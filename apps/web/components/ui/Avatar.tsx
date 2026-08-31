'use client';
import Image from 'next/image';

interface AvatarProps {
  src?: string;
  fallback?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

const sizeMap: Record<string, string> = {
  sm: 'avatar-sm',
  md: 'avatar-md',
  lg: 'avatar-lg',
  xl: 'avatar-xl',
};

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-[var(--text-tertiary)]',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
};

const gradients = [
  'from-[var(--color-primary-500)] to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-fuchsia-600',
  'from-rose-500 to-red-600',
];

export function Avatar({ src, fallback, name, size = 'md', status, className = '' }: AvatarProps) {
  const displayText = fallback || (name ? name.charAt(0).toUpperCase() : '?');
  const gradient = gradients[(name?.charCodeAt(0) ?? 0) % gradients.length];
  const sizeClass = sizeMap[size];

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`avatar ${sizeClass} relative bg-gradient-to-br ${gradient} text-white shadow-md overflow-hidden`}
      >
        {src ? (
          <Image
            src={src}
            alt={name || 'Avatar'}
            fill
            sizes="(max-width: 768px) 40px, 64px"
            className="object-cover"
            unoptimized
          />
        ) : (
          displayText
        )}
      </div>
      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-secondary)] ${statusColors[status]}`}
        />
      )}
    </div>
  );
}
