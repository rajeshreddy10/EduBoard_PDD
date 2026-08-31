'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GradientText } from '@/components/ui/GradientText';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#1a0a2e]">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="w-full max-w-md relative animate-slide-up">
          <GlassCard padding="lg" className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold"><GradientText>Password Reset!</GradientText></h2>
            <p className="text-white/40 mt-2 mb-6">Your password has been successfully reset.</p>
            <Link href="/login">
              <GlassButton variant="gradient" size="lg">Back to Login</GlassButton>
            </Link>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#1a0a2e]">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="w-full max-w-md relative animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold"><GradientText>Reset Password</GradientText></h1>
          <p className="text-white/40 mt-1">Enter your new password</p>
        </div>

        <GlassCard padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassInput label="New Password" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock size={16} />} required />
            <GlassInput label="Confirm Password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} icon={<Lock size={16} />} required />
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
            <GlassButton type="submit" variant="gradient" fullWidth size="lg" loading={loading}>
              Reset Password
            </GlassButton>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
