/**
 * Cases Service
 * Manages moderation cases lifecycle
 */

import { Case } from './case.model';
import { Content } from '../content/content.model';
import { ModerationDecision } from './moderation-decision.model';
import { AppError } from '../../middleware/errorHandler';
import { CaseStatus, CasePriority, ModerationAction } from '../../types';
import logger from '../../utils/logger';
import { emitCaseEvent } from '../../utils/socket';

export interface CreateCaseInput {
  contentId: string;
  organizationId: string;
  riskScore: number;
  severity?: number;
  categories: string[];
  priority: CasePriority;
  aiAnalysis?: any;
}

/**
 * Create case from high-risk content
 */
export const createCase = async (input: CreateCaseInput) => {
  const caseDoc = await Case.create({
    organizationId: input.organizationId,
    contentId: input.contentId,
    status: CaseStatus.PENDING,
    priority: input.priority,
    severity: input.severity,
    riskScore: input.riskScore,
    categories: input.categories,
    aiAnalysis: input.aiAnalysis,
  });

  logger.info('Case created', {
    caseId: caseDoc._id,
    organizationId: input.organizationId,
    priority: input.priority,
  });

  // Emit realtime event
  emitCaseEvent(input.organizationId, 'case:created', {
    caseId: caseDoc._id.toString(),
    priority: input.priority,
    categories: input.categories,
  });

  return caseDoc;
};

/**
 * Get case by ID
 */
export const getCase = async (caseId: string, organizationId: string) => {
  const caseDoc = await Case.findOne({ _id: caseId, organizationId })
    .populate('contentId')
    .populate('assignedTo', 'name email')
    .populate('resolvedBy', 'name email');

  if (!caseDoc) {
    throw AppError.notFound('Case not found');
  }

  const content = caseDoc.contentId as any;

  return {
    id: caseDoc._id.toString(),
    status: caseDoc.status,
    priority: caseDoc.priority,
    riskScore: caseDoc.riskScore,
    severity: caseDoc.severity,
    categories: caseDoc.categories,
    content: content ? {
      id: content._id.toString(),
      text: content.text,
      contentType: content.contentType,
      authorId: content.authorId,
      language: content.language,
    } : null,
    assignedTo: caseDoc.assignedTo ? {
      id: (caseDoc.assignedTo as any)._id.toString(),
      name: (caseDoc.assignedTo as any).name,
      email: (caseDoc.assignedTo as any).email,
    } : null,
    aiAnalysis: caseDoc.aiAnalysis,
    createdAt: caseDoc.createdAt,
    assignedAt: caseDoc.assignedAt,
    resolvedAt: caseDoc.resolvedAt,
  };
};

/**
 * List cases (moderator queue)
 */
export const listCases = async (
  organizationId: string,
  options: {
    status?: CaseStatus;
    priority?: CasePriority;
    assignedTo?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const skip = (page - 1) * limit;

  const filter: any = { organizationId };
  if (options.status) filter.status = options.status;
  if (options.priority) filter.priority = options.priority;
  if (options.assignedTo) filter.assignedTo = options.assignedTo;

  const [items, total] = await Promise.all([
    Case.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('contentId', 'text contentType authorId')
      .populate('assignedTo', 'name email')
      .lean(),
    Case.countDocuments(filter),
  ]);

  return {
    items: items.map(item => ({
      id: item._id.toString(),
      status: item.status,
      priority: item.priority,
      riskScore: item.riskScore,
      categories: item.categories,
      content: item.contentId ? {
        text: (item.contentId as any).text?.substring(0, 200),
        authorId: (item.contentId as any).authorId,
      } : null,
      assignedTo: item.assignedTo ? {
        name: (item.assignedTo as any).name,
      } : null,
      createdAt: item.createdAt,
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
 * Assign case to moderator
 */
export const assignCase = async (
  caseId: string,
  moderatorId: string,
  organizationId: string
) => {
  const caseDoc = await Case.findOne({ _id: caseId, organizationId });

  if (!caseDoc) {
    throw AppError.notFound('Case not found');
  }

  caseDoc.assignedTo = moderatorId as any;
  caseDoc.assignedAt = new Date();
  caseDoc.status = CaseStatus.IN_REVIEW;
  await caseDoc.save();

  logger.info('Case assigned', {
    caseId,
    moderatorId,
  });

  emitCaseEvent(organizationId, 'case:assigned', {
    caseId,
    moderatorId,
  });

  return caseDoc;
};

/**
 * Resolve case with decision
 */
export const resolveCase = async (
  caseId: string,
  moderatorId: string,
  organizationId: string,
  decision: {
    action: ModerationAction;
    rationale: string;
    policyVersionId?: string;
  }
) => {
  const caseDoc = await Case.findOne({ _id: caseId, organizationId });

  if (!caseDoc) {
    throw AppError.notFound('Case not found');
  }

  // Create moderation decision record
  await ModerationDecision.create({
    organizationId,
    caseId,
    moderatorId,
    action: decision.action,
    rationale: decision.rationale,
    policyVersionId: decision.policyVersionId,
    aiRecommendation: caseDoc.aiAnalysis?.recommendedAction,
  });

  // Update case
  caseDoc.status = CaseStatus.RESOLVED;
  caseDoc.resolvedBy = moderatorId as any;
  caseDoc.resolvedAt = new Date();
  await caseDoc.save();

  logger.info('Case resolved', {
    caseId,
    moderatorId,
    action: decision.action,
  });

  emitCaseEvent(organizationId, 'case:resolved', {
    caseId,
    action: decision.action,
  });

  return caseDoc;
};
