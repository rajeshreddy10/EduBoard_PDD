'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic, NotebookPen, PenSquare, Plus,
  Bell, User as UserIcon, HelpCircle,
  Settings as SettingsIcon, Clock,
  ArrowRight, Sparkles, ShieldCheck, Layers, History,
  Zap, ChevronRight, Palette, LayoutGrid
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useBoard } from '@/lib/BoardContext';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { boards } = useBoard();

  const recentHistory = boards.slice(0, 4);
  const firstName = user?.name?.split(' ')[0] || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const coreModules = [
    {
      id: 'draw-space',
      title: 'DrawSpace Whiteboard',
      desc: 'Interactive digital canvas with reference drawer, waypoints, step reveal & teacher notes.',
      icon: PenSquare,
      badge: 'Interactive Canvas',
      accentColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      route: '/normal-board',
    },
    {
      id: 'voice-board',
      title: 'Voice Board AI',
      desc: 'Speech-to-text live transcription with real-time word deduplication & formula placement.',
      icon: Mic,
      badge: 'Speech Recognition',
      accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      route: '/voice-control',
    },
    {
      id: 'doc-canvas',
      title: 'DocCanvas Annotator',
      desc: 'Annotate PDFs, Word, & lesson documents with pen, highlighter, & shape overlays.',
      icon: NotebookPen,
      badge: 'Document Studio',
      accentColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      route: '/gesture-board',
    },
  ];

  const quickLinks = [
    { label: 'Saved History', desc: 'Browse board records', icon: History, route: '/dashboard/boards' },
    { label: 'Notifications', desc: 'Alerts & updates', icon: Bell, route: '/notifications' },
    { label: 'Profile Settings', desc: 'Account details', icon: UserIcon, route: '/profile' },
    { label: 'Theme Studio', desc: 'Visual appearance', icon: Palette, route: '/dashboard/settings/theme' },
    { label: 'System Settings', desc: 'App preferences', icon: SettingsIcon, route: '/settings' },
    { label: 'Help Center', desc: 'User guide & FAQs', icon: HelpCircle, route: '/help' },
  ];

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-8 pb-8 animate-fade-in">
      
      {/* Studio Editorial Welcome Hero */}
      <header className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs font-semibold text-[var(--text-secondary)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>EduBoard Studio v3.1 Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-tertiary)] font-medium leading-relaxed">
            Your intelligent teaching environment is ready. Launch a new whiteboard session or pick up where you left off.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => router.push('/voice-control')}
            className="px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] text-xs font-semibold text-[var(--text-primary)] transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-xs"
          >
            <Mic className="w-4 h-4 text-amber-500" />
            <span>Voice Board</span>
          </button>
          <button
            onClick={() => router.push('/normal-board')}
            className="px-5 py-2.5 rounded-xl bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Session</span>
          </button>
        </div>
      </header>

      {/* Metric Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Saved Sessions', value: `${boards.length} Boards`, icon: History, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Intelligent Modules', value: '3 Active Studios', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map(stat => (
          <div
            key={stat.label}
            className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xs flex items-center gap-4 group"
          >
            <div className={`w-11 h-11 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</div>
              <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Core Interactive Whiteboard Modules */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[var(--color-primary-500)]" />
            Core Interactive Modules
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {coreModules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => router.push(m.route)}
                className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xs hover:shadow-md hover:border-[var(--border-secondary)] transition-all cursor-pointer group flex flex-col justify-between space-y-6 studio-card-hover"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-11 h-11 rounded-xl ${m.accentColor} flex items-center justify-center border shadow-xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-primary)] uppercase tracking-wider">
                    {m.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary-500)] transition-colors mb-1.5">
                    {m.title}
                  </h3>
                  <p className="text-xs text-[var(--text-tertiary)] font-medium leading-relaxed">
                    {m.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border-primary)] flex items-center justify-between text-xs font-semibold text-[var(--color-primary-500)]">
                  <span>Launch Module</span>
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent History & Saved Sessions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--color-primary-500)]" />
            Recent History & Saved Sessions
          </h2>
          <button
            onClick={() => router.push('/dashboard/boards')}
            className="text-xs font-semibold text-[var(--color-primary-500)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All History</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {recentHistory.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] text-center space-y-3">
            <History className="w-9 h-9 text-[var(--text-tertiary)] mx-auto opacity-40" />
            <p className="text-sm font-bold text-[var(--text-primary)]">No saved sessions yet</p>
            <p className="text-xs text-[var(--text-tertiary)]">Start drawing on DrawSpace or Voice Board to save your first workspace.</p>
            <button
              onClick={() => router.push('/normal-board')}
              className="px-4 py-2 rounded-xl bg-[var(--color-primary-500)] text-white text-xs font-semibold hover:bg-[var(--color-primary-600)] transition-all cursor-pointer shadow-xs"
            >
              Create New Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/dashboard/boards/${item.id}`)}
                className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xs hover:shadow-md hover:border-[var(--border-secondary)] transition-all cursor-pointer space-y-4 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-primary)]">
                      {item.isInfiniteCanvas ? 'Infinite Canvas' : 'Standard Board'}
                    </span>
                    {item.isShared && (
                      <span className="text-[10px] font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                        Shared
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary-500)] transition-colors truncate">{item.title}</h4>
                  <p className="text-xs text-[var(--text-tertiary)] line-clamp-2 mt-1 font-medium">{item.description || 'Saved whiteboard workspace session.'}</p>
                </div>

                <div className="pt-3 border-t border-[var(--border-primary)] flex items-center justify-between text-[10px] text-[var(--text-tertiary)] font-medium">
                  <span>Updated {formatDate(item.updatedAt)}</span>
                  <span className="text-[var(--color-primary-500)] font-semibold group-hover:translate-x-0.5 transition-transform">Open →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Access System Tools */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Quick System Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((l) => {
            const Icon = l.icon;
            return (
              <div
                key={l.route + l.label}
                onClick={() => router.push(l.route)}
                className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xs hover:shadow-md hover:border-[var(--border-secondary)] transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-tertiary)] text-[var(--color-primary-500)] flex items-center justify-center shrink-0 border border-[var(--border-primary)]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary-500)] transition-colors">{l.label}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)] font-medium">{l.desc}</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--color-primary-500)] group-hover:translate-x-1 transition-all" />
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
