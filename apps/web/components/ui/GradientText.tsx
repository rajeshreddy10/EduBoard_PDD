'use client';
import React, { ReactNode } from 'react';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
}

export function GradientText({
  children, className = '', from = 'from-[var(--color-primary-500)]', via = 'via-purple-500', to = 'to-pink-500', as: Tag = 'span',
}: GradientTextProps) {
  return (
    <Tag className={`bg-gradient-to-r ${from} ${via} ${to} bg-clip-text text-transparent ${className}`}>
      {children}
    </Tag>
  );
}
