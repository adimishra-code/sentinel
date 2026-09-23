import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  MessageSquare,
  ExternalLink,
  Loader2,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { casesApi } from '../services/api';
import { clsx } from 'clsx';

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

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'ai' | 'history'>('overview');
  const [resolving, setResolving] = useState(false);
  const [resolveData, setResolveData] = useState({ action: '', rationale: '' });

  useEffect(() => {
    if (id) {
      fetchCase();
    }
  }, [id]);

  const fetchCase = async () => {
    try {
      setIsLoading(true);
      const data = await casesApi.get(id!);
      setCaseData(data);
    } catch (err) {
      setError('Failed to load case details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveData.action || !resolveData.rationale.trim()) return;

    setResolving(true);
    try {
      await casesApi.resolve(id!, {
        action: resolveData.action,
        rationale: resolveData.rationale,
      });
      fetchCase();
      setResolveData({ action: '', rationale: '' });
    } catch (err) {
      alert('Failed to resolve case');
    } finally {
      setResolving(false);
    }
  };

  const handleAssign = async () => {
    try {
      await casesApi.assign(id!);
      fetchCase();
    } catch (err) {
      alert('Failed to assign case');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <h2 className="text-heading-md font-semibold text-neutral-900">Case not found</h2>
        <p className="text-body-md text-neutral-500 mt-2">{error || 'The case you\'re looking for doesn\'t exist.'}</p>
        <button onClick={() => navigate('/cases')} className="mt-4 btn-primary btn-md">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cases
        </button>
      </div>
    );
  }

  const c = caseData;
  const severity = c.severity || 'low';
  const status = c.status || 'pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/cases')}
            className="btn-ghost btn-sm p-2 lg:hidden"
            aria-label="Back to cases"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <NavLink to="/cases" className="text-body-sm text-neutral-500 hover:text-neutral-700 mb-1 inline-block">
              <ArrowLeft className="w-4 h-4 inline mr-1" /> All Cases
            </NavLink>
            <h1 className="text-display-sm font-semibold text-neutral-900">{c.id}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={severityColors[severity] as any} dot>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Badge>
          <Badge variant={statusColors[status] as any}>
            {status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </Badge>
          {c.priority && (
            <Badge variant="info">
              P{['critical', 'high', 'medium', 'low'].indexOf(c.priority) + 1}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="tabs" role="tablist">
            {[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'content', label: 'Content', icon: MessageSquare },
              { id: 'ai', label: 'AI Analysis', icon: Shield },
              { id: 'history', label: 'History', icon: Clock },
            ].map((tab: { id: string; label: string; icon: any }) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  'tab',
                  activeTab === tab.id && 'tab-active'
                )}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Panels */}
          {activeTab === 'overview' && (
            <Card className="p-0">
              <div className="p-5 border-b border-neutral-200">
                <h2 className="text-heading-md font-semibold text-neutral-900">Case Overview</h2>
              </div>
              <div className="p-5 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-caption text-neutral-500 uppercase tracking-wider">Assignee</p>
                    <p className="text-body-md font-medium text-neutral-900 flex items-center gap-2">
                      {c.assignedTo ? (
                        <>
                          <User className="w-4 h-4 text-neutral-400" />
                          {c.assignedTo}
                        </>
                      ) : (
                        <span className="text-neutral-400">Unassigned</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-neutral-500 uppercase tracking-wider">Risk Score</p>
                    <p className="text-body-md font-medium text-neutral-900">{c.riskScore || 0}/100</p>
                  </div>
                  <div>
                    <p className="text-caption text-neutral-500 uppercase tracking-wider">Categories</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {c.categories?.map((cat: string) => (
                        <Badge key={cat} variant="neutral">{cat}</Badge>
                      )) || <span className="text-neutral-400 text-body-sm">None</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-caption text-neutral-500 uppercase tracking-wider">Created</p>
                    <p className="text-body-md font-medium text-neutral-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-400" />
                      {c.createdAt ? new Date(c.createdAt).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                </div>

                {c.contentId && (
                  <div className="pt-6 border-t border-neutral-200">
                    <p className="text-caption text-neutral-500 uppercase tracking-wider">Content ID</p>
                    <p className="font-mono text-body-sm text-neutral-700 mt-1">{c.contentId}</p>
                  </div>
                )}

                {c.resolvedAt && (
                  <div className="pt-6 border-t border-neutral-200 bg-low-50 rounded-lg p-4">
                    <p className="text-caption text-neutral-500 uppercase tracking-wider">Resolved</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-status-low" />
                        <span className="text-body-md font-medium text-neutral-900">
                          {c.resolvedBy || 'System'}
                        </span>
                      </div>
                      <span className="text-body-sm text-neutral-500">
                        {new Date(c.resolvedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'content' && (
            <Card className="p-0">
              <div className="p-5 border-b border-neutral-200">
                <h2 className="text-heading-md font-semibold text-neutral-900">Content Details</h2>
              </div>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <p className="text-caption text-neutral-500 uppercase tracking-wider">Content Type</p>
                    <p className="text-body-md font-medium text-neutral-900 mt-1 capitalize">{c.contentType || 'text'}</p>
                  </div>
                  {c.text && (
                    <div>
                      <p className="text-caption text-neutral-500 uppercase tracking-wider">Text Content</p>
                      <div className="mt-2 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                        <p className="text-body-md text-neutral-900 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    </div>
                  )}
                  {c.imageUrls?.length && (
                    <div>
                      <p className="text-caption text-neutral-500 uppercase tracking-wider">Images</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {c.imageUrls.map((url: string, i: number) => (
                          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200">
                            <img src={url} alt={`Content image ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {c.urls?.length && (
                    <div>
                      <p className="text-caption text-neutral-500 uppercase tracking-wider">URLs</p>
                      <ul className="mt-2 space-y-1">
                        {c.urls.map((url: string, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-neutral-400" />
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 text-body-sm truncate">
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.metadata && (
                    <div>
                      <p className="text-caption text-neutral-500 uppercase tracking-wider">Metadata</p>
                      <pre className="mt-2 p-4 bg-neutral-50 rounded-lg border border-neutral-200 overflow-x-auto text-body-sm text-neutral-700">
                        {JSON.stringify(c.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {activeTab === 'ai' && (
            <Card className="p-0">
              <div className="p-5 border-b border-neutral-200">
                <h2 className="text-heading-md font-semibold text-neutral-900">AI Analysis</h2>
              </div>
              <CardBody>
                {c.aiAnalysis ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-caption text-neutral-500 uppercase tracking-wider">Overall Assessment</p>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
                          <span className="text-display-sm font-bold text-brand-700">
                            {Math.round((c.aiAnalysis.overallSeverity || 0) * 100)}
                          </span>
                        </div>
                        <div>
                          <p className="text-heading-md font-semibold text-neutral-900">
                            {c.aiAnalysis.recommendedAction || 'No recommendation'}
                          </p>
                          <p className="text-body-sm text-neutral-500">
                            Confidence: {Math.round((c.aiAnalysis.confidence || 0) * 100)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {c.aiAnalysis.reasoning && (
                      <div>
                        <p className="text-caption text-neutral-500 uppercase tracking-wider">Reasoning</p>
                        <p className="mt-2 text-body-md text-neutral-700">{c.aiAnalysis.reasoning}</p>
                      </div>
                    )}

                    {c.aiAnalysis.categories?.length && (
                      <div>
                        <p className="text-caption text-neutral-500 uppercase tracking-wider">Category Scores</p>
                        <div className="mt-2 space-y-3">
                          {c.aiAnalysis.categories.map((cat: any) => (
                            <div key={cat.category} className="space-y-1">
                              <div className="flex justify-between text-body-sm">
                                <span className="font-medium text-neutral-900">{cat.category}</span>
                                <span className="text-neutral-500">{Math.round(cat.score * 100)}%</span>
                              </div>
                              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-500 rounded-full transition-all duration-300"
                                  style={{ width: `${cat.score * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {c.aiAnalysis.evidence?.length && (
                      <div>
                        <p className="text-caption text-neutral-500 uppercase tracking-wider">Evidence</p>
                        <ul className="mt-2 space-y-1">
                          {c.aiAnalysis.evidence.map((e: string, i: number) => (
                            <li key={i} className="text-body-sm text-neutral-700 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-status-low flex-shrink-0" />
                              {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.aiAnalysis.requiresHumanReview && (
                      <div className="p-4 bg-status-high-50 border border-status-high-200 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-status-high mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-status-high-900">Human Review Required</p>
                          <p className="text-body-sm text-status-high-700 mt-1">
                            This case has been flagged for human review based on AI analysis.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Shield className="empty-state-icon w-12 h-12" />
                    <p className="empty-state-title">No AI Analysis Available</p>
                    <p className="empty-state-description">AI analysis will appear here after content processing.</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {activeTab === 'history' && (
            <Card className="p-0">
              <div className="p-5 border-b border-neutral-200">
                <h2 className="text-heading-md font-semibold text-neutral-900">Case History</h2>
              </div>
              <CardBody>
                {c.history?.length ? (
                  <div className="space-y-4">
                    {c.history.map((entry: any, i: number) => (
                      <div key={i} className="flex gap-4 pb-4 border-b border-neutral-100 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-brand-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm font-medium text-neutral-900">{entry.action}</p>
                          <p className="text-caption text-neutral-500">{entry.details}</p>
                          <p className="text-caption text-neutral-400">{new Date(entry.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Clock className="empty-state-icon w-12 h-12" />
                    <p className="empty-state-title">No History</p>
                    <p className="empty-state-description">Case history will appear here as actions are taken.</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-4">
          <Card className="p-0">
            <div className="p-5 border-b border-neutral-200">
              <h2 className="text-heading-md font-semibold text-neutral-900">Actions</h2>
            </div>
            <CardBody className="space-y-3">
              {!c.assignedTo && c.status !== 'resolved' && c.status !== 'dismissed' && (
                <button
                  onClick={handleAssign}
                  className="btn-secondary btn-md w-full justify-start"
                  disabled={resolving}
                >
                  <User className="w-4 h-4" />
                  Assign to Me
                </button>
              )}

              {c.status !== 'resolved' && c.status !== 'dismissed' && (
                <button
                  className="btn-primary btn-md w-full justify-start"
                  data-modal-target="resolve-modal"
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolve Case
                </button>
              )}

              {c.status === 'resolved' && (
                <Badge variant="low" className="w-full justify-center">
                  <CheckCircle className="w-3 h-3" />
                  Case Resolved
                </Badge>
              )}

              {c.status === 'dismissed' && (
                <Badge variant="neutral" className="w-full justify-center">
                  <XCircle className="w-3 h-3" />
                  Case Dismissed
                </Badge>
              )}

              <div className="pt-3 border-t border-neutral-200">
                <NavLink to={`/cases/${c.id}/appeal`} className="btn-ghost btn-md w-full justify-start">
                  <MessageSquare className="w-4 h-4" />
                  View Appeals
                </NavLink>
              </div>
            </CardBody>
          </Card>

          {/* Quick Info */}
          <Card className="p-0">
            <div className="p-5 border-b border-neutral-200">
              <h2 className="text-heading-md font-semibold text-neutral-900">Quick Info</h2>
            </div>
            <CardBody className="space-y-3">
              <dl className="space-y-3 text-body-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Case ID</dt>
                  <dd className="font-mono font-medium text-neutral-900">{c.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Organization</dt>
                  <dd className="font-medium text-neutral-900 truncate">{c.organizationId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Content ID</dt>
                  <dd className="font-mono font-medium text-neutral-900 truncate">{c.contentId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Created</dt>
                  <dd className="text-neutral-900">{c.createdAt ? new Date(c.createdAt).toLocaleString() : 'Unknown'}</dd>
                </div>
                {c.assignedAt && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Assigned</dt>
                    <dd className="text-neutral-900">{new Date(c.assignedAt).toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Resolve Modal */}
      <div
        id="resolve-modal"
        className="modal-overlay hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-modal-title"
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3 id="resolve-modal-title" className="text-heading-md font-semibold text-neutral-900">Resolve Case</h3>
            <button
              className="btn-ghost btn-sm"
              onClick={() => document.getElementById('resolve-modal')?.classList.add('hidden')}
              aria-label="Close modal"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleResolve} className="modal-body space-y-4">
            <div>
              <label htmlFor="action" className="label">Action</label>
              <select
                id="action"
                value={resolveData.action}
                onChange={(e) => setResolveData({ ...resolveData, action: e.target.value })}
                className="input"
                required
              >
                <option value="">Select action</option>
                <option value="allow">Allow</option>
                <option value="allow_and_monitor">Allow & Monitor</option>
                <option value="warn">Warn User</option>
                <option value="limit">Limit Visibility</option>
                <option value="remove">Remove Content</option>
                <option value="review">Requires Review</option>
                <option value="escalate">Escalate</option>
                <option value="suspend">Suspend User</option>
              </select>
            </div>
            <div>
              <label htmlFor="rationale" className="label">Rationale <span className="text-status-critical">*</span></label>
              <textarea
                id="rationale"
                value={resolveData.rationale}
                onChange={(e) => setResolveData({ ...resolveData, rationale: e.target.value })}
                className="input min-h-[100px] resize-y"
                placeholder="Explain the reasoning for this decision..."
                required
                rows={4}
              />
            </div>
          </form>
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary btn-md"
              onClick={() => document.getElementById('resolve-modal')?.classList.add('hidden')}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="resolve-modal-form"
              className="btn-primary btn-md"
              disabled={resolving}
            >
              {resolving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Resolving...
                </>
              ) : (
                'Resolve Case'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}