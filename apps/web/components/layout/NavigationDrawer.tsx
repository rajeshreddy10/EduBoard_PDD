'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LayoutDashboard, History, Bell, Mic, Grid3X3, NotebookPen, User, Settings, Palette, HelpCircle } from 'lucide-react';
import { Logo } from '@/components/branding/Logo';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_SECTIONS = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'History', href: '/dashboard/boards', icon: History },
      { label: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  {
    title: 'INTELLIGENT BOARDS',
    items: [
      { label: 'Voice Board', href: '/voice-control', icon: Mic },
      { label: 'DrawSpace', href: '/normal-board', icon: Grid3X3 },
      { label: 'DocCanvas', href: '/gesture-board', icon: NotebookPen },
    ],
  },
  {
    title: 'SETTINGS & PROFILE',
    items: [
      { label: 'Profile', href: '/profile', icon: User },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Theme', href: '/dashboard/settings/theme', icon: Palette },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      { label: 'Help Center', href: '/help', icon: HelpCircle },
    ],
  },
];

export function NavigationDrawer({ isOpen, onClose }: NavigationDrawerProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <>
      {/* Dark Overlay Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[99] transition-opacity duration-300 animate-fade-in"
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[var(--bg-elevated)] border-r border-[var(--border-primary)] shadow-2xl z-[100] flex flex-col transition-transform duration-300 animate-slide-in-left"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
      >
        {/* Header */}
        <div className="h-16 px-5 border-b border-[var(--border-primary)] flex items-center justify-between shrink-0 bg-[var(--bg-primary)]/50">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3 no-underline">
            <Logo size="sm" showText={false} />
            <span className="font-bold text-lg text-[var(--text-primary)]">
              Smart<span className="text-[var(--color-primary-500)]">Board</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all no-underline ${
                        isActive
                          ? 'bg-[var(--color-primary-500)] text-white shadow-md shadow-indigo-500/20'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--text-tertiary)]'}`} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-primary)]/40 shrink-0 text-center">
          <p className="text-[11px] text-[var(--text-tertiary)] font-mono">
            SmartBoard v3.1 &bull; Digital Whiteboard
          </p>
        </div>
      </aside>
    </>
  );
}
