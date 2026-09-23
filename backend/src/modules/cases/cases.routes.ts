import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate';
import {
  ListCasesSchema,
  AssignCaseSchema,
  ResolveCaseSchema,
  IdParamSchema,
} from '../../types/schemas';
import * as casesController from './cases.controller';
import { PERMISSIONS } from '../../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List cases (moderator queue)
router.get(
  '/',
  requirePermission(PERMISSIONS.CASE_READ),
  validateQuery(ListCasesSchema),
  casesController.listCases
);

// Get case details
router.get(
  '/:id',
  requirePermission(PERMISSIONS.CASE_READ),
  validateParams(IdParamSchema),
  casesController.getCase
);

// Assign case
router.post(
  '/:id/assign',
  requirePermission(PERMISSIONS.CASE_ASSIGN),
  validateParams(IdParamSchema),
  validateBody(AssignCaseSchema),
  casesController.assignCase
);

// Resolve case
router.post(
  '/:id/resolve',
  requirePermission(PERMISSIONS.CASE_RESOLVE),
  validateParams(IdParamSchema),
  validateBody(ResolveCaseSchema),
  casesController.resolveCase
);

export default router;
