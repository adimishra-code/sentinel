/**
 * Shared Zod Schemas for Sentinel
 * Request/response validation across services
 */

import { z } from 'zod';
import { VALIDATION_LIMITS } from './constants';

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(VALIDATION_LIMITS.USER_NAME_MAX_LENGTH),
  organizationName: z.string().min(1, 'Organization name is required').max(VALIDATION_LIMITS.ORGANIZATION_NAME_MAX_LENGTH),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================================================
// ORGANIZATION SCHEMAS
// ============================================================================

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(VALIDATION_LIMITS.ORGANIZATION_NAME_MAX_LENGTH),
  slug: z.string()
    .min(3)
    .max(VALIDATION_LIMITS.ORGANIZATION_SLUG_MAX_LENGTH)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  settings: z.record(z.unknown()).optional(),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(VALIDATION_LIMITS.ORGANIZATION_NAME_MAX_LENGTH).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['platform_admin', 'org_admin', 'moderator', 'reviewer', 'end_user']),
  permissions: z.array(z.string()).optional(),
});

export const UpdateMemberSchema = z.object({
  role: z.enum(['platform_admin', 'org_admin', 'moderator', 'reviewer', 'end_user']).optional(),
  permissions: z.array(z.string()).optional(),
});

// ============================================================================
// CONTENT & MODERATION SCHEMAS
// ============================================================================

export const ModerateContentSchema = z.object({
  contentType: z.enum(['text', 'image', 'url', 'mixed']),
  text: z.string().max(VALIDATION_LIMITS.CONTENT_TEXT_MAX_LENGTH).optional(),
  imageUrls: z.array(z.string().url()).max(VALIDATION_LIMITS.CONTENT_IMAGES_MAX_COUNT).optional(),
  urls: z.array(z.string().url()).max(VALIDATION_LIMITS.CONTENT_URLS_MAX_COUNT).optional(),
  authorId: z.string().optional(),
  targetId: z.string().optional(),
  conversationId: z.string().optional(),
  sourcePlatform: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => {
    if (data.contentType === 'text') return !!data.text;
    if (data.contentType === 'image') return !!data.imageUrls?.length;
    if (data.contentType === 'url') return !!data.urls?.length;
    return true;
  },
  { message: 'Content must match the specified contentType' }
);

// ============================================================================
// CASE SCHEMAS
// ============================================================================

export const ListCasesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
  status: z.enum(['pending', 'in_review', 'resolved', 'escalated', 'dismissed']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assignedTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'riskScore', 'priority', 'severity']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const AssignCaseSchema = z.object({
  moderatorId: z.string().min(1, 'Moderator ID is required'),
});

export const ResolveCaseSchema = z.object({
  action: z.enum(['allow', 'allow_and_monitor', 'warn', 'limit', 'remove', 'escalate', 'suspend']),
  rationale: z.string().min(10, 'Rationale must be at least 10 characters').max(VALIDATION_LIMITS.DECISION_RATIONALE_MAX_LENGTH),
  evidence: z.record(z.unknown()).optional(),
});

// ============================================================================
// POLICY SCHEMAS
// ============================================================================

export const CreatePolicySchema = z.object({
  name: z.string().min(1).max(VALIDATION_LIMITS.POLICY_NAME_MAX_LENGTH),
  description: z.string().max(1000).optional(),
  categories: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    severityThreshold: z.number().min(0).max(1),
    firstOffenseAction: z.enum(['allow', 'allow_and_monitor', 'warn', 'limit', 'remove', 'review', 'escalate', 'suspend']),
    repeatOffenseAction: z.enum(['allow', 'allow_and_monitor', 'warn', 'limit', 'remove', 'review', 'escalate', 'suspend']),
    requiresHumanReview: z.boolean(),
  })),
  rules: z.record(z.unknown()).optional(),
});

// ============================================================================
// APPEAL SCHEMAS
// ============================================================================

export const CreateAppealSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
  reason: z.string().min(20, 'Reason must be at least 20 characters').max(VALIDATION_LIMITS.APPEAL_REASON_MAX_LENGTH),
});

export const ResolveAppealSchema = z.object({
  status: z.enum(['upheld', 'reversed', 'modified']),
  outcomeRationale: z.string().min(10).max(VALIDATION_LIMITS.DECISION_RATIONALE_MAX_LENGTH),
});

// ============================================================================
// API KEY SCHEMAS
// ============================================================================

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

// ============================================================================
// PAGINATION SCHEMA
// ============================================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// WEBHOOK SCHEMAS
// ============================================================================

export const CreateWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  url: z.string().url('Must be a valid URL'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
});

// ============================================================================
// AUDIT SCHEMAS
// ============================================================================

export const ListAuditLogsSchema = z.object({
  action: z.string().optional(),
  actorId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================================
// ID PARAM SCHEMA
// ============================================================================

export const IdParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});
