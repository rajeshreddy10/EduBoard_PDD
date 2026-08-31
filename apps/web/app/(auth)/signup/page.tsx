'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Logo } from '@/components/branding/Logo';

export default function SignupPage() {
  const router = useRouter();
  const { signup, loginWithGoogle, error, loading, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      await signup(email, password, name, confirmPassword);
      router.push('/dashboard');
    } catch {}
  };

  const handleGoogleSignup = async () => {
    setLocalError(null);
    clearError();
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      setLocalError(err?.message || 'Google sign-up failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      <div className="absolute inset-0 bg-dot-subtle opacity-50" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-[var(--color-primary-500)]/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative animate-slide-up">
        <button
          onClick={() => router.push('/onboarding')}
          className="absolute -top-12 left-0 flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={true} />
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Create Account
          </h1>
          <p className="text-[var(--text-tertiary)] mt-2 font-medium">Join the future of interactive learning</p>
        </div>

        <div className="bg-[var(--bg-secondary)] p-8 rounded-2xl shadow-sm border border-[var(--border-primary)]">
          <div className="mb-6">
            <button
              onClick={handleGoogleSignup}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm font-medium hover:border-blue-500/40 hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-primary)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs font-medium text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {displayError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                {displayError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--text-primary)]">Full Name</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input pl-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--text-primary)]">Email Address</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--text-primary)]">Password</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input pl-10"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--text-primary)]">Confirm</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="input pl-10"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              {showPassword ? <span className="flex items-center gap-1"><EyeOff size={12} /> Hide passwords</span> : <span className="flex items-center gap-1"><Eye size={12} /> Show passwords</span>}
            </button>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-[var(--border-primary)] text-[var(--color-primary-500)] focus:ring-[var(--color-primary-500)]"
                />
                <span className="text-sm text-[var(--text-secondary)] leading-snug">
                  I agree to the{' '}
                  <Link href="/help/privacy" className="text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] font-medium">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/help/privacy" className="text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] font-medium">Privacy Policy</Link>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading || !agreeTerms}
              className={`w-full py-3 mt-2 rounded-xl text-center font-bold flex items-center justify-center gap-2 transition-all ${
                agreeTerms && !loading && !googleLoading
                  ? 'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)] shadow-md shadow-[var(--color-primary-500)]/20 hover:shadow-lg cursor-pointer'
                  : 'bg-[var(--text-tertiary)] text-white/70 cursor-not-allowed shadow-none'
              }`}
            >
              {loading && !googleLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
