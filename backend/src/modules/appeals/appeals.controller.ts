import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as appealsService from './appeals.service';
import { z } from 'zod';
import { AppealStatus } from '../../types';

const CreateAppealSchema = z.object({
  caseId: z.string().min(1),
  reason: z.string().min(20).max(2000),
});

/**
 * Create appeal
 * POST /api/v1/appeals
 */
export const createAppeal = asyncHandler(async (req: Request, res: Response) => {
  const { caseId, reason } = CreateAppealSchema.parse(req.body);

  if (!req.organizationId || !req.userId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Authentication required' },
    });
  }

  const appeal = await appealsService.createAppeal(caseId, req.userId, req.organizationId, reason);

  res.status(201).json({
    success: true,
    data: {
      id: appeal._id.toString(),
      status: appeal.status,
      createdAt: appeal.createdAt,
    },
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

const ListAppealsSchema = z.object({
  status: z.nativeEnum(AppealStatus).optional(),
  userId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * List appeals
 * GET /api/v1/appeals
 */
export const listAppeals = asyncHandler(async (req: Request, res: Response) => {
  const options = ListAppealsSchema.parse(req.query);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  const result = await appealsService.listAppeals(req.organizationId, options);

  res.status(200).json({
    success: true,
    data: result.items,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
      pagination: result.pagination,
    },
  });
});

/**
 * Get appeal details
 * GET /api/v1/appeals/:id
 */
export const getAppeal = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  const appeal = await appealsService.getAppeal(id, req.organizationId);

  res.status(200).json({
    success: true,
    data: appeal,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

const ResolveAppealSchema = z.object({
  status: z.enum(['upheld', 'reversed', 'modified']),
  outcomeRationale: z.string().min(10).max(5000),
});

/**
 * Resolve appeal
 * POST /api/v1/appeals/:id/resolve
 */
export const resolveAppeal = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const resolution = ResolveAppealSchema.parse(req.body);

  if (!req.organizationId || !req.userId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Authentication required' },
    });
  }

  await appealsService.resolveAppeal(id, req.userId, req.organizationId, resolution);

  res.status(200).json({
    success: true,
    data: { message: 'Appeal resolved successfully' },
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});
