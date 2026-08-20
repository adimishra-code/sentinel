/**
 * Shared Constants for Sentinel Platform
 */

// ============================================================================
// PERMISSIONS
// ============================================================================

export const PERMISSIONS = {
  // Organization management
  ORG_READ: 'org:read',
  ORG_WRITE: 'org:write',
  ORG_DELETE: 'org:delete',
  ORG_MANAGE_MEMBERS: 'org:manage_members',
  ORG_MANAGE_SETTINGS: 'org:manage_settings',

  // User management
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  USER_MANAGE_ROLES: 'user:manage_roles',

  // Content & Moderation
  CONTENT_READ: 'content:read',
  CONTENT_SUBMIT: 'content:submit',
  CONTENT_DELETE: 'content:delete',

  CASE_READ: 'case:read',
  CASE_REVIEW: 'case:review',
  CASE_ASSIGN: 'case:assign',
  CASE_ESCALATE: 'case:escalate',
  CASE_RESOLVE: 'case:resolve',

  DECISION_READ: 'decision:read',
  DECISION_WRITE: 'decision:write',
  DECISION_OVERRIDE: 'decision:override',

  // Policy
  POLICY_READ: 'policy:read',
  POLICY_WRITE: 'policy:write',
  POLICY_ACTIVATE: 'policy:activate',
  POLICY_DELETE: 'policy:delete',

  // Appeals
  APPEAL_READ: 'appeal:read',
  APPEAL_SUBMIT: 'appeal:submit',
  APPEAL_REVIEW: 'appeal:review',
  APPEAL_RESOLVE: 'appeal:resolve',

  // Analytics & Audit
  ANALYTICS_READ: 'analytics:read',
  AUDIT_READ: 'audit:read',

  // API Keys & Integrations
  API_KEY_READ: 'api_key:read',
  API_KEY_CREATE: 'api_key:create',
  API_KEY_REVOKE: 'api_key:revoke',

  INTEGRATION_READ: 'integration:read',
  INTEGRATION_WRITE: 'integration:write',
  INTEGRATION_DELETE: 'integration:delete',

  // Evaluation & Testing
  EVALUATION_READ: 'evaluation:read',
  EVALUATION_RUN: 'evaluation:run',
} as const;

// ============================================================================
// ROLE PERMISSIONS MAPPING
// ============================================================================

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  platform_admin: Object.values(PERMISSIONS), // All permissions

  org_admin: [
    PERMISSIONS.ORG_READ,
    PERMISSIONS.ORG_WRITE,
    PERMISSIONS.ORG_MANAGE_MEMBERS,
    PERMISSIONS.ORG_MANAGE_SETTINGS,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_WRITE,
    PERMISSIONS.USER_MANAGE_ROLES,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.CASE_READ,
    PERMISSIONS.CASE_REVIEW,
    PERMISSIONS.CASE_ASSIGN,
    PERMISSIONS.CASE_ESCALATE,
    PERMISSIONS.CASE_RESOLVE,
    PERMISSIONS.DECISION_READ,
    PERMISSIONS.DECISION_WRITE,
    PERMISSIONS.DECISION_OVERRIDE,
    PERMISSIONS.POLICY_READ,
    PERMISSIONS.POLICY_WRITE,
    PERMISSIONS.POLICY_ACTIVATE,
    PERMISSIONS.APPEAL_READ,
    PERMISSIONS.APPEAL_REVIEW,
    PERMISSIONS.APPEAL_RESOLVE,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.API_KEY_READ,
    PERMISSIONS.API_KEY_CREATE,
    PERMISSIONS.API_KEY_REVOKE,
    PERMISSIONS.INTEGRATION_READ,
    PERMISSIONS.INTEGRATION_WRITE,
    PERMISSIONS.INTEGRATION_DELETE,
    PERMISSIONS.EVALUATION_READ,
    PERMISSIONS.EVALUATION_RUN,
  ],

  moderator: [
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CASE_READ,
    PERMISSIONS.CASE_REVIEW,
    PERMISSIONS.CASE_ESCALATE,
    PERMISSIONS.CASE_RESOLVE,
    PERMISSIONS.DECISION_READ,
    PERMISSIONS.DECISION_WRITE,
    PERMISSIONS.POLICY_READ,
    PERMISSIONS.APPEAL_READ,
    PERMISSIONS.ANALYTICS_READ,
  ],

  reviewer: [
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CASE_READ,
    PERMISSIONS.DECISION_READ,
    PERMISSIONS.POLICY_READ,
    PERMISSIONS.APPEAL_READ,
    PERMISSIONS.APPEAL_REVIEW,
    PERMISSIONS.APPEAL_RESOLVE,
    PERMISSIONS.ANALYTICS_READ,
  ],

  end_user: [
    PERMISSIONS.CONTENT_SUBMIT,
    PERMISSIONS.APPEAL_SUBMIT,
  ],
};

// ============================================================================
// MODERATION CATEGORIES (MVP)
// ============================================================================

export const MODERATION_CATEGORIES = {
  TOXICITY: 'toxicity',
  SEVERE_TOXICITY: 'severe_toxicity',
  HARASSMENT: 'harassment',
  BULLYING: 'bullying',
  HATE_SPEECH: 'hate_speech',
  IDENTITY_ATTACK: 'identity_attack',
  THREAT_DIRECT: 'threat_direct',
  THREAT_INDIRECT: 'threat_indirect',
  VIOLENT_INTENT: 'violent_intent',
  SEXUAL_HARASSMENT: 'sexual_harassment',
  SEXUAL_EXPLICIT: 'sexual_explicit',
  SELF_HARM: 'self_harm',
  SPAM: 'spam',
  SCAM: 'scam',
  PHISHING: 'phishing',
  IMPERSONATION: 'impersonation',
} as const;

// ============================================================================
// SEVERITY THRESHOLDS
// ============================================================================

export const SEVERITY_THRESHOLDS = {
  CRITICAL: 0.9,
  HIGH: 0.7,
  MEDIUM: 0.5,
  LOW: 0.3,
} as const;

// ============================================================================
// CONFIDENCE THRESHOLDS
// ============================================================================

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.65,
  LOW: 0.45,
} as const;

// ============================================================================
// RATE LIMITS
// ============================================================================

export const RATE_LIMITS = {
  // Per organization
  DEFAULT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  DEFAULT_MAX_REQUESTS: 100,

  // Specific endpoints
  MODERATION_MAX_PER_MINUTE: 60,
  AUTH_MAX_PER_HOUR: 10,
  API_KEY_MAX_PER_DAY: 1000,
} as const;

// ============================================================================
// PAGINATION DEFAULTS
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ============================================================================
// VALIDATION LIMITS
// ============================================================================

export const VALIDATION_LIMITS = {
  CONTENT_TEXT_MAX_LENGTH: 50000, // 50k chars
  CONTENT_URLS_MAX_COUNT: 10,
  CONTENT_IMAGES_MAX_COUNT: 10,
  ORGANIZATION_NAME_MAX_LENGTH: 100,
  ORGANIZATION_SLUG_MAX_LENGTH: 50,
  USER_NAME_MAX_LENGTH: 100,
  POLICY_NAME_MAX_LENGTH: 100,
  APPEAL_REASON_MAX_LENGTH: 2000,
  DECISION_RATIONALE_MAX_LENGTH: 5000,
} as const;

// ============================================================================
// SUPPORTED LANGUAGES (MVP)
// ============================================================================

export const SUPPORTED_LANGUAGES = {
  ENGLISH: 'en',
  HINDI: 'hi',
  HINGLISH: 'hi-en', // Mixed Hindi-English
} as const;

// ============================================================================
// API ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // Authorization
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Case events
  CASE_CREATED: 'case:created',
  CASE_UPDATED: 'case:updated',
  CASE_ASSIGNED: 'case:assigned',
  CASE_RESOLVED: 'case:resolved',
  CASE_ESCALATED: 'case:escalated',

  // Appeal events
  APPEAL_CREATED: 'appeal:created',
  APPEAL_UPDATED: 'appeal:updated',
  APPEAL_RESOLVED: 'appeal:resolved',

  // Notification events
  NOTIFICATION_NEW: 'notification:new',

  // System events
  SYSTEM_ALERT: 'system:alert',
} as const;
