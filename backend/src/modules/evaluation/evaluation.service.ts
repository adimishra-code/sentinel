/**
 * Evaluation Service
 * Runs detection benchmarks against the worker and persists results.
 */

import axios from 'axios';
import { EvaluationRun, IEvaluationRun } from './evaluation.model';
import { AppError } from '../../middleware/errorHandler';
import config from '../../config';
import logger from '../../utils/logger';

export interface RunBenchmarkInput {
  organizationId: string;
  userId: string;
  threshold?: number;
  useLLM?: boolean;
}

export interface BenchmarkReport {
  dataset: string;
  totalCases: number;
  threshold: number;
  path: string;
  flagged: Record<string, unknown>;
  categories: Array<Record<string, unknown>>;
  decisionAccuracy: Record<string, unknown>;
  latencyMs: Record<string, unknown>;
  costPer1kItems: number;
  timestamp: string;
  llm?: Record<string, unknown>;
  thresholdTuning?: Array<Record<string, unknown>>;
  mongoRecorded?: boolean;
}

export const runBenchmark = async (
  input: RunBenchmarkInput
): Promise<{ report: BenchmarkReport; run: IEvaluationRun }> => {
  const { organizationId, userId, threshold = 0.5, useLLM = false } = input;

  const workerUrl = config.worker.url;
  let report: BenchmarkReport;

  try {
    const response = await axios.post(
      `${workerUrl}/evaluation/benchmark`,
      { threshold, useLLM },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Shared-Secret': config.worker.sharedSecret,
        },
        timeout: 60000,
      }
    );
    report = response.data as BenchmarkReport;
  } catch (error: any) {
    logger.error('Worker benchmark failed', { error: error.message });
    throw AppError.serviceUnavailable(
      `Worker benchmark unavailable: ${error.message || 'Unknown error'}`
    );
  }

  const run = await EvaluationRun.create({
    organizationId,
    userId,
    dataset: report.dataset,
    totalCases: report.totalCases,
    threshold: report.threshold,
    path: report.path,
    report: report as unknown as Record<string, unknown>,
  });

  logger.info('Benchmark run recorded', {
    runId: run._id,
    organizationId,
    userId,
    totalCases: report.totalCases,
  });

  return { report, run };
};

export const listRuns = async (
  organizationId: string,
  options: { page?: number; limit?: number } = {}
) => {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    EvaluationRun.find({ organizationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EvaluationRun.countDocuments({ organizationId }),
  ]);

  return {
    items: items.map((item) => ({
      id: item._id.toString(),
      dataset: item.dataset,
      totalCases: item.totalCases,
      threshold: item.threshold,
      path: item.path,
      createdAt: item.createdAt,
      report: item.report,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getRun = async (
  organizationId: string,
  runId: string
) => {
  const run = await EvaluationRun.findOne({ _id: runId, organizationId }).lean();
  if (!run) {
    throw AppError.notFound('Evaluation run not found');
  }
  return {
    id: run._id.toString(),
    dataset: run.dataset,
    totalCases: run.totalCases,
    threshold: run.threshold,
    path: run.path,
    createdAt: run.createdAt,
    report: run.report,
  };
};
