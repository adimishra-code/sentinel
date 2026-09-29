import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Copy,
  Check,
  Calendar,
  Layers,
  Activity,
  UserCheck,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { auditApi } from '../services/api';

interface AuditItem {
  id: string;
  action: string;
  actorId: string;
  actorType: 'user' | 'system' | 'api_key';
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, any> = { page, limit: 15 };
    if (selectedAction !== 'all') p.action = selectedAction;
    if (selectedEntityType !== 'all') p.entityType = selectedEntityType;
    if (searchQuery.trim()) {
      if (searchQuery.startsWith('usr_') || searchQuery.length === 24) {
        p.actorId = searchQuery.trim();
      } else {
        p.entityId = searchQuery.trim();
      }
    }
    return p;
  }, [page, selectedAction, selectedEntityType, searchQuery]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => auditApi.list(queryParams),
  });

  const logs: AuditItem[] = data?.items || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sentinel-audit-logs-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportLogsAsCsv = () => {
    const headers = ['ID', 'Timestamp', 'Action', 'Actor Type', 'Actor ID', 'Entity Type', 'Entity ID', 'IP Address'];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.createdAt).toISOString(),
      l.action,
      l.actorType,
      l.actorId,
      l.entityType,
      l.entityId,
      l.ipAddress || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sentinel-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const getActionBadgeVariant = (action: string): 'critical' | 'high' | 'medium' | 'low' | 'info' | 'neutral' => {
    if (action.includes('delete') || action.includes('archive') || action.includes('dismiss')) return 'critical';
    if (action.includes('resolve') || action.includes('activate')) return 'low';
    if (action.includes('create') || action.includes('update')) return 'info';
    if (action.includes('assign')) return 'medium';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-semibold text-neutral-900">Audit Logs</h1>
          <p className="text-body-md text-neutral-500 mt-1">
            Immutable enterprise audit trail of administrative, moderation, and policy actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportLogsAsCsv}
            disabled={logs.length === 0}
            className="btn-secondary btn-sm"
            title="Export as CSV"
          >
            <Download className="w-4 h-4 mr-1.5" />
            CSV
          </button>
          <button
            onClick={exportLogsAsJson}
            disabled={logs.length === 0}
            className="btn-secondary btn-sm"
            title="Export as JSON"
          >
            <Download className="w-4 h-4 mr-1.5" />
            JSON
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary btn-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-neutral-500 font-medium uppercase tracking-wider">Total Recorded Events</p>
              <p className="text-heading-lg font-bold text-neutral-900 mt-1">{pagination.total || logs.length}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-neutral-500 font-medium uppercase tracking-wider">Policy Lifecycle</p>
              <p className="text-heading-lg font-bold text-neutral-900 mt-1">
                {logs.filter((l) => l.entityType === 'policy').length}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-neutral-500 font-medium uppercase tracking-wider">Moderation Decisions</p>
              <p className="text-heading-lg font-bold text-neutral-900 mt-1">
                {logs.filter((l) => l.action.startsWith('case.')).length}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-neutral-500 font-medium uppercase tracking-wider">Access & Auth</p>
              <p className="text-heading-lg font-bold text-neutral-900 mt-1">
                {logs.filter((l) => l.action.startsWith('auth.') || l.action.startsWith('api_key.')).length}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by Actor ID or Entity ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="input pl-9 w-full"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setPage(1);
                }}
                className="input w-auto min-w-[150px]"
              >
                <option value="all">All Actions</option>
                <option value="case.resolved">Case Resolved</option>
                <option value="case.assigned">Case Assigned</option>
                <option value="case.bulk_assign">Case Bulk Assign</option>
                <option value="case.bulk_dismiss">Case Bulk Dismiss</option>
                <option value="policy.created">Policy Created</option>
                <option value="policy.updated">Policy Updated</option>
                <option value="policy.activated">Policy Activated</option>
                <option value="policy.archived">Policy Archived</option>
                <option value="appeal.created">Appeal Created</option>
                <option value="appeal.resolved">Appeal Resolved</option>
                <option value="auth.login">Auth Login</option>
                <option value="api_key.created">API Key Created</option>
              </select>
            </div>

            <select
              value={selectedEntityType}
              onChange={(e) => {
                setSelectedEntityType(e.target.value);
                setPage(1);
              }}
              className="input w-auto min-w-[140px]"
            >
              <option value="all">All Entities</option>
              <option value="case">Cases</option>
              <option value="policy">Policies</option>
              <option value="appeal">Appeals</option>
              <option value="user">Users</option>
              <option value="api_key">API Keys</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-heading-sm font-semibold text-neutral-900">Activity Records</h2>
            <span className="text-caption text-neutral-500 font-mono">
              ({pagination.total || logs.length} total)
            </span>
          </div>
          {isFetching && <span className="text-caption text-neutral-400 animate-pulse">Syncing...</span>}
        </CardHeader>

        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
                  <div className="space-y-2 w-1/3">
                    <div className="h-4 bg-neutral-200 rounded w-3/4" />
                    <div className="h-3 bg-neutral-100 rounded w-1/2" />
                  </div>
                  <div className="h-6 bg-neutral-200 rounded w-24" />
                  <div className="h-4 bg-neutral-100 rounded w-32" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <h3 className="text-heading-sm font-medium text-neutral-900">No audit events found</h3>
              <p className="text-body-sm text-neutral-500 mt-1 max-w-sm mx-auto">
                No audit entries match the current filter criteria or search query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-caption font-semibold text-neutral-600 border-b border-neutral-200">
                    <th className="py-3 px-6">Timestamp</th>
                    <th className="py-3 px-6">Action</th>
                    <th className="py-3 px-6">Entity</th>
                    <th className="py-3 px-6">Actor</th>
                    <th className="py-3 px-6">Client IP</th>
                    <th className="py-3 px-6 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-body-sm">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-neutral-50/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-3.5 px-6 whitespace-nowrap text-neutral-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="font-mono text-xs">
                            {new Date(log.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <Badge variant={getActionBadgeVariant(log.action)} dot>
                          {log.action}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-neutral-900 capitalize text-xs">
                            {log.entityType}
                          </span>
                          <span className="font-mono text-[11px] text-neutral-500 truncate max-w-[130px]">
                            {log.entityId}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-100 text-neutral-600 border border-neutral-200">
                            {log.actorType}
                          </span>
                          <span className="font-mono text-xs text-neutral-700 truncate max-w-[120px]">
                            {log.actorId}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap font-mono text-xs text-neutral-500">
                        {log.ipAddress || '—'}
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="btn-secondary btn-sm p-1.5 text-neutral-600 hover:text-neutral-900"
                          title="View audit event payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="border-t border-neutral-200 px-6 py-3.5 flex items-center justify-between text-body-sm text-neutral-600">
            <div>
              Page <span className="font-medium text-neutral-900">{pagination.page}</span> of{' '}
              <span className="font-medium text-neutral-900">{pagination.totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || isFetching}
                className="btn-secondary btn-sm disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages || isFetching}
                className="btn-secondary btn-sm disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-neutral-700" />
                <h3 className="text-heading-sm font-semibold text-neutral-900">Audit Record Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-xs">
                <div>
                  <span className="text-neutral-400 uppercase font-semibold">Event ID:</span>
                  <p className="font-mono text-neutral-900 mt-0.5 truncate">{selectedLog.id}</p>
                </div>
                <div>
                  <span className="text-neutral-400 uppercase font-semibold">Timestamp:</span>
                  <p className="font-mono text-neutral-900 mt-0.5">
                    {new Date(selectedLog.createdAt).toISOString()}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-400 uppercase font-semibold">Action:</span>
                  <div className="mt-1">
                    <Badge variant={getActionBadgeVariant(selectedLog.action)} dot>
                      {selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-neutral-400 uppercase font-semibold">Actor:</span>
                  <p className="font-mono text-neutral-900 mt-0.5">
                    [{selectedLog.actorType}] {selectedLog.actorId}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-400 uppercase font-semibold">Entity Type:</span>
                  <p className="font-medium text-neutral-900 mt-0.5 capitalize">{selectedLog.entityType}</p>
                </div>
                <div>
                  <span className="text-neutral-400 uppercase font-semibold">Entity ID:</span>
                  <p className="font-mono text-neutral-900 mt-0.5 truncate">{selectedLog.entityId}</p>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <span className="text-neutral-400 uppercase font-semibold">Client IP:</span>
                    <p className="font-mono text-neutral-900 mt-0.5">{selectedLog.ipAddress}</p>
                  </div>
                )}
                {selectedLog.userAgent && (
                  <div className="col-span-2">
                    <span className="text-neutral-400 uppercase font-semibold">User Agent:</span>
                    <p className="font-mono text-neutral-700 mt-0.5 truncate text-[11px]">
                      {selectedLog.userAgent}
                    </p>
                  </div>
                )}
              </div>

              {/* Changes Payload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                    Changes / Diff Payload
                  </h4>
                  {selectedLog.changes && (
                    <button
                      onClick={() => handleCopy(JSON.stringify(selectedLog.changes, null, 2), 'changes')}
                      className="text-xs flex items-center gap-1 text-neutral-500 hover:text-neutral-800"
                    >
                      {copiedId === 'changes' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === 'changes' ? 'Copied' : 'Copy JSON'}
                    </button>
                  )}
                </div>
                <pre className="p-3 bg-neutral-900 text-neutral-100 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                  {selectedLog.changes && Object.keys(selectedLog.changes).length > 0
                    ? JSON.stringify(selectedLog.changes, null, 2)
                    : '// No state changes recorded for this action'}
                </pre>
              </div>

              {/* Metadata Payload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                    Context Metadata
                  </h4>
                  {selectedLog.metadata && (
                    <button
                      onClick={() => handleCopy(JSON.stringify(selectedLog.metadata, null, 2), 'metadata')}
                      className="text-xs flex items-center gap-1 text-neutral-500 hover:text-neutral-800"
                    >
                      {copiedId === 'metadata' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === 'metadata' ? 'Copied' : 'Copy JSON'}
                    </button>
                  )}
                </div>
                <pre className="p-3 bg-neutral-900 text-neutral-100 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0
                    ? JSON.stringify(selectedLog.metadata, null, 2)
                    : '// No additional metadata payload'}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="btn-primary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
