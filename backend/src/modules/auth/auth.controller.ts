import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as authService from './auth.service';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  SSOCallbackSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../../types/schemas';
import logger from '../../utils/logger';
import { logAudit } from '../../utils/audit';

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
 * Change the authenticated user's password
 * POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);

  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  await authService.changePassword(req.userId, currentPassword, newPassword);
  await logAudit(req, 'auth.password_changed', 'user', req.userId, undefined, {});

  res.status(200).json({
    success: true,
    data: { message: 'Password changed successfully' },
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Request a password reset token
 * POST /api/v1/auth/forgot-password
 * Always returns success to prevent user enumeration.
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = ForgotPasswordSchema.parse(req.body);

  await authService.forgotPassword(email.toLowerCase());

  res.status(200).json({
    success: true,
    data: {
      message:
        'If an account exists for this email, a password reset link has been sent.',
    },
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Reset password using a single-use token
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = ResetPasswordSchema.parse(req.body);

  await authService.resetPassword(token, newPassword);

  res.status(200).json({
    success: true,
    data: { message: 'Password reset successfully' },
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * List the authenticated user's refresh token sessions
 * GET /api/v1/auth/sessions
 */
export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const sessions = await authService.getSessions(req.userId);

  res.status(200).json({
    success: true,
    data: sessions,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Revoke a single session
 * DELETE /api/v1/auth/sessions/:sessionId
 */
export const revokeSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  await authService.revokeSession(req.userId, sessionId);
  await logAudit(req, 'auth.session_revoked', 'refresh_token', sessionId, undefined, {});

  res.status(200).json({
    success: true,
    data: { message: 'Session revoked' },
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Revoke all sessions except the current one
 * POST /api/v1/auth/sessions/revoke-all
 */
export const revokeAllSessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const currentToken = req.headers.authorization?.split(' ')[1];
  await authService.revokeAllSessions(req.userId, currentToken);
  await logAudit(req, 'auth.sessions_revoked_all', 'user', req.userId, undefined, {});

  res.status(200).json({
    success: true,
    data: { message: 'All other sessions revoked' },
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
