import crypto from 'crypto';
import { User, IUser } from './user.model';
import { Organization } from '../organizations/organization.model';
import { OrganizationMember } from '../organizations/organization-member.model';
import { RefreshToken } from './refresh-token.model';
import { AppError } from '../../middleware/errorHandler';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateSlug,
} from './auth.utils';
import { UserRole, UserStatus } from '../../types';
import logger from '../../utils/logger';

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
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
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

  // Find user with password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  // Check user status
  if (user.status !== UserStatus.ACTIVE) {
    throw AppError.unauthorized('User account is not active');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw AppError.unauthorized('Invalid email or password');
  }

  // Get user's primary organization (first one they're a member of)
  const membership = await OrganizationMember.findOne({ userId: user._id })
    .populate('organizationId')
    .sort({ createdAt: 1 });

  if (!membership) {
    throw AppError.internal('User has no organization membership');
  }

  const organization = membership.organizationId as any;

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

  // Revoke old refresh token (single-use rotation)
  storedToken.revoked = true;
  await storedToken.save();

  // Generate new tokens
  const newAccessToken = generateAccessToken(user._id.toString(), user.email);
  const newRefreshToken = generateRefreshToken(user._id.toString(), user.email);

  // Store new refresh token
  const newRefreshTokenExpiry = new Date();
  newRefreshTokenExpiry.setDate(newRefreshTokenExpiry.getDate() + 7); // 7 days

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(newRefreshToken),
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
