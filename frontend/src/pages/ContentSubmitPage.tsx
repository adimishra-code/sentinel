import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  Send,
  FileText,
  Image,
  Link,
} from 'lucide-react';

type ContentType = 'text' | 'image' | 'url';

type Decision = 'allow' | 'allow_and_monitor' | 'remove' | 'review';

interface ModerationResult {
  contentId: string;
  decision: Decision;
  riskScore: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  categories: string[];
  requiresHumanReview: boolean;
  reasoning: string[];
  caseId?: string;
  processedAt: string;
}

const decisionConfig: Record<Decision, { label: string; color: 'critical' | 'high' | 'medium' | 'low' | 'neutral'; icon: React.FC<any> }> = {
  allow: { label: 'Allowed', color: 'low', icon: CheckCircle },
  allow_and_monitor: { label: 'Allowed — Monitoring', color: 'medium', icon: Clock },
  remove: { label: 'Removed', color: 'critical', icon: AlertTriangle },
  review: { label: 'Sent to Review', color: 'high', icon: Clock },
};

const contentTypes: { id: ContentType; label: string; icon: React.FC<any>; placeholder: string }[] = [
  { id: 'text', label: 'Text', icon: FileText, placeholder: 'Paste or type the content you want to moderate...' },
  { id: 'image', label: 'Image URL', icon: Image, placeholder: 'https://example.com/image.jpg' },
  { id: 'url', label: 'URL / Link', icon: Link, placeholder: 'https://example.com/post/123' },
];

export function ContentSubmitPage() {
  const navigate = useNavigate();
  const [contentType, setContentType] = useState<ContentType>('text');
  const [text, setText] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ModerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const payload: Record<string, any> = {
        contentType,
        authorId: authorId.trim() || undefined,
        sourcePlatform: sourcePlatform.trim() || undefined,
      };

      if (contentType === 'text') payload.text = text.trim();
      else if (contentType === 'image') payload.imageUrls = [text.trim()];
      else if (contentType === 'url') payload.urls = [text.trim()];

      const res = await api.post<ModerationResult>('/moderate', payload);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setText('');
    setAuthorId('');
    setSourcePlatform('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-display-sm font-semibold text-neutral-900">Submit Content</h1>
          <p className="text-body-sm text-neutral-500 mt-0.5">
            Submit content for AI-assisted moderation and risk scoring
          </p>
        </div>
      </div>

      {/* Result card */}
      {result && (
        <Card className="p-5 border-2 border-neutral-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-body-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">
                Moderation Result
              </p>
              <div className="flex items-center gap-2">
                {(() => {
                  const cfg = decisionConfig[result.decision];
                  const Icon = cfg.icon;
                  return (
                    <>
                      <Icon className="w-5 h-5 text-neutral-700" />
                      <span className="text-heading-md font-semibold text-neutral-900">{cfg.label}</span>
                      <Badge variant={cfg.color}>{result.severity}</Badge>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="text-right">
              <p className="text-body-xs text-neutral-500">Risk Score</p>
              <p className="text-display-sm font-bold text-neutral-900">
                {Math.round(result.riskScore * 100)}
                <span className="text-body-sm text-neutral-400 font-normal">/100</span>
              </p>
            </div>
          </div>

          {result.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {result.categories.map((cat) => (
                <Badge key={cat} variant="neutral">{cat}</Badge>
              ))}
            </div>
          )}

          {result.reasoning.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-3 mb-4">
              <p className="text-body-xs font-medium text-neutral-600 mb-2">Analysis reasoning</p>
              <ul className="space-y-1">
                {result.reasoning.map((r, i) => (
                  <li key={i} className="text-body-sm text-neutral-700 flex gap-2">
                    <span className="text-neutral-400 flex-shrink-0">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {result.caseId && (
                <button
                  onClick={() => navigate(`/cases/${result.caseId}`)}
                  className="btn-primary btn-sm"
                >
                  View Case
                </button>
              )}
              <button onClick={handleReset} className="btn-secondary btn-sm">
                Submit Another
              </button>
            </div>
            <p className="text-caption text-neutral-400">
              ID: <span className="font-mono">{result.contentId.slice(-8)}</span>
            </p>
          </div>
        </Card>
      )}

      {/* Form */}
      {!result && (
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Content type tabs */}
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">
                Content Type
              </label>
              <div className="flex gap-2">
                {contentTypes.map((ct) => {
                  const Icon = ct.icon;
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => { setContentType(ct.id); setText(''); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-body-sm font-medium border transition-colors ${
                        contentType === ct.id
                          ? 'bg-brand-50 border-brand-300 text-brand-700'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {ct.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content input */}
            <div>
              <label htmlFor="content-input" className="block text-body-sm font-medium text-neutral-700 mb-2">
                {contentType === 'text' ? 'Content Text' : contentType === 'image' ? 'Image URL' : 'URL'}
                <span className="text-status-critical ml-1">*</span>
              </label>
              {contentType === 'text' ? (
                <textarea
                  id="content-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  className="input w-full resize-none font-mono text-body-sm"
                  placeholder={contentTypes.find(c => c.id === contentType)?.placeholder}
                  required
                />
              ) : (
                <input
                  id="content-input"
                  type="url"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="input w-full"
                  placeholder={contentTypes.find(c => c.id === contentType)?.placeholder}
                  required
                />
              )}
            </div>

            {/* Optional metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="author-id" className="block text-body-sm font-medium text-neutral-700 mb-2">
                  Author ID <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <input
                  id="author-id"
                  type="text"
                  value={authorId}
                  onChange={(e) => setAuthorId(e.target.value)}
                  className="input w-full"
                  placeholder="user_123"
                />
              </div>
              <div>
                <label htmlFor="source-platform" className="block text-body-sm font-medium text-neutral-700 mb-2">
                  Source Platform <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <input
                  id="source-platform"
                  type="text"
                  value={sourcePlatform}
                  onChange={(e) => setSourcePlatform(e.target.value)}
                  className="input w-full"
                  placeholder="forum, chat, review..."
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-body-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-caption text-neutral-400">
                Content is analyzed using AI + rule-based detection
              </p>
              <button
                type="submit"
                disabled={isSubmitting || !text.trim()}
                className="btn-primary btn-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit for Moderation
                  </>
                )}
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
