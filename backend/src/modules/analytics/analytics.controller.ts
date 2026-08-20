import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as analyticsService from './analytics.service';
import { z } from 'zod';

const AnalyticsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

/**
 * Get dashboard overview
 * GET /api/v1/analytics/overview
 */
export const getDashboardOverview = asyncHandler(async (req: Request, res: Response) => {
  const options = AnalyticsQuerySchema.parse(req.query);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  const data = await analyticsService.getDashboardOverview(req.organizationId, options);

  res.status(200).json({
    success: true,
    data,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get content analytics
 * GET /api/v1/analytics/content
 */
export const getContentAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const options = AnalyticsQuerySchema.parse(req.query);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  const data = await analyticsService.getContentAnalytics(req.organizationId, options);

  res.status(200).json({
    success: true,
    data,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get case analytics
 * GET /api/v1/analytics/cases
 */
export const getCaseAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const options = AnalyticsQuerySchema.parse(req.query);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  const data = await analyticsService.getCaseAnalytics(req.organizationId, options);

  res.status(200).json({
    success: true,
    data,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get decision analytics
 * GET /api/v1/analytics/decisions
 */
export const getDecisionAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const options = AnalyticsQuerySchema.parse(req.query);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  const data = await analyticsService.getDecisionAnalytics(req.organizationId, options);

  res.status(200).json({
    success: true,
    data,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get appeal analytics
 * GET /api/v1/analytics/appeals
 */
export const getAppealAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const options = AnalyticsQuerySchema.parse(req.query);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  const data = await analyticsService.getAppealAnalytics(req.organizationId, options);

  res.status(200).json({
    success: true,
    data,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get category distribution
 * GET /api/v1/analytics/categories
 */
export const getCategoryDistribution = asyncHandler(async (req: Request, res: Response) => {
  const options = AnalyticsQuerySchema.parse(req.query);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  const data = await analyticsService.getCategoryDistribution(req.organizationId, options);

  res.status(200).json({
    success: true,
    data,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});
