'use client';

import React, { useState } from 'react';
import { Bookmark, Plus, Trash2, MapPin, Check, X } from 'lucide-react';

export interface Waypoint {
  id: string;
  name: string;
  panX: number;
  panY: number;
  zoom: number;
}

interface WaypointBarProps {
  waypoints: Waypoint[];
  onAddWaypoint: (name: string) => void;
  onSelectWaypoint: (wp: Waypoint) => void;
  onDeleteWaypoint: (id: string) => void;
}

export const WaypointBar: React.FC<WaypointBarProps> = ({
  waypoints,
  onAddWaypoint,
  onSelectWaypoint,
  onDeleteWaypoint,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    const name = nameInput.trim() || `View ${waypoints.length + 1}`;
    onAddWaypoint(name);
    setNameInput('');
    setIsAdding(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
          waypoints.length > 0
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
        }`}
        title="Canvas Camera Waypoints"
      >
        <MapPin className="w-3.5 h-3.5" />
        <span>Waypoints ({waypoints.length})</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-12 left-0 z-50 studio-card p-3 w-64 space-y-3 animate-fade-in shadow-dock">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-primary)]">
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-[var(--color-primary-500)]" /> Camera Views
            </span>
            <button onClick={() => setIsOpen(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Waypoint Input */}
          {isAdding ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="View Name..."
                className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)]"
              />
              <button onClick={handleSave} className="p-1 rounded-lg bg-[var(--color-primary-500)] text-white">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsAdding(false)} className="p-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--color-primary-500)]" /> Save Current View
            </button>
          )}

          {/* List of Saved Waypoints */}
          <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1">
            {waypoints.length === 0 ? (
              <p className="text-[10px] text-[var(--text-tertiary)] text-center py-2 font-medium">No camera views saved yet.</p>
            ) : (
              waypoints.map((wp) => (
                <div
                  key={wp.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer group"
                  onClick={() => {
                    onSelectWaypoint(wp);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-[var(--color-primary-500)] shrink-0" />
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[140px]">{wp.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWaypoint(wp.id);
                    }}
                    className="text-[var(--text-tertiary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    title="Delete View"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
