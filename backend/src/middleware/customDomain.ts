import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../utils/redis';
import { Organization } from '../modules/organizations/organization.model';

const DEFAULT_HOSTS = ['localhost', '127.0.0.1', 'sentinelops.com', 'api.sentinelops.com'];

/**
 * Custom subdomain & domain routing middleware
 * Maps custom hostnames (e.g. safety.acmecorp.com or acme.sentinelops.com) to an Organization ID
 */
export const customDomainMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const host = req.hostname || req.headers.host?.split(':')[0];
    if (!host || DEFAULT_HOSTS.includes(host)) {
      return next();
    }

    // Check Redis cache for custom domain mapping (10 min TTL)
    const redis = getRedisClient();
    const cacheKey = `custom_domain:${host}`;
    const cachedOrgId = await redis.get(cacheKey);

    if (cachedOrgId) {
      req.organizationId = cachedOrgId;
      return next();
    }

    // Lookup organization by customDomain or subdomain slug
    let org = await Organization.findOne({
      $or: [
        { 'settings.customDomain': host },
        { slug: host.split('.')[0] },
      ],
      status: 'active',
    }).select('_id').lean();

    if (org) {
      const orgId = org._id.toString();
      req.organizationId = orgId;
      await redis.set(cacheKey, orgId, 'EX', 600); // 10 minutes TTL
    }

    next();
  } catch (err) {
    // Custom domain failure should not block request
    next();
  }
};
