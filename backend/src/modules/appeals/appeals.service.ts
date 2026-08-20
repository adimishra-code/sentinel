/**
 * Appeals Service
 * Handles user appeals for moderation decisions
 */

import { Appeal } from './appeal.model';
import { Case } from '../cases/case.model';
import { ModerationDecision } from '../cases/moderation-decision.model';
import { AppError } from '../../middleware/errorHandler';
import { AppealStatus } from '../../types';
import logger from '../../utils/logger';
import { emitCaseEvent } from '../../utils/socket';

/**
 * Create appeal for a case
 */
export const createAppeal = async (
  caseId: string,
  userId: string,
  organizationId: string,
  reason: string
) => {
  // Check if case exists and is resolved
  const caseDoc = await Case.findOne({ _id: caseId, organizationId });

  if (!caseDoc) {
    throw AppError.notFound('Case not found');
  }

  if (caseDoc.status !== 'resolved') {
    throw AppError.badRequest('Can only appeal resolved cases');
  }

  // Check if user already appealed this case
  const existingAppeal = await Appeal.findOne({ caseId, userId, organizationId });

  if (existingAppeal) {
    throw AppError.conflict('Appeal already submitted for this case');
  }

  // Create appeal
  const appeal = await Appeal.create({
    organizationId,
    caseId,
    userId,
    reason,
    status: AppealStatus.PENDING,
  });

  logger.info('Appeal created', {
    appealId: appeal._id,
    caseId,
    userId,
  });

  emitCaseEvent(organizationId, 'appeal:created', {
    appealId: appeal._id.toString(),
    caseId,
  });

  return appeal;
};

/**
 * List appeals
 */
export const listAppeals = async (
  organizationId: string,
  options: {
    status?: AppealStatus;
    userId?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const skip = (page - 1) * limit;

  const filter: any = { organizationId };
  if (options.status) filter.status = options.status;
  if (options.userId) filter.userId = options.userId;

  const [items, total] = await Promise.all([
    Appeal.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('caseId')
      .lean(),
    Appeal.countDocuments(filter),
  ]);

  return {
    items: items.map(item => ({
      id: item._id.toString(),
      status: item.status,
      reason: item.reason,
      user: item.userId ? {
        name: (item.userId as any).name,
        email: (item.userId as any).email,
      } : null,
      caseId: item.caseId ? (item.caseId as any)._id.toString() : null,
      createdAt: item.createdAt,
      reviewedAt: item.reviewedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get appeal details
 */
export const getAppeal = async (appealId: string, organizationId: string) => {
  const appeal = await Appeal.findOne({ _id: appealId, organizationId })
    .populate('userId', 'name email')
    .populate('caseId')
    .populate('reviewedBy', 'name email');

  if (!appeal) {
    throw AppError.notFound('Appeal not found');
  }

  // Get original decision
  const decision = await ModerationDecision.findOne({
    caseId: appeal.caseId,
    organizationId,
  });

  return {
    id: appeal._id.toString(),
    status: appeal.status,
    reason: appeal.reason,
    outcome: appeal.outcome,
    outcomeRationale: appeal.outcomeRationale,
    user: appeal.userId ? {
      id: (appeal.userId as any)._id.toString(),
      name: (appeal.userId as any).name,
      email: (appeal.userId as any).email,
    } : null,
    case: appeal.caseId ? {
      id: (appeal.caseId as any)._id.toString(),
      status: (appeal.caseId as any).status,
      categories: (appeal.caseId as any).categories,
    } : null,
    originalDecision: decision ? {
      action: decision.action,
      rationale: decision.rationale,
    } : null,
    reviewedBy: appeal.reviewedBy ? {
      name: (appeal.reviewedBy as any).name,
    } : null,
    createdAt: appeal.createdAt,
    reviewedAt: appeal.reviewedAt,
  };
};

/**
 * Resolve appeal
 */
export const resolveAppeal = async (
  appealId: string,
  reviewerId: string,
  organizationId: string,
  resolution: {
    status: 'upheld' | 'reversed' | 'modified';
    outcomeRationale: string;
  }
) => {
  const appeal = await Appeal.findOne({ _id: appealId, organizationId });

  if (!appeal) {
    throw AppError.notFound('Appeal not found');
  }

  if (appeal.status !== AppealStatus.PENDING && appeal.status !== AppealStatus.IN_REVIEW) {
    throw AppError.badRequest('Appeal already resolved');
  }

  appeal.status = resolution.status === 'upheld' ? AppealStatus.UPHELD :
                  resolution.status === 'reversed' ? AppealStatus.REVERSED :
                  AppealStatus.MODIFIED;
  appeal.outcome = resolution.status;
  appeal.outcomeRationale = resolution.outcomeRationale;
  appeal.reviewedBy = reviewerId as any;
  appeal.reviewedAt = new Date();

  await appeal.save();

  logger.info('Appeal resolved', {
    appealId,
    reviewerId,
    outcome: resolution.status,
  });

  emitCaseEvent(organizationId, 'appeal:resolved', {
    appealId,
    outcome: resolution.status,
  });

  return appeal;
};
