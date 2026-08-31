'use client';

import React, { useRef, useState } from 'react';
import { Move, Trash2, Plus, Minus, Edit3, Undo2, Redo2, Check } from 'lucide-react';

export interface BoardTextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

interface TextElementOverlayProps {
  element: BoardTextElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (updated: BoardTextElement) => void;
  onDelete: (id: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isEraserActive?: boolean;
}

// Keep the element reachable so it can never be dragged fully off-screen
// and silently lost.
const clampToReachable = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export function TextElementOverlay({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isEraserActive = false,
}: TextElementOverlayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(element.text);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isEraserActive) {
      onDelete(element.id);
      return;
    }
    onSelect(element.id);
    // Capture the pointer on the drag surface so dragging stays attached to
    // the element even when the finger/stylus leaves it or crosses edges.
    try {
      rootRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* capture unsupported — dragging still works while over the element */
    }
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - element.x,
      y: e.clientY - element.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    onUpdate({
      ...element,
      x: clampToReachable(e.clientX - dragOffset.x, 10, window.innerWidth - 80),
      y: clampToReachable(e.clientY - dragOffset.y, 10, window.innerHeight - 60),
    });
  };

  const endDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);
  };

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(96, element.fontSize + delta));
    onUpdate({ ...element, fontSize: newSize });
  };

  const saveEdit = () => {
    if (editText.trim()) {
      onUpdate({ ...element, text: editText.trim() });
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditText(element.text);
    setIsEditing(false);
  };

  return (
    <div
      ref={rootRef}
      style={{ left: `${element.x}px`, top: `${element.y}px`, touchAction: 'none' }}
      className={`absolute z-30 select-none group transition-shadow ${
        isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 rounded-xl shadow-lg' : ''
      }`}
      onPointerDown={() => onSelect(element.id)}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Interactive Text Display or Inline Edit Input */}
      {isEditing ? (
        <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 border border-indigo-500 rounded-lg shadow-xl p-0.5">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            aria-label="Edit text content"
            autoFocus
            className="p-0 m-0 text-sm bg-transparent border-none outline-none font-sans text-slate-900 dark:text-white leading-tight"
            style={{ fontSize: `${element.fontSize}px` }}
          />
          <button
            onClick={saveEdit}
            aria-label="Save text"
            className="flex items-center justify-center w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors cursor-pointer shrink-0"
            title="Save Text (Enter)"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className="cursor-move p-0 m-0 font-sans font-medium text-slate-900 dark:text-slate-100 hover:outline-1 hover:outline-dashed hover:outline-indigo-400 transition-all whitespace-pre-wrap leading-tight"
          style={{
            fontSize: `${element.fontSize}px`,
            color: element.color || 'inherit',
          }}
          onPointerDown={handlePointerDown}
        >
          {element.text}
        </div>
      )}

      {/* Floating Control Toolbar (Shown on Selection) */}
      {isSelected && (
        <div
          className="absolute -top-12 left-0 flex items-center gap-0.5 p-1 bg-slate-900/90 text-white rounded-xl shadow-2xl backdrop-blur-md border border-slate-700 text-xs shrink-0 z-40 animate-fade-in"
          onPointerDown={(e) => e.stopPropagation()}
          role="toolbar"
          aria-label={`Text element controls: ${element.text.substring(0, 30)}`}
        >
          {/* Drag Handle Icon */}
          <div className="px-1.5 py-1.5 text-slate-400 cursor-move flex items-center" title="Drag to Move">
            <Move className="w-3.5 h-3.5" />
          </div>

          <div className="w-px h-4 bg-slate-700" />

          {/* Font Size Controls */}
          <button
            onClick={() => changeFontSize(-2)}
            aria-label="Decrease font size"
            className="flex items-center justify-center min-w-[34px] min-h-[34px] hover:bg-slate-800 rounded-md transition-colors cursor-pointer text-slate-200"
            title="Decrease Font Size"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono px-1 font-bold min-w-[28px] text-center text-indigo-300">
            {element.fontSize}px
          </span>
          <button
            onClick={() => changeFontSize(2)}
            aria-label="Increase font size"
            className="flex items-center justify-center min-w-[34px] min-h-[34px] hover:bg-slate-800 rounded-md transition-colors cursor-pointer text-slate-200"
            title="Increase Font Size"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-700" />

          {/* Edit Text */}
          <button
            onClick={() => {
              setEditText(element.text);
              setIsEditing(true);
            }}
            aria-label="Edit text content"
            className="flex items-center justify-center min-w-[34px] min-h-[34px] hover:bg-slate-800 rounded-md transition-colors cursor-pointer text-indigo-300"
            title="Edit Text Content"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Undo / Redo */}
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo"
              className="flex items-center justify-center min-w-[34px] min-h-[34px] hover:bg-slate-800 disabled:opacity-40 rounded-md transition-colors cursor-pointer text-slate-200"
              title="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo"
              className="flex items-center justify-center min-w-[34px] min-h-[34px] hover:bg-slate-800 disabled:opacity-40 rounded-md transition-colors cursor-pointer text-slate-200"
              title="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="w-px h-4 bg-slate-700" />

          {/* Delete */}
          <button
            onClick={() => onDelete(element.id)}
            aria-label="Delete text"
            className="flex items-center justify-center min-w-[34px] min-h-[34px] hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors cursor-pointer text-slate-400"
            title="Delete Text"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
