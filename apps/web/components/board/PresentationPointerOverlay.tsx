'use client';

import React, { useEffect, useState } from 'react';

export type LaserColorMode = 'red' | 'green' | 'blue' | 'yellow';

export interface LaserPoint {
  x: number;
  y: number;
  color: string;
  time: number;
}

export interface RemoteLaserState {
  userId: string;
  points: LaserPoint[];
}

interface PresentationPointerOverlayProps {
  localPoints: LaserPoint[];
  remoteLasers?: Record<string, LaserPoint[]>;
}

export const LASER_COLOR_MAP: Record<LaserColorMode, string> = {
  red: '#ef4444',
  green: '#10b981',
  blue: '#3b82f6',
  yellow: '#eab308',
};

export function PresentationPointerOverlay({ localPoints, remoteLasers = {} }: PresentationPointerOverlayProps) {
  const [now, setNow] = useState(0);

  // Animation frame loop to smoothly decay pointer trails
  useEffect(() => {
    setNow(Date.now());
    let animId: number;
    const tick = () => {
      setNow(Date.now());
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const renderTrail = (pts: LaserPoint[], keyPrefix: string) => {
    const active = pts.filter(p => now - p.time < 750); // Trail expires in 750ms
    if (active.length < 2) return null;

    return (
      <g key={keyPrefix}>
        {active.map((pt, idx) => {
          if (idx === 0) return null;
          const prev = active[idx - 1];
          const age = now - pt.time;
          const opacity = Math.max(0, 1 - age / 750);
          const strokeWidth = Math.max(2, 8 * (1 - age / 750));

          return (
            <line
              key={`${keyPrefix}_${idx}`}
              x1={prev.x}
              y1={prev.y}
              x2={pt.x}
              y2={pt.y}
              stroke={pt.color || '#ef4444'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacity}
              style={{ filter: `drop-shadow(0 0 6px ${pt.color || '#ef4444'})` }}
            />
          );
        })}
        {/* Pointer Head */}
        {active.length > 0 && (
          <circle
            cx={active[active.length - 1].x}
            cy={active[active.length - 1].y}
            r={6}
            fill={active[active.length - 1].color || '#ef4444'}
            style={{ filter: `drop-shadow(0 0 8px ${active[active.length - 1].color || '#ef4444'})` }}
          />
        )}
      </g>
    );
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-hidden">
      {/* Local Teacher Laser Pointer */}
      {renderTrail(localPoints, 'local_laser')}

      {/* Remote Collaborators Laser Pointers */}
      {Object.entries(remoteLasers).map(([uid, pts]) => renderTrail(pts, `remote_laser_${uid}`))}
    </svg>
  );
}
