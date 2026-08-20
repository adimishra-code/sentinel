import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import * as analyticsController from './analytics.controller';
import { PERMISSIONS } from '../../types';

const router = Router();

// All routes require authentication + analytics:read permission
router.use(authenticate);
router.use(requirePermission(PERMISSIONS.ANALYTICS_READ));

// Dashboard overview
router.get('/overview', analyticsController.getDashboardOverview);

// Content analytics
router.get('/content', analyticsController.getContentAnalytics);

// Case analytics
router.get('/cases', analyticsController.getCaseAnalytics);

// Decision analytics
router.get('/decisions', analyticsController.getDecisionAnalytics);

// Appeal analytics
router.get('/appeals', analyticsController.getAppealAnalytics);

// Category distribution
router.get('/categories', analyticsController.getCategoryDistribution);

export default router;
