import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { appealsApi } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Scale, ChevronRight, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

type AppealStatus = 'pending' | 'under_review' | 'upheld' | 'reversed' | 'modified' | 'closed';

const statusConfig: Record<AppealStatus, { label: string; color: 'critical' | 'high' | 'medium' | 'low' | 'neutral'; icon: React.FC<any> }> = {
  pending: { label: 'Pending', color: 'medium', icon: Clock },
  under_review: { label: 'Under Review', color: 'high', icon: RefreshCw },
  upheld: { label: 'Upheld', color: 'critical', icon: XCircle },
  reversed: { label: 'Reversed', color: 'low', icon: CheckCircle },
  modified: { label: 'Modified', color: 'medium', icon: RefreshCw },
  closed: { label: 'Closed', color: 'neutral', icon: XCircle },
};

const STATUS_FILTERS: { value: '' | AppealStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'upheld', label: 'Upheld' },
  { value: 'reversed', label: 'Reversed' },
];

export function AppealsPage() {
  const [statusFilter, setStatusFilter] = useState<'' | AppealStatus>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['appeals', statusFilter, page],
    queryFn: () =>
      appealsApi.list({ status: statusFilter || undefined, page, limit: 20 }),
  });

  const appeals = (data as any)?.items ?? [];
  const pagination = (data as any)?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-semibold text-neutral-900">Appeals</h1>
          <p className="text-body-md text-neutral-500 mt-1">
            Review and manage user appeals against moderation decisions
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-body-sm font-medium border transition-colors',
              statusFilter === f.value
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Appeals table */}
      <Card className="p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Appeal ID</th>
                <th>Case</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Filed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="h-4 w-full max-w-[120px] bg-neutral-200 animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : appeals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Scale className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                    <p className="text-body-md text-neutral-500">No appeals found</p>
                    <p className="text-body-sm text-neutral-400 mt-1">Appeals will appear here when users contest moderation decisions</p>
                  </td>
                </tr>
              ) : (
                appeals.map((appeal: any) => {
                  const status = (appeal.status as AppealStatus) || 'pending';
                  const cfg = statusConfig[status] ?? statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <tr key={appeal.id || appeal._id}>
                      <td className="font-mono text-body-sm font-medium text-neutral-700">
                        #{(appeal.id || appeal._id || '').slice(-8)}
                      </td>
                      <td>
                        {appeal.caseId ? (
                          <NavLink
                            to={`/cases/${appeal.caseId}`}
                            className="text-brand-700 hover:text-brand-800 text-body-sm font-medium"
                          >
                            View Case <ChevronRight className="w-3.5 h-3.5 inline" />
                          </NavLink>
                        ) : (
                          <span className="text-neutral-400 text-body-sm">—</span>
                        )}
                      </td>
                      <td className="max-w-xs">
                        <p className="text-body-sm text-neutral-700 truncate">
                          {appeal.reason || 'No reason provided'}
                        </p>
                      </td>
                      <td>
                        <Badge variant={cfg.color}>
                          <Icon className="w-3 h-3 mr-1 inline" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="text-body-sm text-neutral-500">
                        {appeal.createdAt ? new Date(appeal.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <NavLink
                          to={`/appeals/${appeal.id || appeal._id}`}
                          className="text-body-sm text-brand-700 hover:text-brand-800 font-medium"
                        >
                          Details
                        </NavLink>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100">
            <p className="text-body-sm text-neutral-500">
              Page {pagination.page} of {pagination.totalPages} — {pagination.total} total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary btn-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className="btn-secondary btn-sm disabled:opacity-40"
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
