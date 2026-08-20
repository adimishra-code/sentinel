import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../../config';
import { UserRole } from '../../types';

const SALT_ROUNDS = 10;

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
