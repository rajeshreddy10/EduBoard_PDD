'use client';
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { GlassButton } from './GlassButton';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 px-6 ${className}`}>
      <div className="w-20 h-20 rounded-2xl bg-red-500/8 border border-red-500/15 flex items-center justify-center mb-5">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-1.5">{title}</h3>
      <p className="text-sm text-[var(--text-tertiary)] text-center max-w-sm mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <GlassButton variant="secondary" size="sm" icon={<RefreshCw size={16} />} onClick={onRetry}>
          Try Again
        </GlassButton>
      )}
    </div>
  );
}
