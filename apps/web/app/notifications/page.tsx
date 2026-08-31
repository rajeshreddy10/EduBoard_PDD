'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Bell, Check, Trash2, Info, AlertTriangle,
  CheckCircle, MessageSquare, BookOpen, Zap, Loader2, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { notificationService } from '@/lib/services/firebaseData';
import { Notification as AppNotification } from '@/lib/types';
import * as store from '@/lib/store';
import DashboardLayout from '@/app/dashboard/layout';

const TYPE_ICONS: Record<string, React.ElementType> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle,
  alert: Zap,
  message: MessageSquare,
  classroom: BookOpen,
  achievement: Zap,
};

const TYPE_COLORS: Record<string, string> = {
  info: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  alert: '#ec4899',
  message: '#06b6d4',
  classroom: '#8b5cf6',
  achievement: '#f59e0b',
};

const INITIAL_SEED_NOTIFS: Partial<AppNotification>[] = [
  { type: 'info', title: 'Welcome to EduBoard', message: 'Your AI-powered smart interactive workspace is ready to use.', actionable: true, actionUrl: '/dashboard' },
  { type: 'success', title: 'Firebase Cloud Storage Active', message: 'Your history records and workspace state now sync securely across all your devices.', actionable: false },
  { type: 'info', title: 'Voice Board & DrawSpace', message: 'Try out live LaTeX speech-to-text recognition on Voice Board.', actionable: true, actionUrl: '/voice-control' }
];

export default function NotificationsPage() {
  return (
    <DashboardLayout>
      <NotificationsContent />
    </DashboardLayout>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let isMounted = true;

    async function initNotifications() {
      setLoading(true);
      setError(null);

      if (user?.id) {
        try {
          unsub = notificationService.subscribeToNotifications(user.id, (realTimeNotifs) => {
            if (!isMounted) return;
            if (realTimeNotifs.length === 0) {
              INITIAL_SEED_NOTIFS.forEach(n => notificationService.addNotification(user.id, n));
            } else {
              setNotifications(realTimeNotifs);
            }
            setLoading(false);
          });
        } catch (err: any) {
          console.error('Failed to load notifications from Firestore:', err);
          if (isMounted) {
            setError('Could not connect to live notifications service.');
            setNotifications(store.getNotifications());
            setLoading(false);
          }
        }
      } else {
        setNotifications(store.getNotifications());
        setLoading(false);
      }
    }

    initNotifications();

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    store.markNotificationRead(id);
    if (user?.id) {
      try {
        await notificationService.markAsRead(user.id, id);
      } catch (err) {
        console.error('Failed to mark read in Firestore:', err);
      }
    }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    store.markAllNotificationsRead();
    if (user?.id) {
      try {
        await notificationService.markAllAsRead(user.id);
      } catch (err) {
        console.error('Failed to mark all read in Firestore:', err);
      }
    }
  };

  const remove = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (user?.id) {
      try {
        await notificationService.deleteNotification(user.id, id);
      } catch (err) {
        console.error('Failed to delete notification from Firestore:', err);
      }
    }
  };

  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (isoStr?: string) => {
    if (!isoStr || now === 0) return 'Recently';
    try {
      const diff = Math.floor((now - new Date(isoStr).getTime()) / 60000);
      if (diff < 1) return 'Just now';
      if (diff < 60) return `${diff}m ago`;
      const hrs = Math.floor(diff / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--color-primary-500)]" />
            <h1 className="font-black text-[var(--text-primary)] text-xl tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-500)] text-white text-xs font-black shadow-sm">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 rounded-xl bg-[var(--bg-tertiary)] gap-1">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  filter === f ? 'bg-[var(--color-primary-500)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--color-primary-500)] hover:bg-[var(--color-primary-500)]/10 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-4">
        {error && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 font-bold underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-7 h-7 text-[var(--color-primary-500)] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[var(--text-tertiary)]">Loading your notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] rounded-3xl p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] flex items-center justify-center mx-auto opacity-70">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              No {filter === 'unread' ? 'unread ' : ''}notifications found
            </p>
            <p className="text-xs text-[var(--text-tertiary)] max-w-sm mx-auto">
              You will receive updates here regarding your classroom sessions, history saves, and team collaborations.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => {
              const Icon = TYPE_ICONS[n.type] || Info;
              const color = TYPE_COLORS[n.type] || '#6366f1';
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    if (n.actionUrl) router.push(n.actionUrl);
                  }}
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all group hover:border-[var(--color-primary-500)]/40 cursor-pointer ${
                    !n.read
                      ? 'bg-[var(--bg-secondary)] border-[var(--border-primary)] shadow-sm'
                      : 'bg-[var(--bg-tertiary)]/40 border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                    style={{ background: `${color}18`, color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {n.title}
                      </h3>
                      {!n.read && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: color }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-[var(--text-tertiary)] font-semibold mt-1.5 block">
                      {formatTimeAgo(n.timestamp)}
                    </span>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      remove(n.id);
                    }}
                    title="Delete notification"
                    className="p-1.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 text-[var(--text-tertiary)] transition-all flex-shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
