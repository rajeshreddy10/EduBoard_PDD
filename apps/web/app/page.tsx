'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/branding/Logo';
import { useAuth } from '@/lib/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setShowContent(true);
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(timer); return 100; }
        return prev + 5;
      });
    }, 50);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        if (user) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      }, 1500);
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center">
      <div className={`flex flex-col items-center transition-all duration-700 ease-out ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="mb-8">
          <Logo size="xl" />
        </div>

        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          EduBoard
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mb-12">
          Your intelligent digital workspace
        </p>

        <div className="w-48 space-y-2">
          <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
            <span>Loading</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
