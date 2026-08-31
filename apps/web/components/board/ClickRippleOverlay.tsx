'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RippleEffect } from '@/types/board';

interface ClickRippleOverlayProps {
  isEnabled?: boolean;
  color?: string;
  className?: string;
}

const RIPPLE_COLORS = [
  '#3b82f6', // Azure Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444'  // Red
];

export const ClickRippleOverlay: React.FC<ClickRippleOverlayProps> = ({
  isEnabled = true,
  color,
  className = ''
}) => {
  const [ripples, setRipples] = useState<RippleEffect[]>([]);

  const handlePointerDown = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isEnabled) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const randomColor = color || RIPPLE_COLORS[Math.floor(Math.random() * RIPPLE_COLORS.length)];
    const newRipple: RippleEffect = {
      id: `ripple_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      x: clientX,
      y: clientY,
      color: randomColor,
      startTime: Date.now()
    };

    setRipples(prev => [...prev.slice(-12), newRipple]); // Keep max 12 active ripples
  }, [isEnabled, color]);

  useEffect(() => {
    if (!isEnabled) return;

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isEnabled, handlePointerDown]);

  // Clean up finished ripples after 600ms
  useEffect(() => {
    if (ripples.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setRipples(prev => prev.filter(r => now - r.startTime < 600));
    }, 600);
    return () => clearTimeout(timer);
  }, [ripples]);

  if (!isEnabled) return null;

  return (
    <div className={`fixed inset-0 pointer-events-none z-[9999] overflow-hidden ${className}`}>
      <AnimatePresence>
        {ripples.map((r) => (
          <React.Fragment key={r.id}>
            {/* Outer Expanding Glowing Ring */}
            <motion.div
              initial={{ scale: 0.2, opacity: 1, borderWidth: 4 }}
              animate={{ scale: 2.2, opacity: 0, borderWidth: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{
                left: `${r.x}px`,
                top: `${r.y}px`,
                transform: 'translate(-50%, -50%)',
                borderColor: r.color,
                boxShadow: `0 0 20px ${r.color}`
              }}
              className="absolute w-12 h-12 rounded-full border border-solid pointer-events-none"
            />
            {/* Inner Core Pulse */}
            <motion.div
              initial={{ scale: 0.1, opacity: 0.9 }}
              animate={{ scale: 0.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{
                left: `${r.x}px`,
                top: `${r.y}px`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: r.color
              }}
              className="absolute w-8 h-8 rounded-full pointer-events-none"
            />
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};
