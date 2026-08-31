'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname || '/dashboard')}`;
      router.replace(redirectUrl);
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] p-6 space-y-4">
        <Loader2 className="w-10 h-10 text-[var(--color-primary-500)] animate-spin" />
        <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
          Verifying Session...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userRoleStr = (user.role as string) || '';
  if (requiredRole && userRoleStr !== requiredRole && userRoleStr !== 'super_admin' && userRoleStr !== 'school_admin' && userRoleStr !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-primary)]">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[var(--bg-secondary)] border border-red-500/20 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Access Restricted</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 leading-relaxed">
              This area requires <span className="font-bold uppercase text-red-400">{requiredRole}</span> privileges.
              You are currently signed in as <span className="font-bold text-[var(--text-primary)]">{user.name || user.email}</span> ({user.role}).
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 rounded-2xl bg-[var(--color-primary-500)] text-white text-xs font-bold hover:bg-[var(--color-primary-600)] transition-all shadow-md cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
