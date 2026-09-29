/**
 * Policies Controller
 */

import { Request, Response, NextFunction } from 'express';
import {
  createPolicy,
  getPolicy,
  listPolicies,
  updatePolicy,
  activatePolicy,
  archivePolicy,
  getPolicyVersions,
} from './policies.service';
import { PolicyStatus } from '../../types';
import { logAudit } from '../../utils/audit';

export const handleCreatePolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const policy = await createPolicy(organizationId!, req.body);
    await logAudit(req, 'policy.created', 'policy', (policy as any)._id?.toString() || (policy as any).id, undefined, { name: req.body.name });
    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
};

export const handleListPolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const { status, page, limit } = req.query;
    const result = await listPolicies(organizationId!, {
      status: status as PolicyStatus,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const handleGetPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const policy = await getPolicy(req.params.id, organizationId!);
    res.json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
};

export const handleUpdatePolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const policy = await updatePolicy(req.params.id, organizationId!, req.body);
    await logAudit(req, 'policy.updated', 'policy', req.params.id, req.body);
    res.json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
};

export const handleActivatePolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const policy = await activatePolicy(req.params.id, organizationId!);
    await logAudit(req, 'policy.activated', 'policy', req.params.id);
    res.json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
};

export const handleArchivePolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const policy = await archivePolicy(req.params.id, organizationId!);
    await logAudit(req, 'policy.archived', 'policy', req.params.id);
    res.json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
};

export const handleGetPolicyVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req;
    const versions = await getPolicyVersions(req.params.id, organizationId!);
    res.json({ success: true, data: versions });
  } catch (err) {
    next(err);
  }
};
