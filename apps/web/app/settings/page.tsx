'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, BellRing, Palette, Globe, Shield, User,
  Moon, Sun, CheckCircle, Clock, MapPin, Lock, LogOut, Cloud
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { type ThemeId } from '@/lib/theme';
import { getSettings, updateSettings, getProfile } from '@/lib/store';
import { useAuth } from '@/lib/AuthContext';
import { userProfileService } from '@/lib/services/firebaseData';
import DashboardLayout from '@/app/dashboard/layout';

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      type="button"
      className={`w-10 h-5.5 rounded-full transition-all relative cursor-pointer ${
        value ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
          value ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xs space-y-4">
      <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2 pb-3 border-b border-[var(--border-primary)]">
        <Icon className="w-4 h-4 text-[var(--color-primary-500)]" /> {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-bold text-[var(--text-primary)]">{label}</p>
        {desc && <p className="text-[11px] text-[var(--text-tertiary)] font-medium mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <SettingsContent />
    </DashboardLayout>
  );
}

function SettingsContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [savedNotice, setSavedNotice] = useState(false);
  const [s, setS] = useState({
    theme: theme || 'dark',
    language: 'en',
    country: 'US',
    timeZone: 'UTC-05:00',
    fontSize: 'medium',
    notifPush: true,
    notifEmail: true,
    notifClassroom: true,
    notifAI: false,
    highContrast: false,
    reduceMotion: false,
    profilePublic: true,
    dataSharing: false,
    twoFactor: false,
  });

  useEffect(() => {
    const stored = getSettings();
    setS({
      theme: theme || stored.theme || 'dark',
      language: stored.language || 'en',
      country: stored.country || 'US',
      timeZone: stored.timeZone || 'UTC-05:00',
      fontSize: stored.textSize || 'medium',
      notifPush: stored.notificationsEnabled ?? true,
      notifEmail: stored.emailNotifications ?? true,
      notifClassroom: true,
      notifAI: false,
      highContrast: stored.highContrast ?? false,
      reduceMotion: stored.reducedMotion ?? false,
      profilePublic: true,
      dataSharing: false,
      twoFactor: false,
    });

    if (user?.id) {
      import('@/lib/services/firebaseData').then(({ userSettingsService }) => {
        userSettingsService.getSettings(user.id).then((cloudSettings) => {
          if (cloudSettings) {
            setS(prev => ({ ...prev, ...cloudSettings }));
          }
        }).catch(console.warn);
      });
    }
  }, [theme, user?.id]);

  const persist = (prev: typeof s, key: string, value: any) => {
    const next = { ...prev, [key]: value };
    if (key === 'theme') {
      setTheme(value as ThemeId);
    }
    updateSettings({
      theme: (key === 'theme' ? value : next.theme) as any,
      language: next.language,
      country: next.country,
      timeZone: next.timeZone,
      textSize: next.fontSize as any,
      notificationsEnabled: next.notifPush,
      emailNotifications: next.notifEmail,
      highContrast: next.highContrast,
      reducedMotion: next.reduceMotion,
    });
    if (user?.id) {
      userProfileService.updateProfile(user.id, { appSettings: next } as any).catch(console.error);
      import('@/lib/services/firebaseData').then(({ userSettingsService }) => {
        userSettingsService.saveSettings(user.id, next).catch(console.error);
      });
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
    return next;
  };

  const toggle = (key: keyof typeof s) => setS(prev => persist(prev, key, !prev[key]));

  const COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'IN', name: 'India' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'JP', name: 'Japan' },
  ];

  const TIME_ZONES = [
    { value: 'UTC-08:00', label: '(UTC-08:00) Pacific Time (US & Canada)' },
    { value: 'UTC-05:00', label: '(UTC-05:00) Eastern Time (US & Canada)' },
    { value: 'UTC+00:00', label: '(UTC+00:00) Greenwich Mean Time (London)' },
    { value: 'UTC+01:00', label: '(UTC+01:00) Central European Time (Paris)' },
    { value: 'UTC+05:30', label: '(UTC+05:30) India Standard Time' },
  ];

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'hi', label: 'हिन्दी' },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-8 animate-fade-in">
      
      {/* Page Header */}
      <header className="flex items-center justify-between pb-4 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">System Settings</h1>
            <p className="text-xs text-[var(--text-tertiary)] font-medium">Manage preferences, appearance, and application configuration</p>
          </div>
        </div>

        {savedNotice && (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 shadow-xs">
            <CheckCircle className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </header>

      {/* 1. Account Settings */}
      <Section title="Account" icon={User}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {user?.name ? user.name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">{user?.name || user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">{user?.email || ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/profile')}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--color-primary-500)] text-white text-xs font-semibold hover:bg-[var(--color-primary-600)] transition-all shadow-xs cursor-pointer"
            >
              View Profile
            </button>
            <button
              onClick={async () => {
                await logout();
                router.push('/login');
              }}
              className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Section>

      {/* 2. Appearance */}
      <Section title="Appearance" icon={Palette}>
        <div>
          <p className="text-xs font-bold text-[var(--text-primary)] mb-2.5">Theme Mode</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setS(prev => persist(prev, 'theme', 'dark'))}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                s.theme === 'dark' ? 'border-[var(--color-primary-500)] bg-blue-500/10' : 'border-[var(--border-primary)] bg-[var(--bg-tertiary)]'
              }`}
            >
              <Moon className="w-4 h-4 text-blue-400" />
              <div className="text-left">
                <p className="text-xs font-bold text-[var(--text-primary)]">Dark Mode</p>
                <p className="text-[10px] text-[var(--text-tertiary)] font-medium">Low light comfort</p>
              </div>
            </button>

            <button
              onClick={() => setS(prev => persist(prev, 'theme', 'light'))}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                s.theme === 'light' ? 'border-[var(--color-primary-500)] bg-blue-500/10' : 'border-[var(--border-primary)] bg-[var(--bg-tertiary)]'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <div className="text-left">
                <p className="text-xs font-bold text-[var(--text-primary)]">Light Mode</p>
                <p className="text-[10px] text-[var(--text-tertiary)] font-medium">Daylight theme</p>
              </div>
            </button>
          </div>
        </div>

        <Row label="High Contrast" desc="Enhance element outlines and legibility">
          <Toggle value={s.highContrast} onChange={() => toggle('highContrast')} />
        </Row>

        <Row label="Reduce Motion" desc="Minimize transition and animation effects">
          <Toggle value={s.reduceMotion} onChange={() => toggle('reduceMotion')} />
        </Row>
      </Section>

      {/* 3. Region & Language */}
      <Section title="Region & Language" icon={Globe}>
        <Row label="Country / Region" desc="Set your primary region for localized content">
          <select
            value={s.country}
            onChange={e => setS(prev => persist(prev, 'country', e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)] cursor-pointer"
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </Row>

        <Row label="Display Language" desc="Interface language across EduBoard">
          <select
            value={s.language}
            onChange={e => setS(prev => persist(prev, 'language', e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)] cursor-pointer"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </Row>

        <Row label="Time Zone" desc="Used for scheduling sessions and history logs">
          <select
            value={s.timeZone}
            onChange={e => setS(prev => persist(prev, 'timeZone', e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs font-semibold text-[var(--text-primary)] max-w-[200px] truncate focus:outline-none focus:border-[var(--color-primary-500)] cursor-pointer"
          >
            {TIME_ZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </Row>
      </Section>

      {/* 4. Notifications */}
      <Section title="Notifications" icon={BellRing}>
        <Row label="Push Notifications" desc="Alerts on your desktop device">
          <Toggle value={s.notifPush} onChange={() => toggle('notifPush')} />
        </Row>
        <Row label="Email Notifications" desc="Weekly summaries and system announcements">
          <Toggle value={s.notifEmail} onChange={() => toggle('notifEmail')} />
        </Row>
        <Row label="Classroom Activity" desc="Student hand-raises and live updates">
          <Toggle value={s.notifClassroom} onChange={() => toggle('notifClassroom')} />
        </Row>
      </Section>

      {/* 5. Firebase & Cloud Integration */}
      <Section title="Firebase & Cloud Sync" icon={Cloud}>
        <Row label="Firebase Auth & Menu Cloud Sync" desc="Synchronize user profile, system settings, saved history, and notifications via Firebase">
          <Toggle value={(s as any).firebaseSync ?? true} onChange={() => toggle('firebaseSync' as any)} />
        </Row>
        <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-between text-xs font-semibold">
          <div className="space-y-0.5">
            <p className="text-[var(--text-primary)] font-bold">Firebase Auth State</p>
            <p className="text-[11px] text-[var(--text-tertiary)] font-mono">
              {user ? `User: ${user.email || user.name || user.id}` : 'Guest / Unauthenticated'}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold ${
            user ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
          }`}>
            {user ? 'Authenticated' : 'Offline Mode'}
          </span>
        </div>
      </Section>

    </div>
  );
}

