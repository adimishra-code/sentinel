import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import * as moderationController from './moderation.controller';
import { PERMISSIONS } from '../../types';

const router = Router();

// Moderate endpoint - requires authentication
router.post('/moderate', authenticate, moderationController.moderateContent);

// Content routes - require authentication
router.get('/content', authenticate, requirePermission(PERMISSIONS.CONTENT_READ), moderationController.listContent);
router.get('/content/:id', authenticate, requirePermission(PERMISSIONS.CONTENT_READ), moderationController.getContent);

export default router;
