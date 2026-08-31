'use client';

import React, { useState } from 'react';
import {
  FileText, Plus, X, ChevronDown, ChevronUp, Eye, EyeOff, Move, Palette
} from 'lucide-react';

export interface TeacherNote {
  id: string;
  title: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isCollapsed: boolean;
}

interface TeacherNotesOverlayProps {
  isTeacher: boolean;
  notes: TeacherNote[];
  onUpdateNotes: (notes: TeacherNote[]) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const NOTE_COLORS = [
  { name: 'Yellow', bg: '#fef08a', border: '#facc15', text: '#713f12' },
  { name: 'Blue', bg: '#bae6fd', border: '#38bdf8', text: '#0369a1' },
  { name: 'Green', bg: '#bbf7d0', border: '#4ade80', text: '#15803d' },
  { name: 'Pink', bg: '#fbcfe8', border: '#f472b6', text: '#be185d' },
  { name: 'Purple', bg: '#e9d5ff', border: '#c084fc', text: '#6b21a8' },
];

export function TeacherNotesOverlay({
  isTeacher,
  notes,
  onUpdateNotes,
  isVisible,
  onToggleVisibility,
}: TeacherNotesOverlayProps) {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Strictly enforce privacy: if user is not a teacher, render nothing
  if (!isTeacher) return null;

  const addNote = () => {
    const newNote: TeacherNote = {
      id: `note_${Date.now()}`,
      title: 'TEACHING CUE / ANSWER',
      content: 'Ask students why x = 42...',
      color: '#fef08a',
      x: 100 + notes.length * 30,
      y: 120 + notes.length * 30,
      width: 240,
      height: 180,
      isCollapsed: false,
    };
    onUpdateNotes([...notes, newNote]);
    setActiveNoteId(newNote.id);
  };

  const updateNote = (id: string, fields: Partial<TeacherNote>) => {
    onUpdateNotes(notes.map(n => (n.id === id ? { ...n, ...fields } : n)));
  };

  const deleteNote = (id: string) => {
    onUpdateNotes(notes.filter(n => n.id !== id));
  };

  const handleMouseDown = (e: React.MouseEvent, note: TeacherNote) => {
    setDraggingNoteId(note.id);
    setDragOffset({ x: e.clientX - note.x, y: e.clientY - note.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNoteId) return;
    const newX = Math.max(10, e.clientX - dragOffset.x);
    const newY = Math.max(10, e.clientY - dragOffset.y);
    updateNote(draggingNoteId, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDraggingNoteId(null);
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Teleprompter Floating Control */}
      <div className="absolute top-4 right-16 pointer-events-auto flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] px-3 py-1.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
          <FileText className="w-4 h-4 text-amber-500" />
          <span>Teacher Teleprompter</span>
        </div>
        <button
          onClick={onToggleVisibility}
          className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors cursor-pointer"
          title={isVisible ? 'Hide notes from view' : 'Show notes'}
        >
          {isVisible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-amber-400" />}
        </button>
        <button
          onClick={addNote}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Note
        </button>
      </div>

      {/* Private Sticky Notes */}
      {isVisible &&
        notes.map(note => {
          const colorObj = NOTE_COLORS.find(c => c.bg === note.color) || NOTE_COLORS[0];
          return (
            <div
              key={note.id}
              style={{
                left: note.x,
                top: note.y,
                width: note.isCollapsed ? 220 : note.width,
                backgroundColor: colorObj.bg,
                borderColor: colorObj.border,
                color: colorObj.text,
              }}
              className="absolute pointer-events-auto rounded-2xl border-2 shadow-xl flex flex-col transition-shadow duration-150 select-none"
            >
              {/* Header / Drag Bar */}
              <div
                onMouseDown={e => handleMouseDown(e, note)}
                className="px-3 py-2 flex items-center justify-between border-b border-black/10 cursor-grab active:cursor-grabbing font-mono text-[11px] font-extrabold tracking-wider uppercase"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Move className="w-3 h-3 opacity-60 flex-shrink-0" />
                  <input
                    value={note.title}
                    onChange={e => updateNote(note.id, { title: e.target.value })}
                    className="bg-transparent font-bold focus:outline-none truncate w-full"
                  />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Color selector dropdown */}
                  <div className="relative group">
                    <button className="p-1 rounded hover:bg-black/10 transition-colors">
                      <Palette className="w-3 h-3 opacity-70" />
                    </button>
                    <div className="absolute right-0 top-6 hidden group-hover:flex gap-1 p-1 bg-white rounded-lg shadow-lg border border-black/10 z-50">
                      {NOTE_COLORS.map(c => (
                        <button
                          key={c.name}
                          onClick={() => updateNote(note.id, { color: c.bg })}
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: c.bg }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => updateNote(note.id, { isCollapsed: !note.isCollapsed })}
                    className="p-1 rounded hover:bg-black/10 transition-colors"
                  >
                    {note.isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>

                  <button onClick={() => deleteNote(note.id)} className="p-1 rounded hover:bg-black/10 text-red-600 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Note Content Area */}
              {!note.isCollapsed && (
                <textarea
                  value={note.content}
                  onChange={e => updateNote(note.id, { content: e.target.value })}
                  placeholder="Private teaching notes, cues, and answers..."
                  className="w-full flex-1 p-3 bg-transparent text-xs font-sans font-medium focus:outline-none resize-none leading-relaxed"
                  style={{ minHeight: note.height - 40 }}
                />
              )}
            </div>
          );
        })}
    </div>
  );
}
