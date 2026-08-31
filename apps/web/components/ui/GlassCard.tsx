import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', padding = 'md', hover = false, onClick }: CardProps) {
  const paddings = { sm: 'p-3', md: 'p-4', lg: 'p-6', xl: 'p-8' };
  return (
    <div
      className={`bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] ${paddings[padding]} ${hover ? 'transition-shadow duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

export const GlassCard = Card;
