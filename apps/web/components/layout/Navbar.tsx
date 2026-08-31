'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Bell, Search, Settings, User, LogOut, Grid3X3, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Logo } from '@/components/branding/Logo';
import { getNotifications } from '@/lib/store';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifications = getNotifications().filter(n => !n.read);

  const getPageTitle = () => {
    const segment = pathname?.split('/')[1] || 'dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  };

  return (
    <header className="topbar">
      <div className="flex h-full items-center justify-between max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-3">
          <button onClick={onToggleSidebar} className="btn-ghost" style={{ width: 36, height: 36, borderRadius: 8 }}>
            <Menu size={18} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 no-underline">
            <Logo size="sm" showText={false} />
            <span className="hidden sm:block font-bold text-base text-[var(--text-primary)]">
              Smart<span className="text-[var(--color-primary-500)]">Board</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center ml-3 pl-3 border-l border-[var(--border-primary)]">
            <span className="text-sm text-[var(--text-tertiary)]">{getPageTitle()}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input type="text" placeholder="Search everything..." className="input !py-1.5 !pl-9 !pr-3 text-sm" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/notifications" className="btn-ghost" style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', textDecoration: 'none' }}>
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-[var(--bg-primary)]">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </Link>

          <Link href="/settings" className="btn-ghost hidden sm:flex" style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            <Settings size={18} />
          </Link>

          <div className="relative ml-1">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="btn-ghost flex items-center gap-2" style={{ padding: '0.25rem 0.5rem', borderRadius: 8 }}>
              <div className="avatar avatar-sm" style={{ background: 'var(--color-primary-500)' }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="hidden lg:block text-sm text-[var(--text-secondary)] max-w-[100px] truncate">{user?.name}</span>
              <ChevronDown size={12} className="hidden lg:block text-[var(--text-tertiary)]" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 z-50 bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg shadow-lg overflow-hidden">
                  <div className="p-3 border-b border-[var(--border-primary)]">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link href="/profile" className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] dark:hover:bg-[var(--bg-tertiary)] rounded-md transition-colors no-underline">
                      <User size={15} /> Profile
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] dark:hover:bg-[var(--bg-tertiary)] rounded-md transition-colors no-underline">
                      <Settings size={15} /> Settings
                    </Link>
                    <Link href="/dashboard/boards" className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] dark:hover:bg-[var(--bg-tertiary)] rounded-md transition-colors no-underline">
                      <Grid3X3 size={15} /> Workspace
                    </Link>
                  </div>
                  <div className="border-t border-[var(--border-primary)] p-1.5">
                    <button onClick={logout} className="flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md w-full transition-colors">
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
