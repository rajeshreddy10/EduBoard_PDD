'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import * as store from '@/lib/store';
import {
  Mic, MicOff, Pen, Eraser, Move, Type, Trash2, Download, Upload,
  Undo2, Redo2, FileText, CheckCircle2, Sparkles, AlertCircle, Volume2, Plus, Minus
} from 'lucide-react';
import { BoardHeader, SaveStatusType } from '@/components/layout/BoardHeader';
import { TextElementOverlay, BoardTextElement } from '@/components/board/TextElementOverlay';
import { fileImportService, ImportedFileData } from '@/lib/file-import/FileImportService';
import { useAuth } from '@/lib/AuthContext';
import { useBoard } from '@/lib/BoardContext';
import { historyService } from '@/lib/services/firebaseData';
import type { Board } from '@/lib/types';

type ToolMode = 'pen' | 'eraser' | 'pointer' | 'text';

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser';
}

const PEN_COLORS = [
  { name: 'Ink', hex: '#1e293b' },
  { name: 'Azure', hex: '#2563eb' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Ruby', hex: '#dc2626' },
  { name: 'Violet', hex: '#7c3aed' }
];

// Helper to prevent duplicate sentence repetition during speech recognition
function dedupeSpeechText(baseText: string, currentSpeech: string): string {
  const base = baseText.trim();
  const current = currentSpeech.trim();

  if (!base) return current;
  if (!current) return base;

  if (base.endsWith(current) || base.toLowerCase().endsWith(current.toLowerCase())) {
    return base;
  }

  const baseWords = base.split(/\s+/);
  const currentWords = current.split(/\s+/);

  let overlapCount = 0;
  for (let len = Math.min(baseWords.length, currentWords.length); len > 0; len--) {
    const baseSuffix = baseWords.slice(-len).join(' ').toLowerCase().replace(/[.,!?]/g, '');
    const currentPrefix = currentWords.slice(0, len).join(' ').toLowerCase().replace(/[.,!?]/g, '');
    if (baseSuffix === currentPrefix) {
      overlapCount = len;
      break;
    }
  }

  if (overlapCount > 0) {
    const remainingNewWords = currentWords.slice(overlapCount).join(' ');
    return remainingNewWords ? `${base} ${remainingNewWords}` : base;
  }

  return `${base} ${current}`;
}

export default function VoiceBoardPage() {
  return (
    <React.Suspense fallback={<div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white text-xs font-semibold">Loading Voice Board...</div>}>
      <VoiceBoardContent />
    </React.Suspense>
  );
}

function VoiceBoardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams?.get('id');
  const { user } = useAuth();
  const { saveBoard, boards } = useBoard();
  const [boardId, setBoardId] = useState<string>(() => queryId || `voiceboard_${Date.now()}`);

  const [saveStatus, setSaveStatus] = useState<SaveStatusType>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // ── Mode & State ──────────────────────────────────────────────────────────
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'Voice OFF' | 'Voice ON' | 'Listening...'>('Voice OFF');
  const [interimText, setInterimText] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Drawing tools state
  const [tool, setTool] = useState<ToolMode>('pen');
  const [color, setColor] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(4);

  // Font size state for Voice Board text elements (Requirement 4)
  const [fontSize, setFontSize] = useState<number>(24);

  // Canvas elements state
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [textElements, setTextElements] = useState<BoardTextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<ImportedFileData | null>(null);

  // Undo / Redo Stacks & Word Stack (Requirement 3)
  const [undoStack, setUndoStack] = useState<{ strokes: Stroke[]; textElements: BoardTextElement[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ strokes: Stroke[]; textElements: BoardTextElement[] }[]>([]);
  const [redoWordsStack, setRedoWordsStack] = useState<{ elementId: string; word: string; x: number; y: number; fontSize: number; color: string }[]>([]);

  // Refs for Speech Recognition Session Management (Requirement 1 & 2)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const recognitionRef = useRef<any>(null);
  const activeStreamElementIdRef = useRef<string | null>(null);
  const sessionBaseTextRef = useRef<string>('');
  const isTogglingRef = useRef(false);

  // Load saved board if opening from history
  useEffect(() => {
    if (!queryId) return;
    const targetId = queryId;
    let isMounted = true;
    async function loadSavedVoiceBoard() {
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
      }
    }
    loadSavedVoiceBoard();
    return () => { isMounted = false; };
  }, [queryId, boards, user?.id]);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const boardPayload: Board = {
        id: boardId,
        title: activeDocument ? `Voice Board: ${activeDocument.name}` : 'Voice AI Interactive Board',
        description: `Speech & canvas session with ${textElements.length} spoken elements and ${strokes.length} strokes.`,
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
        ...(activeDocument ? {
          bgFile: { url: activeDocument.dataUrl || (activeDocument as any).url, type: activeDocument.type },
          activeDocument: activeDocument as any,
        } : {}),
      };

      await saveBoard(boardPayload);
      if (user?.id) {
        await historyService.saveBoardVersion(user.id, boardId, boardPayload);
      }

      setSaveStatus('saved');
      setLastSavedTime(timeStr);
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err) {
      console.error('Failed to save Voice Board to Firestore:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // Record undo state snapshot
  const saveSnapshot = useCallback(() => {
    setUndoStack((prev) => [...prev, { strokes, textElements }]);
    setRedoStack([]);
  }, [strokes, textElements]);

  // Word-Level Undo Handler (Requirement 3)
  const handleUndo = useCallback(() => {
    setTextElements((prevTextElements) => {
      if (prevTextElements.length === 0) return prevTextElements;

      let targetIndex = -1;
      if (selectedTextId) {
        targetIndex = prevTextElements.findIndex((el) => el.id === selectedTextId);
      }
      if (targetIndex === -1 || prevTextElements[targetIndex].text.trim().length === 0) {
        for (let i = prevTextElements.length - 1; i >= 0; i--) {
          if (prevTextElements[i].text.trim().length > 0) {
            targetIndex = i;
            break;
          }
        }
      }

      if (targetIndex === -1) return prevTextElements;

      const targetElement = prevTextElements[targetIndex];
      const words = targetElement.text.trim().split(/\s+/);
      const removedWord = words.pop();

      if (!removedWord) return prevTextElements;

      setUndoStack((prev) => [...prev, { strokes, textElements: prevTextElements }]);
      setRedoStack([]);

      setRedoWordsStack((prev) => [
        ...prev,
        {
          elementId: targetElement.id,
          word: removedWord,
          x: targetElement.x,
          y: targetElement.y,
          fontSize: targetElement.fontSize,
          color: targetElement.color,
        },
      ]);

      const newText = words.join(' ');
      const nextElements = [...prevTextElements];
      if (words.length > 0) {
        nextElements[targetIndex] = {
          ...targetElement,
          text: newText,
        };
      } else {
        nextElements.splice(targetIndex, 1);
        if (selectedTextId === targetElement.id) {
          setSelectedTextId(null);
        }
      }

      if (activeStreamElementIdRef.current === targetElement.id || !activeStreamElementIdRef.current) {
        sessionBaseTextRef.current = newText;
        if (recognitionRef.current && isVoiceActive) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }
      }

      return nextElements;
    });
  }, [selectedTextId, strokes, isVoiceActive]);

  // Word-Level Redo Handler (Requirement 3)
  const handleRedo = useCallback(() => {
    if (redoWordsStack.length === 0) {
      if (redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      setUndoStack((prev) => [...prev, { strokes, textElements }]);
      setStrokes(next.strokes);
      setTextElements(next.textElements);
      setRedoStack((prev) => prev.slice(0, -1));
      return;
    }

    const lastRedoItem = redoWordsStack[redoWordsStack.length - 1];
    setRedoWordsStack((prev) => prev.slice(0, -1));

    setTextElements((prev) => {
      const existingIndex = prev.findIndex((el) => el.id === lastRedoItem.elementId);
      if (existingIndex !== -1) {
        const updated = [...prev];
        const newText = `${updated[existingIndex].text} ${lastRedoItem.word}`.trim();
        updated[existingIndex] = {
          ...updated[existingIndex],
          text: newText,
        };
        if (activeStreamElementIdRef.current === lastRedoItem.elementId) {
          sessionBaseTextRef.current = newText;
        }
        return updated;
      } else {
        const restoredElement: BoardTextElement = {
          id: lastRedoItem.elementId,
          text: lastRedoItem.word,
          x: lastRedoItem.x,
          y: lastRedoItem.y,
          fontSize: lastRedoItem.fontSize,
          color: lastRedoItem.color,
        };
        activeStreamElementIdRef.current = lastRedoItem.elementId;
        sessionBaseTextRef.current = lastRedoItem.word;
        return [...prev, restoredElement];
      }
    });
  }, [redoWordsStack, redoStack, strokes, textElements]);

  // Text Size Adjustment Handler (Requirement 4)
  const handleFontSizeChange = useCallback((delta: number) => {
    setFontSize((prevSize) => {
      const newSize = Math.max(12, Math.min(96, prevSize + delta));

      setTextElements((prev) => {
        if (prev.length === 0) return prev;
        const targetId = selectedTextId || activeStreamElementIdRef.current || prev[prev.length - 1].id;
        return prev.map((el) => (el.id === targetId ? { ...el, fontSize: newSize } : el));
      });

      return newSize;
    });
  }, [selectedTextId]);

  // ── Redraw Canvas ─────────────────────────────────────────────────────────
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokes) {
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
  }, [strokes]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Canvas Resize Listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        redrawCanvas();
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [redrawCanvas]);

  // ── Real-Time Incremental Speech Recognition (Deduplicated) ────────────────
  const stopVoiceRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    setTextElements((prev) => {
      if (activeStreamElementIdRef.current) {
        const activeEl = prev.find((e) => e.id === activeStreamElementIdRef.current);
        if (activeEl) {
          sessionBaseTextRef.current = activeEl.text.trim();
        }
      }
      return prev;
    });

    setIsVoiceActive(false);
    setIsListening(false);
    setVoiceStatus('Voice OFF');
    setInterimText('');
  }, []);

  const startVoiceRecognition = useCallback(() => {
    setVoiceError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser.');
      return;
    }

    setTextElements((prev) => {
      let activeId = activeStreamElementIdRef.current;
      let activeEl = activeId ? prev.find((e) => e.id === activeId) : null;
      if (!activeEl && prev.length > 0) {
        activeEl = prev[prev.length - 1];
        activeId = activeEl.id;
        activeStreamElementIdRef.current = activeId;
      }
      sessionBaseTextRef.current = activeEl ? activeEl.text.trim() : '';
      return prev;
    });

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsVoiceActive(true);
        setIsListening(true);
        setVoiceStatus('Listening...');
      };

      recognition.onresult = (event: any) => {
        let sessionFinalText = '';
        let sessionInterimText = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          if (result.isFinal) {
            sessionFinalText += (sessionFinalText ? ' ' : '') + transcript.trim();
          } else {
            sessionInterimText += (sessionInterimText ? ' ' : '') + transcript.trim();
          }
        }

        const currentSpeech = (sessionFinalText + (sessionInterimText ? (sessionFinalText ? ' ' : '') + sessionInterimText : '')).trim();
        setInterimText(sessionInterimText || sessionFinalText);

        if (!currentSpeech) return;

        setTextElements((prev) => {
          const activeId = activeStreamElementIdRef.current;
          const existingIndex = activeId ? prev.findIndex((el) => el.id === activeId) : -1;
          const baseText = sessionBaseTextRef.current;

          // Apply deduplication logic so final transcript replaces interim text without duplicating
          const fullText = dedupeSpeechText(baseText, currentSpeech);

          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              text: fullText,
            };
            return updated;
          } else {
            const count = prev.length;
            const newId = `voice_text_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            activeStreamElementIdRef.current = newId;
            const newText: BoardTextElement = {
              id: newId,
              text: fullText,
              x: 100 + (count % 4) * 40,
              y: 120 + Math.floor(count / 4) * 70,
              fontSize: fontSize || 24,
              color: '#1e293b',
            };
            setSelectedTextId(newId);
            return [...prev, newText];
          }
        });
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setVoiceError(`Voice recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current && isVoiceActive) {
          // Continuous restart: sync base text so new session appends seamlessly without duplicates
          setTextElements((prev) => {
            if (activeStreamElementIdRef.current) {
              const activeEl = prev.find((e) => e.id === activeStreamElementIdRef.current);
              if (activeEl) {
                sessionBaseTextRef.current = activeEl.text.trim();
              }
            }
            return prev;
          });

          try {
            recognition.start();
          } catch {}
        } else {
          setIsListening(false);
          setVoiceStatus('Voice ON');
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsVoiceActive(true);
      setVoiceStatus('Listening...');
    } catch (err: any) {
      setVoiceError(`Could not access microphone: ${err.message}`);
      stopVoiceRecognition();
    }
  }, [fontSize, isVoiceActive, stopVoiceRecognition]);

  // Clean up voice recognition on unmount
  useEffect(() => {
    return () => {
      stopVoiceRecognition();
    };
  }, [stopVoiceRecognition]);

  // Toggle Voice Button Click Handler
  const toggleVoice = useCallback(() => {
    if (isVoiceActive) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  }, [isVoiceActive, startVoiceRecognition, stopVoiceRecognition]);

  // Keyboard Shortcut for Voice (Alt+V or Ctrl+Shift+V)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltV = e.altKey && e.code === 'KeyV';
      const isCtrlShiftV = (e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyV';

      if (isAltV || isCtrlShiftV) {
        if (e.repeat) return;
        e.preventDefault();

        if (isTogglingRef.current) return;
        isTogglingRef.current = true;
        setTimeout(() => { isTogglingRef.current = false; }, 300);

        toggleVoice();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleVoice]);

  // ── Drawing Event Handlers ────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'pointer') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingRef.current = true;
    currentStrokeRef.current = [{ x, y }];
    setSelectedTextId(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentStrokeRef.current.push({ x, y });

    // Live preview stroke
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pts = currentStrokeRef.current;
    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'eraser' ? strokeWidth * 4 : strokeWidth;
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current.length > 1) {
      saveSnapshot();
      const newStroke: Stroke = {
        id: `stroke_${Date.now()}`,
        points: [...currentStrokeRef.current],
        color,
        width: strokeWidth,
        tool: tool === 'eraser' ? 'eraser' : 'pen',
      };
      setStrokes((prev) => [...prev, newStroke]);
    }
    currentStrokeRef.current = [];
  };

  // Erase Text Element Handler (Requirement 5)
  const handleDeleteTextElement = useCallback((id: string) => {
    saveSnapshot();
    if (activeStreamElementIdRef.current === id) {
      activeStreamElementIdRef.current = null;
      sessionBaseTextRef.current = '';
    }
    setTextElements((prev) => prev.filter((t) => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  }, [saveSnapshot, selectedTextId]);

  // Clear Whiteboard
  const handleClear = () => {
    if (confirm('Clear the entire whiteboard?')) {
      saveSnapshot();
      setStrokes([]);
      setTextElements([]);
      setActiveDocument(null);
      activeStreamElementIdRef.current = null;
      sessionBaseTextRef.current = '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)] overflow-hidden">
      {/* Board Header with Visible Menu Button & Save Button */}
      <BoardHeader
        title="Voice Board"
        subtitle="English Speech to Whiteboard Text"
        onSave={handleSave}
        saveStatus={saveStatus}
        lastSavedTime={lastSavedTime}
      >
        {/* Voice ON / OFF Control */}
        <div className="flex items-center gap-2 p-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl">
          <button
            onClick={toggleVoice}
            title="Toggle Voice Input (Shortcut: Alt+V)"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isVoiceActive
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                : 'bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] text-white shadow-xs'
            }`}
          >
            {isVoiceActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{isVoiceActive ? 'Voice OFF' : 'Voice ON'}</span>
            <span className="text-[10px] opacity-75 font-mono px-1 bg-black/20 rounded">Alt+V</span>
          </button>

          {/* Status Display Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
              voiceStatus === 'Listening...'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse'
                : isVoiceActive
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                : 'text-[var(--text-tertiary)]'
            }`}
          >
            {voiceStatus === 'Listening...' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
            <span>{voiceStatus}</span>
          </div>
        </div>
      </BoardHeader>

      {/* Main Whiteboard Workspace */}
      <div className="flex-1 relative bg-white dark:bg-slate-950 overflow-hidden cursor-crosshair">
        {/* Background Document / Image Card */}
        {activeDocument && (
          <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-0">
            <div className="max-w-4xl max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-800 dark:text-slate-100 font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4" /> {activeDocument.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400">Annotation Mode</span>
              </div>
              {activeDocument.dataUrl ? (
                <Image
                  src={activeDocument.dataUrl}
                  alt={activeDocument.name}
                  width={1200}
                  height={800}
                  className="max-h-[65vh] w-auto h-auto object-contain rounded-lg mx-auto"
                  unoptimized
                />
              ) : (
                <div className="prose dark:prose-invert text-sm max-h-[60vh] overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  <pre className="whitespace-pre-wrap font-sans">{activeDocument.textContent}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transparent Canvas Annotation Layer */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute inset-0 z-10 touch-none"
        />

        {/* Placed Spoken English Text Elements Overlay */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {textElements.map((el) => (
            <div key={el.id} className="pointer-events-auto">
              <TextElementOverlay
                element={el}
                isSelected={selectedTextId === el.id}
                isEraserActive={tool === 'eraser'}
                onSelect={(id) => setSelectedTextId(id)}
                onUpdate={(updated) => {
                  setTextElements((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                  if (activeStreamElementIdRef.current === updated.id) {
                    sessionBaseTextRef.current = updated.text.trim();
                  }
                }}
                onDelete={handleDeleteTextElement}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={undoStack.length > 0 || textElements.some((t) => t.text.trim().length > 0)}
                canRedo={redoStack.length > 0 || redoWordsStack.length > 0}
              />
            </div>
          ))}
        </div>

        {/* Live Listening Interim Speech Feedback Overlay */}
        {isListening && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-3 animate-fade-in max-w-lg">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">Listening to English Speech...</p>
              <p className="text-sm font-semibold truncate text-emerald-300">
                {interimText || 'Speak into microphone... Speech converts to text on the board.'}
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {voiceError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-red-500 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
            <AlertCircle className="w-4 h-4" />
            <span>{voiceError}</span>
          </div>
        )}

        {/* Floating Whiteboard Control Toolbar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--bg-elevated)]/90 backdrop-blur-xl border border-[var(--border-primary)] p-2 rounded-2xl shadow-2xl flex items-center gap-2">
          {/* Tool Modes */}
          <div className="flex items-center gap-1 bg-[var(--bg-primary)] p-1 rounded-xl">
            <button
              onClick={() => setTool('pen')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                tool === 'pen' ? 'bg-[var(--color-primary-500)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
              title="Pen Tool"
            >
              <Pen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                tool === 'eraser' ? 'bg-[var(--color-primary-500)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
              title="Eraser Tool (Click text element to erase)"
            >
              <Eraser className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('pointer')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                tool === 'pointer' ? 'bg-[var(--color-primary-500)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
              title="Select / Move Tool"
            >
              <Move className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-[var(--border-primary)]" />

          {/* Text Size Controls (Requirement 4) */}
          <div className="flex items-center gap-1 bg-[var(--bg-primary)] p-1 rounded-xl" title="Adjust Text Size">
            <button
              onClick={() => handleFontSizeChange(-2)}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors cursor-pointer"
              title="Decrease Text Size"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-bold px-1 text-indigo-600 dark:text-indigo-400 min-w-[32px] text-center select-none">
              {fontSize}px
            </span>
            <button
              onClick={() => handleFontSizeChange(2)}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors cursor-pointer"
              title="Increase Text Size"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-6 bg-[var(--border-primary)]" />

          {/* Color Picker */}
          <div className="flex items-center gap-1 px-1">
            {PEN_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  color === c.hex ? 'scale-125 border-indigo-500' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-[var(--border-primary)]" />

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0 && !textElements.some((t) => t.text.trim().length > 0)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors cursor-pointer"
            title="Undo Last Spoken Word"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0 && redoWordsStack.length === 0}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors cursor-pointer"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-[var(--border-primary)]" />

          {/* Clear Board */}
          <button
            onClick={handleClear}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
            title="Clear Whiteboard"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
