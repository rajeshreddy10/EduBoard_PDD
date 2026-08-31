'use client';
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  className?: string;
}

const variantMap: Record<string, string> = {
  primary: 'badge-blue',
  secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]',
  danger: 'badge-red',
  success: 'badge-green',
  warning: 'badge-amber',
  info: 'badge-violet',
};

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  return (
    <span className={`badge ${variantMap[variant]} ${className}`}>
      {children}
    </span>
  );
}
