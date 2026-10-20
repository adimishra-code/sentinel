import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { validateBody, validateParams } from '../../middleware/validate';
import { CreatePolicySchema, IdParamSchema } from '../../types/schemas';
import { PERMISSIONS } from '../../types';
import {
  handleCreatePolicy,
  handleListPolicies,
  handleGetPolicy,
  handleUpdatePolicy,
  handleActivatePolicy,
  handleArchivePolicy,
  handleGetPolicyVersions,
} from './policies.controller';

const router = Router();

router.use(authenticate);

router.get('/', handleListPolicies);
router.post('/', validateBody(CreatePolicySchema), requirePermission(PERMISSIONS.POLICY_WRITE), handleCreatePolicy);
router.get('/:id', validateParams(IdParamSchema), handleGetPolicy);
router.patch('/:id', validateParams(IdParamSchema), requirePermission(PERMISSIONS.POLICY_WRITE), handleUpdatePolicy);
router.post('/:id/activate', validateParams(IdParamSchema), requirePermission(PERMISSIONS.POLICY_ACTIVATE), handleActivatePolicy);
router.post('/:id/archive', validateParams(IdParamSchema), requirePermission(PERMISSIONS.POLICY_ACTIVATE), handleArchivePolicy);
router.get('/:id/versions', validateParams(IdParamSchema), handleGetPolicyVersions);

export default router;
