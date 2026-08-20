import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import * as organizationsController from './organizations.controller';
import { PERMISSIONS } from '../../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List user's organizations
router.get('/', organizationsController.listUserOrganizations);

// Get organization details
router.get('/:id', organizationsController.getOrganization);

// Update organization
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.ORG_WRITE),
  organizationsController.updateOrganization
);

// List organization members
router.get('/:id/members', organizationsController.listMembers);

// Invite member
router.post(
  '/:id/members/invite',
  requirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS),
  organizationsController.inviteMember
);

// Remove member
router.delete(
  '/:id/members/:userId',
  requirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS),
  organizationsController.removeMember
);

// Update member
router.patch(
  '/:id/members/:userId',
  requirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS),
  organizationsController.updateMember
);

export default router;
