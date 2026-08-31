import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">{icon}</div>}
        <input className={`w-full py-2 rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm outline-none transition-all focus:border-[var(--color-primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] placeholder:text-[var(--text-tertiary)] ${icon ? 'pl-10' : 'px-3'} ${error ? '!border-red-500' : ''} ${className}`} {...props} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export const GlassInput = Input;
