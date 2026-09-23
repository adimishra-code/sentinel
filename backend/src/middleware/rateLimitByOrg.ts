import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../utils/redis';
import { Organization } from '../modules/organizations/organization.model';
import { OrganizationPlan } from '../types';
import logger from '../utils/logger';

// Default requests per minute per plan
export const PLAN_LIMITS: Record<OrganizationPlan, number> = {
  [OrganizationPlan.FREE]: 60,
  [OrganizationPlan.PRO]: 600,
  [OrganizationPlan.ENTERPRISE]: 3000,
};

// In-memory fallback bucket if Redis is temporarily unreachable
const inMemoryCounters = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitOptions {
  windowSeconds?: number;
  customLimit?: number;
}

export const rateLimitByOrg = (options: RateLimitOptions = {}) => {
  const windowSeconds = options.windowSeconds ?? 60;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId || (req.headers['x-organization-id'] as string);
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const now = Math.floor(Date.now() / 1000);
      const windowKey = Math.floor(now / windowSeconds);
      const resetTime = (windowKey + 1) * windowSeconds;
      const ttl = resetTime - now;

      let limit = options.customLimit || PLAN_LIMITS[OrganizationPlan.PRO];
      let identifier = `ip:${clientIp}`;

      if (orgId) {
        identifier = `org:${orgId}`;
        try {
          const org = await Organization.findById(orgId).select('plan rateLimitOverride').lean();
          if (org) {
            if (org.rateLimitOverride && org.rateLimitOverride > 0) {
              limit = org.rateLimitOverride;
            } else if (org.plan && PLAN_LIMITS[org.plan]) {
              limit = PLAN_LIMITS[org.plan];
            }
          }
        } catch (dbErr) {
          // If org lookup fails, proceed with default plan limit
          logger.warn('Failed to query organization plan for rate limit', { orgId, error: dbErr });
        }
      }

      const redisKey = `ratelimit:${identifier}:${windowKey}`;
      let currentCount = 1;

      try {
        const redis = getRedisClient();
        const pipeline = redis.pipeline();
        pipeline.incr(redisKey);
        pipeline.expire(redisKey, ttl + 5);
        const results = await pipeline.exec();

        if (results && results[0] && !results[0][0]) {
          currentCount = results[0][1] as number;
        }
      } catch (redisErr) {
        // Fallback to in-memory window
        const memKey = `${identifier}:${windowKey}`;
        const record = inMemoryCounters.get(memKey);
        if (!record || record.resetAt <= now) {
          currentCount = 1;
          inMemoryCounters.set(memKey, { count: 1, resetAt: resetTime });
        } else {
          record.count += 1;
          currentCount = record.count;
        }

        // Clean up old memory entries
        if (inMemoryCounters.size > 10000) {
          for (const [k, v] of inMemoryCounters.entries()) {
            if (v.resetAt <= now) inMemoryCounters.delete(k);
          }
        }
      }

      const remaining = Math.max(0, limit - currentCount);

      // Set standard rate limit headers
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());

      if (currentCount > limit) {
        const retryAfter = Math.max(1, resetTime - now);
        res.setHeader('Retry-After', retryAfter.toString());

        logger.warn('Organization rate limit exceeded', {
          identifier,
          limit,
          currentCount,
          path: req.path,
          method: req.method,
        });

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit of ${limit} requests per minute exceeded. Please retry after ${retryAfter} seconds.`,
            limit,
            remaining: 0,
            reset: resetTime,
            retryAfter,
          },
        });
      }

      next();
    } catch (err) {
      // Never let rate limiter completely crash request
      logger.error('Unexpected error in rateLimitByOrg middleware', { error: err });
      next();
    }
  };
};
