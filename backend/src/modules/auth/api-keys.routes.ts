import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { validateBody, validateParams } from '../../middleware/validate';
import { CreateApiKeySchema, IdParamSchema } from '../../types/schemas';
import * as apiKeysController from './api-keys.controller';
import { PERMISSIONS } from '../../types';

const router = Router();

// All routes require authentication and organization context
router.use(authenticate);

// Create API key
router.post(
  '/',
  validateBody(CreateApiKeySchema),
  requirePermission(PERMISSIONS.API_KEY_CREATE),
  apiKeysController.createApiKey
);

// List API keys
router.get(
  '/',
  requirePermission(PERMISSIONS.API_KEY_READ),
  apiKeysController.listApiKeys
);

// Revoke API key
router.delete(
  '/:id',
  validateParams(IdParamSchema),
  requirePermission(PERMISSIONS.API_KEY_REVOKE),
  apiKeysController.revokeApiKey
);

export default router;
