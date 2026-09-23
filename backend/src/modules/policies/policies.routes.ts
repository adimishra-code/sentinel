import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
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
router.post('/', handleCreatePolicy);
router.get('/:id', handleGetPolicy);
router.patch('/:id', handleUpdatePolicy);
router.post('/:id/activate', handleActivatePolicy);
router.post('/:id/archive', handleArchivePolicy);
router.get('/:id/versions', handleGetPolicyVersions);

export default router;
