import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Sentinel, SentinelError } from './client';
import { verifyWebhookSignature } from './webhook';

describe('Sentinel SDK', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const baseUrl = 'http://127.0.0.1:9999';

  it('moderates content successfully', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          action: 'review',
          riskScore: 0.8,
          severity: 'high',
          categories: ['toxicity'],
          requiresHumanReview: true,
          contentId: 'content_123',
          caseId: 'case_456',
          reasoning: ['toxic language detected'],
        },
      }),
    });

    const client = new Sentinel({ apiKey: 'test-key', baseUrl });
    const result = await client.moderate({ text: 'Hello world', authorId: 'user_1' });

    expect(result.action).toBe('review');
    expect(result.riskScore).toBe(0.8);
    expect(result.contentId).toBe('content_123');

    // Verify the request was made correctly
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${baseUrl}/api/v1/moderate`);
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('ApiKey test-key');
    expect(JSON.parse(options.body).text).toBe('Hello world');
  });

  it('uses Idempotency-Key header when provided', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          action: 'allow',
          riskScore: 0.1,
          severity: 'low',
          categories: [],
          requiresHumanReview: false,
          contentId: 'dup-content-id',
          reasoning: ['cached'],
        },
      }),
    });

    const client = new Sentinel({ apiKey: 'test-key', baseUrl });
    const result = await client.moderate({
      text: 'Hello world',
      authorId: 'user_1',
      idempotencyKey: 'dup-key',
    });

    expect(result.contentId).toBe('dup-content-id');
    expect(result.reasoning).toEqual(['cached']);

    const [url, options] = fetchMock.mock.calls[0];
    expect(options.headers['Idempotency-Key']).toBe('dup-key');
  });

  it('throws SentinelError on 401', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: 'UNAUTHORIZED', message: 'No auth' },
      }),
    });

    const client = new Sentinel({ apiKey: 'bad-key', baseUrl });
    await expect(client.moderate({ text: 'Hello' })).rejects.toThrow(SentinelError);
  });

  it('throws SentinelError on 404 for missing content', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      }),
    });

    const client = new Sentinel({ apiKey: 'test-key', baseUrl });
    await expect(client.getContent('missing-content')).rejects.toThrow(SentinelError);
  });

  it('gets content by ID', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'content_999',
          organizationId: 'org_1',
          contentType: 'text',
          text: 'Sample content',
          createdAt: new Date().toISOString(),
        },
      }),
    });

    const client = new Sentinel({ apiKey: 'test-key', baseUrl });
    const content = await client.getContent('content_999');
    expect(content.id).toBe('content_999');
    expect(content.organizationId).toBe('org_1');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${baseUrl}/api/v1/content/content_999`);
  });

  it('gets job status', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          jobId: 'completed-job',
          status: 'completed',
          result: {
            action: 'allow',
            riskScore: 0.1,
            severity: 'low',
            categories: [],
            requiresHumanReview: false,
            contentId: 'content_789',
          },
        },
      }),
    });

    const client = new Sentinel({ apiKey: 'test-key', baseUrl });
    const status = await client.getJobStatus('completed-job');
    expect(status.status).toBe('completed');
    expect(status.result?.action).toBe('allow');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${baseUrl}/api/v1/moderate/jobs/completed-job`);
  });

  it('throws on missing API key', () => {
    expect(() => new Sentinel({ apiKey: '' } as any)).toThrow(SentinelError);
  });

  it('retries on transient failure then succeeds', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            action: 'allow',
            riskScore: 0.1,
            severity: 'low',
            categories: [],
            requiresHumanReview: false,
            contentId: 'retry-content',
          },
        }),
      });

    const client = new Sentinel({ apiKey: 'key', baseUrl, maxRetries: 3 });
    const result = await client.moderate({ text: 'retry me' });
    expect(result.contentId).toBe('retry-content');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('exhausts retries on persistent failure', async () => {
    fetchMock.mockRejectedValue(new Error('Persistent network error'));

    const client = new Sentinel({ apiKey: 'key', baseUrl, maxRetries: 2 });
    await expect(client.moderate({ text: 'retry me' })).rejects.toThrow(
      'Persistent network error'
    );
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('handles 429 with Retry-After header', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { 'Retry-After': '1' },
        json: async () => ({
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            action: 'allow',
            riskScore: 0.1,
            severity: 'low',
            categories: [],
            requiresHumanReview: false,
            contentId: 'rate-limited-content',
          },
        }),
      });

    const client = new Sentinel({ apiKey: 'key', baseUrl, maxRetries: 3 });
    const result = await client.moderate({ text: 'rate limited' });
    expect(result.contentId).toBe('rate-limited-content');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry 4xx client errors (except 429)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: { code: 'BAD_REQUEST', message: 'Invalid request' },
      }),
    });

    const client = new Sentinel({ apiKey: 'key', baseUrl, maxRetries: 3 });
    await expect(client.moderate({ text: 'bad request' })).rejects.toThrow(SentinelError);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry on 400
  });

  it('waitForJob times out', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          jobId: 'never-completes',
          status: 'waiting',
          result: undefined,
        },
      }),
    });

    const client = new Sentinel({ apiKey: 'key', baseUrl });
    await expect(
      client.waitForJob('never-completes', 100, 100)
    ).rejects.toThrow(SentinelError);
  });

  it('waitForJob handles failed job', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          jobId: 'failed-job',
          status: 'failed',
          result: undefined,
          failedReason: 'Worker crashed',
        },
      }),
    });

    const client = new Sentinel({ apiKey: 'key', baseUrl });
    await expect(client.waitForJob('failed-job')).rejects.toThrow(SentinelError);
  });

  it('handles non-JSON error body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const client = new Sentinel({ apiKey: 'key', baseUrl });
    await expect(client.moderate({ text: 'test' })).rejects.toThrow();
  });
});

describe('verifyWebhookSignature', () => {
  it('verifies a valid timestamped signature', () => {
    const timestamp = Date.now();
    const body = `${timestamp}.${JSON.stringify({ event: 'case.resolved', data: { caseId: '1' } })}`;
    const secret = 'my-secret';
    const sig = `sha256=${require('crypto').createHmac('sha256', secret).update(body).digest('hex')}`;
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });

  it('rejects a stale signature', () => {
    const oldTimestamp = Date.now() - 10 * 60 * 1000;
    const body = `${oldTimestamp}.${JSON.stringify({ event: 'x', data: {} })}`;
    const secret = 'my-secret';
    const sig = `sha256=${require('crypto').createHmac('sha256', secret).update(body).digest('hex')}`;
    expect(verifyWebhookSignature(body, sig, secret)).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const timestamp = Date.now();
    const body = `${timestamp}.${JSON.stringify({ event: 'x', data: {} })}`;
    expect(verifyWebhookSignature(body, 'sha256=deadbeef', 'secret')).toBe(false);
  });

  it('rejects a malformed signature header', () => {
    const timestamp = Date.now();
    const body = `${timestamp}.${JSON.stringify({ event: 'x', data: {} })}`;
    expect(verifyWebhookSignature(body, 'not-hex-at-all', 'secret')).toBe(false);
    expect(verifyWebhookSignature(body, 'md5=abc123', 'secret')).toBe(false);
    expect(verifyWebhookSignature(body, '', 'secret')).toBe(false);
  });
});

describe('verifyWebhookSignature', () => {
  it('verifies a valid timestamped signature', () => {
    const timestamp = Date.now();
    const body = `${timestamp}.${JSON.stringify({ event: 'case.resolved', data: { caseId: '1' } })}`;
    const secret = 'my-secret';
    const sig = `sha256=${require('crypto').createHmac('sha256', secret).update(body).digest('hex')}`;
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });

  it('rejects a stale signature', () => {
    const oldTimestamp = Date.now() - 10 * 60 * 1000;
    const body = `${oldTimestamp}.${JSON.stringify({ event: 'x', data: {} })}`;
    const secret = 'my-secret';
    const sig = `sha256=${require('crypto').createHmac('sha256', secret).update(body).digest('hex')}`;
    expect(verifyWebhookSignature(body, sig, secret)).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const timestamp = Date.now();
    const body = `${timestamp}.${JSON.stringify({ event: 'x', data: {} })}`;
    expect(verifyWebhookSignature(body, 'sha256=deadbeef', 'secret')).toBe(false);
  });
});
