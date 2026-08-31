'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/branding/Logo';
import { ArrowRight, Sparkles, Hand, Mic, LayoutDashboard } from 'lucide-react';

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between p-6">
      {/* Header */}
      <div className="flex justify-between items-center py-4">
        <Logo size="md" />
        <Link 
          href="/login"
          className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
        >
          Sign In
        </Link>
      </div>

      {/* Hero Body */}
      <div className="max-w-md mx-auto my-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--accent-primary)] font-semibold">
          <Sparkles className="w-4 h-4" /> Next-Gen AI Smart Workspace
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Welcome to <span className="gradient-text">EduBoard</span>
        </h1>

        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
          Experience gesture-controlled whiteboards, AI voice assistance, interactive smart boards, and seamless note-taking anywhere.
        </p>

        {/* Feature Badges */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col items-center gap-1.5 text-center">
            <Hand className="w-5 h-5 text-indigo-400" />
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Gestures</span>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col items-center gap-1.5 text-center">
            <Mic className="w-5 h-5 text-emerald-400" />
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Voice AI</span>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col items-center gap-1.5 text-center">
            <LayoutDashboard className="w-5 h-5 text-purple-400" />
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Smart Board</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-md mx-auto w-full space-y-3 pt-6">
        <Link
          href="/signup"
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20"
        >
          Get Started Free <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          href="/dashboard"
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all"
        >
          Explore Dashboard
        </Link>
      </div>
    </div>
  );
}
