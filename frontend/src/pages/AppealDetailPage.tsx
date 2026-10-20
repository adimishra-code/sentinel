import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useState } from 'react';
import {
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Loader2,
  ArrowLeft,
  Save,
} from 'lucide-react';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAppeal, useResolveAppeal } from '../hooks/queries';
import { CanDo } from '../components/CanDo';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'medium' },
  in_review: { label: 'Under Review', color: 'high' },
  upheld: { label: 'Upheld', color: 'critical' },
  reversed: { label: 'Reversed', color: 'low' },
  modified: { label: 'Modified', color: 'medium' },
  closed: { label: 'Closed', color: 'neutral' },
};

export function AppealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const resolveAppeal = useResolveAppeal();
  const [resolveData, setResolveData] = useState({ outcome: '', reviewerNotes: '' });
  const [showToast, setShowToast] = useState(false);

  const { data: appeal, isLoading, error } = useAppeal(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !appeal) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <h2 className="text-heading-md font-semibold text-neutral-900">Appeal not found</h2>
        <p className="text-body-md text-neutral-500 mt-2">
          {error?.message || 'The appeal you\'re looking for doesn\'t exist.'}
        </p>
        <button onClick={() => navigate('/appeals')} className="mt-4 btn-primary btn-md">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Appeals
        </button>
      </div>
    );
  }

  const a = appeal as any;
  const cfg = statusConfig[a.status] ?? statusConfig.pending;

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveData.outcome || !resolveData.reviewerNotes.trim()) return;

    try {
      await resolveAppeal.mutateAsync({
        id: a.id,
        data: { outcome: resolveData.outcome, reviewerNotes: resolveData.reviewerNotes },
      });
      setResolveData({ outcome: '', reviewerNotes: '' });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch {
      // Error handled by React Query / API error response
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/appeals')}
            className="btn-ghost btn-sm p-2 lg:hidden"
            aria-label="Back to appeals"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <NavLink to="/appeals" className="text-body-sm text-neutral-500 hover:text-neutral-700 mb-1 inline-block">
              <ArrowLeft className="w-4 h-4 inline mr-1" /> All Appeals
            </NavLink>
            <h1 className="text-display-sm font-semibold text-neutral-900">Appeal #{a.id?.slice(-8)}</h1>
          </div>
        </div>
        <Badge variant={cfg.color as any}>{cfg.label}</Badge>
      </div>

      {showToast && (
        <div className="p-4 bg-status-low-50 border border-status-low-200 rounded-lg flex items-center gap-3 text-status-low-700" role="alert">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-body-sm">Appeal resolved successfully.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appeal details */}
          <Card className="p-0">
            <div className="p-5 border-b border-neutral-200">
              <h2 className="text-heading-md font-semibold text-neutral-900">Appeal Details</h2>
            </div>
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-caption text-neutral-500 uppercase tracking-wider">Appellant</p>
                  <p className="text-body-md font-medium text-neutral-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-neutral-400" />
                    {a.user?.name || 'Unknown user'}
                  </p>
                </div>
                <div>
                  <p className="text-caption text-neutral-500 uppercase tracking-wider">Filed</p>
                  <p className="text-body-md font-medium text-neutral-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : 'Unknown'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-caption text-neutral-500 uppercase tracking-wider">Reason</p>
                  <p className="mt-2 text-body-md text-neutral-700 whitespace-pre-wrap">
                    {a.reason || 'No reason provided'}
                  </p>
                </div>
              </div>

              {a.outcome && (
                <div className="pt-6 border-t border-neutral-200">
                  <p className="text-caption text-neutral-500 uppercase tracking-wider">Outcome</p>
                  <div className="mt-2 flex items-center gap-3">
                    <Badge variant={(statusConfig[a.outcome]?.color ?? 'neutral') as any}>
                      {a.outcome.charAt(0).toUpperCase() + a.outcome.slice(1)}
                    </Badge>
                    {a.reviewedAt && (
                      <span className="text-body-sm text-neutral-500">
                        Reviewed {new Date(a.reviewedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {a.outcomeRationale && (
                <div className="pt-6 border-t border-neutral-200">
                  <p className="text-caption text-neutral-500 uppercase tracking-wider">Reviewer Notes</p>
                  <p className="mt-2 text-body-md text-neutral-700 whitespace-pre-wrap">
                    {a.outcomeRationale}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Linked case */}
          {a.case && (
            <Card className="p-0">
              <div className="p-5 border-b border-neutral-200">
                <h2 className="text-heading-md font-semibold text-neutral-900">Linked Case</h2>
              </div>
              <CardBody className="p-5 space-y-4">
                <NavLink to={`/cases/${a.case.id}`} className="text-brand-700 hover:text-brand-800 font-medium text-body-sm">
                  View Case <MessageSquare className="w-4 h-4 inline ml-1" />
                </NavLink>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-caption text-neutral-500 uppercase tracking-wider">Status</p>
                    <p className="text-body-md font-medium text-neutral-900">
                      {a.case.status?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-neutral-500 uppercase tracking-wider">Categories</p>
                    <p className="text-body-md text-neutral-700">
                      {(a.case.categories?.join(', ') || 'None')}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-neutral-500 uppercase tracking-wider">Risk Score</p>
                    <p className="text-body-md font-medium text-neutral-900">
                      {a.case.riskScore != null ? Math.round(a.case.riskScore * 100) + '%' : '—'}
                    </p>
                  </div>
                </div>
                {a.case.content && (
                  <div className="pt-4 border-t border-neutral-200">
                    <p className="text-caption text-neutral-500 uppercase tracking-wider">Content</p>
                    <p className="mt-2 text-body-sm text-neutral-700 whitespace-pre-wrap truncate md:truncate-none max-w-none">
                      {a.case.content.text || 'No text'}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Original decision */}
          {a.originalDecision && (
            <Card className="p-0">
              <div className="p-5 border-b border-neutral-200">
                <h2 className="text-heading-md font-semibold text-neutral-900">Original Decision</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="neutral">{a.originalDecision.action}</Badge>
                  <p className="text-body-sm text-neutral-600">Original moderator action</p>
                </div>
                <p className="text-caption text-neutral-500 uppercase tracking-wider">Rationale</p>
                <p className="text-body-md text-neutral-700 whitespace-pre-wrap">
                  {a.originalDecision.rationale || 'No rationale recorded'}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar - Resolve action */}
        <div className="space-y-4">
          <Card className="p-0">
            <div className="p-5 border-b border-neutral-200">
              <h2 className="text-heading-md font-semibold text-neutral-900">Resolve Appeal</h2>
            </div>
            <CardBody className="space-y-4">
              <p className="text-body-sm text-neutral-600">
                Only org admins and reviewers can resolve appeals.
              </p>
              <CanDo roles={['org_admin', 'reviewer']}>
                <form onSubmit={handleResolve} className="space-y-4">
                  <div>
                    <label htmlFor="outcome" className="label">Outcome <span className="text-status-critical">*</span></label>
                    <select
                      id="outcome"
                      value={resolveData.outcome}
                      onChange={(e) => setResolveData({ ...resolveData, outcome: e.target.value })}
                      className="input w-full"
                      required
                    >
                      <option value="">Select outcome</option>
                      <option value="upheld">Upheld</option>
                      <option value="reversed">Reversed</option>
                      <option value="modified">Modified</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="reviewerNotes" className="label">Reviewer Notes <span className="text-status-critical">*</span></label>
                    <textarea
                      id="reviewerNotes"
                      value={resolveData.reviewerNotes}
                      onChange={(e) => setResolveData({ ...resolveData, reviewerNotes: e.target.value })}
                      className="input w-full min-h-[100px] resize-y"
                      placeholder="Explain the reasoning for this decision..."
                      required
                      rows={4}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary btn-md w-full justify-start"
                    disabled={resolveAppeal.isPending}
                  >
                    {resolveAppeal.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Resolving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Resolve Appeal
                      </>
                    )}
                  </button>
                </form>
              </CanDo>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
