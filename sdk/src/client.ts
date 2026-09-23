import {
  SentinelConfig,
  ModerateRequest,
  ModerationResult,
  AsyncJobStatus,
} from './types';
import { verifyWebhookSignature } from './webhook';

export class Sentinel {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: SentinelConfig) {
    if (!config.apiKey) {
      throw new Error('Sentinel API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.sentinelops.com').replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs || 15000;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${this.apiKey}`,
      ...(options.headers as Record<string, string>),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.error?.message || json?.message || `HTTP error ${response.status}: ${response.statusText}`
        );
      }

      return json.data !== undefined ? json.data : json;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Submit content for AI & pattern moderation
   */
  async moderate(request: ModerateRequest): Promise<ModerationResult> {
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
        throw new Error(`Job failed: ${status.failedReason || 'Unknown error'}`);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Timed out waiting for moderation job ${jobId}`);
  }

  /**
   * Verify an incoming webhook signature
   */
  verifyWebhook(payload: string | Buffer, signature: string, secret: string): boolean {
    return verifyWebhookSignature(payload, signature, secret);
  }
}
