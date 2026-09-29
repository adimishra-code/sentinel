import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, Info, AlertTriangle, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { notificationsApi } from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type NotifType = 'case_created' | 'case_assigned' | 'case_resolved' | 'appeal_filed' | 'policy_activated' | 'system';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

const typeIcon: Record<NotifType, React.FC<any>> = {
  case_created: AlertTriangle,
  case_assigned: Shield,
  case_resolved: Check,
  appeal_filed: Info,
  policy_activated: Shield,
  system: Info,
};

const typeColor: Record<NotifType, string> = {
  case_created: 'text-orange-500 bg-orange-50',
  case_assigned: 'text-brand-600 bg-brand-50',
  case_resolved: 'text-green-600 bg-green-50',
  appeal_filed: 'text-yellow-600 bg-yellow-50',
  policy_activated: 'text-brand-600 bg-brand-50',
  system: 'text-neutral-500 bg-neutral-100',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ limit: 15 } as any),
    refetchInterval: 30000,
  });

  const notifications: Notification[] = (data as any)?.items ?? [];
  const unreadCount: number = (data as any)?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Mark visible unread as read after a short delay when panel opens
  useEffect(() => {
    if (!open) return;
    const unread = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unread.length === 0) return;
    const t = setTimeout(() => markRead.mutate(unread), 2000);
    return () => clearTimeout(t);
  }, [open, notifications.length]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        id="notifications-btn"
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-popover mt-2 w-[360px] bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <h3 className="text-heading-sm font-semibold text-neutral-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-body-xs font-medium rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 px-2 py-1 text-body-xs text-neutral-500 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-neutral-50">
            {isLoading ? (
              <div className="py-10 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-body-sm text-neutral-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = typeIcon[notif.type] ?? Info;
                const iconClass = typeColor[notif.type] ?? 'text-neutral-500 bg-neutral-100';
                return (
                  <div
                    key={notif.id}
                    className={clsx(
                      'flex gap-3 px-4 py-3 transition-colors hover:bg-neutral-50',
                      !notif.read && 'bg-brand-50/40'
                    )}
                  >
                    <div className={clsx('w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center', iconClass)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-body-sm', notif.read ? 'text-neutral-700' : 'font-medium text-neutral-900')}>
                        {notif.title}
                      </p>
                      <p className="text-body-xs text-neutral-500 mt-0.5 truncate">{notif.message}</p>
                      <p className="text-caption text-neutral-400 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
