'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Undo2, Redo2, Trash2, Pen, Eraser, Move, Upload,
  Send, Save, Check, AlertCircle, Loader2, MousePointer2,
  Zap, ZoomIn, PanelLeftOpen, Disc,
  FileText, Maximize2, Minimize2, RotateCcw, Eye, Bookmark, PanelLeft
} from 'lucide-react';
import { BoardHeader } from '@/components/layout/BoardHeader';
import { TextElementOverlay, BoardTextElement } from '@/components/board/TextElementOverlay';
import { fileImportService, ImportedFileData } from '@/lib/file-import/FileImportService';
import { DocumentViewer } from '@/components/board/DocumentViewer';
import { VanishingLaserOverlay } from '@/components/board/VanishingLaserOverlay';
import { SpotlightOverlay } from '@/components/board/SpotlightOverlay';
import { ReferenceDrawer } from '@/components/board/ReferenceDrawer';
import { ProgressiveRevealBar, StepGroup } from '@/components/board/ProgressiveRevealBar';
import { WaypointBar, Waypoint } from '@/components/board/WaypointBar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { TeacherNotesOverlay, TeacherNote } from '@/components/board/TeacherNotesOverlay';
import { PresentationPointerOverlay, LaserPoint, LaserColorMode, LASER_COLOR_MAP } from '@/components/board/PresentationPointerOverlay';
import { socketService } from '@/lib/socket';

import { useAuth } from '@/lib/AuthContext';
import { useBoard } from '@/lib/BoardContext';
import { SaveStatusType } from '@/components/layout/BoardHeader';
import { historyService } from '@/lib/services/firebaseData';
import type { Board } from '@/lib/types';

import { useSearchParams } from 'next/navigation';
import * as store from '@/lib/store';

type DrawTool = 'pen' | 'eraser' | 'pointer' | 'text' | 'laser';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser';
}

const COLORS = [
  { name: 'Ink', hex: '#1e293b' },
  { name: 'Ruby', hex: '#ef4444' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Azure', hex: '#3b82f6' },
  { name: 'Violet', hex: '#8b5cf6' }
];

export default function NormalBoardPage() {
  return (
    <ErrorBoundary fallbackTitle="Whiteboard Error" fallbackMessage="Something went wrong with the whiteboard canvas. Your work is safe. Click reload to restore.">
      <React.Suspense fallback={<div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white text-xs font-semibold">Loading DrawSpace...</div>}>
        <NormalBoardContent />
      </React.Suspense>
    </ErrorBoundary>
  );
}

function NormalBoardContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams?.get('id');
  const { user } = useAuth();
  const { saveBoard, boards } = useBoard();
  const [boardId, setBoardId] = useState<string>(() => queryId || `drawspace_${Date.now()}`);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [textElements, setTextElements] = useState<BoardTextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const [activeDocument, setActiveDocument] = useState<ImportedFileData | null>(null);
  const [docMode, setDocMode] = useState<'write' | 'scroll'>('write');

  // Presentation Features State
  const [isSpotlightActive, setIsSpotlightActive] = useState(false);
  const [isReferenceDrawerOpen, setIsReferenceDrawerOpen] = useState(false);
  const [referenceDocument, setReferenceDocument] = useState<ImportedFileData | null>(null);

  // Progressive Reveal State
  const [steps, setSteps] = useState<StepGroup[]>([]);
  const [currentRevealStep, setCurrentRevealStep] = useState(0);
  const [isRevealActive, setIsRevealActive] = useState(false);

  // Waypoints State
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  // Presentation & Teacher State
  const [laserColorMode, setLaserColorMode] = useState<LaserColorMode>('red');
  const [teacherNotes, setTeacherNotes] = useState<TeacherNote[]>([]);
  const [isNotesVisible, setIsNotesVisible] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [undoStack, setUndoStack] = useState<{ strokes: Stroke[]; textElements: BoardTextElement[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ strokes: Stroke[]; textElements: BoardTextElement[] }[]>([]);

  const [saveStatus, setSaveStatus] = useState<SaveStatusType>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const isMountedRef = useRef(true);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logicalSizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load saved board if opening from history
  useEffect(() => {
    if (!queryId) return;
    const targetId = queryId;
    let isMounted = true;
    async function loadSavedDrawSpaceBoard() {
      let b = boards.find(item => item.id === targetId) || store.getBoard(targetId);
      if (!b && user?.id) {
        b = (await historyService.getHistoryItem(user.id, targetId)) || undefined;
      }
      if (b && isMounted) {
        setBoardId(b.id);
        if (b.strokes && Array.isArray(b.strokes)) {
          setStrokes(b.strokes as any);
        }
        if (b.elements && Array.isArray(b.elements)) {
          setTextElements(b.elements as any);
        }
        if ((b as any).activeDocument) {
          setActiveDocument((b as any).activeDocument);
        }
        if ((b as any).waypoints && Array.isArray((b as any).waypoints)) {
          setWaypoints((b as any).waypoints);
        }
        if ((b as any).teacherNotes && Array.isArray((b as any).teacherNotes)) {
          setTeacherNotes((b as any).teacherNotes);
        }
      }
    }
    loadSavedDrawSpaceBoard();
    return () => { isMounted = false; };
  }, [queryId, boards, user?.id]);

  // Keyboard Shift key listener to temporarily activate Spotlight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isSpotlightActive) {
        setIsSpotlightActive(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && isSpotlightActive) {
        setIsSpotlightActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpotlightActive]);

  const showStatus = useCallback((message: string, duration = 2500) => {
    if (!isMountedRef.current) return;
    setStatusMessage(message);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setStatusMessage(null);
    }, duration);
  }, []);

  const saveSnapshot = useCallback(() => {
    setUndoStack((prev) => [...prev, { strokes, textElements }]);
    setRedoStack([]);
  }, [strokes, textElements]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, { strokes, textElements }]);
    setStrokes(previous.strokes);
    setTextElements(previous.textElements);
    setUndoStack((prev) => prev.slice(0, -1));
  }, [undoStack, strokes, textElements]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, { strokes, textElements }]);
    setStrokes(next.strokes);
    setTextElements(next.textElements);
    setRedoStack((prev) => prev.slice(0, -1));
  }, [redoStack, strokes, textElements]);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const boardPayload: Board = {
        id: boardId,
        title: activeDocument ? `DrawSpace: ${activeDocument.name}` : 'DrawSpace Interactive Whiteboard',
        description: `Interactive canvas session with ${strokes.length} strokes and ${textElements.length} text elements.`,
        createdBy: user?.id || 'guest',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        isShared: false,
        width: 1920,
        height: 1080,
        zoom: 100,
        isInfiniteCanvas: true,
        strokes: strokes as any,
        elements: textElements as any,
      };

      await saveBoard(boardPayload);
      if (user?.id) {
        await historyService.saveBoardVersion(user.id, boardId, boardPayload);
      }

      setSaveStatus('saved');
      setLastSavedTime(timeStr);
      showStatus('Board saved to cloud history successfully!');
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err) {
      console.error('Failed to save board:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // ── Filter Visible Items based on Progressive Reveal ─────────────────────
  const visibleStrokes = React.useMemo(() => {
    if (!isRevealActive || steps.length === 0 || currentRevealStep === 0) {
      return isRevealActive ? [] : strokes;
    }
    const revealedStepObjects = steps.slice(0, currentRevealStep);
    const allowedStrokeIds = new Set(revealedStepObjects.flatMap(s => s.strokeIds));
    return strokes.filter(s => allowedStrokeIds.has(s.id));
  }, [strokes, isRevealActive, steps, currentRevealStep]);

  const visibleTextElements = React.useMemo(() => {
    if (!isRevealActive || steps.length === 0 || currentRevealStep === 0) {
      return isRevealActive ? [] : textElements;
    }
    const revealedStepObjects = steps.slice(0, currentRevealStep);
    const allowedTextIds = new Set(revealedStepObjects.flatMap(s => s.textIds));
    return textElements.filter(t => allowedTextIds.has(t.id));
  }, [textElements, isRevealActive, steps, currentRevealStep]);

  // ── Redraw Canvas ─────────────────────────────────────────────────────────
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr * zoomScale, 0, 0, dpr * zoomScale, panOffset.x * dpr, panOffset.y * dpr);
    const { w, h } = logicalSizeRef.current;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of visibleStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.lineWidth = stroke.tool === 'eraser' ? stroke.width * 4 : stroke.width;
      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [visibleStrokes, zoomScale, panOffset]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      logicalSizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      redrawCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoomScale,
      y: (e.clientY - rect.top - panOffset.y) / zoomScale,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'pointer' || tool === 'text' || tool === 'laser') return;
    const pt = getCanvasCoords(e);
    isDrawingRef.current = true;
    currentStrokeRef.current = [pt];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || tool === 'laser') return;
    const pt = getCanvasCoords(e);
    const points = currentStrokeRef.current;
    points.push(pt);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || points.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr * zoomScale, 0, 0, dpr * zoomScale, panOffset.x * dpr, panOffset.y * dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? strokeWidth * 4 : strokeWidth;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const points = [...currentStrokeRef.current];
    currentStrokeRef.current = [];
    if (points.length < 2 || tool === 'laser') return;

    saveSnapshot();

    const newStroke: Stroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      points,
      color,
      width: strokeWidth,
      tool: tool === 'eraser' ? 'eraser' : 'pen',
    };

    setStrokes(prev => [...prev, newStroke]);
  };

  // ── Progressive Reveal Step Handlers ──────────────────────────────────────
  const handleGroupCurrentAsStep = () => {
    const unassignedStrokeIds = strokes.map(s => s.id);
    const unassignedTextIds = textElements.map(t => t.id);

    if (unassignedStrokeIds.length === 0 && unassignedTextIds.length === 0) {
      showStatus('Draw or add text before creating a reveal step.');
      return;
    }

    const newStepNum = steps.length + 1;
    const newStep: StepGroup = {
      id: `step_${Date.now()}`,
      stepNumber: newStepNum,
      label: `Step ${newStepNum}`,
      strokeIds: unassignedStrokeIds,
      textIds: unassignedTextIds,
    };

    setSteps(prev => [...prev, newStep]);
    showStatus(`Grouped board content into Step ${newStepNum}`);
  };

  // ── Waypoint Camera Glide Handler ─────────────────────────────────────────
  const handleAddWaypoint = (name: string) => {
    const newWp: Waypoint = {
      id: `wp_${Date.now()}`,
      name,
      panX: panOffset.x,
      panY: panOffset.y,
      zoom: zoomScale,
    };
    setWaypoints(prev => [...prev, newWp]);
    showStatus(`Saved view: "${name}"`);
  };

  const handleSelectWaypoint = (wp: Waypoint) => {
    // Smooth camera glide animation using requestAnimationFrame
    const startPanX = panOffset.x;
    const startPanY = panOffset.y;
    const startZoom = zoomScale;
    const targetPanX = wp.panX;
    const targetPanY = wp.panY;
    const targetZoom = wp.zoom;
    const startTime = performance.now();
    const duration = 400; // 400ms smooth camera glide

    const animateCamera = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth easeInOutQuad interpolation
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      setPanOffset({
        x: startPanX + (targetPanX - startPanX) * ease,
        y: startPanY + (targetPanY - startPanY) * ease,
      });
      setZoomScale(startZoom + (targetZoom - startZoom) * ease);

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        showStatus(`Glided to camera view "${wp.name}"`);
      }
    };

    requestAnimationFrame(animateCamera);
  };

  const handleFitBoard = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    showStatus('Reset canvas viewport');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Header Bar */}
      {!isPresentationMode && (
        <BoardHeader
          title={activeDocument ? activeDocument.name : 'DrawSpace Canvas'}
          onSave={handleSave}
          saveStatus={saveStatus}
          lastSavedTime={lastSavedTime}
        >
          {/* Reference Drawer Toggle */}
          <button
            onClick={() => setIsReferenceDrawerOpen(!isReferenceDrawerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isReferenceDrawerOpen
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:bg-[var(--bg-hover)]'
            }`}
            title="Toggle Reference Drawer (30/70 Side-by-Side)"
          >
            <PanelLeft className="w-3.5 h-3.5" />
            <span>Reference</span>
          </button>

          {/* Waypoint Camera Bar */}
          <WaypointBar
            waypoints={waypoints}
            onAddWaypoint={handleAddWaypoint}
            onSelectWaypoint={handleSelectWaypoint}
            onDeleteWaypoint={(id) => setWaypoints(prev => prev.filter(w => w.id !== id))}
          />

          {/* Progressive Reveal Bar */}
          <ProgressiveRevealBar
            steps={steps}
            currentRevealStep={currentRevealStep}
            isRevealActive={isRevealActive}
            onToggleRevealMode={() => {
              setIsRevealActive(!isRevealActive);
              setCurrentRevealStep(0);
            }}
            onNextStep={() => setCurrentRevealStep(prev => Math.min(steps.length, prev + 1))}
            onPrevStep={() => setCurrentRevealStep(prev => Math.max(0, prev - 1))}
            onResetReveal={() => setCurrentRevealStep(0)}
            onGroupCurrentAsStep={handleGroupCurrentAsStep}
          />
        </BoardHeader>
      )}

      {/* Main Workspace Body with Reference Drawer Side-by-Side Flex Reflow */}
      <div className="flex flex-1 w-full h-full overflow-hidden relative">
        
        {/* Left Side-by-Side Reference Drawer (~30% screen width) */}
        <ReferenceDrawer
          isOpen={isReferenceDrawerOpen}
          onClose={() => setIsReferenceDrawerOpen(false)}
          document={referenceDocument}
          onDocumentChange={setReferenceDocument}
        />

        {/* Right Canvas Container (~70% screen width when drawer is open) */}
        <div ref={containerRef} className="relative flex-1 h-full overflow-hidden select-none">
          
          {/* Background Document View */}
          {activeDocument && (
            <DocumentViewer
              document={activeDocument}
              docMode={docMode}
              onDocModeChange={setDocMode}
            />
          )}

          {/* Main Drawing Canvas */}
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="absolute inset-0 z-10 touch-none cursor-crosshair"
          />

          {/* 1. Vanishing Laser Overlay (Fading 2-Second Trail) */}
          <VanishingLaserOverlay isActive={tool === 'laser'} color={LASER_COLOR_MAP[laserColorMode]} />

          {/* 2. Focus Spotlight Overlay (70% Dimmed Canvas with Soft Radial Hole) */}
          <SpotlightOverlay isActive={isSpotlightActive} containerRef={containerRef} />

          {/* Teacher Notes Overlay */}
          <TeacherNotesOverlay
            isTeacher={true}
            notes={teacherNotes}
            onUpdateNotes={setTeacherNotes}
            isVisible={isNotesVisible}
            onToggleVisibility={() => setIsNotesVisible(!isNotesVisible)}
          />

          {/* Interactive Text Elements Overlay */}
          {visibleTextElements.map(el => (
            <TextElementOverlay
              key={el.id}
              element={el}
              isSelected={selectedTextId === el.id}
              onSelect={setSelectedTextId}
              onUpdate={(updated) => setTextElements(prev => prev.map(t => t.id === updated.id ? updated : t))}
              onDelete={(id) => setTextElements(prev => prev.filter(t => t.id !== id))}
            />
          ))}

          {/* Status Message Notification Toast */}
          {statusMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg animate-fade-in border border-slate-700">
              {statusMessage}
            </div>
          )}

          {/* Floating Studio Dock / HUD Toolbar */}
          <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-2 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-dock transition-all ${isPresentationMode ? 'bg-slate-900 border-slate-700 text-white' : ''}`}>
            {/* Drawing Tools */}
            {[
              { id: 'pen', icon: Pen, label: 'Pen' },
              { id: 'eraser', icon: Eraser, label: 'Eraser' },
              { id: 'pointer', icon: MousePointer2, label: 'Select' },
              { id: 'laser', icon: Zap, label: 'Vanishing Laser' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id as DrawTool)}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  tool === t.id ? 'bg-[var(--color-primary-500)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`}
                title={t.label}
              >
                <t.icon className="w-4 h-4" />
              </button>
            ))}

            <div className="w-px h-6 bg-[var(--border-primary)]" />

            {/* Color Swatches */}
            {tool === 'pen' && (
              <div className="flex items-center gap-1.5 px-1">
                {COLORS.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => setColor(c.hex)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                      color === c.hex ? 'scale-125 border-white shadow-xs' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Laser Color Selection */}
            {tool === 'laser' && (
              <div className="flex items-center gap-1.5 px-1">
                {(['red', 'green', 'blue', 'yellow'] as LaserColorMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setLaserColorMode(m)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                      laserColorMode === m ? 'scale-125 border-white shadow-xs' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: LASER_COLOR_MAP[m] }}
                    title={`Laser ${m}`}
                  />
                ))}
              </div>
            )}

            <div className="w-px h-6 bg-[var(--border-primary)]" />

            {/* Focus Spotlight Toggle */}
            <button
              onClick={() => setIsSpotlightActive(!isSpotlightActive)}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                isSpotlightActive ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]'
              }`}
              title="Focus Spotlight (Hold Shift to activate)"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Undo / Redo */}
            <button onClick={handleUndo} disabled={undoStack.length === 0} className="p-2.5 rounded-xl text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--bg-tertiary)] cursor-pointer" title="Undo">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2.5 rounded-xl text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--bg-tertiary)] cursor-pointer" title="Redo">
              <Redo2 className="w-4 h-4" />
            </button>

            {/* Fit Viewport */}
            <button onClick={handleFitBoard} className="p-2.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer" title="Fit Board View">
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-[var(--border-primary)]" />

            {/* Presentation Mode Toggle */}
            <button
              onClick={() => setIsPresentationMode(!isPresentationMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isPresentationMode ? 'bg-red-600 text-white shadow-xs' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {isPresentationMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isPresentationMode ? 'Exit Presentation' : 'Present'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
