/**
 * MFA / TOTP controllers
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as mfaService from './mfa.service';
import { logAudit } from '../../utils/audit';

/**
 * Setup TOTP (returns otpauth URI, secret not yet enabled)
 * POST /api/v1/auth/2fa/setup
 */
export const setup2fa = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const result = await mfaService.setup2fa(req.userId);
  await logAudit(req, 'auth.mfa_setup', 'user', req.userId, undefined, {});

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
 * Enable TOTP after verifying a code (returns recovery codes)
 * POST /api/v1/auth/2fa/enable
 */
export const enable2fa = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const { code } = req.body;
  const result = await mfaService.enable2fa(req.userId, code);
  await logAudit(req, 'auth.mfa_enabled', 'user', req.userId, undefined, {});

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
 * Verify MFA code during login (returns access + refresh tokens)
 * POST /api/v1/auth/2fa/verify
 */
export const verify2fa = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const { code } = req.body;
  const mfaToken = req.headers.authorization?.split(' ')[1];

  if (!mfaToken) {
    return res.status(401).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'MFA token required' },
    });
  }

  const result = await mfaService.verify2fa(
    mfaToken,
    code,
    req.headers['user-agent'],
    req.ip
  );

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
 * Disable TOTP
 * POST /api/v1/auth/2fa/disable
 */
export const disable2fa = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  await mfaService.disable2fa(req.userId);
  await logAudit(req, 'auth.mfa_disabled', 'user', req.userId, undefined, {});

  res.status(200).json({
    success: true,
    data: { message: 'Two-factor authentication disabled' },
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});
