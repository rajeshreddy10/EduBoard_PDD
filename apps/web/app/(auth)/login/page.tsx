'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Logo } from '@/components/branding/Logo';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, error, loading, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {}
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    clearError();
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      setLocalError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      <div className="w-full max-w-md relative animate-fade-in">
        <button
          onClick={() => router.push('/onboarding')}
          className="absolute -top-12 left-0 flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back to Onboarding
        </button>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Logo size="lg" showText={true} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 font-medium">Sign in to your EduBoard workspace</p>
        </div>

        <div className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-2xl shadow-sm border border-[var(--border-primary)] space-y-5">
          <button
            id="btn-google-signin"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-semibold hover:bg-[var(--bg-hover)] transition-all cursor-pointer disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary-500)]" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-primary)]" />
            </div>
            <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2">
              or email sign in
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {displayError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
                {displayError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-primary)]">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  id="input-email"
                  type="email"
                  placeholder="name@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)] font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-primary)]">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)] font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[var(--border-primary)] text-[var(--color-primary-500)]"
                />
                <span className="text-xs font-medium text-[var(--text-secondary)]">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-xs font-semibold text-[var(--color-primary-500)] hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              id="btn-signin"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-2.5 rounded-xl bg-[var(--color-primary-500)] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-primary-600)] shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {loading && !googleLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing In...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-secondary)] font-medium pt-2">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[var(--color-primary-500)] font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
