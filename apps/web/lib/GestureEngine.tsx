'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface GestureEngineProps {
  cameraId?: string;
  sensitivity?: number;
  onGesture?: (gesture: GestureEvent) => void;
  enabled?: boolean;
  children?: React.ReactNode;
}

export interface GestureEvent {
  type: string;
  confidence: number;
  landmarks: { x: number; y: number; z: number }[];
  handedness: 'left' | 'right';
  fingers: { thumb: boolean; index: boolean; middle: boolean; ring: boolean; pinky: boolean };
  timestamp: number;
}

const GESTURE_MAP: Record<string, string> = {
  index_point: 'draw',
  two_fingers: 'pan',
  fist: 'erase',
  open_palm: 'clear',
  pinch: 'zoom',
  ok_sign: 'select',
  thumbs_up: 'confirm',
  peace: 'tool_menu',
  swipe_left: 'undo',
  swipe_right: 'redo',
};

export default function GestureEngine({ cameraId, sensitivity = 70, onGesture, enabled = true, children }: GestureEngineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [detectedGesture, setDetectedGesture] = useState('');
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, deviceId: cameraId ? { exact: cameraId } : undefined },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsActive(true);
    } catch (err) {
      console.warn('Camera access denied:', err);
      setIsActive(false);
    }
  }, [cameraId]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  useEffect(() => {
    if (enabled) {
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [enabled, startCamera, stopCamera]);

  const detectGestures = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, 640, 480);
    const imageData = ctx.getImageData(0, 0, 640, 480);

    frameCountRef.current++;
    const now = Date.now();
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = now;
    }
    if (now - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    const simulatedGesture = simulateGestureDetection(imageData, sensitivity);
    if (simulatedGesture && onGesture) {
      onGesture(simulatedGesture);
      setDetectedGesture(simulatedGesture.type);
      setTimeout(() => setDetectedGesture(''), 500);
    }

    animFrameRef.current = requestAnimationFrame(detectGestures);
  }, [isActive, sensitivity, onGesture]);

  useEffect(() => {
    if (isActive) {
      animFrameRef.current = requestAnimationFrame(detectGestures);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isActive, detectGestures]);

  return (
    <div className="relative">
      {enabled && (
        <div className="fixed bottom-4 right-4 z-50 glass-card p-2 w-48">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-36 rounded-lg object-cover bg-black" />
          <canvas ref={canvasRef} width={640} height={480} className="hidden" />
          <div className="flex items-center justify-between mt-1.5 px-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-[9px] text-[var(--text-tertiary)]">{isActive ? 'Active' : 'Off'}</span>
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)]">{fps} FPS</span>
          </div>
          {detectedGesture && (
            <div className="mt-1 px-1 py-0.5 rounded bg-[var(--color-primary-500)]/20 text-[9px] text-[var(--color-primary-500)] font-medium text-center animate-fade-in">
              {detectedGesture}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function simulateGestureDetection(imageData: ImageData, sensitivity: number): GestureEvent | null {
  const r = Math.random() * 100;
  if (r > sensitivity / 2) return null;

  const gestureTypes = ['index_point', 'two_fingers', 'fist', 'open_palm', 'pinch', 'swipe_left', 'swipe_right'];
  const type = gestureTypes[Math.floor(Math.random() * gestureTypes.length)];
  const confidence = 0.7 + Math.random() * 0.28;

  const landmarks = Array.from({ length: 21 }, () => ({
    x: Math.random() * 640,
    y: Math.random() * 480,
    z: Math.random() * 100
  }));

  const fingers = {
    thumb: Math.random() > 0.5,
    index: Math.random() > 0.5,
    middle: Math.random() > 0.5,
    ring: Math.random() > 0.5,
    pinky: Math.random() > 0.5
  };

  return {
    type: GESTURE_MAP[type] || type,
    confidence,
    landmarks,
    handedness: Math.random() > 0.5 ? 'right' : 'left',
    fingers,
    timestamp: Date.now()
  };
}
