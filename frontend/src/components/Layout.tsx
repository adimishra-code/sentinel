import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  BarChart2,
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Cases', href: '/cases', icon: FileText },
  { name: 'Analytics', href: '/analytics', icon: BarChart2 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Layout() {
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    setUserMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-overlay bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-sticky w-64 bg-white border-r border-neutral-200 transform transition-transform duration-200 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-neutral-200">
          <h1 className="text-heading-lg font-semibold text-brand-900">Sentinel</h1>
          <button
            className="lg:hidden p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main">
          <ul className="space-y-1" role="list">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm font-medium transition-colors duration-150',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {item.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <User className="w-5 h-5 text-brand-700" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-neutral-900 truncate">{user?.name}</p>
              <p className="text-caption text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-dropdown bg-white/80 backdrop-blur-sm border-b border-neutral-200">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                aria-expanded={sidebarOpen}
              >
                <Menu className="w-6 h-6" />
              </button>

              <h2 className="text-heading-md font-semibold text-neutral-900 hidden sm:block">
                {navigation.find((n) => location.pathname === n.href || location.pathname.startsWith(n.href + '/'))?.name || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* User menu */}
              <div className="relative">
                <button
                  className="flex items-center gap-2 p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-brand-700" aria-hidden="true" />
                  </div>
                  <span className="hidden sm:block text-body-sm font-medium text-neutral-700">{user?.name}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-overlay" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
                    <div className="absolute right-0 z-popover mt-2 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg py-1">
                      <div className="px-4 py-3 border-b border-neutral-200">
                        <p className="text-body-sm font-medium text-neutral-900">{user?.name}</p>
                        <p className="text-caption text-neutral-500 truncate">{user?.email}</p>
                        <p className="text-caption text-neutral-400 capitalize">{user?.role}</p>
                      </div>
                      <NavLink
                        to="/settings"
                        className="dropdown-item flex items-center gap-2"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </NavLink>
                      <button
                        className="dropdown-item flex items-center gap-2 w-full text-left text-status-critical"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}