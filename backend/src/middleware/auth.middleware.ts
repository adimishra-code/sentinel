import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { verifyAccessToken, hashToken } from '../modules/auth/auth.utils';
import { hasPermission, getUserPermissions } from '../modules/auth/permissions.utils';
import { User } from '../modules/auth/user.model';
import { OrganizationMember } from '../modules/organizations/organization-member.model';
import { ApiKey } from '../modules/auth/api-key.model';
import { UserRole, UserStatus } from '../types';
import logger from '../utils/logger';

/**
 * Authenticate user via JWT or API key
 * Attaches userId, email to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw AppError.unauthorized('No authorization header provided');
    }

    const [type, token] = authHeader.split(' ');

    if (!token) {
      throw AppError.unauthorized('Malformed authorization header');
    }

    // JWT Authentication
    if (type === 'Bearer') {
      const payload = verifyAccessToken(token);

      // Verify user still exists and is active
      const user = await User.findById(payload.userId);
      if (!user) {
        throw AppError.unauthorized('User not found');
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw AppError.unauthorized('User account is not active');
      }

      req.userId = user._id.toString();
      req.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        status: user.status,
      };

      return next();
    }

    // API Key Authentication
    if (type === 'ApiKey') {
      const keyHash = hashToken(token);

      const apiKey = await ApiKey.findOne({ keyHash, status: 'active' });
      if (!apiKey) {
        throw AppError.unauthorized('Invalid API key');
      }

      // Check expiration
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        throw AppError.unauthorized('API key has expired');
      }

      // Update last used timestamp (async, don't await)
      ApiKey.updateOne({ _id: apiKey._id }, { lastUsedAt: new Date() }).exec();

      // Set request context
      req.organizationId = apiKey.organizationId.toString();
      req.permissions = apiKey.permissions;
      req.apiKeyId = apiKey._id.toString();

      logger.info('API key authentication successful', {
        apiKeyId: apiKey._id,
        organizationId: apiKey.organizationId,
      });

      return next();
    }

    throw AppError.unauthorized('Invalid authorization type. Use "Bearer" or "ApiKey"');
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    logger.error('Authentication error', { error });
    return next(AppError.unauthorized('Invalid or expired token'));
  }
};

/**
 * Require user to be a member of a specific organization
 * Must be called after authenticate
 * Attaches organizationId, userRole, permissions to request
 */
export const requireOrgMembership = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // If API key authenticated, membership already verified
    if (req.apiKeyId) {
      return next();
    }

    if (!req.userId) {
      throw AppError.unauthorized('Authentication required');
    }

    // Get organizationId from route params, body, or header
    const organizationId =
      req.params.organizationId ||
      req.body.organizationId ||
      req.headers['x-organization-id'];

    if (!organizationId) {
      throw AppError.badRequest('Organization ID required');
    }

    // Check membership
    const membership = await OrganizationMember.findOne({
      userId: req.userId,
      organizationId,
    }).populate('organizationId');

    if (!membership) {
      throw AppError.forbidden('Not a member of this organization');
    }

    // Attach to request
    req.organizationId = organizationId as string;
    req.userRole = membership.role;
    req.permissions = getUserPermissions(membership.role, membership.permissions);

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require user to have a specific role
 * Must be called after authenticate and requireOrgMembership
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.userRole)) {
      return next(
        AppError.forbidden(`Required role: ${roles.join(' or ')}. You have: ${req.userRole}`)
      );
    }

    next();
  };
};

/**
 * Require user to have a specific permission
 * Must be called after authenticate and requireOrgMembership
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // API key authentication - check key permissions
      if (req.apiKeyId) {
        if (!req.permissions?.includes(permission)) {
          throw AppError.forbidden(`Missing permission: ${permission}`);
        }
        return next();
      }

      // User authentication
      if (!req.userId || !req.organizationId) {
        throw AppError.unauthorized('Authentication required');
      }

      // Get user's membership if not already loaded
      if (!req.userRole) {
        const membership = await OrganizationMember.findOne({
          userId: req.userId,
          organizationId: req.organizationId,
        });

        if (!membership) {
          throw AppError.forbidden('Not a member of this organization');
        }

        req.userRole = membership.role;
        req.permissions = getUserPermissions(membership.role, membership.permissions);
      }

      // Check permission
      if (!hasPermission(req.userRole, req.permissions || [], permission)) {
        throw AppError.forbidden(`Missing permission: ${permission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication - doesn't fail if no auth provided
 * Useful for endpoints that behave differently for authenticated users
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    // Try to authenticate, but don't fail
    await authenticate(req, res, next);
  } catch (error) {
    // Silent fail for optional auth
    next();
  }
};

/**
 * Require platform admin role
 */
export const requirePlatformAdmin = requireRole(UserRole.PLATFORM_ADMIN);

/**
 * Require org admin role or higher
 */
export const requireOrgAdmin = requireRole(UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN);
