'use client';
import React, { ReactNode, useEffect, useRef, useState } from 'react';

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideIn' | 'scaleIn' | 'scaleUp' | 'none';
  delay?: number;
  duration?: number;
  once?: boolean;
  threshold?: number;
}

const keyframeStyles: Record<string, string> = {
  fadeIn: 'opacity-0',
  slideUp: 'opacity-0 translate-y-4',
  slideDown: 'opacity-0 -translate-y-4',
  slideIn: 'opacity-0 -translate-x-4',
  scaleIn: 'opacity-0 scale-[0.97]',
  scaleUp: 'opacity-0 scale-[0.95]',
  none: '',
};

export function AnimatedContainer({
  children, className = '', animation = 'fadeIn', delay = 0, duration = 400, once = true, threshold = 0.1,
}: AnimatedContainerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold]);

  return (
    <div
      ref={ref}
      className={`transition-all ease-out will-change-transform ${isVisible ? 'opacity-100 translate-x-0 translate-y-0 scale-100' : keyframeStyles[animation]} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionProperty: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
