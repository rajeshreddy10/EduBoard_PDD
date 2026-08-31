'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pen, Eraser, Type, Highlighter, Zap, ZoomIn, Upload, Undo2, Redo2,
  RotateCcw, PanelLeft, FileText, Check, Save,
  X, MousePointer2, Eye
} from 'lucide-react';
import { BoardHeader, SaveStatusType } from '@/components/layout/BoardHeader';
import { TextElementOverlay, BoardTextElement } from '@/components/board/TextElementOverlay';
import { fileImportService, ImportedFileData } from '@/lib/file-import/FileImportService';
import { DocumentViewer } from '@/components/board/DocumentViewer';
import { VanishingLaserOverlay } from '@/components/board/VanishingLaserOverlay';
import { FocusMagnifierOverlay } from '@/components/board/FocusMagnifierOverlay';
import { ReferenceDrawer } from '@/components/board/ReferenceDrawer';
import { WaypointBar, Waypoint } from '@/components/board/WaypointBar';
import { TeacherNotesOverlay, TeacherNote } from '@/components/board/TeacherNotesOverlay';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LASER_COLOR_MAP, LaserColorMode } from '@/components/board/PresentationPointerOverlay';

import { useAuth } from '@/lib/AuthContext';
import { useBoard } from '@/lib/BoardContext';
import { historyService } from '@/lib/services/firebaseData';
import type { Board } from '@/lib/types';

type DocTool = 'pen' | 'text' | 'eraser' | 'highlight' | 'laser' | 'magnify' | 'pointer';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser' | 'highlight';
}

import { useSearchParams } from 'next/navigation';
import * as store from '@/lib/store';

const PEN_COLORS = [
  { name: 'Azure', hex: '#2563eb' },
  { name: 'Ruby', hex: '#dc2626' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Ink', hex: '#0f172a' }
];

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#fef08a' },
  { name: 'Green', hex: '#bbf7d0' },
  { name: 'Cyan', hex: '#a5f3fc' },
  { name: 'Pink', hex: '#fbcfe8' }
];

export function DocCanvasPage() {
  return (
    <ErrorBoundary fallbackTitle="DocCanvas Error" fallbackMessage="Something went wrong with the document canvas. Click reload to restore.">
      <React.Suspense fallback={<div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white text-xs font-semibold">Loading DocCanvas Studio...</div>}>
        <DocCanvasContent />
      </React.Suspense>
    </ErrorBoundary>
  );
}

function DocCanvasContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams?.get('id');
  const { user } = useAuth();
  const { saveBoard, boards } = useBoard();
  const [boardId, setBoardId] = useState<string>(() => queryId || `doccanvas_${Date.now()}`);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Document & View State
  const [doc, setDoc] = useState<ImportedFileData | null>(null);
  const [docMode, setDocMode] = useState<'write' | 'scroll'>('write');

  // Tool & Canvas State
  const [tool, setTool] = useState<DocTool>('pen');
  const [color, setColor] = useState('#2563eb');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [textElements, setTextElements] = useState<BoardTextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Core Features State
  const [isReferenceDrawerOpen, setIsReferenceDrawerOpen] = useState(false);
  const [referenceDocument, setReferenceDocument] = useState<ImportedFileData | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [teacherNotes, setTeacherNotes] = useState<TeacherNote[]>([]);
  const [isNotesVisible, setIsNotesVisible] = useState(false);

  // Overlays State
  const [laserColorMode, setLaserColorMode] = useState<LaserColorMode>('red');
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // History & Save State
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
    async function loadSavedDocCanvasBoard() {
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
          setDoc((b as any).activeDocument);
        }
        if ((b as any).waypoints && Array.isArray((b as any).waypoints)) {
          setWaypoints((b as any).waypoints);
        }
        if ((b as any).teacherNotes && Array.isArray((b as any).teacherNotes)) {
          setTeacherNotes((b as any).teacherNotes);
        }
      }
    }
    loadSavedDocCanvasBoard();
    return () => { isMounted = false; };
  }, [queryId, boards, user?.id]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await fileImportService.importFile(file);
      setDoc(imported);
      showStatus(`Opened document: ${imported.name}`);
    } catch (err) {
      console.error('File import failed:', err);
      showStatus('Failed to import file. Please try another format.');
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const boardPayload: Board = {
        id: boardId,
        title: doc ? `DocCanvas: ${doc.name}` : 'DocCanvas Document Annotation Studio',
        description: `Document annotation session with ${strokes.length} strokes and ${textElements.length} text annotations.`,
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
        ...(doc ? {
          bgFile: { url: doc.dataUrl || (doc as any).url, type: doc.type },
          activeDocument: doc as any,
        } : {}),
      };

      await saveBoard(boardPayload);
      if (user?.id) {
        await historyService.saveBoardVersion(user.id, boardId, boardPayload);
      }

      setSaveStatus('saved');
      setLastSavedTime(timeStr);
      showStatus('Document annotations saved successfully!');
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err) {
      console.error('Failed to save DocCanvas:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // Redraw Canvas
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

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();

      if (stroke.tool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = stroke.width * 4;
        ctx.globalCompositeOperation = 'destination-out';
      } else if (stroke.tool === 'highlight') {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width * 5;
        ctx.globalAlpha = 0.4;
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [strokes, zoomScale, panOffset]);

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
    if (docMode === 'scroll' || tool === 'pointer' || tool === 'laser' || tool === 'magnify') return;

    const pt = getCanvasCoords(e);

    if (tool === 'text') {
      saveSnapshot();
      const newText: BoardTextElement = {
        id: `text_${Date.now()}`,
        x: pt.x,
        y: pt.y,
        text: 'Click to type annotation...',
        fontSize: 18,
        color: color,
      };
      setTextElements(prev => [...prev, newText]);
      setSelectedTextId(newText.id);
      return;
    }

    isDrawingRef.current = true;
    currentStrokeRef.current = [pt];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || docMode === 'scroll' || tool === 'laser' || tool === 'magnify' || tool === 'text') return;
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

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = strokeWidth * 4;
      ctx.globalCompositeOperation = 'destination-out';
    } else if (tool === 'highlight') {
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = strokeWidth * 5;
      ctx.globalAlpha = 0.4;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    }

    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const points = [...currentStrokeRef.current];
    currentStrokeRef.current = [];
    if (points.length < 2 || tool === 'laser' || tool === 'magnify' || tool === 'text') return;

    saveSnapshot();

    const newStroke: Stroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      points,
      color: tool === 'highlight' ? highlightColor : color,
      width: strokeWidth,
      tool: tool === 'eraser' ? 'eraser' : tool === 'highlight' ? 'highlight' : 'pen',
    };

    setStrokes(prev => [...prev, newStroke]);
  };

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
    setPanOffset({ x: wp.panX, y: wp.panY });
    setZoomScale(wp.zoom);
    showStatus(`Glided to view "${wp.name}"`);
  };

  const handleFitBoard = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    showStatus('Reset document view');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Header Bar */}
      <BoardHeader
        title={doc ? `DocCanvas: ${doc.name}` : 'DocCanvas Studio'}
        onSave={handleSave}
        saveStatus={saveStatus}
        lastSavedTime={lastSavedTime}
      >
        {/* Reference Drawer Toggle */}
        <button
          onClick={() => setIsReferenceDrawerOpen(!isReferenceDrawerOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            isReferenceDrawerOpen
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          title="Toggle Reference Drawer"
        >
          <PanelLeft className="w-3.5 h-3.5" />
          <span>Reference</span>
        </button>

        {/* Open Document File Action */}
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md">
          <Upload className="w-3.5 h-3.5" />
          <span>Open Document</span>
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.ppt,.pptx,.txt,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
          />
        </label>

        {/* Waypoints Camera Bar */}
        <WaypointBar
          waypoints={waypoints}
          onAddWaypoint={handleAddWaypoint}
          onSelectWaypoint={handleSelectWaypoint}
          onDeleteWaypoint={(id) => setWaypoints(prev => prev.filter(w => w.id !== id))}
        />
      </BoardHeader>

      {/* Main Studio Viewport */}
      <div className="flex flex-1 w-full h-full overflow-hidden relative bg-slate-900">
        {/* Left Side-by-Side Reference Drawer */}
        <ReferenceDrawer
          isOpen={isReferenceDrawerOpen}
          onClose={() => setIsReferenceDrawerOpen(false)}
          document={referenceDocument}
          onDocumentChange={setReferenceDocument}
        />

        {/* Right Studio Workspace */}
        <div ref={containerRef} className="relative flex-1 h-full overflow-hidden select-none flex items-center justify-center p-4">
          {doc ? (
            <DocumentViewer
              document={doc}
              docMode={docMode}
              onDocModeChange={setDocMode}
              onClose={() => setDoc(null)}
              className="w-full h-full"
            >
              {/* Overlay Canvas */}
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className={`absolute inset-0 z-10 touch-none ${docMode === 'scroll' ? 'pointer-events-none' : 'cursor-crosshair pointer-events-auto'}`}
              />

              {/* Text Elements Overlay */}
              {textElements.map(el => (
                <TextElementOverlay
                  key={el.id}
                  element={el}
                  isSelected={selectedTextId === el.id}
                  onSelect={setSelectedTextId}
                  onUpdate={(updated) => setTextElements(prev => prev.map(t => t.id === updated.id ? updated : t))}
                  onDelete={(id) => setTextElements(prev => prev.filter(t => t.id !== id))}
                />
              ))}
            </DocumentViewer>
          ) : (
            <div className="w-full h-full relative rounded-3xl bg-slate-950/80 border border-slate-800 shadow-2xl overflow-hidden">
              {/* Floating Non-Blocking Blank Canvas Helper Banner */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg text-slate-300 text-xs font-semibold">
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Blank Canvas — Draw directly or import a document</span>
                <label className="pointer-events-auto px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm">
                  <Upload className="w-3 h-3" />
                  <span>Open File</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.ppt,.pptx,.txt,.doc,.docx,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                </label>
              </div>

              {/* Blank Interactive Canvas Overlay */}
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="absolute inset-0 z-10 touch-none cursor-crosshair pointer-events-auto"
              />

              {textElements.map(el => (
                <TextElementOverlay
                  key={el.id}
                  element={el}
                  isSelected={selectedTextId === el.id}
                  onSelect={setSelectedTextId}
                  onUpdate={(updated) => setTextElements(prev => prev.map(t => t.id === updated.id ? updated : t))}
                  onDelete={(id) => setTextElements(prev => prev.filter(t => t.id !== id))}
                />
              ))}
            </div>
          )}

          {/* Interactive Overlays */}
          <VanishingLaserOverlay isActive={tool === 'laser'} color={LASER_COLOR_MAP[laserColorMode]} />
          <FocusMagnifierOverlay isActive={tool === 'magnify'} containerRef={containerRef} sourceCanvasRef={canvasRef} />
          
          <TeacherNotesOverlay
            isTeacher={true}
            notes={teacherNotes}
            onUpdateNotes={setTeacherNotes}
            isVisible={isNotesVisible}
            onToggleVisibility={() => setIsNotesVisible(!isNotesVisible)}
          />

          {/* Toast Notification */}
          {statusMessage && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xl border border-slate-700 animate-fade-in">
              {statusMessage}
            </div>
          )}

          {/* Studio HUD Toolbar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-2 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-2xl transition-all">
            
            {/* Main Annotation Tools */}
            {[
              { id: 'pen', icon: Pen, label: 'Pen Mode' },
              { id: 'text', icon: Type, label: 'Text Typing' },
              { id: 'eraser', icon: Eraser, label: 'Eraser' },
              { id: 'highlight', icon: Highlighter, label: 'Highlight' },
              { id: 'laser', icon: Zap, label: 'Laser Pointer' },
              { id: 'magnify', icon: ZoomIn, label: 'Magnify Lens' },
              { id: 'pointer', icon: MousePointer2, label: 'Select Mode' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id as DocTool)}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  tool === t.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
                title={t.label}
              >
                <t.icon className="w-4 h-4" />
              </button>
            ))}

            <div className="w-px h-6 bg-slate-800" />

            {/* Pen Color Swatches */}
            {tool === 'pen' && (
              <div className="flex items-center gap-1.5 px-1">
                {PEN_COLORS.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => setColor(c.hex)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                      color === c.hex ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Highlight Color Swatches */}
            {tool === 'highlight' && (
              <div className="flex items-center gap-1.5 px-1">
                {HIGHLIGHT_COLORS.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => setHighlightColor(c.hex)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                      highlightColor === c.hex ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={`Highlighter ${c.name}`}
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
                      laserColorMode === m ? 'scale-125 border-white shadow-md' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: LASER_COLOR_MAP[m] }}
                    title={`Laser ${m}`}
                  />
                ))}
              </div>
            )}

            <div className="w-px h-6 bg-slate-800" />

            {/* Undo / Redo */}
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-2.5 rounded-xl text-slate-400 disabled:opacity-30 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-2.5 rounded-xl text-slate-400 disabled:opacity-30 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            {/* Fit Viewport */}
            <button
              onClick={handleFitBoard}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocCanvasPage;
