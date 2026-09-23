export interface SentinelConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
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
