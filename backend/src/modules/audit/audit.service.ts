/**
 * Audit Service
 * Immutable append-only audit logging
 */

import { AuditLog } from './audit-log.model';
import logger from '../../utils/logger';

export interface CreateAuditLogInput {
  organizationId: string;
  action: string;
  actorId: string;
  actorType: 'user' | 'system' | 'api_key';
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create audit log entry (append-only)
 */
export const createAuditLog = async (input: CreateAuditLogInput): Promise<void> => {
  try {
    await AuditLog.create(input);

    logger.debug('Audit log created', {
      organizationId: input.organizationId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  } catch (error) {
    // Log error but don't fail the request
    logger.error('Failed to create audit log', { error, input });
  }
};

/**
 * List audit logs (for admin review)
 */
export const listAuditLogs = async (
  organizationId: string,
  options: {
    action?: string;
    actorId?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}
) => {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 50, 100);
  const skip = (page - 1) * limit;

  const filter: any = { organizationId };
  if (options.action) filter.action = options.action;
  if (options.actorId) filter.actorId = options.actorId;
  if (options.entityType) filter.entityType = options.entityType;
  if (options.entityId) filter.entityId = options.entityId;
  if (options.startDate || options.endDate) {
    filter.createdAt = {};
    if (options.startDate) filter.createdAt.$gte = options.startDate;
    if (options.endDate) filter.createdAt.$lte = options.endDate;
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    items: items.map(item => ({
      id: item._id.toString(),
      action: item.action,
      actorId: item.actorId,
      actorType: item.actorType,
      entityType: item.entityType,
      entityId: item.entityId,
      changes: item.changes,
      metadata: item.metadata,
      ipAddress: item.ipAddress,
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
 * Get audit trail for specific entity
 */
export const getEntityAuditTrail = async (
  organizationId: string,
  entityType: string,
  entityId: string
) => {
  const logs = await AuditLog.find({
    organizationId,
    entityType,
    entityId,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return logs.map(log => ({
    id: log._id.toString(),
    action: log.action,
    actorId: log.actorId,
    actorType: log.actorType,
    changes: log.changes,
    metadata: log.metadata,
    createdAt: log.createdAt,
  }));
};
