import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as moderationService from './moderation.service';
import { ModerateContentSchema } from '../../types/schemas';
import { z } from 'zod';

/**
 * Moderate content
 * POST /api/v1/moderate
 */
export const moderateContent = asyncHandler(async (req: Request, res: Response) => {
  const input = ModerateContentSchema.parse(req.body);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Organization ID required. Use JWT auth or provide X-Organization-ID header.',
      },
    });
  }

  const result = await moderationService.moderateContent(req.organizationId, input as any);

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
 * Get content by ID
 * GET /api/v1/content/:id
 */
export const getContent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Organization ID required',
      },
    });
  }

  const content = await moderationService.getContent(id, req.organizationId);

  res.status(200).json({
    success: true,
    data: content,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

const ListContentSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  authorId: z.string().optional(),
  contentType: z.enum(['text', 'image', 'url', 'mixed']).optional(),
});

/**
 * List content
 * GET /api/v1/content
 */
export const listContent = asyncHandler(async (req: Request, res: Response) => {
  const options = ListContentSchema.parse(req.query);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Organization ID required',
      },
    });
  }

  const result = await moderationService.listContent(req.organizationId, options as any);

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
