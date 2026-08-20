import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import * as casesController from './cases.controller';
import { PERMISSIONS } from '../../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List cases (moderator queue)
router.get('/', requirePermission(PERMISSIONS.CASE_READ), casesController.listCases);

// Get case details
router.get('/:id', requirePermission(PERMISSIONS.CASE_READ), casesController.getCase);

// Assign case
router.post('/:id/assign', requirePermission(PERMISSIONS.CASE_ASSIGN), casesController.assignCase);

// Resolve case
router.post('/:id/resolve', requirePermission(PERMISSIONS.CASE_RESOLVE), casesController.resolveCase);

export default router;
