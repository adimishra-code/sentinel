/**
 * Evaluation controllers
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as evaluationService from './evaluation.service';
import { logAudit } from '../../utils/audit';

/**
 * Run the detection benchmark
 * POST /api/v1/evaluation/run
 */
export const runBenchmark = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId || !req.organizationId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const { threshold, useLLM } = req.body;

  const { report, run } = await evaluationService.runBenchmark({
    organizationId: req.organizationId,
    userId: req.userId,
    threshold,
    useLLM,
  });

  await logAudit(
    req,
    'evaluation.run',
    'evaluation_run',
    run._id.toString(),
    undefined,
    { threshold, useLLM, totalCases: report.totalCases }
  );

  res.status(200).json({
    success: true,
    data: report,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * List evaluation runs for the organization
 * GET /api/v1/evaluation/runs
 */
export const listRuns = asyncHandler(async (req: Request, res: Response) => {
  if (!req.organizationId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const { page, limit } = req.query;
  const result = await evaluationService.listRuns(req.organizationId, {
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
  });

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
 * Get a single evaluation run
 * GET /api/v1/evaluation/runs/:id
 */
export const getRun = asyncHandler(async (req: Request, res: Response) => {
  if (!req.organizationId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const { id } = req.params;
  const run = await evaluationService.getRun(req.organizationId, id);

  res.status(200).json({
    success: true,
    data: run,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});
