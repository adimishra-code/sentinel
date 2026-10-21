import {
  SentinelConfig,
  ModerateRequest,
  ModerationResult,
  AsyncJobStatus,
  ContentItem,
  SentinelError,
} from './types';
import { verifyWebhookSignature } from './webhook';

export { SentinelError } from './types';

/**
 * Retry with exponential backoff.
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Sentinel {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config: SentinelConfig) {
    if (!config.apiKey) {
      throw new SentinelError('Sentinel API key is required', 401, 'MISSING_API_KEY');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.sentinelops.com').replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs || 15000;
    this.maxRetries = config.maxRetries ?? 3;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint.startsWith('/') ? endpoint : `//${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${this.apiKey}`,
      ...(options.headers as Record<string, string>),
    };

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          // Rate limited — retry after backoff (respect Retry-After if present)
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
          if (attempt < this.maxRetries) {
            await sleep(delay);
            continue;
          }
          throw new SentinelError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
        }

        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw SentinelError.fromResponse(response.status, json);
        }

        return json.data !== undefined ? json.data : json;
      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;

        if (error instanceof SentinelError) {
          // Don't retry on client errors (4xx) except 429
          if (error.status >= 400 && error.status < 500 && error.status !== 429) {
            throw error;
          }
        }

        if (attempt < this.maxRetries) {
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Submit content for AI & pattern moderation.
   * Supports Idempotency-Key for safe retries.
   */
  async moderate(request: ModerateRequest): Promise<ModerationResult> {
    const headers: Record<string, string> = {};
    if (request.idempotencyKey) {
      headers['Idempotency-Key'] = request.idempotencyKey;
    }

    const payload = {
      contentType: request.contentType || 'text',
      text: request.text,
      imageUrls: request.imageUrls,
      urls: request.urls,
      authorId: request.authorId,
      targetId: request.targetId,
      conversationId: request.conversationId,
      sourcePlatform: request.sourcePlatform,
      metadata: request.metadata,
    };

    const query = request.async ? '?async=true' : '';
    return this.request<ModerationResult>(`/moderate${query}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  /**
   * Check status of an asynchronous moderation job
   */
  async getJobStatus(jobId: string): Promise<AsyncJobStatus> {
    return this.request<AsyncJobStatus>(`/moderate/jobs/${jobId}`, {
      method: 'GET',
    });
  }

  /**
   * Poll an async job until completion or timeout
   */
  async waitForJob(
    jobId: string,
    intervalMs: number = 1000,
    maxWaitMs: number = 30000
  ): Promise<ModerationResult> {
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      const status = await this.getJobStatus(jobId);
      if (status.status === 'completed' && status.result) {
        return status.result;
      }
      if (status.status === 'failed') {
        throw new SentinelError(
          `Job failed: ${status.failedReason || 'Unknown error'}`,
          status.result ? 200 : 500,
          'JOB_FAILED',
          { failedReason: status.failedReason }
        );
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new SentinelError(`Timed out waiting for moderation job ${jobId}`, 408, 'JOB_TIMEOUT');
  }

  /**
   * Get content by ID
   */
  async getContent(contentId: string): Promise<ContentItem> {
    return this.request<ContentItem>(`/content/${contentId}`, {
      method: 'GET',
    });
  }

  /**
   * Verify an incoming webhook signature
   */
  verifyWebhook(payload: string | Buffer, signature: string, secret: string): boolean {
    return verifyWebhookSignature(payload, signature, secret);
  }
}
