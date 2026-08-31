import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', fullWidth, loading, icon, className = '', children, disabled, ...props }: ButtonProps) {
  const variants: Record<string, string> = {
    primary: 'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)] border-[var(--color-primary-500)]',
    secondary: 'bg-transparent text-[var(--text-primary)] border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]',
    gradient: 'bg-gradient-to-r from-[var(--color-primary-500)] to-purple-600 text-white border-transparent hover:opacity-90',
    danger: 'bg-red-500 text-white border-red-500 hover:bg-red-600',
  };
  const sizes: Record<string, string> = {
    sm: 'py-1 px-2 text-xs',
    md: 'py-2 px-4 text-sm',
    lg: 'py-2.5 px-6 text-base',
    xl: 'py-3 px-8 text-base',
  };
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${fullWidth ? 'w-full' : ''} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : icon ? icon : null}
      {children}
    </button>
  );
}

export const GlassButton = Button;
