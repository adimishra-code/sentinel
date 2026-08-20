import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import * as appealsController from './appeals.controller';
import { PERMISSIONS } from '../../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create appeal (any authenticated user)
router.post('/', appealsController.createAppeal);

// List appeals
router.get('/', requirePermission(PERMISSIONS.APPEAL_READ), appealsController.listAppeals);

// Get appeal details
router.get('/:id', requirePermission(PERMISSIONS.APPEAL_READ), appealsController.getAppeal);

// Resolve appeal (reviewers only)
router.post('/:id/resolve', requirePermission(PERMISSIONS.APPEAL_RESOLVE), appealsController.resolveAppeal);

export default router;
