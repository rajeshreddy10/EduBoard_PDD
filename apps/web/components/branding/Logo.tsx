'use client';

import React from 'react';
import Image from 'next/image';
import { getLogo, getAppName, LogoConfig } from '@/lib/store';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  onClick?: () => void;
}

export function Logo({ size = 'md', showText = true, onClick }: LogoProps) {
  const cfg: LogoConfig = getLogo();
  const name = getAppName() || 'EduBoard';

  const sizes = { sm: 26, md: 36, lg: 48, xl: 64 };
  const dim = sizes[size];
  const fontSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-3xl';

  if (cfg?.type === 'image' && cfg.imageData) {
    return (
      <div onClick={onClick} className={`flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''}`}>
        <Image
          src={cfg.imageData}
          alt={name}
          width={dim}
          height={dim}
          style={{ borderRadius: 12, objectFit: 'cover' }}
          unoptimized
        />
        {showText && <span className={`font-extrabold ${fontSize} tracking-tight text-[var(--text-primary)] uppercase`}>{name}</span>}
      </div>
    );
  }

  return (
    <div onClick={onClick} className={`flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-[var(--color-primary-500)]/25 rounded-2xl blur-md animate-pulse" />
        <svg width={dim} height={dim} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-md">
          <defs>
            <linearGradient id="eduboardGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--color-primary-500, #3B82F6)" />
              <stop offset="100%" stopColor="var(--color-primary-600, #1D4ED8)" />
            </linearGradient>
            <linearGradient id="capGrad" x1="12" y1="10" x2="36" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--color-primary-400, #60A5FA)" />
              <stop offset="100%" stopColor="var(--color-primary-300, #93C5FD)" />
            </linearGradient>
          </defs>

          {/* Dynamic Theme Rounded Board Base Container */}
          <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#eduboardGrad)" />
          
          {/* Smart Board Frame Overlay */}
          <rect x="8" y="8" width="32" height="32" rx="8" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />

          {/* Graduation Cap Top Diamond */}
          <path d="M24 14L35 19.5L24 25L13 19.5L24 14Z" fill="url(#capGrad)" />

          {/* Graduation Cap Base / Skullcap */}
          <path d="M17.5 22.5V26.5C17.5 28.5 20.5 30 24 30C27.5 30 30.5 28.5 30.5 26.5V22.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Tassel */}
          <path d="M32 20.5V25.5C32 26.5 31.5 27.5 31 28" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="31" cy="28.5" r="1" fill="#FDE047" />

          {/* Interactive Screen Signal Dot */}
          <circle cx="37" cy="11" r="2" fill="#10B981" />
        </svg>
      </div>
      {showText && (
        <span className={`font-black ${fontSize} text-[var(--text-primary)] tracking-tight uppercase flex items-baseline gap-1`}>
          <span className="bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] bg-clip-text text-transparent">
            EDU
          </span>
          <span className="text-[var(--text-primary)]">BOARD</span>
        </span>
      )}
    </div>
  );
}
