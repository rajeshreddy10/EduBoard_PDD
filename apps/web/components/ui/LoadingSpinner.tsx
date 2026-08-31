'use client';
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  message?: string;
}

const sizes: Record<string, string> = {
  sm: 'h-4 w-4',
  md: 'h-7 w-7',
  lg: 'h-10 w-10',
  xl: 'h-14 w-14',
};

const borders: Record<string, string> = {
  sm: 'border-2',
  md: 'border-[2.5px]',
  lg: 'border-[3px]',
  xl: 'border-[3.5px]',
};

export function LoadingSpinner({ size = 'md', className = '', message }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="relative flex items-center justify-center">
        <div
          className={`
            ${sizes[size]} rounded-full
            ${borders[size]} border-[var(--border-primary)]
            border-t-[var(--color-primary-500)]
            animate-spin
          `}
          style={{ animationDuration: '0.8s' }}
        />
        <div
          className={`
            absolute ${sizes[size]} rounded-full
            ${borders[size]} border-transparent
            border-r-[var(--color-primary-400)]
            animate-spin
          `}
          style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}
        />
      </div>
      {message && (
        <p className="text-sm font-medium text-[var(--text-tertiary)]">{message}</p>
      )}
    </div>
  );
}
