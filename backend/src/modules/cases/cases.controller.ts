import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as casesService from './cases.service';
import { z } from 'zod';
import { CaseStatus, CasePriority, ModerationAction } from '../../types';

const ListCasesSchema = z.object({
  status: z.nativeEnum(CaseStatus).optional(),
  priority: z.nativeEnum(CasePriority).optional(),
  assignedTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * List cases (moderator queue)
 * GET /api/v1/cases
 */
export const listCases = asyncHandler(async (req: Request, res: Response) => {
  const options = ListCasesSchema.parse(req.query);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  const result = await casesService.listCases(req.organizationId, options);

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
 * Get case details
 * GET /api/v1/cases/:id
 */
export const getCase = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  const caseData = await casesService.getCase(id, req.organizationId);

  res.status(200).json({
    success: true,
    data: caseData,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

const AssignCaseSchema = z.object({
  moderatorId: z.string().min(1),
});

/**
 * Assign case to moderator
 * POST /api/v1/cases/:id/assign
 */
export const assignCase = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { moderatorId } = AssignCaseSchema.parse(req.body);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  await casesService.assignCase(id, moderatorId, req.organizationId);

  res.status(200).json({
    success: true,
    data: { message: 'Case assigned successfully' },
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

const ResolveCaseSchema = z.object({
  action: z.nativeEnum(ModerationAction),
  rationale: z.string().min(10).max(5000),
  policyVersionId: z.string().optional(),
});

/**
 * Resolve case with decision
 * POST /api/v1/cases/:id/resolve
 */
export const resolveCase = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const decision = ResolveCaseSchema.parse(req.body);

  if (!req.organizationId || !req.userId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Authentication required' },
    });
  }

  await casesService.resolveCase(id, req.userId, req.organizationId, decision);

  res.status(200).json({
    success: true,
    data: { message: 'Case resolved successfully' },
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

const BulkUpdateSchema = z.object({
  caseIds: z.array(z.string().min(1)).min(1).max(100),
  operation: z.enum(['assign', 'dismiss']),
  moderatorId: z.string().optional(),
});

/**
 * Bulk update cases
 * POST /api/v1/cases/bulk
 */
export const bulkUpdateCases = asyncHandler(async (req: Request, res: Response) => {
  const { caseIds, operation, moderatorId } = BulkUpdateSchema.parse(req.body);

  if (!req.organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Organization ID required' },
    });
  }

  const result = await casesService.bulkUpdateCases(
    caseIds,
    req.organizationId,
    operation,
    { moderatorId }
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

