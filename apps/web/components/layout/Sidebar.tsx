'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/branding/Logo';
import { getUser } from '@/lib/store';
import { useAuth } from '@/lib/AuthContext';

import {
  LayoutDashboard, History as HistoryIcon, Bell, Mic, Grid3X3, NotebookPen, User, Settings, Palette, HelpCircle, Menu, LogOut
} from 'lucide-react';

const I = {
  dashboard: <LayoutDashboard size={18} />,
  history: <HistoryIcon size={18} />,
  notifications: <Bell size={18} />,
  voiceBoard: <Mic size={18} />,
  drawSpace: <Grid3X3 size={18} />,
  docCanvas: <NotebookPen size={18} />,
  profile: <User size={18} />,
  settings: <Settings size={18} />,
  theme: <Palette size={18} />,
  help: <HelpCircle size={18} />,
  collapse: <Menu size={18} />,
};

const NAV = [
  {
    section: 'WORKSPACE',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: I.dashboard },
      { label: 'Saved History', href: '/dashboard/boards', icon: I.history },
      { label: 'Notifications', href: '/notifications', icon: I.notifications },
    ],
  },
  {
    section: 'TEACHING BOARDS',
    items: [
      { label: 'DrawSpace Canvas', href: '/normal-board', icon: I.drawSpace },
      { label: 'Voice Board AI', href: '/voice-control', icon: I.voiceBoard },
      { label: 'DocCanvas Annotator', href: '/gesture-board', icon: I.docCanvas },
    ],
  },
  {
    section: 'PREFERENCES',
    items: [
      { label: 'User Profile', href: '/profile', icon: I.profile },
      { label: 'System Settings', href: '/settings', icon: I.settings },
      { label: 'Theme Studio', href: '/dashboard/settings/theme', icon: I.theme },
    ],
  },
  {
    section: 'SUPPORT',
    items: [
      { label: 'Help & Tutorials', href: '/help', icon: I.help },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [currentUser, setCurrentUser] = useState(getUser());

  useEffect(() => {
    const handler = () => setCurrentUser(getUser());
    window.addEventListener('profile-changed', handler);
    return () => window.removeEventListener('profile-changed', handler);
  }, []);

  return (
    <>
      {mobileOpen && (
        <div onClick={onMobileClose} className="fixed inset-0 bg-black/50 z-45 lg:hidden" />
      )}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? '!translate-x-0' : ''} lg:translate-x-0 ${!mobileOpen ? '-translate-x-full' : ''}`}>
        <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--border-primary)] flex-shrink-0">
          {collapsed ? (
            <Logo size="sm" showText={false} />
          ) : (
            <Logo size="md" />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 space-y-4 px-1.5">
          {NAV.map((section) => (
            <div key={section.section}>
              {!collapsed && <div className="sidebar-section-title px-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-2">{section.section}</div>}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                  return (
                    <Link key={item.href} href={item.href} className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all no-underline ${isActive ? 'bg-[var(--color-primary-500)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`} title={collapsed ? item.label : ''} onClick={onMobileClose}>
                      <span className="flex-shrink-0 flex">{item.icon}</span>
                      {!collapsed && <span className="truncate text-sm font-semibold">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-[var(--border-primary)] flex-shrink-0 bg-[var(--bg-secondary)]/50 space-y-2">
          {!collapsed && (
            <button
              onClick={async () => { await logout(); router.push('/login'); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-200 transition-all cursor-pointer"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          )}

          <button onClick={onToggleCollapse} className="sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer" title={collapsed ? 'Expand' : 'Collapse'}>
            <span className="flex-shrink-0 flex transition-transform duration-300" style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}>
              <Menu size={18} />
            </span>
            {!collapsed && <span className="text-sm font-semibold">Collapse Sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
