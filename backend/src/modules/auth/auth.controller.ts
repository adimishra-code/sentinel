import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as authService from './auth.service';
import { RegisterSchema, LoginSchema, RefreshTokenSchema, SSOCallbackSchema } from '../../types/schemas';
import logger from '../../utils/logger';

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = RegisterSchema.parse(req.body);

  const result = await authService.register(input);

  logger.info('User registered', {
    userId: result.user.id,
    email: result.user.email,
    organizationId: result.organization.id,
  });

  res.status(201).json({
    success: true,
    data: result,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = LoginSchema.parse(req.body);

  const result = await authService.login({
    ...input,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  logger.info('User logged in', {
    userId: result.user.id,
    email: result.user.email,
  });

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = RefreshTokenSchema.parse(req.body);

  const result = await authService.refresh(
    refreshToken,
    req.headers['user-agent'],
    req.ip
  );

  res.status(200).json({
    success: true,
    data: {
      tokens: result,
    },
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = RefreshTokenSchema.parse(req.body);

  await authService.logout(refreshToken);

  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get current user
 * GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  const user = await authService.getCurrentUser(req.userId);

  res.status(200).json({
    success: true,
    data: user,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Handle Enterprise SSO Callback (SAML 2.0 / OIDC)
 * POST /api/v1/auth/sso/callback
 */
export const ssoCallback = asyncHandler(async (req: Request, res: Response) => {
  const input = SSOCallbackSchema.parse(req.body);

  const result = await authService.ssoLogin({
    ...input,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  logger.info('User authenticated via SSO', {
    userId: result.user.id,
    email: result.user.email,
    organizationId: result.organization.id,
    provider: input.provider,
  });

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});
