/**
 * Shared Type Definitions for Sentinel
 * Used across backend, frontend, and worker services
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin',
  ORG_ADMIN = 'org_admin',
  MODERATOR = 'moderator',
  REVIEWER = 'reviewer',
  END_USER = 'end_user',
}

export enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum OrganizationPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  URL = 'url',
  MIXED = 'mixed',
}

export enum CaseStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  DISMISSED = 'dismissed',
}

export enum CasePriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum ModerationAction {
  ALLOW = 'allow',
  ALLOW_AND_MONITOR = 'allow_and_monitor',
  WARN = 'warn',
  LIMIT = 'limit',
  REMOVE = 'remove',
  REVIEW = 'review',
  ESCALATE = 'escalate',
  SUSPEND = 'suspend',
}

export enum AppealStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  UPHELD = 'upheld',
  REVERSED = 'reversed',
  MODIFIED = 'modified',
}

export enum PolicyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

// ============================================================================
// BASE TYPES
// ============================================================================

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDelete {
  deletedAt?: Date;
  isDeleted: boolean;
}

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================

export interface User extends Timestamps {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: Date;
}

export interface Organization extends Timestamps {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  plan?: OrganizationPlan;
  rateLimitOverride?: number;
  settings?: Record<string, unknown>;
}

export interface OrganizationMember extends Timestamps {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  permissions: string[];
}

export interface ApiKey extends Timestamps {
  id: string;
  organizationId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  status: 'active' | 'revoked';
  expiresAt?: Date;
  lastUsedAt?: Date;
  permissions: string[];
}

// ============================================================================
// CONTENT & MODERATION
// ============================================================================

export interface Content extends Timestamps {
  id: string;
  organizationId: string;
  contentType: ContentType;
  text?: string;
  imageUrls?: string[];
  urls?: string[];
  metadata?: Record<string, unknown>;
  authorId?: string;
  targetId?: string;
  conversationId?: string;
  sourcePlatform?: string;
  language?: string;
}

export interface Case extends Timestamps {
  id: string;
  organizationId: string;
  contentId: string;
  status: CaseStatus;
  priority: CasePriority;
  severity?: number;
  riskScore: number;
  categories: string[];
  assignedTo?: string;
  assignedAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface ModerationDecision extends Timestamps {
  id: string;
  organizationId: string;
  caseId: string;
  moderatorId: string;
  action: ModerationAction;
  rationale: string;
  policyVersionId: string;
  confidence?: number;
  aiRecommendation?: ModerationAction;
  evidence?: Record<string, unknown>;
}

// ============================================================================
// POLICY
// ============================================================================

export interface Policy extends Timestamps {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  status: PolicyStatus;
  currentVersion: number;
}

export interface PolicyVersion extends Timestamps {
  id: string;
  policyId: string;
  organizationId: string;
  version: number;
  categories: PolicyCategory[];
  rules: Record<string, unknown>;
  effectiveFrom: Date;
  effectiveUntil?: Date;
}

export interface PolicyCategory {
  id: string;
  name: string;
  description?: string;
  severityThreshold: number;
  firstOffenseAction: ModerationAction;
  repeatOffenseAction: ModerationAction;
  requiresHumanReview: boolean;
}

// ============================================================================
// AI & DETECTION
// ============================================================================

export interface ModelRun extends Timestamps {
  id: string;
  organizationId: string;
  contentId: string;
  modelProvider: string;
  modelName: string;
  modelVersion?: string;
  classification: Classification;
  latencyMs: number;
  tokensUsed?: number;
}

export interface Classification {
  categories: CategoryScore[];
  overallSeverity: number;
  confidence: number;
  flags: string[];
  reasoning?: string;
  evidence?: string[];
  recommendedAction?: ModerationAction;
  requiresHumanReview: boolean;
}

export interface CategoryScore {
  category: string;
  score: number;
  confidence: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================================================
// APPEALS
// ============================================================================

export interface Appeal extends Timestamps {
  id: string;
  organizationId: string;
  caseId: string;
  userId: string;
  reason: string;
  status: AppealStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  outcome?: string;
  outcomeRationale?: string;
}

// ============================================================================
// AUDIT & ANALYTICS
// ============================================================================

export interface AuditLog extends Timestamps {
  id: string;
  organizationId: string;
  action: string;
  actorId: string;
  actorType: 'user' | 'system' | 'api_key';
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// API REQUESTS & RESPONSES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
