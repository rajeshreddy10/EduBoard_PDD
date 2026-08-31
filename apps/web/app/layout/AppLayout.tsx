'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Grid3X3,
  Settings, User, NotebookPen, Mic, HelpCircle, Sliders, LogOut,
  Menu, X, Bell, Sun, Moon, Search, History
} from 'lucide-react';
import { Logo } from '@/components/branding/Logo';
import { getUser } from '@/lib/store';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { section: 'Workspace', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/boards', label: 'Saved History', icon: History },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ]},
  { section: 'Teaching Boards', items: [
    { href: '/normal-board', label: 'DrawSpace Canvas', icon: Grid3X3 },
    { href: '/voice-control', label: 'Voice Board AI', icon: Mic },
    { href: '/gesture-board', label: 'DocCanvas Annotator', icon: NotebookPen },
  ]},
  { section: 'Preferences', items: [
    { href: '/profile', label: 'User Profile', icon: User },
    { href: '/settings', label: 'System Settings', icon: Sliders },
  ]},
  { section: 'Support', items: [
    { href: '/help', label: 'Help & Tutorials', icon: HelpCircle },
  ]},
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState(getUser());

  useEffect(() => {
    const handler = () => setCurrentUser(getUser());
    const toggleHandler = () => setSidebarOpen((prev) => !prev);
    window.addEventListener('profile-changed', handler);
    window.addEventListener('toggle-sidebar', toggleHandler);
    return () => {
      window.removeEventListener('profile-changed', handler);
      window.removeEventListener('toggle-sidebar', toggleHandler);
    };
  }, []);

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));

  const fullscreenRoutes = ['/smart-board', '/normal-board', '/presentation', '/gesture-board', '/dashboard/tools/gesture'];
  const isFullscreen = fullscreenRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));

  if (isFullscreen) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed left-0 top-0 h-full z-50 w-[260px] bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center px-4 h-16 border-b border-[var(--border-primary)] justify-between">
          <Logo size="md" onClick={() => router.push('/dashboard')} />
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl text-[var(--text-secondary)] transition-colors" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 space-y-4 px-3">
          {navItems.map(section => (
            <div key={section.section} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">{section.section}</div>
              {section.items.map(item => (
                <a key={item.href} href={item.href} onClick={(e) => { e.preventDefault(); router.push(item.href); setSidebarOpen(false); }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all no-underline ${isActive(item.href) ? 'bg-[var(--color-primary-500)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}>
                  <item.icon className={`w-4 h-4 shrink-0 ${isActive(item.href) ? 'text-white' : 'text-[var(--text-tertiary)]'}`} />
                  <span className="truncate">{item.label}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] mb-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-500)] flex items-center justify-center text-white text-xs font-extrabold">
              {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">{currentUser.name}</div>
              <div className="text-[10px] text-[var(--text-tertiary)] truncate">{currentUser.email}</div>
            </div>
          </div>
          <button onClick={async () => { await logout(); router.push('/login'); }}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-200 transition-all cursor-pointer">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-col min-h-screen transition-all duration-300">
        <header className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
              className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl transition-all cursor-pointer shrink-0 text-xs font-bold"
            >
              <Menu className="w-4 h-4 text-[var(--color-primary-500)]" />
              <span className="hidden sm:inline">Menu</span>
            </button>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input type="text" placeholder="Quick Search..."
                className="w-44 sm:w-64 pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-xl transition-all border border-[var(--border-primary)] cursor-pointer" title={`Switch to ${isDark ? 'light' : 'dark'} theme`}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="w-px h-5 bg-[var(--border-primary)] mx-1" />
            <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => router.push('/profile')}>
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary-500)] transition-colors">{currentUser.name?.split(' ')[0]}</span>
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Teacher</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-500)] flex items-center justify-center text-white text-xs font-extrabold">
                {currentUser.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
