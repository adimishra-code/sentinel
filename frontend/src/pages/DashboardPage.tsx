import { LayoutDashboard, FileText, AlertTriangle, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

const stats = [
  { name: 'Content Analyzed', value: '12,342', change: '+12%', trend: 'up', icon: LayoutDashboard, color: 'brand' },
  { name: 'Cases Created', value: '342', change: '+8%', trend: 'up', icon: FileText, color: 'brand' },
  { name: 'Pending Review', value: '28', change: '-5%', trend: 'down', icon: Clock, color: 'high' },
  { name: 'Auto-Resolved', value: '1,204', change: '+15%', trend: 'up', icon: CheckCircle, color: 'low' },
];

const recentCases = [
  { id: 'CASE-001', content: 'Hate speech detected in comments...', severity: 'critical', status: 'Open', assignee: 'Sarah Chen', created: '2 min ago' },
  { id: 'CASE-002', content: 'Harassment report - user @john_doe', severity: 'high', status: 'In Review', assignee: 'Mike Johnson', created: '15 min ago' },
  { id: 'CASE-003', content: 'Spam campaign detected across forums', severity: 'medium', status: 'Open', assignee: 'Unassigned', created: '1 hour ago' },
  { id: 'CASE-004', content: 'Self-harm concern in private messages', severity: 'critical', status: 'Escalated', assignee: 'Emma Wilson', created: '3 hours ago' },
  { id: 'CASE-005', content: 'Policy violation - adult content', severity: 'low', status: 'Resolved', assignee: 'Sarah Chen', created: '5 hours ago' },
];

const severityColors: Record<string, string> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-semibold text-neutral-900">Dashboard</h1>
          <p className="text-body-md text-neutral-500 mt-1">Overview of your trust & safety operations</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary btn-sm">Export Report</button>
          <button className="btn-primary btn-sm">New Case</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
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
                  <span className="text-body-sm text-neutral-500">vs last week</span>
                </div>
              </div>
              <div className={clsx('p-2 rounded-lg', `bg-${stat.color}-100 text-${stat.color}-700`)}>
                <stat.icon className="w-6 h-6" aria-hidden="true" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 p-5">
          <h2 className="text-heading-md font-semibold text-neutral-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full btn-secondary btn-md justify-start">
              <FileText className="w-5 h-5" />
              Submit Content for Review
            </button>
            <button className="w-full btn-secondary btn-md justify-start">
              <Shield className="w-5 h-5" />
              Create Policy Rule
            </button>
            <button className="w-full btn-secondary btn-md justify-start">
              <Users className="w-5 h-5" />
              Invite Moderator
            </button>
            <button className="w-full btn-secondary btn-md justify-start">
              <TrendingUp className="w-5 h-5" />
              View Analytics
            </button>
          </div>
        </Card>

        {/* Recent Cases */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h2 className="text-heading-md font-semibold text-neutral-900">Recent Cases</h2>
            <NavLink to="/cases" className="text-body-sm text-brand-700 hover:text-brand-800 font-medium">
              View all
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
                {recentCases.map((case_) => (
                  <tr key={case_.id}>
                    <td className="font-mono text-body-sm font-medium">{case_.id}</td>
                    <td className="max-w-xs truncate">{case_.content}</td>
                    <td>
                      <Badge variant={severityColors[case_.severity] as any}>
                        {case_.severity.charAt(0).toUpperCase() + case_.severity.slice(1)}
                      </Badge>
                    </td>
                    <td>{case_.status}</td>
                    <td className="text-body-sm text-neutral-600">{case_.assignee}</td>
                    <td className="text-body-sm text-neutral-500">{case_.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { clsx } from 'clsx';
import { NavLink } from 'react-router-dom';