import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as apiKeysService from './api-keys.service';
import { CreateApiKeySchema } from '../../types/schemas';

/**
 * Create API key
 * POST /api/v1/api-keys
 */
export const createApiKey = asyncHandler(async (req: Request, res: Response) => {
  const input = CreateApiKeySchema.parse(req.body);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Organization ID required in header: X-Organization-ID',
      },
    });
  }

  const result = await apiKeysService.createApiKey(
    req.organizationId,
    req.userId!,
    input
  );

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
 * List API keys
 * GET /api/v1/api-keys
 */
export const listApiKeys = asyncHandler(async (req: Request, res: Response) => {
  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Organization ID required in header: X-Organization-ID',
      },
    });
  }

  const apiKeys = await apiKeysService.listApiKeys(req.organizationId, req.userId!);

  res.status(200).json({
    success: true,
    data: apiKeys,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
      total: apiKeys.length,
    },
  });
});

/**
 * Revoke API key
 * DELETE /api/v1/api-keys/:id
 */
export const revokeApiKey = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Organization ID required in header: X-Organization-ID',
      },
    });
  }

  const result = await apiKeysService.revokeApiKey(id, req.organizationId, req.userId!);

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});
