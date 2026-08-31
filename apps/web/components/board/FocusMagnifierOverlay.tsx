'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, Eye } from 'lucide-react';

interface FocusMagnifierOverlayProps {
  isActive: boolean;
  sourceCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  zoomLevel?: number;
  lensSize?: number;
}

export const FocusMagnifierOverlay: React.FC<FocusMagnifierOverlayProps> = ({
  isActive,
  sourceCanvasRef,
  containerRef,
  zoomLevel = 2.0,
  lensSize = 200
}) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const lensCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const drawMagnifiedView = useCallback(() => {
    if (!isActive || !pos) return;
    const lensCanvas = lensCanvasRef.current;
    if (!lensCanvas) return;
    const ctx = lensCanvas.getContext('2d');
    if (!ctx) return;

    const sourceCanvas = sourceCanvasRef?.current;

    const dpr = window.devicePixelRatio || 1;
    lensCanvas.width = lensSize * dpr;
    lensCanvas.height = lensSize * dpr;

    ctx.clearRect(0, 0, lensSize * dpr, lensSize * dpr);

    // Create circular clipping path for magnifying glass lens
    ctx.save();
    ctx.beginPath();
    ctx.arc((lensSize * dpr) / 2, (lensSize * dpr) / 2, (lensSize * dpr) / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    // Fill glass background with dark/light backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, lensSize * dpr, lensSize * dpr);

    if (sourceCanvas) {
      const srcW = lensSize / zoomLevel;
      const srcH = lensSize / zoomLevel;
      const srcX = Math.max(0, (pos.x - srcW / 2) * dpr);
      const srcY = Math.max(0, (pos.y - srcH / 2) * dpr);

      try {
        ctx.drawImage(
          sourceCanvas,
          srcX,
          srcY,
          srcW * dpr,
          srcH * dpr,
          0,
          0,
          lensSize * dpr,
          lensSize * dpr
        );
      } catch (err) {
        // Fallback if cross-origin or canvas read error occurs
      }
    }

    // Add subtle glass reflection & crosshair indicator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo((lensSize * dpr) / 2 - 12, (lensSize * dpr) / 2);
    ctx.lineTo((lensSize * dpr) / 2 + 12, (lensSize * dpr) / 2);
    ctx.moveTo((lensSize * dpr) / 2, (lensSize * dpr) / 2 - 12);
    ctx.lineTo((lensSize * dpr) / 2, (lensSize * dpr) / 2 + 12);
    ctx.stroke();

    ctx.restore();
  }, [isActive, pos, sourceCanvasRef, zoomLevel, lensSize]);

  useEffect(() => {
    if (!isActive) {
      setPos(null);
      return;
    }

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const targetContainer = containerRef?.current || sourceCanvasRef?.current?.parentElement || document.body;
      const rect = targetContainer.getBoundingClientRect();

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      setPos({ x, y });
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, [isActive, containerRef, sourceCanvasRef]);

  useEffect(() => {
    if (isActive && pos) {
      animFrameRef.current = requestAnimationFrame(drawMagnifiedView);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, pos, drawMagnifiedView]);

  if (!isActive || !pos) return null;

  return (
    <div
      className="absolute pointer-events-none z-50 transition-transform duration-75 ease-out"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: 'translate(-50%, -50%)',
        width: `${lensSize}px`,
        height: `${lensSize}px`
      }}
    >
      {/* Outer Glowing Metallic Frame */}
      <div className="w-full h-full rounded-full border-4 border-indigo-500/80 shadow-[0_0_30px_rgba(99,102,241,0.5),inset_0_0_15px_rgba(255,255,255,0.2)] bg-slate-950/80 backdrop-blur-md relative overflow-hidden flex items-center justify-center">
        <canvas
          ref={lensCanvasRef}
          className="w-full h-full rounded-full block"
          style={{ width: `${lensSize}px`, height: `${lensSize}px` }}
        />

        {/* Top Badge showing 2.0x Zoom */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-indigo-600/90 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1">
          <ZoomIn className="w-3 h-3" />
          <span>{zoomLevel.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
};
