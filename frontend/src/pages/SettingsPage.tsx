import { useState, useCallback, useEffect } from 'react';
import { User, Bell, Shield, Key, Building, LogOut, Save, Loader2, CheckCircle, Users, Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores/authStore';
import { clsx } from 'clsx';
import { organizationsApi, apiKeysApi } from '../services/api';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'organization', label: 'Organization', icon: Building },
];

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'Organization Admin',
  moderator: 'Moderator',
  reviewer: 'Reviewer',
  end_user: 'End User',
  platform_admin: 'Platform Admin',
};

export function SettingsPage() {
  const { user, updateUser, clearAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'api-keys' | 'organization'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setSuccessMessage(null);
    setErrorMessage(null);
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    clearMessages();

    try {
      await updateUser({ name: profileData.name });
      setSuccessMessage('Profile updated successfully');
    } catch (err) {
      setErrorMessage('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      clearAuth();
    }
  };

  /* ============ API Keys state ============ */
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');
  const [keyPermissions, setKeyPermissions] = useState<string[]>(['content:submit']);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  const loadApiKeys = async () => {
    setApiKeysLoading(true);
    try {
      const data = await apiKeysApi.list();
      setApiKeys(Array.isArray(data) ? data : (data as any)?.items ?? []);
    } catch {
      setErrorMessage('Failed to load API keys');
    } finally {
      setApiKeysLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingKey(true);
    setNewKey(null);
    clearMessages();

    try {
      const result = await apiKeysApi.create({
        name: keyName.trim(),
        permissions: keyPermissions.filter(Boolean),
      });
      const created = result?.data ?? result;
      setNewKey(created.key ?? null);
      setKeyName('');
      setKeyPermissions(['content:submit']);
      setCreateModal(false);
      await loadApiKeys();
      setSuccessMessage('API key created. Copy it now — it will not be shown again.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return;
    setRevokingKeyId(id);
    clearMessages();
    try {
      await apiKeysApi.revoke(id);
      await loadApiKeys();
      setSuccessMessage('API key revoked.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to revoke API key');
    } finally {
      setRevokingKeyId(null);
    }
  };

  /* ============ Organization state ============ */
  const [org, setOrg] = useState<any>(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [editOrgName, setEditOrgName] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'org_admin' | 'moderator' | 'reviewer' | 'end_user'>('moderator');
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const loadOrganization = async () => {
    if (!user?.organizationId) return;
    setOrgLoading(true);
    try {
      const data = await organizationsApi.get(user.organizationId);
      setOrg(data);
      setEditOrgName(data.name);
    } catch {
      setErrorMessage('Failed to load organization');
    } finally {
      setOrgLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!user?.organizationId) return;
    setMembersLoading(true);
    try {
      const data = await organizationsApi.listMembers(user.organizationId);
      setMembers(Array.isArray(data) ? data : (data as any)?.items ?? []);
    } catch {
      setErrorMessage('Failed to load members');
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'organization') {
      loadOrganization();
      loadMembers();
    }
  }, [activeTab, user?.organizationId]);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrg(true);
    clearMessages();
    try {
      await organizationsApi.update(user!.organizationId, { name: editOrgName.trim() });
      if (org) setOrg({ ...org, name: editOrgName.trim() });
      setSuccessMessage('Organization name updated.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update organization');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    clearMessages();
    try {
      await organizationsApi.inviteMember(user!.organizationId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteModal(false);
      await loadMembers();
      setSuccessMessage('Invitation sent.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the organization?')) return;
    setRemovingMemberId(userId);
    clearMessages();
    try {
      await organizationsApi.removeMember(user!.organizationId, userId);
      await loadMembers();
      setSuccessMessage('Member removed.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleUpdateMember = async (member: any, role?: string) => {
    setUpdatingMemberId(member.id);
    clearMessages();
    try {
      await organizationsApi.updateMember(user!.organizationId, member.userId, { role });
      await loadMembers();
      setSuccessMessage('Member updated.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update member');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const lastOwner = members.filter((m) => m.role === 'org_admin' || m.role === 'platform_admin').length <= 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-display-sm font-semibold text-neutral-900">Settings</h1>
        <p className="text-body-md text-neutral-500 mt-1">Manage your account and preferences</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-status-low-50 border border-status-low-200 rounded-lg flex items-center gap-3 text-status-low-700" role="alert">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-body-sm">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-status-critical-50 border border-status-critical-200 rounded-lg flex items-center gap-3 text-status-critical-700" role="alert">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-body-sm">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <Card className="lg:col-span-1 p-0">
          <nav className="p-2" aria-label="Settings navigation">
            <ul className="space-y-1" role="list">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      clearMessages();
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm font-medium transition-colors duration-150 text-left',
                      activeTab === tab.id
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    )}
                  >
                    <tab.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-neutral-200 p-4">
            <button
              onClick={handleLogout}
              className="w-full btn-danger btn-sm justify-center"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </Card>

        {/* Tab Panels */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card className="p-0">
              <CardHeader>
                <h2 className="text-heading-md font-semibold text-neutral-900">Profile</h2>
                <p className="text-body-sm text-neutral-500 mt-1">Update your personal information</p>
              </CardHeader>
              <form onSubmit={handleSaveProfile} className="p-5 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-10 h-10 text-brand-700" />
                  </div>
                  <div>
                    <p className="text-heading-md font-semibold text-neutral-900">{profileData.name || 'No name set'}</p>
                    <p className="text-body-sm text-neutral-500">{profileData.email}</p>
                    <p className="text-caption text-neutral-400 capitalize mt-1">{user?.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="label">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="label">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="input"
                      required
                      disabled
                    />
                    <p className="form-hint">Email cannot be changed. Contact support for changes.</p>
                  </div>
                </div>

                <div>
                  <label className="label">Role</label>
                  <div className="input-disabled input cursor-default">
                    <Badge variant="info">{ROLE_LABELS[user?.role as string] || user?.role}</Badge>
                  </div>
                </div>

                <CardFooter>
                  <button type="submit" className="btn-primary btn-md" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card className="p-0">
              <CardHeader>
                <h2 className="text-heading-md font-semibold text-neutral-900">Notifications</h2>
                <p className="text-body-sm text-neutral-500 mt-1">Configure how you receive updates</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-body-md font-medium text-neutral-900">Email Notifications</h3>
                  {[
                    { id: 'case-assigned', label: 'Case Assigned', desc: 'When a case is assigned to you' },
                    { id: 'case-updated', label: 'Case Updates', desc: 'When a case you\'re watching is updated' },
                    { id: 'mentions', label: 'Mentions', desc: 'When you\'re mentioned in a case' },
                    { id: 'weekly-digest', label: 'Weekly Digest', desc: 'Summary of your cases each week' },
                  ].map((item) => (
                    <label key={item.id} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
                      <div>
                        <p className="text-body-md font-medium text-neutral-900">{item.label}</p>
                        <p className="text-body-sm text-neutral-500">{item.desc}</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 text-brand-600 rounded border-neutral-300 focus:ring-brand-500" />
                    </label>
                  ))}
                </div>

                <div className="pt-6 border-t border-neutral-200 space-y-4">
                  <h3 className="text-body-md font-medium text-neutral-900">In-App Notifications</h3>
                  {[
                    { id: 'realtime-cases', label: 'Real-time Case Updates', desc: 'Receive live updates via Socket.IO' },
                    { id: 'sound', label: 'Notification Sounds', desc: 'Play sound for new notifications' },
                  ].map((item) => (
                    <label key={item.id} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
                      <div>
                        <p className="text-body-md font-medium text-neutral-900">{item.label}</p>
                        <p className="text-body-sm text-neutral-500">{item.desc}</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 text-brand-600 rounded border-neutral-300 focus:ring-brand-500" />
                    </label>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card className="p-0">
              <CardHeader>
                <h2 className="text-heading-md font-semibold text-neutral-900">Security</h2>
                <p className="text-body-sm text-neutral-500 mt-1">Manage your account security settings</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div>
                      <p className="text-body-md font-medium text-neutral-900">Two-Factor Authentication</p>
                      <p className="text-body-sm text-neutral-500">Add an extra layer of security to your account</p>
                    </div>
                    <button className="btn-secondary btn-sm">Enable 2FA</button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div>
                      <p className="text-body-md font-medium text-neutral-900">Password</p>
                      <p className="text-body-sm text-neutral-500">Last changed: Never</p>
                    </div>
                    <button className="btn-secondary btn-sm">Change Password</button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div>
                      <p className="text-body-md font-medium text-neutral-900">Active Sessions</p>
                      <p className="text-body-sm text-neutral-500">1 active session (this device)</p>
                    </div>
                    <button className="btn-ghost btn-sm">View All</button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api-keys' && (
            <Card className="p-0">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-heading-md font-semibold text-neutral-900">API Keys</h2>
                  <p className="text-body-sm text-neutral-500 mt-1">Manage your API keys for programmatic access</p>
                </div>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => {
                    setKeyName('');
                    setKeyPermissions(['content:submit']);
                    setNewKey(null);
                    setCreateModal(true);
                  }}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Create API Key
                </button>
              </CardHeader>
              <CardBody>
                {apiKeysLoading ? (
                  <div className="py-10 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="empty-state py-8">
                    <Key className="empty-state-icon w-12 h-12" />
                    <p className="empty-state-title">No API Keys</p>
                    <p className="empty-state-description">Create an API key to access Sentinel programmatically.</p>
                    <button className="btn-primary btn-md mt-4" onClick={() => {
                      setKeyName('');
                      setKeyPermissions(['content:submit']);
                      setNewKey(null);
                      setCreateModal(true);
                    }}>
                      <Key className="w-4 h-4 mr-2" />
                      Create Your First API Key
                    </button>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Prefix</th>
                          <th>Permissions</th>
                          <th>Status</th>
                          <th>Last Used</th>
                          <th>Created</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeys.map((key: any) => (
                          <tr key={key.id}>
                            <td className="font-medium text-neutral-900">{key.name}</td>
                            <td className="font-mono text-body-sm text-neutral-600">{key.keyPrefix}</td>
                            <td className="text-body-sm text-neutral-700">
                              {key.permissions?.join(', ') || '—'}
                            </td>
                            <td>
                              <Badge variant={key.status === 'active' ? 'low' : 'neutral'}>
                                {key.status}
                              </Badge>
                            </td>
                            <td className="text-body-sm text-neutral-600">
                              {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="text-body-sm text-neutral-600">
                              {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : '—'}
                            </td>
                            <td>
                              <button
                                onClick={() => handleRevokeKey(key.id)}
                                disabled={revokingKeyId === key.id}
                                className="text-body-sm text-status-critical hover:text-status-critical-900 underline underline-offset-4"
                              >
                                {revokingKeyId === key.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                    Revoking...
                                  </>
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5 inline" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <Card className="p-0">
              <CardHeader>
                <h2 className="text-heading-md font-semibold text-neutral-900">Organization</h2>
                <p className="text-body-sm text-neutral-500 mt-1">Manage your organization settings</p>
              </CardHeader>
              <CardBody className="space-y-6">
                {orgLoading || membersLoading ? (
                  <div className="py-10 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Organization Name</label>
                        <form onSubmit={handleSaveOrg} className="space-y-2">
                          <input
                            type="text"
                            defaultValue={org?.name}
                            value={editOrgName}
                            onChange={(e) => setEditOrgName(e.target.value)}
                            className="input"
                            disabled={savingOrg}
                          />
                          <p className="form-hint">Only organization admins can change this.</p>
                          <button
                            type="submit"
                            className="btn-primary btn-sm"
                            disabled={savingOrg || !editOrgName.trim()}
                          >
                            {savingOrg ? 'Saving...' : 'Save Name'}
                          </button>
                        </form>
                      </div>
                      <div>
                        <label className="label">Slug</label>
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-400">sentinel.io/</span>
                          <input
                            type="text"
                            defaultValue={org?.slug}
                            className="input flex-1"
                            disabled
                          />
                          <p className="form-hint">Slug cannot be changed after creation.</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-neutral-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-body-md font-medium text-neutral-900">Members</h3>
                        <button
                          className="btn-secondary btn-sm flex items-center gap-2"
                          onClick={() => setInviteModal(true)}
                        >
                          <Plus className="w-4 h-4" />
                          Invite Member
                        </button>
                      </div>

                      {members.length === 0 ? (
                        <div className="empty-state py-8">
                          <Users className="empty-state-icon w-12 h-12" />
                          <p className="empty-state-title">No Members</p>
                          <p className="empty-state-description">Invite teammates to collaborate on moderation.</p>
                        </div>
                      ) : (
                        <div className="table-container">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Member</th>
                                <th>Role</th>
                                <th>Joined</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {members.map((member: any) => (
                                <tr key={member.id}>
                                  <td className="font-medium text-neutral-900">
                                    {member.user?.name || member.user?.email || 'Unknown'}
                                  </td>
                                  <td>
                                    <Badge variant="neutral">{ROLE_LABELS[member.role] || member.role}</Badge>
                                  </td>
                                  <td className="text-body-sm text-neutral-600">
                                    {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '—'}
                                  </td>
                                  <td>
                                    {member.userId === user?.id ? (
                                      <span className="text-body-xs text-neutral-400">You</span>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleUpdateMember(member, 'moderator')}
                                          disabled={updatingMemberId === member.id || lastOwner}
                                          className="btn-ghost btn-sm text-body-xs"
                                          title="Set as moderator"
                                        >
                                          {updatingMemberId === member.id ? (
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                          ) : (
                                            'Moderator'
                                          )}
                                        </button>
                                        <button
                                          onClick={() => handleRemoveMember(member.userId)}
                                          disabled={removingMemberId === member.id || lastOwner}
                                          className="btn-ghost btn-sm text-status-critical text-body-xs"
                                          title="Remove member"
                                        >
                                          {removingMemberId === member.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            'Remove'
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {lastOwner && (
                        <p className="text-body-xs text-neutral-400 mt-2">
                          You are the last organization admin — role changes and removal are disabled until another admin exists.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCreateModal(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-heading-lg font-semibold text-neutral-900">Create API Key</h2>
              <p className="text-body-sm text-neutral-500 mt-1">The key value is shown only once.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-body-sm font-medium text-neutral-700 mb-1" htmlFor="key-name">
                  Key Name *
                </label>
                <input
                  id="key-name"
                  type="text"
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  placeholder="e.g. Production Bot"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-body-sm font-medium text-neutral-700 mb-1">
                  Permissions
                </label>
                <div className="space-y-2">
                  {['content:submit', 'content:read', 'case:read', 'case:resolve', 'api_key:read'].map(perm => (
                    <label key={perm} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={keyPermissions.includes(perm)}
                        onChange={e => {
                          setKeyPermissions(e.target.checked
                            ? [...keyPermissions, perm]
                            : keyPermissions.filter(p => p !== perm)
                          )}
                        }
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      {perm}
                    </label>
                  ))}
                </div>
              </div>
              {newKey && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                  <p className="text-caption text-neutral-500 uppercase tracking-wider mb-1">Key Value (copy now)</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKey}
                      readOnly
                      className="flex-1 input font-mono text-body-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newKey);
                        setSuccessMessage('API key copied to clipboard.');
                      }}
                      className="btn-secondary btn-sm"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-caption text-neutral-500 mt-1">
                    Save this key securely. It will not be shown again.
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-neutral-200 flex items-center justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-body-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                onClick={() => setCreateModal(false)}
                disabled={creatingKey}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-brand-600 text-white text-body-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                disabled={creatingKey || !keyName.trim()}
                onClick={handleCreateKey}
              >
                {creatingKey ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setInviteModal(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-heading-lg font-semibold text-neutral-900">Invite Member</h2>
              <p className="text-body-sm text-neutral-500 mt-1">Invite a teammate to your organization.</p>
            </div>
            <form onSubmit={handleInviteMember} className="p-6 space-y-4">
              <div>
                <label className="block text-body-sm font-medium text-neutral-700 mb-1" htmlFor="invite-email">
                  Email *
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-body-sm font-medium text-neutral-700 mb-1" htmlFor="invite-role">
                  Role *
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-sm"
                >
                  <option value="org_admin">Organization Admin</option>
                  <option value="moderator">Moderator</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="end_user">End User</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-body-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                  onClick={() => setInviteModal(false)}
                  disabled={inviting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white text-body-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
