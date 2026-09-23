import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { rateLimitByOrg } from '../../middleware/rateLimitByOrg';
import { validateBody, validateParams } from '../../middleware/validate';
import { ModerateContentSchema, IdParamSchema } from '../../types/schemas';
import * as moderationController from './moderation.controller';
import { PERMISSIONS } from '../../types';

const router = Router();

// Moderate endpoint - requires authentication + per-org rate limiting + input validation
router.post(
  '/moderate',
  authenticate,
  rateLimitByOrg(),
  validateBody(ModerateContentSchema),
  moderationController.moderateContent
);

// Job status polling for async moderation
router.get(
  '/moderate/jobs/:jobId',
  authenticate,
  moderationController.getJobStatus
);

// Content routes - require authentication
router.get(
  '/content',
  authenticate,
  requirePermission(PERMISSIONS.CONTENT_READ),
  moderationController.listContent
);

router.get(
  '/content/:id',
  authenticate,
  validateParams(IdParamSchema),
  requirePermission(PERMISSIONS.CONTENT_READ),
  moderationController.getContent
);

export default router;
