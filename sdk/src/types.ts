export interface SentinelConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export type ContentType = 'text' | 'image' | 'url' | 'mixed';

export type ModerationAction =
  | 'allow'
  | 'allow_and_monitor'
  | 'warn'
  | 'limit'
  | 'remove'
  | 'review'
  | 'escalate'
  | 'suspend';

export interface ModerateRequest {
  text?: string;
  contentType?: ContentType;
  imageUrls?: string[];
  urls?: string[];
  authorId?: string;
  targetId?: string;
  conversationId?: string;
  sourcePlatform?: string;
  metadata?: Record<string, unknown>;
  async?: boolean;
  idempotencyKey?: string;
}

export interface ModerationResult {
  action: ModerationAction;
  riskScore: number;
  severity?: string;
  categories: string[];
  requiresHumanReview: boolean;
  contentId: string;
  caseId?: string;
  confidence?: number;
  reasoning?: string[];
  jobId?: string;
}

export interface AsyncJobStatus {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress?: number;
  result?: ModerationResult;
  failedReason?: string;
  createdAt: string;
}

export interface WebhookPayload<T = unknown> {
  id: string;
  event: string;
  timestamp: string;
  organizationId: string;
  data: T;
}

/**
 * Typed error thrown by the Sentinel SDK.
 */
export class SentinelError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, status: number, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SentinelError';
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, SentinelError.prototype);
  }

  static fromResponse(status: number, body: any): SentinelError {
    const code = body?.error?.code || body?.code || 'UNKNOWN_ERROR';
    const message = body?.error?.message || body?.message || `HTTP error ${status}`;
    const details = body?.error?.details || body?.details;
    return new SentinelError(message, status, code, details);
  }
}

export interface ContentItem {
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
  createdAt: string;
}
