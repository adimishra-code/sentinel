import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimitByOrg, resetRateLimitMemoryCounters } from './rateLimitByOrg';
import { Request, Response, NextFunction } from 'express';

vi.mock('../utils/redis', () => ({
  getRedisClient: vi.fn().mockReturnValue({
    get: vi.fn().mockRejectedValue(new Error('Redis down')),
    set: vi.fn().mockRejectedValue(new Error('Redis down')),
    pipeline: vi.fn().mockReturnValue({
      incr: vi.fn(),
      expire: vi.fn(),
      exec: vi.fn().mockRejectedValue(new Error('Redis connection down')),
    }),
  }),
}));

vi.mock('../modules/organizations/organization.model', () => ({
  Organization: {
    findById: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          plan: 'pro',
          rateLimitOverride: null,
        }),
      }),
    }),
  },
}));

describe('rateLimitByOrg middleware', () => {
  beforeEach(() => {
    resetRateLimitMemoryCounters();
  });
  const mockResponse = () => {
    const res: Partial<Response> = {};
    const headers: Record<string, string> = {};
    res.setHeader = vi.fn().mockImplementation((k: string, v: string) => {
      headers[k] = v;
    });
    res.getHeader = vi.fn().mockImplementation((k: string) => headers[k]);
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return { res: res as Response, headers };
  };

  it('should allow requests within limit and attach RFC rate limit headers', async () => {
    const middleware = rateLimitByOrg({ customLimit: 10, windowSeconds: 60 });
    const req = {
      organizationId: 'org_test_1',
      headers: {},
      ip: '127.0.0.1',
      socket: {},
    } as unknown as Request;

    const { res, headers } = mockResponse();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(headers['X-RateLimit-Limit']).toBe('10');
    expect(headers['X-RateLimit-Remaining']).toBe('9');
    expect(headers['X-RateLimit-Reset']).toBeDefined();
  });

  it('should return 429 when limit is exceeded', async () => {
    const middleware = rateLimitByOrg({ customLimit: 2, windowSeconds: 60 });
    const req = {
      organizationId: 'org_test_overflow',
      headers: {},
      ip: '127.0.0.1',
      socket: {},
    } as unknown as Request;

    const next = vi.fn() as NextFunction;

    // Send 2 requests
    const res1 = mockResponse();
    await middleware(req, res1.res, next);
    const res2 = mockResponse();
    await middleware(req, res2.res, next);

    expect(next).toHaveBeenCalledTimes(2);

    // 3rd request exceeds limit
    const res3 = mockResponse();
    await middleware(req, res3.res, next);

    expect(next).toHaveBeenCalledTimes(2); // not called 3rd time
    expect(res3.res.status).toHaveBeenCalledWith(429);
    expect(res3.headers['Retry-After']).toBeDefined();
  });
});
