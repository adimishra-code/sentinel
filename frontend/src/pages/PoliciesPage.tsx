import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Shield, Plus, CheckCircle, Archive, ChevronRight, Clock, Zap } from 'lucide-react';

interface PolicyCategory {
  id: string;
  name: string;
  description?: string;
  severityThreshold: number;
  firstOffenseAction: string;
  repeatOffenseAction: string;
  requiresHumanReview: boolean;
}

interface Policy {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  currentVersion: number;
  categories: PolicyCategory[];
  createdAt: string;
}

const DEFAULT_CATEGORIES: PolicyCategory[] = [
  { id: 'hate_speech', name: 'Hate Speech', severityThreshold: 0.7, firstOffenseAction: 'remove', repeatOffenseAction: 'remove', requiresHumanReview: true },
  { id: 'threat_direct', name: 'Direct Threats', severityThreshold: 0.6, firstOffenseAction: 'escalate', repeatOffenseAction: 'escalate', requiresHumanReview: true },
  { id: 'toxicity', name: 'Toxicity / Profanity', severityThreshold: 0.5, firstOffenseAction: 'warn', repeatOffenseAction: 'remove', requiresHumanReview: false },
  { id: 'spam', name: 'Spam', severityThreshold: 0.6, firstOffenseAction: 'remove', repeatOffenseAction: 'remove', requiresHumanReview: false },
  { id: 'sexual_harassment', name: 'Sexual Harassment', severityThreshold: 0.7, firstOffenseAction: 'remove', repeatOffenseAction: 'escalate', requiresHumanReview: false },
  { id: 'phishing', name: 'Phishing / Scams', severityThreshold: 0.7, firstOffenseAction: 'remove', repeatOffenseAction: 'remove', requiresHumanReview: true },
  { id: 'self_harm', name: 'Self-Harm Content', severityThreshold: 0.5, firstOffenseAction: 'escalate', repeatOffenseAction: 'escalate', requiresHumanReview: true },
];

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle },
  draft: { label: 'Draft', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  archived: { label: 'Archived', color: 'text-neutral-500 bg-neutral-50 border-neutral-200', icon: Archive },
};

function StatusBadge({ status }: { status: Policy['status'] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function CreatePolicyModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<PolicyCategory[]>(DEFAULT_CATEGORIES);

  const mutation = useMutation({
    mutationFn: (data: { name: string; description: string; categories: PolicyCategory[] }) =>
      api.post<Policy>('/policies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      onClose();
    },
  });

  const updateCategory = (id: string, field: keyof PolicyCategory, value: any) => {
    setCategories(cats => cats.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-heading-lg font-semibold text-neutral-900">Create Policy</h2>
          <p className="text-body-sm text-neutral-500 mt-1">Configure moderation categories and thresholds</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-1" htmlFor="policy-name">
                Policy Name *
              </label>
              <input
                id="policy-name"
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="e.g. Community Guidelines v2"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-1" htmlFor="policy-desc">
                Description
              </label>
              <textarea
                id="policy-desc"
                rows={2}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                placeholder="Brief description of this policy"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div>
            <h3 className="text-body-sm font-medium text-neutral-700 mb-3">Category Thresholds</h3>
            <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.id} className="p-3 border border-neutral-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body-sm font-medium text-neutral-900">{cat.name}</span>
                    <span className="text-caption text-neutral-500">
                      Threshold: {(cat.severityThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-caption text-neutral-500 mb-1">Threshold</label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={cat.severityThreshold}
                        onChange={e => updateCategory(cat.id, 'severityThreshold', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-caption text-neutral-500 mb-1">First offense</label>
                      <select
                        className="w-full px-2 py-1 text-caption border border-neutral-200 rounded"
                        value={cat.firstOffenseAction}
                        onChange={e => updateCategory(cat.id, 'firstOffenseAction', e.target.value)}
                      >
                        <option value="warn">Warn</option>
                        <option value="remove">Remove</option>
                        <option value="escalate">Escalate</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-caption text-neutral-500 mb-1">Human review</label>
                      <label className="flex items-center gap-2 mt-1.5">
                        <input
                          type="checkbox"
                          checked={cat.requiresHumanReview}
                          onChange={e => updateCategory(cat.id, 'requiresHumanReview', e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-caption text-neutral-600">Required</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-neutral-200 flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-body-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-brand-600 text-white text-body-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            disabled={!name.trim() || mutation.isPending}
            onClick={() => mutation.mutate({ name, description, categories })}
          >
            {mutation.isPending ? 'Creating...' : 'Create Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PoliciesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: () => api.get<{ items: Policy[]; pagination: any }>('/policies'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.post<Policy>(`/policies/${id}/activate`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post<Policy>(`/policies/${id}/archive`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
  });

  const policies = data?.items || [];
  const activePolicies = policies.filter(p => p.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-xl font-bold text-neutral-900">Policies</h1>
          <p className="text-body-sm text-neutral-500 mt-1">
            Manage moderation policies and category thresholds
          </p>
        </div>
        <button
          id="create-policy-btn"
          type="button"
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-body-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" />
          New Policy
        </button>
      </div>

      {/* Active Policy Banner */}
      {activePolicies.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <Zap className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-body-sm font-medium text-green-800">
              Active policy: {activePolicies[0].name}
            </p>
            <p className="text-caption text-green-600 mt-0.5">
              Version {activePolicies[0].currentVersion} — All new content is evaluated against this policy
            </p>
          </div>
        </div>
      )}

      {/* Policy List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-neutral-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-heading-md font-medium text-neutral-500">No policies yet</h3>
          <p className="text-body-sm text-neutral-400 mt-2">
            Create your first moderation policy to start enforcing content standards
          </p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-brand-600 text-white text-body-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
            onClick={() => setShowCreate(true)}
          >
            Create Policy
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map(policy => (
            <div
              key={policy.id}
              className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-brand-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-body-sm font-semibold text-neutral-900">{policy.name}</h3>
                    <StatusBadge status={policy.status} />
                    <span className="text-caption text-neutral-400">v{policy.currentVersion}</span>
                  </div>
                  {policy.description && (
                    <p className="text-body-sm text-neutral-500 mt-1">{policy.description}</p>
                  )}
                  <p className="text-caption text-neutral-400 mt-2">
                    {policy.categories?.length || 0} categories configured
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {policy.status === 'draft' && (
                    <button
                      type="button"
                      className="px-3 py-1.5 text-caption font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                      disabled={activateMutation.isPending}
                      onClick={() => activateMutation.mutate(policy.id)}
                    >
                      Activate
                    </button>
                  )}
                  {policy.status === 'active' && (
                    <button
                      type="button"
                      className="px-3 py-1.5 text-caption font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50"
                      disabled={archiveMutation.isPending}
                      onClick={() => archiveMutation.mutate(policy.id)}
                    >
                      Archive
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors"
                    aria-label="View policy details"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreatePolicyModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
