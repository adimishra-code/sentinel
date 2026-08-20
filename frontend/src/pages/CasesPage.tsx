import { Search, Filter, Plus, ChevronDown } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useState } from 'react';
import { clsx } from 'clsx';
import { NavLink } from 'react-router-dom';

const cases = [
  { id: 'CASE-001', content: 'Hate speech detected in comments section...', severity: 'critical', category: 'Hate Speech', status: 'Open', assignee: 'Sarah Chen', reporter: 'Auto-detection', created: '2 min ago', riskScore: 94 },
  { id: 'CASE-002', content: 'Harassment report - user @john_doe targeting @jane_smith', severity: 'high', category: 'Harassment', status: 'In Review', assignee: 'Mike Johnson', reporter: 'User Report', created: '15 min ago', riskScore: 87 },
  { id: 'CASE-003', content: 'Spam campaign detected across multiple forums', severity: 'medium', category: 'Spam', status: 'Open', assignee: 'Unassigned', reporter: 'Pattern Detection', created: '1 hour ago', riskScore: 62 },
  { id: 'CASE-004', content: 'Self-harm concern in private messages', severity: 'critical', category: 'Self-Harm', status: 'Escalated', assignee: 'Emma Wilson', reporter: 'User Report', created: '3 hours ago', riskScore: 98 },
  { id: 'CASE-005', content: 'Policy violation - adult content in public post', severity: 'low', category: 'Adult Content', status: 'Resolved', assignee: 'Sarah Chen', reporter: 'Auto-detection', created: '5 hours ago', riskScore: 23 },
  { id: 'CASE-006', content: 'Potential impersonation of brand account', severity: 'high', category: 'Impersonation', status: 'Open', assignee: 'Unassigned', reporter: 'User Report', created: '6 hours ago', riskScore: 81 },
  { id: 'CASE-007', content: 'Threat of violence in gaming chat', severity: 'critical', category: 'Violence', status: 'In Review', assignee: 'Mike Johnson', reporter: 'Auto-detection', created: '8 hours ago', riskScore: 96 },
  { id: 'CASE-008', content: 'Coordinated harassment campaign', severity: 'high', category: 'Harassment', status: 'Open', assignee: 'Emma Wilson', reporter: 'Pattern Detection', created: '12 hours ago', riskScore: 89 },
];

const severityColors: Record<string, string> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

const statusColors: Record<string, string> = {
  Open: 'critical',
  'In Review': 'high',
  Escalated: 'high',
  Resolved: 'low',
  Dismissed: 'neutral',
};

export function CasesPage() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'severity' | 'riskScore'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredCases = cases
    .filter((c) => {
      if (search && !c.id.toLowerCase().includes(search.toLowerCase()) && !c.content.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (severityFilter && c.severity !== severityFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let aVal: any = a[sortBy];
      let bVal: any = b[sortBy];
      if (sortBy === 'created') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-semibold text-neutral-900">Cases</h1>
          <p className="text-body-md text-neutral-500 mt-1">Manage and review moderation cases</p>
        </div>
        <NavLink to="/cases/new" className="btn-primary btn-md">
          <Plus className="w-4 h-4" />
          New Case
        </NavLink>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="input w-auto min-w-[160px]"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto min-w-[160px]"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Review">In Review</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
              <option value="Dismissed">Dismissed</option>
            </select>

            <div className="flex items-center gap-2">
              <label className="text-body-sm text-neutral-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input w-auto min-w-[140px]"
              >
                <option value="created">Created</option>
                <option value="severity">Severity</option>
                <option value="riskScore">Risk Score</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="btn-ghost btn-sm p-2"
                aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
              >
                <ChevronDown className={clsx('w-4 h-4 transition-transform', sortOrder === 'desc' && 'rotate-180')} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Cases Table */}
      <Card className="p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="w-32">Case ID</th>
                <th>Content Preview</th>
                <th className="w-36">Severity</th>
                <th className="w-32">Category</th>
                <th className="w-36">Status</th>
                <th className="w-36">Assignee</th>
                <th className="w-28">Risk</th>
                <th className="w-36">Created</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((case_) => (
                <tr key={case_.id}>
                  <td className="font-mono text-body-sm font-medium">
                    <NavLink to={`/cases/${case_.id}`} className="text-brand-700 hover:text-brand-800">
                      {case_.id}
                    </NavLink>
                  </td>
                  <td className="max-w-md truncate">{case_.content}</td>
                  <td>
                    <Badge variant={severityColors[case_.severity] as any} dot>
                      {case_.severity.charAt(0).toUpperCase() + case_.severity.slice(1)}
                    </Badge>
                  </td>
                  <td className="text-body-sm text-neutral-700">{case_.category}</td>
                  <td>
                    <Badge variant={statusColors[case_.status] as any}>
                      {case_.status}
                    </Badge>
                  </td>
                  <td className="text-body-sm text-neutral-600">{case_.assignee}</td>
                  <td className="font-mono text-body-sm font-medium text-neutral-900">{case_.riskScore}</td>
                  <td className="text-body-sm text-neutral-500">{case_.created}</td>
                  <td>
                    <NavLink to={`/cases/${case_.id}`} className="text-brand-700 hover:text-brand-800 font-medium text-body-sm">
                      View
                    </NavLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-4 border-t border-neutral-200 flex items-center justify-between">
          <p className="text-body-sm text-neutral-500">
            Showing {filteredCases.length} of {cases.length} cases
          </p>
          <div className="flex items-center gap-2">
            <button className="btn-secondary btn-sm" disabled>Previous</button>
            <button className="btn-secondary btn-sm" disabled>Next</button>
          </div>
        </div>
      </Card>
    </div>
  );
}