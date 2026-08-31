'use client';
import React from 'react';
import { Inbox } from 'lucide-react';
import { GlassButton } from './GlassButton';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 px-6 ${className}`}>
      <div className="w-20 h-20 rounded-2xl glass-panel flex items-center justify-center mb-5">
        {icon || <Inbox className="w-10 h-10 text-[var(--text-tertiary)]" />}
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-tertiary)] text-center max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <GlassButton variant="gradient" size="sm" onClick={action.onClick}>
          {action.label}
        </GlassButton>
      )}
    </div>
  );
}
