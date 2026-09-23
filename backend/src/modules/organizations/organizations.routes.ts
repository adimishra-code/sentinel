import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { validateBody, validateParams } from '../../middleware/validate';
import {
  UpdateOrganizationSchema,
  InviteMemberSchema,
  UpdateMemberSchema,
  IdParamSchema,
} from '../../types/schemas';
import * as organizationsController from './organizations.controller';
import { PERMISSIONS } from '../../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List user's organizations
router.get('/', organizationsController.listUserOrganizations);

// Get organization details
router.get('/:id', validateParams(IdParamSchema), organizationsController.getOrganization);

// Update organization
router.patch(
  '/:id',
  validateParams(IdParamSchema),
  validateBody(UpdateOrganizationSchema),
  requirePermission(PERMISSIONS.ORG_WRITE),
  organizationsController.updateOrganization
);

// List organization members
router.get('/:id/members', validateParams(IdParamSchema), organizationsController.listMembers);

// Invite member
router.post(
  '/:id/members/invite',
  validateParams(IdParamSchema),
  validateBody(InviteMemberSchema),
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
  validateBody(UpdateMemberSchema),
  requirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS),
  organizationsController.updateMember
);

export default router;
