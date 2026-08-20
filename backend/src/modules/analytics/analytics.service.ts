/**
 * Analytics Service
 * Aggregates metrics for dashboard
 */

import { Content } from '../content/content.model';
import { Case } from '../cases/case.model';
import { ModerationDecision } from '../cases/moderation-decision.model';
import { Appeal } from '../appeals/appeal.model';

/**
 * Get content analytics
 */
export const getContentAnalytics = async (
  organizationId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
) => {
  const filter: any = { organizationId };
  if (options.startDate || options.endDate) {
    filter.createdAt = {};
    if (options.startDate) filter.createdAt.$gte = options.startDate;
    if (options.endDate) filter.createdAt.$lte = options.endDate;
  }

  const [total, byType, byLanguage] = await Promise.all([
    Content.countDocuments(filter),
    Content.aggregate([
      { $match: filter },
      { $group: { _id: '$contentType', count: { $sum: 1 } } },
    ]),
    Content.aggregate([
      { $match: filter },
      { $group: { _id: '$language', count: { $sum: 1 } } },
    ]),
  ]);

  return {
    total,
    byType: byType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>),
    byLanguage: byLanguage.reduce((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {} as Record<string, number>),
  };
};

/**
 * Get case analytics
 */
export const getCaseAnalytics = async (
  organizationId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
) => {
  const filter: any = { organizationId };
  if (options.startDate || options.endDate) {
    filter.createdAt = {};
    if (options.startDate) filter.createdAt.$gte = options.startDate;
    if (options.endDate) filter.createdAt.$lte = options.endDate;
  }

  const [total, byStatus, byPriority, avgRiskScore] = await Promise.all([
    Case.countDocuments(filter),
    Case.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Case.aggregate([
      { $match: filter },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Case.aggregate([
      { $match: filter },
      { $group: { _id: null, avgRisk: { $avg: '$riskScore' } } },
    ]),
  ]);

  // Calculate time-to-resolution
  const resolved = await Case.find({
    ...filter,
    status: 'resolved',
    resolvedAt: { $exists: true },
  }).select('createdAt resolvedAt').lean();

  const avgTimeToResolve = resolved.length > 0
    ? resolved.reduce((sum, c) => {
        const diff = c.resolvedAt!.getTime() - c.createdAt.getTime();
        return sum + diff;
      }, 0) / resolved.length / 1000 / 60 // minutes
    : 0;

  return {
    total,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>),
    byPriority: byPriority.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>),
    avgRiskScore: avgRiskScore[0]?.avgRisk || 0,
    avgTimeToResolveMinutes: Math.round(avgTimeToResolve),
  };
};

/**
 * Get moderation decisions analytics
 */
export const getDecisionAnalytics = async (
  organizationId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
) => {
  const filter: any = { organizationId };
  if (options.startDate || options.endDate) {
    filter.createdAt = {};
    if (options.startDate) filter.createdAt.$gte = options.startDate;
    if (options.endDate) filter.createdAt.$lte = options.endDate;
  }

  const [byAction, byModerator] = await Promise.all([
    ModerationDecision.aggregate([
      { $match: filter },
      { $group: { _id: '$action', count: { $sum: 1 } } },
    ]),
    ModerationDecision.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$moderatorId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    byAction: byAction.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>),
    topModerators: byModerator.map(item => ({
      moderatorId: item._id.toString(),
      count: item.count,
    })),
  };
};

/**
 * Get appeals analytics
 */
export const getAppealAnalytics = async (
  organizationId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
) => {
  const filter: any = { organizationId };
  if (options.startDate || options.endDate) {
    filter.createdAt = {};
    if (options.startDate) filter.createdAt.$gte = options.startDate;
    if (options.endDate) filter.createdAt.$lte = options.endDate;
  }

  const [total, byStatus] = await Promise.all([
    Appeal.countDocuments(filter),
    Appeal.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  // Calculate reversal rate
  const resolved = await Appeal.countDocuments({
    ...filter,
    status: { $in: ['upheld', 'reversed', 'modified'] },
  });

  const reversed = await Appeal.countDocuments({
    ...filter,
    outcome: 'reversed',
  });

  const reversalRate = resolved > 0 ? (reversed / resolved) * 100 : 0;

  return {
    total,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>),
    reversalRatePercent: Math.round(reversalRate * 10) / 10,
  };
};

/**
 * Get category distribution
 */
export const getCategoryDistribution = async (
  organizationId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
) => {
  const filter: any = { organizationId };
  if (options.startDate || options.endDate) {
    filter.createdAt = {};
    if (options.startDate) filter.createdAt.$gte = options.startDate;
    if (options.endDate) filter.createdAt.$lte = options.endDate;
  }

  const cases = await Case.find(filter).select('categories').lean();

  // Flatten categories and count
  const categoryCount: Record<string, number> = {};
  cases.forEach(c => {
    c.categories.forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
  });

  return Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Get dashboard overview
 */
export const getDashboardOverview = async (
  organizationId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
) => {
  const [content, cases, decisions, appeals, categories] = await Promise.all([
    getContentAnalytics(organizationId, options),
    getCaseAnalytics(organizationId, options),
    getDecisionAnalytics(organizationId, options),
    getAppealAnalytics(organizationId, options),
    getCategoryDistribution(organizationId, options),
  ]);

  return {
    content,
    cases,
    decisions,
    appeals,
    categories: categories.slice(0, 10), // Top 10
  };
};
