import { useState, useMemo } from 'react';
import { Search, Plus, ChevronDown } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { clsx } from 'clsx';
import { NavLink } from 'react-router-dom';
import { useCases } from '../hooks/queries';

interface Case {
  id: string;
  contentPreview?: string;
  text?: string;
  severity: string;
  status: string;
  categories?: string[];
  category?: string;
  assignedTo?: string;
  riskScore: number;
  createdAt?: string;
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
};

export function CasesPage() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'severity' | 'riskScore'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useCases({
    page,
    limit: 20,
    status: statusFilter || undefined,
    priority: severityFilter || undefined,
  });

  const cases = data?.cases || [];
  const meta = data?.meta;

  const filteredCases = useMemo(() => {
    return cases
      .filter((c: Case) => {
        if (search && !c.id.toLowerCase().includes(search.toLowerCase()) &&
            !(c.contentPreview || '').toLowerCase().includes(search.toLowerCase())) {
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
  }, [cases, search, severityFilter, statusFilter, sortBy, sortOrder]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSeverityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSeverityFilter(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

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
              onChange={handleSearch}
              className="input pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={severityFilter}
              onChange={handleSeverityChange}
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
              onChange={handleStatusChange}
              className="input w-auto min-w-[160px]"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
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
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><div className="h-4 w-20 bg-neutral-200 animate-pulse rounded" /></td>
                    <td><div className="h-4 w-40 bg-neutral-200 animate-pulse rounded" /></td>
                    <td><div className="h-5 w-16 bg-neutral-200 animate-pulse rounded-full" /></td>
                    <td><div className="h-4 w-20 bg-neutral-200 animate-pulse rounded" /></td>
                    <td><div className="h-4 w-20 bg-neutral-200 animate-pulse rounded" /></td>
                    <td><div className="h-4 w-24 bg-neutral-200 animate-pulse rounded" /></td>
                    <td><div className="h-4 w-16 bg-neutral-200 animate-pulse rounded" /></td>
                    <td><div className="h-4 w-24 bg-neutral-200 animate-pulse rounded" /></td>
                    <td></td>
                  </tr>
                ))
              ) : filteredCases.length > 0 ? (
                filteredCases.map((case_: Case) => (
                  <tr key={case_.id}>
                    <td className="font-mono text-body-sm font-medium">
                      <NavLink to={`/cases/${case_.id}`} className="text-brand-700 hover:text-brand-800">
                        {case_.id}
                      </NavLink>
                    </td>
                    <td className="max-w-md truncate">{case_.contentPreview || case_.text || 'No preview'}</td>
                    <td>
                      <Badge variant={severityColors[case_.severity] as any} dot>
                        {case_.severity?.charAt(0).toUpperCase() + case_.severity?.slice(1) || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="text-body-sm text-neutral-700">
                      {case_.categories?.[0] || case_.category || 'Unknown'}
                    </td>
                    <td>
                      <Badge variant={statusColors[case_.status] as any}>
                        {case_.status?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="text-body-sm text-neutral-600">{case_.assignedTo || 'Unassigned'}</td>
                    <td className="font-mono text-body-sm font-medium text-neutral-900">{case_.riskScore || 0}</td>
                    <td className="text-body-sm text-neutral-500">
                      {case_.createdAt ? new Date(case_.createdAt).toLocaleString() : 'Unknown'}
                    </td>
                    <td>
                      <NavLink to={`/cases/${case_.id}`} className="text-brand-700 hover:text-brand-800 font-medium text-body-sm">
                        View
                      </NavLink>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-neutral-500">
                    No cases found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && (
          <div className="px-5 py-4 border-t border-neutral-200 flex items-center justify-between">
            <p className="text-body-sm text-neutral-500">
              Showing {meta.page * meta.limit - meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} cases
            </p>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary btn-sm"
                disabled={meta.page <= 1}
                onClick={() => handlePageChange(meta.page - 1)}
              >
                Previous
              </button>
              <button
                className="btn-secondary btn-sm"
                disabled={meta.page >= meta.totalPages}
                onClick={() => handlePageChange(meta.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}