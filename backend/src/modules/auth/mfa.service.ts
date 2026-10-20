/**
 * MFA / TOTP service
 * Time-based one-time password two-factor authentication
 * Implemented natively with Node crypto (RFC 6238 TOTP over HMAC-SHA1).
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { TotpSecret } from './totp-secret.model';
import { User } from './user.model';
import { RefreshToken } from './refresh-token.model';
import { AppError } from '../../middleware/errorHandler';
import { encryptSecret, decryptSecret } from './auth.utils';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from './auth.utils';
import config from '../../config';
import logger from '../../utils/logger';
import { notify } from '../notifications/notifications.service';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_STEP = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // accept current and one step either side

/**
 * Base32 encode (RFC 4648, no padding).
 */
function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let bitCount = 0;
  let result = '';
  for (const byte of bytes) {
    bits = (bits << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      result += BASE32_ALPHABET[(bits >>> (bitCount - 5)) & 31];
      bitCount -= 5;
    }
  }
  if (bitCount > 0) {
    result += BASE32_ALPHABET[(bits << (5 - bitCount)) & 31];
  }
  return result;
}

/**
 * Base32 decode (RFC 4648, no padding).
 */
function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let bitCount = 0;
  const result: number[] = [];
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) {
      throw AppError.badRequest('Invalid base32 secret');
    }
    bits = (bits << 5) | val;
    bitCount += 5;
    if (bitCount >= 8) {
      result.push((bits >>> (bitCount - 8)) & 0xff);
      bitCount -= 8;
    }
  }
  return Buffer.from(result);
}

function generateSecret(): string {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

function otpauthUrl(email: string, secret: string): string {
  const issuer = encodeURIComponent('Sentinel');
  const account = encodeURIComponent(email);
  return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`;
}

function generateTotpToken(secretBase32: string, counter: number): string {
  const secret = base32Decode(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secret).update(counterBuffer).digest();

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** TOTP_DIGITS;
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

function verifyTotp(code: string, secretBase32: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  for (let step = -TOTP_WINDOW; step <= TOTP_WINDOW; step++) {
    const counter = Math.floor((now + step * TOTP_STEP) / TOTP_STEP);
    const expected = generateTotpToken(secretBase32, counter);
    if (timingSafeEqual(code, expected)) {
      return true;
    }
  }
  return false;
}

/**
 * Constant-time string comparison to avoid timing leaks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return timingSafeEqualBuffer(ba, bb);
}

function timingSafeEqualBuffer(a: Buffer, b: Buffer): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Recovery code length and count
 */
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_LENGTH = 8;

function generateRecoveryCode(): string {
  const bytes = crypto.randomBytes(RECOVERY_CODE_LENGTH / 2);
  return bytes.toString('hex');
}

/**
 * Setup TOTP: generate a secret, encrypt it at rest (not yet enabled),
 * and return the otpauth URI for the user to scan.
 */
export const setup2fa = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const secret = generateSecret();
  const otpauthUrlValue = otpauthUrl(user.email, secret);

  // Encrypt the secret at rest; store as not yet enabled
  const encrypted = encryptSecret(secret); // "iv:payload" base64

  let totp = await TotpSecret.findOne({ userId });
  if (totp) {
    const [iv, ciphertext] = encrypted.split(':');
    totp.encryptedSecret = ciphertext;
    totp.iv = iv;
    totp.enabled = false;
    totp.recoveryCodes = [];
    await totp.save();
  } else {
    const [iv, ciphertext] = encrypted.split(':');
    totp = await TotpSecret.create({
      userId,
      encryptedSecret: ciphertext,
      iv,
      enabled: false,
      recoveryCodes: [],
    });
  }

  logger.info('TOTP setup initiated', { userId });

  return {
    otpauthUrl: otpauthUrlValue,
    secret,
  };
};

/**
 * Enable TOTP after verifying a valid code. Generates recovery codes.
 */
export const enable2fa = async (userId: string, code: string) => {
  const totp = await TotpSecret.findOne({ userId });
  if (!totp || !totp.encryptedSecret) {
    throw AppError.badRequest('TOTP is not set up. Run setup first.');
  }

  const secret = decryptSecret(`${totp.iv}:${totp.encryptedSecret}`);
  const isValid = verifyTotp(code, secret);
  if (!isValid) {
    throw AppError.unauthorized('Invalid verification code');
  }

  // Generate recovery codes (store hashes)
  const recoveryCodes: string[] = [];
  const recoveryCodeHashes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const code = generateRecoveryCode();
    recoveryCodes.push(code);
    recoveryCodeHashes.push(hashToken(code));
  }

  totp.enabled = true;
  totp.recoveryCodes = recoveryCodeHashes;
  await totp.save();

  logger.info('TOTP enabled', { userId });

  // Notify user
  try {
    await notify({
      organizationId: '',
      userId,
      type: 'system',
      title: 'Two-factor authentication enabled',
      message: 'Two-factor authentication has been enabled on your account.',
    });
  } catch {
    // Non-critical
  }

  return {
    recoveryCodes,
  };
};

/**
 * Verify a TOTP code during the MFA login step. `mfaToken` is the short-lived
 * token issued at login when 2FA is required. Returns access + refresh tokens.
 */
export const verify2fa = async (
  mfaToken: string,
  code: string,
  userAgent?: string,
  ipAddress?: string
) => {
  let payload: any;
  try {
    payload = jwt.verify(mfaToken, config.jwt.refreshSecret);
  } catch {
    throw AppError.unauthorized('Invalid or expired MFA token');
  }

  if (payload.type !== 'mfa') {
    throw AppError.unauthorized('Invalid MFA token');
  }

  const userId = payload.userId;

  const totp = await TotpSecret.findOne({ userId, enabled: true });
  if (!totp) {
    throw AppError.badRequest('Two-factor authentication is not enabled');
  }

  const secret = decryptSecret(`${totp.iv}:${totp.encryptedSecret}`);

  // Check TOTP code first
  const isTotpValid = verifyTotp(code, secret);

  // Check recovery code (hashed)
  let isRecoveryValid = false;
  if (!isTotpValid) {
    const codeHash = hashToken(code);
    const index = totp.recoveryCodes.indexOf(codeHash);
    if (index !== -1) {
      isRecoveryValid = true;
      // Single-use: remove the recovery code
      totp.recoveryCodes.splice(index, 1);
    }
  }

  if (!isTotpValid && !isRecoveryValid) {
    throw AppError.unauthorized('Invalid verification code');
  }

  if (isRecoveryValid) {
    await totp.save();
  }

  // Issue full session tokens
  const user = await User.findById(userId);
  if (!user || user.status !== 'active') {
    throw AppError.unauthorized('User not found or inactive');
  }

  const familyId = crypto.randomBytes(16).toString('hex');
  const accessToken = generateAccessToken(userId, user.email);
  const refreshToken = generateRefreshToken(userId, user.email);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    familyId,
    expiresAt: refreshTokenExpiry,
    revoked: false,
    userAgent,
    ipAddress,
  });

  logger.info('MFA verification successful', { userId });

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Disable TOTP for the user.
 */
export const disable2fa = async (userId: string) => {
  const totp = await TotpSecret.findOne({ userId });
  if (!totp) {
    throw AppError.notFound('Two-factor authentication is not set up');
  }

  totp.enabled = false;
  totp.recoveryCodes = [];
  await totp.save();

  logger.info('TOTP disabled', { userId });

  return { message: 'Two-factor authentication disabled' };
};
