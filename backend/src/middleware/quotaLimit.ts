import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../utils/redis';
import { Organization } from '../modules/organizations/organization.model';
import { OrganizationPlan } from '../types';
import logger from '../utils/logger';

// Monthly content moderation request quotas by plan
export const MONTHLY_PLAN_QUOTAS: Record<OrganizationPlan, number> = {
  [OrganizationPlan.FREE]: 1000,
  [OrganizationPlan.PRO]: 50000,
  [OrganizationPlan.ENTERPRISE]: Infinity,
};

/**
 * Enforce monthly organization moderation quotas with usage tracking
 */
export const checkMonthlyQuota = async (req: Request, res: Response, next: NextFunction) => {
  const orgId = req.organizationId;
  if (!orgId) return next();

  try {
    const org = await Organization.findById(orgId).select('plan').lean();
    const plan = org?.plan || OrganizationPlan.PRO;
    const maxQuota = MONTHLY_PLAN_QUOTAS[plan];

    if (maxQuota === Infinity) {
      res.setHeader('X-Plan-Quota-Limit', 'unlimited');
      return next();
    }

    const date = new Date();
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const usageKey = `usage:${orgId}:${yearMonth}`;

    const redis = getRedisClient();
    const currentUsage = await redis.incr(usageKey);

    // Keep usage records active for 60 days
    if (currentUsage === 1) {
      await redis.expire(usageKey, 60 * 24 * 3600);
    }

    res.setHeader('X-Plan-Quota-Limit', maxQuota.toString());
    res.setHeader('X-Plan-Quota-Used', currentUsage.toString());

    if (currentUsage > maxQuota) {
      logger.warn('Organization plan quota exceeded', {
        organizationId: orgId,
        plan,
        currentUsage,
        maxQuota,
      });

      return res.status(402).json({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: `Monthly moderation quota of ${maxQuota.toLocaleString()} items exceeded for your ${plan} plan. Please upgrade your organization plan.`,
          quota: maxQuota,
          used: currentUsage,
        },
      });
    }

    next();
  } catch (err) {
    logger.warn('Quota check bypass on error', { error: err });
    next();
  }
};
