import { Request, Response, NextFunction } from 'express';
import { listAuditLogs, getEntityAuditTrail } from './audit.service';

export const handleListAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const { action, actorId, entityType, entityId, startDate, endDate, page, limit } = req.query;

    const result = await listAuditLogs(organizationId!, {
      action: action as string,
      actorId: actorId as string,
      entityType: entityType as string,
      entityId: entityId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const handleGetEntityAuditTrail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const { entityType, entityId } = req.params;

    const trail = await getEntityAuditTrail(organizationId!, entityType, entityId);
    res.json({ success: true, data: trail });
  } catch (err) {
    next(err);
  }
};
