'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GradientText } from '@/components/ui/GradientText';
import { useAuth } from '@/lib/AuthContext';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email via Firebase Auth.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#1a0a2e]">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="w-full max-w-md relative animate-slide-up">
          <GlassCard padding="lg" className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold"><GradientText>Check Your Email</GradientText></h2>
            <p className="text-white/40 mt-2 mb-6">We sent a password reset link to <span className="text-white/70">{email}</span></p>
            <GlassButton variant="gradient" fullWidth size="lg" onClick={() => router.push('/reset-password')}>
              Open Email App
            </GlassButton>
            <button onClick={() => setSent(false)} className="mt-3 text-sm text-indigo-400 hover:text-indigo-300">
              Send again
            </button>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#1a0a2e]">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="w-full max-w-md relative animate-slide-up">
        <Link href="/login" className="inline-flex items-center gap-2 text-white/40 hover:text-white/60 mb-6 transition-colors">
          <ArrowLeft size={18} /> Back to login
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/25">
            <Send className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold"><GradientText>Forgot Password</GradientText></h1>
          <p className="text-white/40 mt-1">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        <GlassCard padding="lg">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassInput label="Email Address" type="email" placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail size={16} />} required />
            <GlassButton type="submit" variant="gradient" fullWidth size="lg" loading={loading}>
              Send Reset Link
            </GlassButton>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
