import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as moderationService from './moderation.service';
import { ModerateContentSchema } from '../../types/schemas';
import { enqueueModeration, moderationQueue } from '../../utils/queue';
import { z } from 'zod';

/**
 * Moderate content (synchronously or asynchronously via queue)
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

  const isAsync = req.query.async === 'true' || req.headers['prefer'] === 'respond-async';

  if (isAsync) {
    const job = await enqueueModeration(req.organizationId, input as any);
    return res.status(202).json({
      success: true,
      status: 'queued',
      jobId: job.id,
      meta: {
        statusUrl: `/api/v1/moderate/jobs/${job.id}`,
        requestId: (req as any).requestId,
        timestamp: new Date().toISOString(),
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
 * Check async moderation job status
 * GET /api/v1/moderate/jobs/:jobId
 */
export const getJobStatus = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = await moderationQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Job ${jobId} not found`,
      },
    });
  }

  // Tenant security: verify job belongs to requesting organization
  if (req.organizationId && job.data?.organizationId !== req.organizationId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this job',
      },
    });
  }

  const state = await job.getState();
  const result = job.returnvalue;
  const failedReason = job.failedReason;

  res.status(200).json({
    success: true,
    data: {
      jobId: job.id,
      status: state,
      progress: job.progress,
      result: state === 'completed' ? result : undefined,
      failedReason: state === 'failed' ? failedReason : undefined,
      createdAt: new Date(job.timestamp).toISOString(),
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
