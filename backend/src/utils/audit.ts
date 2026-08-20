/**
 * Audit logging middleware helper
 * Use after successful operations to log actions
 */

import { Request } from 'express';
import { createAuditLog } from '../modules/audit/audit.service';

/**
 * Log action to audit trail
 * Call this after successful operations
 */
export const logAudit = async (
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  changes?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<void> => {
  if (!req.organizationId) return;

  const actorId = req.userId || req.apiKeyId || 'system';
  const actorType = req.userId ? 'user' : req.apiKeyId ? 'api_key' : 'system';

  await createAuditLog({
    organizationId: req.organizationId,
    action,
    actorId,
    actorType,
    entityType,
    entityId,
    changes,
    metadata,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
};
