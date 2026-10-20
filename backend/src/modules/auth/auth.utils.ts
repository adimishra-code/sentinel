import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../../config';
import { UserRole } from '../../types';

const SALT_ROUNDS = 12;

// ============================================================================
// Password Hashing
// ============================================================================

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// ============================================================================
// JWT Generation & Verification
// ============================================================================

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export const generateAccessToken = (userId: string, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'access',
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (userId: string, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'refresh',
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return payload;
  } catch (error) {
    throw error;
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const payload = jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return payload;
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// Token Hashing (for refresh tokens and API keys)
// ============================================================================

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ============================================================================
// API Key Generation
// ============================================================================

export const generateApiKey = (): { key: string; hash: string; prefix: string } => {
  // Generate a secure random key (32 bytes = 64 hex chars)
  const key = crypto.randomBytes(32).toString('hex');

  // Hash for storage
  const hash = hashToken(key);

  // Prefix for display (first 8 chars)
  const prefix = key.substring(0, 8);

  return { key, hash, prefix };
};

// ============================================================================
// Slug Generation
// ============================================================================

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
};

// ============================================================================
// Random Token Generation (for invitations)
// ============================================================================

export const generateInviteToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// ============================================================================
// At-rest encryption (AES-256-GCM) for secrets such as TOTP seeds
// ============================================================================

const ENCRYPTION_KEY_BUFFER = Buffer.from(config.encryption.key, 'utf8');

if (ENCRYPTION_KEY_BUFFER.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
}

/**
 * Encrypt a plaintext secret using AES-256-GCM.
 * Returns `iv:ciphertext` (both base64).
 */
export const encryptSecret = (plaintext: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY_BUFFER, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${Buffer.concat([ciphertext, authTag]).toString('base64')}`;
};

/**
 * Decrypt a secret produced by encryptSecret.
 * Expects `iv:ciphertext` (both base64).
 */
export const decryptSecret = (encrypted: string): string => {
  const [ivB64, payloadB64] = encrypted.split(':');
  if (!ivB64 || !payloadB64) {
    throw new Error('Invalid encrypted secret format');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const payload = Buffer.from(payloadB64, 'base64');
  const ciphertext = payload.slice(0, payload.length - 16);
  const authTag = payload.slice(payload.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY_BUFFER, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};
