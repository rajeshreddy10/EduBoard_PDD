'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { LaserPoint } from '@/types/board';

interface VanishingLaserOverlayProps {
  isActive: boolean;
  color?: string;
  className?: string;
}

export const VanishingLaserOverlay: React.FC<VanishingLaserOverlayProps> = ({
  isActive,
  color = '#ef4444',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<LaserPoint[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const isPointerDownRef = useRef(false);

  const renderLaser = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const now = Date.now();
    const LASER_LIFETIME_MS = 2000; // 2 Seconds Vanishing Time

    // Filter points older than 2000ms
    pointsRef.current = pointsRef.current.filter(p => now - p.timestamp < LASER_LIFETIME_MS);
    const points = pointsRef.current;

    ctx.clearRect(0, 0, width, height);

    if (points.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw fading glowing laser segments
      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const age = now - p2.timestamp;
        const progress = Math.max(0, 1 - age / LASER_LIFETIME_MS);

        if (progress <= 0) continue;

        // Glow Layer
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = progress * 0.8;
        ctx.lineWidth = 10 * progress;
        ctx.shadowColor = color;
        ctx.shadowBlur = 16 * progress;
        ctx.stroke();

        // Intense White Core Layer
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = progress;
        ctx.lineWidth = 4 * progress;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }

      // Draw glowing laser head dot at current cursor position
      const head = points[points.length - 1];
      const headAge = now - head.timestamp;
      const headProgress = Math.max(0, 1 - headAge / LASER_LIFETIME_MS);

      if (headProgress > 0) {
        ctx.beginPath();
        ctx.arc(head.x, head.y, 6 * headProgress, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.globalAlpha = headProgress;
        ctx.fill();
      }

      ctx.restore();
    }

    if (isActive || pointsRef.current.length > 0) {
      animFrameRef.current = requestAnimationFrame(renderLaser);
    }
  }, [isActive, color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isActive || pointsRef.current.length > 0) {
      animFrameRef.current = requestAnimationFrame(renderLaser);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive, renderLaser]);

  const addPoint = (e: React.PointerEvent) => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    pointsRef.current.push({ x, y, timestamp: Date.now() });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isActive) return;
    isPointerDownRef.current = true;
    addPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isActive) return;
    addPoint(e);
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`absolute inset-0 z-30 touch-none ${isActive ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'} ${className}`}
    />
  );
};
