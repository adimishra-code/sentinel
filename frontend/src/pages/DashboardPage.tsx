import { useState } from 'react';
import { LayoutDashboard, FileText, CheckCircle, Clock, Users, TrendingUp, Shield, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { clsx } from 'clsx';
import { NavLink } from 'react-router-dom';
import { useAnalyticsOverview, useCaseAnalytics } from '../hooks/queries';

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
};

export function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();
  const { data: caseAnalytics, isLoading: casesLoading } = useCaseAnalytics();

  const metrics = overview ? {
    totalContent: overview.content?.total || 0,
    totalCases: overview.cases?.total || 0,
    avgRiskScore: Math.round(overview.cases?.avgRiskScore || 0),
    resolutionRate: overview.cases?.resolutionRate || 0,
    avgResolutionTime: overview.cases?.avgResolutionTime || 0,
    pendingReview: overview.cases?.byStatus?.pending || 0,
  } : null;

  const recentCases = caseAnalytics?.recentCases || [];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const statCards = metrics ? [
    { name: 'Content Analyzed', value: formatNumber(metrics.totalContent), change: '+12%', trend: 'up', icon: LayoutDashboard, color: 'brand' },
    { name: 'Cases Created', value: formatNumber(metrics.totalCases), change: '+8%', trend: 'up', icon: FileText, color: 'brand' },
    { name: 'Pending Review', value: formatNumber(metrics.pendingReview), change: '-5%', trend: 'down', icon: Clock, color: 'high' },
    { name: 'Auto-Resolved', value: formatNumber(metrics.totalCases - metrics.pendingReview), change: '+15%', trend: 'up', icon: CheckCircle, color: 'low' },
  ] : [];

  const isLoading = overviewLoading || casesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-semibold text-neutral-900">Dashboard</h1>
          <p className="text-body-md text-neutral-500 mt-1">Overview of your trust & safety operations</p>
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
          <button className="btn-secondary btn-sm">Export Report</button>
          <button className="btn-primary btn-sm">New Case</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-24 bg-neutral-200 rounded" />
                <div className="h-8 w-16 bg-neutral-200 rounded" />
              </div>
            </Card>
          ))
        ) : (
          statCards.map((stat) => (
            <Card key={stat.name} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-body-sm text-neutral-500">{stat.name}</p>
                  <p className="text-display-sm font-semibold text-neutral-900 mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={clsx(
                      'text-body-sm font-medium',
                      stat.trend === 'up' ? 'text-status-low' : 'text-status-critical'
                    )}>
                      {stat.change}
                    </span>
                    <span className="text-body-sm text-neutral-500">vs last period</span>
                  </div>
                </div>
                <div className={clsx('p-2 rounded-lg', `bg-${stat.color}-100 text-${stat.color}-700`)}>
                  <stat.icon className="w-6 h-6" aria-hidden="true" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions & Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 p-5">
          <h2 className="text-heading-md font-semibold text-neutral-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <NavLink to="/cases/new" className="w-full btn-secondary btn-md justify-start">
              <FileText className="w-5 h-5" />
              Submit Content for Review
            </NavLink>
            <button className="w-full btn-secondary btn-md justify-start" disabled>
              <Shield className="w-5 h-5" />
              Create Policy Rule
            </button>
            <button className="w-full btn-secondary btn-md justify-start" disabled>
              <Users className="w-5 h-5" />
              Invite Moderator
            </button>
            <NavLink to="/analytics" className="w-full btn-secondary btn-md justify-start">
              <TrendingUp className="w-5 h-5" />
              View Analytics
            </NavLink>
          </div>
        </Card>

        {/* Recent Cases */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h2 className="text-heading-md font-semibold text-neutral-900">Recent Cases</h2>
            <NavLink to="/cases" className="text-body-sm text-brand-700 hover:text-brand-800 font-medium">
              View all
              <ArrowRight className="w-4 h-4 inline ml-1" />
            </NavLink>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Content Preview</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td><div className="h-4 w-20 bg-neutral-200 animate-pulse rounded" /></td>
                      <td><div className="h-4 w-40 bg-neutral-200 animate-pulse rounded" /></td>
                      <td><div className="h-5 w-16 bg-neutral-200 animate-pulse rounded-full" /></td>
                      <td><div className="h-4 w-20 bg-neutral-200 animate-pulse rounded" /></td>
                      <td><div className="h-4 w-24 bg-neutral-200 animate-pulse rounded" /></td>
                      <td><div className="h-4 w-24 bg-neutral-200 animate-pulse rounded" /></td>
                    </tr>
                  ))
                ) : recentCases.length > 0 ? (
                  recentCases.map((case_: any) => (
                    <tr key={case_.id}>
                      <td className="font-mono text-body-sm font-medium">
                        <NavLink to={`/cases/${case_.id}`} className="text-brand-700 hover:text-brand-800">
                          {case_.id}
                        </NavLink>
                      </td>
                      <td className="max-w-xs truncate">{case_.contentPreview || case_.content || 'No preview'}</td>
                      <td>
                        <Badge variant={severityColors[case_.severity] as any} dot>
                          {case_.severity?.charAt(0).toUpperCase() + case_.severity?.slice(1) || 'Unknown'}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={statusColors[case_.status] as any}>
                          {case_.status?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="text-body-sm text-neutral-600">{case_.assignee || 'Unassigned'}</td>
                      <td className="text-body-sm text-neutral-500">
                        {case_.createdAt ? new Date(case_.createdAt).toLocaleString() : 'Unknown'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-neutral-500">
                      No recent cases
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}