import { useEffect, useState } from 'react';
import {
  FileText,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart2,
  PieChart,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { analyticsApi } from '../services/api';
import { clsx } from 'clsx';

interface AnalyticsData {
  content?: {
    total: number;
    byType?: Record<string, number>;
  };
  cases?: {
    total: number;
    avgRiskScore: number;
    resolutionRate: number;
    avgResolutionTime: number;
    byStatus?: Record<string, number>;
    byPriority?: Record<string, number>;
  };
  decisions?: {
    byAction?: Record<string, number>;
    topModerators?: Array<{ name: string; count: number }>;
  };
  appeals?: {
    total: number;
    reversalRate: number;
    byStatus?: Record<string, number>;
  };
  categories?: Array<{ category: string; count: number; percentage: number }>;
}

const metricCards = [
  { key: 'totalContent', label: 'Total Content', icon: FileText, color: 'brand' },
  { key: 'totalCases', label: 'Total Cases', icon: AlertTriangle, color: 'high' },
  { key: 'avgRiskScore', label: 'Avg Risk Score', icon: TrendingUp, color: 'medium' },
  { key: 'resolutionRate', label: 'Resolution Rate', icon: CheckCircle, color: 'low' },
  { key: 'avgResolutionTime', label: 'Avg Resolution Time', icon: Clock, color: 'info' },
  { key: 'pendingReview', label: 'Pending Review', icon: Users, color: 'critical' },
];

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const overview = await analyticsApi.getOverview();
      setData(overview);
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-sm font-semibold text-neutral-900">Analytics</h1>
            <p className="text-body-md text-neutral-500 mt-1">Insights into your trust & safety operations</p>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="btn-secondary btn-sm"
          >
            <RefreshCw className={clsx('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metricCards.map((metric) => (
            <Card key={metric.key} className="p-5">
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-24 bg-neutral-200 rounded" />
                <div className="h-8 w-16 bg-neutral-200 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <h2 className="text-heading-md font-semibold text-neutral-900">Unable to load analytics</h2>
        <p className="text-body-md text-neutral-500 mt-2">{error || 'No data available'}</p>
        <button onClick={fetchData} className="mt-4 btn-primary btn-md">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  const metrics = {
    totalContent: data.content?.total || 0,
    totalCases: data.cases?.total || 0,
    avgRiskScore: Math.round(data.cases?.avgRiskScore || 0),
    resolutionRate: data.cases?.resolutionRate || 0,
    avgResolutionTime: data.cases?.avgResolutionTime || 0,
    pendingReview: data.cases?.byStatus?.pending || 0,
  };

  const casesData = data.cases!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-semibold text-neutral-900">Analytics</h1>
          <p className="text-body-md text-neutral-500 mt-1">Insights into your trust & safety operations</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="input w-auto min-w-[140px]"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="btn-secondary btn-sm"
          >
            <RefreshCw className={clsx('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((metric) => (
          <Card key={metric.key} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-body-sm text-neutral-500">{metric.label}</p>
                <p className="text-display-sm font-semibold text-neutral-900 mt-1">
                  {metric.key === 'avgRiskScore'
                    ? `${metrics[metric.key as keyof typeof metrics]}%`
                    : metric.key === 'resolutionRate'
                    ? `${metrics[metric.key as keyof typeof metrics]}%`
                    : metric.key === 'avgResolutionTime'
                    ? formatTime(metrics[metric.key as keyof typeof metrics])
                    : formatNumber(metrics[metric.key as keyof typeof metrics])}
                </p>
              </div>
              <div className={clsx('p-2 rounded-lg', `bg-${metric.color}-100 text-${metric.color}-700`)}>
                <metric.icon className="w-6 h-6" aria-hidden="true" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Status */}
        <Card className="p-0">
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-neutral-900">Cases by Status</h2>
          </CardHeader>
          <CardBody>
            {data.cases?.byStatus ? (
              <div className="space-y-3">
                {Object.entries(data.cases.byStatus).map(([status, count]) => {
                  const countNum = count as number;
                  const maxCount = Math.max(...Object.values(casesData.byStatus!).map(v => v as number));
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={statusColors[status] as any} dot>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 w-48">
                        <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${(countNum / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-body-sm font-medium text-neutral-900 w-12 text-right">{countNum}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state py-8">
                <PieChart className="empty-state-icon w-12 h-12" />
                <p className="empty-state-title">No Status Data</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Cases by Priority */}
        <Card className="p-0">
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-neutral-900">Cases by Priority</h2>
          </CardHeader>
          <CardBody>
            {data.cases?.byPriority ? (
              <div className="space-y-3">
                {Object.entries(data.cases.byPriority).map(([priority, count]) => {
                  const countNum = count as number;
                  const maxCount = Math.max(...Object.values(casesData.byPriority!).map(v => v as number));
                  return (
                    <div key={priority} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={severityColors[priority] as any} dot>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 w-48">
                        <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${(countNum / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-body-sm font-medium text-neutral-900 w-12 text-right">{countNum}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state py-8">
                <BarChart2 className="empty-state-icon w-12 h-12" />
                <p className="empty-state-title">No Priority Data</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Content & Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content by Type */}
        <Card className="p-0">
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-neutral-900">Content by Type</h2>
          </CardHeader>
          <CardBody>
            {data.content?.byType ? (
              <div className="space-y-3">
                {Object.entries(data.content.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-body-md text-neutral-700 capitalize">{type}</span>
                    <span className="font-mono text-body-sm font-medium text-neutral-900">{count as number}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <FileText className="empty-state-icon w-12 h-12" />
                <p className="empty-state-title">No Content Data</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Top Categories */}
        <Card className="p-0">
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-neutral-900">Top Categories</h2>
          </CardHeader>
          <CardBody>
            {data.categories?.length ? (
              <div className="space-y-3">
                {data.categories.slice(0, 8).map((cat: any, i: number) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-body-sm text-neutral-500 w-6 text-right">#{i + 1}</span>
                      <span className="text-body-md text-neutral-700">{cat.category}</span>
                    </div>
                    <div className="flex items-center gap-4 w-48">
                      <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                      <span className="font-mono text-body-sm font-medium text-neutral-900 w-16 text-right">{cat.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <BarChart2 className="empty-state-icon w-12 h-12" />
                <p className="empty-state-title">No Category Data</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Decisions & Appeals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Decisions by Action */}
        <Card className="p-0">
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-neutral-900">Decisions by Action</h2>
          </CardHeader>
          <CardBody>
            {data.decisions?.byAction ? (
              <div className="space-y-3">
                {Object.entries(data.decisions.byAction).map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-body-md text-neutral-700">{action.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>
                    <span className="font-mono text-body-sm font-medium text-neutral-900">{count as number}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <CheckCircle className="empty-state-icon w-12 h-12" />
                <p className="empty-state-title">No Decision Data</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Appeal Stats */}
        <Card className="p-0">
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-neutral-900">Appeals Overview</h2>
          </CardHeader>
          <CardBody>
            {data.appeals ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-body-md text-neutral-700">Total Appeals</span>
                  <span className="font-mono text-body-sm font-medium text-neutral-900">{data.appeals.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-md text-neutral-700">Reversal Rate</span>
                  <Badge variant={data.appeals.reversalRate > 20 ? 'high' : 'low'}>
                    {data.appeals.reversalRate.toFixed(1)}%
                  </Badge>
                </div>
                {data.appeals.byStatus && (
                  <div className="pt-3 border-t border-neutral-200 space-y-2">
                    {Object.entries(data.appeals.byStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <Badge variant={statusColors[status] as any}>
                          {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                        <span className="font-mono text-body-sm font-medium text-neutral-900">{count as number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state py-8">
                <FileText className="empty-state-icon w-12 h-12" />
                <p className="empty-state-title">No Appeal Data</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

const severityColors: Record<string, string> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

const statusColors: Record<string, string> = {
  pending: 'critical',
  in_review: 'high',
  resolved: 'low',
  escalated: 'high',
  dismissed: 'neutral',
  upheld: 'high',
  reversed: 'critical',
  modified: 'medium',
};