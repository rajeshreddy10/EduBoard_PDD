'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SpotlightOverlayProps {
  isActive: boolean;
  radius?: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({
  isActive,
  radius = 160,
  containerRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const drawSpotlight = useCallback(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);

    // 1. Fill entire canvas with 70% dark mask
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.70)';
    ctx.fillRect(0, 0, width, height);

    // 2. Cut out circular soft-edged spotlight around cursor if active
    const pos = posRef.current;
    if (pos) {
      ctx.globalCompositeOperation = 'destination-out';
      
      const gradient = ctx.createRadialGradient(
        pos.x, pos.y, radius * 0.4,
        pos.x, pos.y, radius
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.9)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';

      // Soft glowing ring outline around the spotlight aperture
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();

    if (isActive) {
      animFrameRef.current = requestAnimationFrame(drawSpotlight);
    }
  }, [isActive, radius]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const targetContainer = containerRef?.current || canvas.parentElement || document.body;
      const dpr = window.devicePixelRatio || 1;
      const rect = targetContainer.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [containerRef]);

  useEffect(() => {
    if (!isActive) {
      posRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      posRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove);
    animFrameRef.current = requestAnimationFrame(drawSpotlight);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, drawSpotlight]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-35 pointer-events-none transition-opacity duration-300"
    />
  );
};
