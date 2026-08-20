import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import * as organizationsService from './organizations.service';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
} from '../../types/schemas';
import { z } from 'zod';
import { UserRole } from '../../types';

/**
 * Get organization details
 * GET /api/v1/organizations/:id
 */
export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const organization = await organizationsService.getOrganization(id, req.userId!);

  res.status(200).json({
    success: true,
    data: organization,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Update organization
 * PATCH /api/v1/organizations/:id
 */
export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = UpdateOrganizationSchema.parse(req.body);

  const organization = await organizationsService.updateOrganization(
    id,
    req.userId!,
    input
  );

  res.status(200).json({
    success: true,
    data: organization,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * List organization members
 * GET /api/v1/organizations/:id/members
 */
export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const members = await organizationsService.listMembers(id, req.userId!);

  res.status(200).json({
    success: true,
    data: members,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
      total: members.length,
    },
  });
});

const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  permissions: z.array(z.string()).optional(),
});

/**
 * Invite member to organization
 * POST /api/v1/organizations/:id/members/invite
 */
export const inviteMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = InviteMemberSchema.parse(req.body);

  const result = await organizationsService.inviteMember(id, req.userId!, input);

  res.status(201).json({
    success: true,
    data: result,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Remove member from organization
 * DELETE /api/v1/organizations/:id/members/:userId
 */
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { id, userId } = req.params;

  const result = await organizationsService.removeMember(id, userId, req.userId!);

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

const UpdateMemberSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  permissions: z.array(z.string()).optional(),
});

/**
 * Update member role/permissions
 * PATCH /api/v1/organizations/:id/members/:userId
 */
export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const { id, userId } = req.params;
  const { role, permissions } = UpdateMemberSchema.parse(req.body);

  const result = await organizationsService.updateMember(
    id,
    userId,
    req.userId!,
    role,
    permissions
  );

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * List user's organizations
 * GET /api/v1/organizations
 */
export const listUserOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const organizations = await organizationsService.listUserOrganizations(req.userId!);

  res.status(200).json({
    success: true,
    data: organizations,
    meta: {
      requestId: (req as any).requestId,
      timestamp: new Date().toISOString(),
      total: organizations.length,
    },
  });
});
