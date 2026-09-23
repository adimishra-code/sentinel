import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody, validateParams } from '../../middleware/validate';
import { CreatePolicySchema, IdParamSchema } from '../../types/schemas';
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
router.post('/', validateBody(CreatePolicySchema), handleCreatePolicy);
router.get('/:id', validateParams(IdParamSchema), handleGetPolicy);
router.patch('/:id', validateParams(IdParamSchema), handleUpdatePolicy);
router.post('/:id/activate', validateParams(IdParamSchema), handleActivatePolicy);
router.post('/:id/archive', validateParams(IdParamSchema), handleArchivePolicy);
router.get('/:id/versions', validateParams(IdParamSchema), handleGetPolicyVersions);

export default router;
