import { useState } from 'react';
import { User, Bell, Shield, Key, Building, LogOut, Save, Loader2, CheckCircle, Users } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores/authStore';
import { clsx } from 'clsx';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'organization', label: 'Organization', icon: Building },
];

export function SettingsPage() {
  const { user, updateUser, clearAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'api-keys' | 'organization'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      updateUser({ name: profileData.name });
      setSuccessMessage('Profile updated successfully');
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      clearAuth();
    }
  };

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
                    onClick={() => setActiveTab(tab.id as any)}
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
                    <Badge variant="info">{user?.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Badge>
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
                <button className="btn-primary btn-sm">
                  <Key className="w-4 h-4 mr-2" />
                  Create API Key
                </button>
              </CardHeader>
              <CardBody>
                <div className="empty-state">
                  <Key className="empty-state-icon w-12 h-12" />
                  <p className="empty-state-title">No API Keys</p>
                  <p className="empty-state-description">Create an API key to access Sentinel programmatically.</p>
                  <button className="btn-primary btn-md mt-4">
                    <Key className="w-4 h-4 mr-2" />
                    Create Your First API Key
                  </button>
                </div>
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
                <div className="space-y-4">
                  <div>
                    <label className="label">Organization Name</label>
                    <input type="text" defaultValue="Acme Corporation" className="input" disabled />
                    <p className="form-hint">Only organization admins can change this.</p>
                  </div>
                  <div>
                    <label className="label">Slug</label>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">sentinel.io/</span>
                      <input type="text" defaultValue="acme-corp" className="input flex-1" disabled />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-200">
                  <h3 className="text-body-md font-medium text-neutral-900 mb-4">Members</h3>
                  <div className="empty-state py-8">
                    <Users className="empty-state-icon w-12 h-12" />
                    <p className="empty-state-title">Member Management</p>
                    <p className="empty-state-description">Invite and manage team members (requires org_admin role).</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}