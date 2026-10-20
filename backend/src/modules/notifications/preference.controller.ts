/**
 * Notification preference controllers
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as preferenceService from './preference.service';

/**
 * Get all notification preferences for the authenticated user
 * GET /api/v1/auth/notifications/preferences
 */
export const getPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const prefs = await preferenceService.getPreferences(req.userId);

  res.status(200).json({
    success: true,
    data: prefs,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Set a single notification preference
 * PUT /api/v1/auth/notifications/preferences
 */
export const setPreference = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const { type, channel, enabled } = req.body;

  const pref = await preferenceService.setPreference({
    userId: req.userId,
    type,
    channel,
    enabled,
  });

  res.status(200).json({
    success: true,
    data: pref,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});
