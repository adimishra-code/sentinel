import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser } from './user.model';
import { Organization } from '../organizations/organization.model';
import { OrganizationMember } from '../organizations/organization-member.model';
import { RefreshToken } from './refresh-token.model';
import { PasswordResetToken } from './password-reset-token.model';
import { TotpSecret } from './totp-secret.model';
import { AppError } from '../../middleware/errorHandler';
import config from '../../config';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateSlug,
  generateInviteToken,
  encryptSecret,
  decryptSecret,
} from './auth.utils';
import { UserRole, UserStatus } from '../../types';
import logger from '../../utils/logger';
import { notify } from '../notifications/notifications.service';
import { getRedisClient } from '../../utils/redis';

/**
 * Failed login attempt lockout configuration
 */
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes
const LOGIN_LOCKOUT_TTL_SECONDS = 60 * 60 * 24; // 24 hours for the key

const loginAttemptsKey = (email: string) => `login:attempts:${email}`;
const loginLockoutKey = (email: string) => `login:lockout:${email}`;

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

export interface LoginInput {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    status: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  mfaRequired?: boolean;
  mfaToken?: string;
}

/**
 * Register a new user and create their organization
 */
export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const { email, password, name, organizationName } = input;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw AppError.conflict('User with this email already exists');
  }

  // Generate organization slug
  let slug = generateSlug(organizationName);

  // Ensure slug is unique
  let slugExists = await Organization.findOne({ slug });
  let counter = 1;
  while (slugExists) {
    slug = `${generateSlug(organizationName)}-${counter}`;
    slugExists = await Organization.findOne({ slug });
    counter++;
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create organization
  const organization = await Organization.create({
    name: organizationName,
    slug,
    status: 'active',
  });

  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    name,
    status: UserStatus.ACTIVE,
    emailVerified: false,
  });

  // Create organization membership (org admin)
  await OrganizationMember.create({
    organizationId: organization._id,
    userId: user._id,
    role: UserRole.ORG_ADMIN,
    permissions: [],
  });

  // Generate tokens
  const accessToken = generateAccessToken(user._id.toString(), user.email);
  const refreshToken = generateRefreshToken(user._id.toString(), user.email);

  // Store refresh token
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshTokenExpiry,
    revoked: false,
  });

  logger.info('User registered successfully', {
    userId: user._id,
    organizationId: organization._id,
    email: user.email,
  });

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      status: user.status,
    },
    organization: {
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
};

/**
 * Login user with email and password
 */
export const login = async (input: LoginInput): Promise<AuthResponse> => {
  const { email, password, userAgent, ipAddress } = input;
  const normalizedEmail = email.toLowerCase();

  // Check if the account is locked due to too many failed attempts
  try {
    const redis = getRedisClient();
    const lockoutKey = loginLockoutKey(normalizedEmail);
    const lockoutTTL = await redis.ttl(lockoutKey);
    if (lockoutTTL > 0) {
      throw AppError.tooManyRequests(
        `Account temporarily locked due to too many failed login attempts. Try again in ${lockoutTTL} seconds.`
      );
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Redis unavailable — proceed without lockout
  }

  // Find user with password field
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  // Record a failed attempt regardless of whether the user exists (prevents enumeration)
  const recordFailedAttempt = async () => {
    try {
      const redis = getRedisClient();
      const attemptsKey = loginAttemptsKey(normalizedEmail);
      const attempts = (await redis.incr(attemptsKey)) || 1;
      if (attempts === 1) {
        await redis.expire(attemptsKey, LOGIN_LOCKOUT_TTL_SECONDS);
      }
      if (attempts >= LOGIN_MAX_ATTEMPTS) {
        await redis.setex(loginLockoutKey(normalizedEmail), LOGIN_LOCKOUT_WINDOW_SECONDS, '1');
      }
    } catch {
      // Redis unavailable — proceed without lockout tracking
    }
  };

  if (!user) {
    await recordFailedAttempt();
    throw AppError.unauthorized('Invalid email or password');
  }

  // Check user status
  if (user.status !== UserStatus.ACTIVE) {
    await recordFailedAttempt();
    throw AppError.unauthorized('User account is not active');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    await recordFailedAttempt();
    throw AppError.unauthorized('Invalid email or password');
  }

  // Reset failed attempts on successful password check
  try {
    const redis = getRedisClient();
    await redis.del(loginAttemptsKey(normalizedEmail));
    await redis.del(loginLockoutKey(normalizedEmail));
  } catch {
    // Non-critical
  }

  // Get user's primary organization (first one they're a member of)
  const membership = await OrganizationMember.findOne({ userId: user._id })
    .populate('organizationId')
    .sort({ createdAt: 1 });

  if (!membership) {
    throw AppError.internal('User has no organization membership');
  }

  const organization = membership.organizationId as any;

  // If 2FA is enabled, issue a short-lived MFA token instead of full session tokens
  const totp = await TotpSecret.findOne({ userId: user._id, enabled: true });
  if (totp) {
    const mfaPayload = { userId: user._id.toString(), email: user.email, type: 'mfa' as const };
    const mfaToken = jwt.sign(mfaPayload, config.jwt.refreshSecret, {
      expiresIn: '5m',
    } as jwt.SignOptions);

    logger.info('Login requires MFA', { userId: user._id });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        status: user.status,
      },
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        slug: organization.slug,
      },
      mfaRequired: true,
      mfaToken,
    };
  }

  // Generate tokens with a token family for reuse detection
  const familyId = crypto.randomBytes(16).toString('hex');
  const accessToken = generateAccessToken(user._id.toString(), user.email);
  const refreshToken = generateRefreshToken(user._id.toString(), user.email);

  // Store refresh token
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    familyId,
    expiresAt: refreshTokenExpiry,
    revoked: false,
    userAgent,
    ipAddress,
  });

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  logger.info('User logged in successfully', {
    userId: user._id,
    email: user.email,
  });

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      status: user.status,
    },
    organization: {
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
};

/**
 * Refresh access token using refresh token
 */
export const refresh = async (
  refreshTokenString: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  // Verify token signature
  const payload = verifyRefreshToken(refreshTokenString);

  // Find and validate refresh token in database
  const tokenHash = hashToken(refreshTokenString);
  const storedToken = await RefreshToken.findOne({ tokenHash });

  if (!storedToken) {
    throw AppError.unauthorized('Invalid refresh token');
  }

  if (storedToken.revoked) {
    throw AppError.unauthorized('Refresh token has been revoked');
  }

  if (storedToken.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token has expired');
  }

  if (storedToken.userId.toString() !== payload.userId) {
    throw AppError.unauthorized('Token user mismatch');
  }

  // Verify user still exists and is active
  const user = await User.findById(payload.userId);
  if (!user) {
    throw AppError.unauthorized('User not found');
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw AppError.unauthorized('User account is not active');
  }

  // Reuse detection: if this token was already revoked, someone is replaying it.
  // Revoke the entire token family to force re-login everywhere.
  if (storedToken.revoked) {
    await RefreshToken.updateMany(
      { userId: storedToken.userId, familyId: storedToken.familyId },
      { revoked: true }
    );
    logger.warn('Refresh token reuse detected, family revoked', {
      userId: storedToken.userId,
      familyId: storedToken.familyId,
    });
    throw AppError.unauthorized('Refresh token has been revoked');
  }

  // Revoke old refresh token (single-use rotation), keep same family
  storedToken.revoked = true;
  await storedToken.save();

  // Generate new tokens
  const newAccessToken = generateAccessToken(user._id.toString(), user.email);
  const newRefreshToken = generateRefreshToken(user._id.toString(), user.email);

  // Store new refresh token in the same family
  const newRefreshTokenExpiry = new Date();
  newRefreshTokenExpiry.setDate(newRefreshTokenExpiry.getDate() + 7); // 7 days

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(newRefreshToken),
    familyId: storedToken.familyId,
    expiresAt: newRefreshTokenExpiry,
    revoked: false,
    userAgent,
    ipAddress,
  });

  logger.info('Token refreshed successfully', {
    userId: user._id,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

/**
 * Logout user by revoking refresh token
 */
export const logout = async (refreshTokenString: string): Promise<void> => {
  const tokenHash = hashToken(refreshTokenString);
  const storedToken = await RefreshToken.findOne({ tokenHash });

  if (storedToken && !storedToken.revoked) {
    storedToken.revoked = true;
    await storedToken.save();

    logger.info('User logged out', {
      userId: storedToken.userId,
    });
  }
};

/**
 * Get current user details with their organizations
 */
export const getCurrentUser = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  // Get user's organizations
  const memberships = await OrganizationMember.find({ userId })
    .populate('organizationId')
    .sort({ createdAt: 1 });

  const organizations = memberships.map((m: any) => ({
    id: m.organizationId._id.toString(),
    name: m.organizationId.name,
    slug: m.organizationId.slug,
    role: m.role,
    permissions: m.permissions,
  }));

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    status: user.status,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    organizations,
  };
};

export interface SSOLoginInput {
  provider: 'saml' | 'oidc' | 'google' | 'okta' | 'azure-ad';
  email: string;
  name: string;
  externalId: string;
  organizationSlug: string;
  idToken?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Enterprise SSO Login (SAML 2.0 / OIDC)
 * Authenticates user via enterprise provider, maps to organization, and issues tokens
 */
export const ssoLogin = async (input: SSOLoginInput): Promise<AuthResponse> => {
  const { provider, email, name, organizationSlug, userAgent, ipAddress } = input;

  const organization = await Organization.findOne({ slug: organizationSlug.toLowerCase() });
  if (!organization) {
    throw AppError.notFound(`Organization with slug "${organizationSlug}" not found`);
  }

  // Find or create user
  let user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const randomSecret = crypto.randomBytes(32).toString('hex');
    const passwordHash = await hashPassword(randomSecret);

    user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });

    logger.info('New user provisioned via SSO', {
      userId: user._id,
      email: user.email,
      provider,
    });
  }

  // Ensure membership in organization
  let membership = await OrganizationMember.findOne({
    userId: user._id,
    organizationId: organization._id,
  });

  if (!membership) {
    membership = await OrganizationMember.create({
      organizationId: organization._id,
      userId: user._id,
      role: UserRole.REVIEWER,
      permissions: [],
    });

    logger.info('User joined organization via SSO', {
      userId: user._id,
      organizationId: organization._id,
      provider,
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id.toString(), user.email);
  const refreshToken = generateRefreshToken(user._id.toString(), user.email);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshTokenExpiry,
    revoked: false,
    userAgent,
    ipAddress,
  });

  user.lastLoginAt = new Date();
  await user.save();

  logger.info('User logged in via SSO successfully', {
    userId: user._id,
    email: user.email,
    provider,
    organizationId: organization._id,
  });

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      status: user.status,
    },
    organization: {
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
};

/**
 * Change the user's password after verifying the current password.
 * Revokes all other refresh token sessions and sends a notice email.
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await User.findById(userId).select('+passwordHash email');
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw AppError.unauthorized('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);
  user.passwordHash = passwordHash;
  await user.save();

  // Revoke all refresh token sessions (force re-login everywhere)
  await RefreshToken.updateMany({ userId: user._id, revoked: false }, { revoked: true });

  logger.info('Password changed', { userId: user._id });

  // Send notice email (best effort)
  try {
    await notify({
      organizationId: '',
      userId: user._id.toString(),
      type: 'system',
      title: 'Password changed',
      message: 'Your password was changed recently. If this was not you, contact support immediately.',
    });
  } catch {
    // Non-critical
  }
};

/**
 * Request a password reset token. Returns successfully regardless of whether
 * the email exists to prevent user enumeration.
 */
export const forgotPassword = async (email: string): Promise<void> => {
  const user = await User.findOne({ email }).select('_id');
  if (!user) {
    // Still return success to the caller; do not reveal existence.
    return;
  }

  // Invalidate any existing unused reset tokens for this user
  await PasswordResetToken.updateMany(
    { userId: user._id, used: false },
    { used: true }
  );

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
    used: false,
  });

  // Best-effort email with reset link (dev: logs to console via transporter fallback)
  try {
    await notify({
      organizationId: '',
      userId: user._id.toString(),
      type: 'system',
      title: 'Password reset requested',
      message: `Use this reset token (valid for 30 minutes): ${token}`,
      data: { token },
    });
  } catch {
    // Non-critical
  }
};

/**
 * Reset password using a single-use hashed token.
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const tokenHash = hashToken(token);
  const resetToken = await PasswordResetToken.findOne({
    tokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    throw AppError.badRequest('Invalid or expired reset token');
  }

  const user = await User.findById(resetToken.userId).select('+passwordHash');
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const passwordHash = await hashPassword(newPassword);
  user.passwordHash = passwordHash;
  await user.save();

  // Mark token used
  resetToken.used = true;
  await resetToken.save();

  // Revoke all sessions (force re-login)
  await RefreshToken.updateMany({ userId: user._id, revoked: false }, { revoked: true });

  logger.info('Password reset via token', { userId: user._id });
};

/**
 * List refresh token sessions for a user.
 */
export const getSessions = async (userId: string) => {
  const tokens = await RefreshToken.find({ userId }).sort({ createdAt: -1 }).lean();

  return tokens.map((t) => ({
    id: t._id.toString(),
    createdAt: t.createdAt,
    lastUsedAt: t.updatedAt,
    userAgent: t.userAgent,
    ipAddress: t.ipAddress,
    revoked: t.revoked,
    expiresAt: t.expiresAt,
  }));
};

/**
 * Revoke a single session if it belongs to the user.
 */
export const revokeSession = async (userId: string, sessionId: string): Promise<void> => {
  const token = await RefreshToken.findOne({ _id: sessionId, userId });
  if (!token) {
    throw AppError.notFound('Session not found');
  }
  token.revoked = true;
  await token.save();
};

/**
 * Revoke all sessions except the one identified by currentTokenHash.
 */
export const revokeAllSessions = async (userId: string, currentToken?: string): Promise<void> => {
  const query: any = { userId, revoked: false };
  if (currentToken) {
    const currentHash = hashToken(currentToken);
    query.tokenHash = { $ne: currentHash };
  }
  await RefreshToken.updateMany(query, { revoked: true });
};
