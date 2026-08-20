import mongoose from 'mongoose';
import { Organization } from './organization.model';
import { OrganizationMember } from './organization-member.model';
import { User } from '../auth/user.model';
import { AppError } from '../../middleware/errorHandler';
import { generateSlug, generateInviteToken } from '../auth/auth.utils';
import { UserRole } from '../../types';
import logger from '../../utils/logger';

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateOrganizationInput {
  name?: string;
  settings?: Record<string, unknown>;
}

export interface InviteMemberInput {
  email: string;
  role: UserRole;
  permissions?: string[];
}

/**
 * Get organization by ID
 */
export const getOrganization = async (organizationId: string, userId: string) => {
  // Verify user is a member
  const membership = await OrganizationMember.findOne({
    organizationId,
    userId,
  });

  if (!membership) {
    throw AppError.forbidden('Not a member of this organization');
  }

  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw AppError.notFound('Organization not found');
  }

  // Get member count
  const memberCount = await OrganizationMember.countDocuments({ organizationId });

  return {
    id: organization._id.toString(),
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    settings: organization.settings,
    memberCount,
    userRole: membership.role,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
};

/**
 * Update organization
 */
export const updateOrganization = async (
  organizationId: string,
  userId: string,
  input: UpdateOrganizationInput
) => {
  // Verify user is a member with update permissions checked by middleware
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw AppError.notFound('Organization not found');
  }

  if (input.name) {
    organization.name = input.name;
  }

  if (input.settings) {
    organization.settings = { ...organization.settings, ...input.settings };
  }

  await organization.save();

  logger.info('Organization updated', {
    organizationId,
    userId,
  });

  return {
    id: organization._id.toString(),
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    settings: organization.settings,
    updatedAt: organization.updatedAt,
  };
};

/**
 * List organization members
 */
export const listMembers = async (organizationId: string, userId: string) => {
  // Verify user is a member
  const membership = await OrganizationMember.findOne({
    organizationId,
    userId,
  });

  if (!membership) {
    throw AppError.forbidden('Not a member of this organization');
  }

  const members = await OrganizationMember.find({ organizationId })
    .populate('userId', 'name email status lastLoginAt')
    .sort({ createdAt: 1 });

  return members.map((m: any) => ({
    id: m._id.toString(),
    user: {
      id: m.userId._id.toString(),
      name: m.userId.name,
      email: m.userId.email,
      status: m.userId.status,
      lastLoginAt: m.userId.lastLoginAt,
    },
    role: m.role,
    permissions: m.permissions,
    joinedAt: m.createdAt,
  }));
};

/**
 * Invite member to organization
 * Returns invite token (to be sent via email in Phase 5)
 */
export const inviteMember = async (
  organizationId: string,
  inviterId: string,
  input: InviteMemberInput
) => {
  const { email, role, permissions = [] } = input;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    // Check if already a member
    const existingMembership = await OrganizationMember.findOne({
      organizationId,
      userId: existingUser._id,
    });

    if (existingMembership) {
      throw AppError.conflict('User is already a member of this organization');
    }
  }

  // Generate invite token (in Phase 5, this will be sent via email)
  const inviteToken = generateInviteToken();

  // TODO Phase 5: Store invitation in database with expiration
  // TODO Phase 5: Send invitation email

  logger.info('Member invited', {
    organizationId,
    inviterId,
    email,
    role,
  });

  return {
    inviteToken,
    email,
    role,
    permissions,
    message: 'Invitation created. In Phase 5, this will be sent via email.',
  };
};

/**
 * Accept invitation (simplified for Phase 1)
 * In Phase 5, this will verify the token and create membership
 */
export const acceptInvitation = async (token: string, userId: string) => {
  // TODO Phase 5: Verify invitation token, check expiration
  // TODO Phase 5: Create OrganizationMember record
  // TODO Phase 5: Delete invitation record

  throw AppError.notFound('Invitation system will be implemented in Phase 5');
};

/**
 * Remove member from organization
 */
export const removeMember = async (
  organizationId: string,
  memberUserId: string,
  removerId: string
) => {
  // Cannot remove yourself
  if (memberUserId === removerId) {
    throw AppError.badRequest('Cannot remove yourself from organization');
  }

  const membership = await OrganizationMember.findOne({
    organizationId,
    userId: memberUserId,
  });

  if (!membership) {
    throw AppError.notFound('Member not found');
  }

  // Check if this is the last admin
  if (membership.role === UserRole.ORG_ADMIN || membership.role === UserRole.PLATFORM_ADMIN) {
    const adminCount = await OrganizationMember.countDocuments({
      organizationId,
      role: { $in: [UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN] },
    });

    if (adminCount <= 1) {
      throw AppError.badRequest('Cannot remove the last admin from organization');
    }
  }

  await membership.deleteOne();

  logger.info('Member removed from organization', {
    organizationId,
    memberUserId,
    removerId,
  });

  return {
    message: 'Member removed successfully',
  };
};

/**
 * Update member role and permissions
 */
export const updateMember = async (
  organizationId: string,
  memberUserId: string,
  updaterId: string,
  role?: UserRole,
  permissions?: string[]
) => {
  // Cannot update yourself
  if (memberUserId === updaterId) {
    throw AppError.badRequest('Cannot update your own role or permissions');
  }

  const membership = await OrganizationMember.findOne({
    organizationId,
    userId: memberUserId,
  });

  if (!membership) {
    throw AppError.notFound('Member not found');
  }

  // If changing role, check if this is the last admin
  if (
    role &&
    role !== membership.role &&
    (membership.role === UserRole.ORG_ADMIN || membership.role === UserRole.PLATFORM_ADMIN)
  ) {
    const adminCount = await OrganizationMember.countDocuments({
      organizationId,
      role: { $in: [UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN] },
    });

    if (adminCount <= 1) {
      throw AppError.badRequest('Cannot change role of the last admin');
    }
  }

  if (role) {
    membership.role = role;
  }

  if (permissions !== undefined) {
    membership.permissions = permissions;
  }

  await membership.save();

  logger.info('Member updated', {
    organizationId,
    memberUserId,
    updaterId,
    newRole: role,
  });

  return {
    id: membership._id.toString(),
    userId: membership.userId.toString(),
    role: membership.role,
    permissions: membership.permissions,
    updatedAt: membership.updatedAt,
  };
};

/**
 * List user's organizations
 */
export const listUserOrganizations = async (userId: string) => {
  const memberships = await OrganizationMember.find({ userId })
    .populate('organizationId')
    .sort({ createdAt: 1 });

  return memberships.map((m: any) => ({
    id: m.organizationId._id.toString(),
    name: m.organizationId.name,
    slug: m.organizationId.slug,
    status: m.organizationId.status,
    role: m.role,
    permissions: m.permissions,
    joinedAt: m.createdAt,
  }));
};
