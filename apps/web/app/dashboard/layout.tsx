'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Grid3X3,
  Mic,
  NotebookPen,
  User as UserIcon,
  Settings as SettingsIcon,
  Palette,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Bell,
  History,
  Sun,
  Moon,
  ChevronRight
} from 'lucide-react';
import { Logo } from '@/components/branding/Logo';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';

const NAV_GROUPS = [
  {
    section: 'Workspace',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Saved History', href: '/dashboard/boards', icon: History },
      { label: 'Notifications', href: '/notifications', icon: Bell },
    ]
  },
  {
    section: 'Teaching Boards',
    items: [
      { label: 'DrawSpace Canvas', href: '/normal-board', icon: Grid3X3 },
      { label: 'Voice Board AI', href: '/voice-control', icon: Mic },
      { label: 'DocCanvas Annotator', href: '/gesture-board', icon: NotebookPen },
    ]
  },
  {
    section: 'Preferences',
    items: [
      { label: 'User Profile', href: '/profile', icon: UserIcon },
      { label: 'System Settings', href: '/settings', icon: SettingsIcon },
      { label: 'Theme Studio', href: '/dashboard/settings/theme', icon: Palette },
    ]
  },
  {
    section: 'Support',
    items: [
      { label: 'Help & FAQs', href: '/help', icon: HelpCircle },
    ]
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const getInitials = (nameStr?: string) => {
    if (!nameStr) return 'U';
    return nameStr.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] transition-colors">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`shrink-0 h-screen sticky top-0 z-40 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex flex-col transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        } ${mobileOpen ? 'fixed left-0 top-0 z-50 flex' : 'hidden lg:flex'}`}
      >
        {/* Logo / Brand Bar */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-[var(--border-primary)] shrink-0">
          {collapsed ? (
            <Logo size="sm" showText={false} onClick={() => router.push('/dashboard')} />
          ) : (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
              <Logo size="md" />
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.section} className="space-y-1">
              {!collapsed && (
                <div className="px-3 pt-1 pb-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                  {group.section}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                      isActive
                        ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                    title={collapsed ? item.label : ''}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--text-tertiary)]'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer Collapse Toggle */}
        <div className="p-3 border-t border-[var(--border-primary)] shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all w-full cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Menu size={16} className="shrink-0" />
              {!collapsed && <span>Collapse Menu</span>}
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-6 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] sticky top-0 z-30 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu size={18} />
            </button>

            {/* Quick Search Bar */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search boards, tools, or notes..."
                className="w-64 lg:w-80 pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-500)]/15 transition-all"
              />
            </div>
          </div>

          {/* User Controls & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notifications */}
            <button
              onClick={() => router.push('/notifications')}
              className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all relative cursor-pointer"
              title="Notifications"
            >
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[var(--bg-secondary)]" />
            </button>

            <div className="h-5 w-px bg-[var(--border-primary)] mx-1" />

            {/* User Profile Pill */}
            <div
              onClick={() => router.push('/profile')}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] transition-all cursor-pointer"
            >
              <div className="w-7 h-7 relative rounded-lg overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-extrabold">
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name || 'User Avatar'}
                    fill
                    sizes="28px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span>{getInitials(user?.name)}</span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-[var(--text-primary)] leading-none">{user?.name?.split(' ')[0] || 'User'}</div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-tertiary)] hover:text-red-500 hover:border-red-500/30 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page Main Content Area */}
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 w-full max-w-[1600px] mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
