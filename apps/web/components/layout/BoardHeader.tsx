'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Brain, Loader2, PanelLeftOpen, Save, Check, AlertCircle } from 'lucide-react';
import { NavigationDrawer } from './NavigationDrawer';

export type SaveStatusType = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

interface BoardHeaderProps {
  title: string;
  subtitle?: string;
  version?: string;
  onAiAction?: () => void;
  aiActionLabel?: string;
  isAiProcessing?: boolean;
  aiActionIcon?: React.ReactNode;
  onSave?: () => void;
  saveStatus?: SaveStatusType;
  lastSavedTime?: string;
  onBack?: () => void;
  onToggleMenu?: () => void;
  children?: React.ReactNode;
}

export function BoardHeader({
  title,
  subtitle = 'Auto Sync: Active',
  version = 'v3.1',
  onAiAction,
  aiActionLabel = 'AI Action',
  isAiProcessing = false,
  aiActionIcon,
  onSave,
  saveStatus = 'idle',
  lastSavedTime,
  onBack,
  onToggleMenu,
  children
}: BoardHeaderProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenuClick = () => {
    if (onToggleMenu) {
      onToggleMenu();
    } else {
      setDrawerOpen(true);
    }
  };

  const renderSaveButtonContent = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            <span>Saving...</span>
          </>
        );
      case 'saved':
        return (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span>Saved {lastSavedTime || 'just now'}</span>
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span>Save failed</span>
          </>
        );
      case 'unsaved':
        return (
          <>
            <Save className="w-3.5 h-3.5 text-amber-500" />
            <span>Save *</span>
          </>
        );
      default:
        return (
          <>
            <Save className="w-3.5 h-3.5 text-white" />
            <span>Save</span>
          </>
        );
    }
  };

  return (
    <>
      <header className="h-16 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between px-3 sm:px-6 shrink-0 z-50 transition-all relative shadow-xs">
        {/* Left: Navigation Menu Button, Back & Board Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleMenuClick}
            aria-label="Open Navigation Menu"
            title="Open Navigation Menu"
            className="flex items-center gap-2 px-3 py-2 justify-center bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)] text-[var(--text-primary)] font-semibold text-xs rounded-xl transition-all cursor-pointer shrink-0"
          >
            <PanelLeftOpen className="w-4 h-4 text-[var(--color-primary-500)]" />
            <span className="hidden sm:inline">Menu</span>
          </button>

          <button
            onClick={() => (onBack ? onBack() : router.back())}
            aria-label="Go Back"
            title="Go Back"
            className="flex items-center gap-1.5 p-2 justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden lg:inline text-xs font-semibold">Back</span>
          </button>
          
          <div className="flex flex-col">
            <h1 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-primary-500)] shrink-0" />
              <span className="truncate max-w-[150px] sm:max-w-[280px]">{title}</span>
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider truncate hidden sm:inline">
                {subtitle}
              </span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-400 animate-ping' : saveStatus === 'saved' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">
                  {saveStatus === 'saved' ? 'Cloud Synced' : saveStatus === 'saving' ? 'Saving...' : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Custom Toolbar or Status (Optional) */}
        {children && (
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-none py-1">
            {children}
          </div>
        )}

        {/* Right: Save Button & AI Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onSave && (
            <button
              onClick={onSave}
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer border shrink-0 ${
                saveStatus === 'saved'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20'
                  : saveStatus === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-600 hover:bg-red-500/20'
                  : saveStatus === 'unsaved'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20'
                  : 'bg-[var(--color-primary-500)] border-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-600)] shadow-xs'
              }`}
            >
              {renderSaveButtonContent()}
            </button>
          )}

          {onAiAction && (
            <button
              onClick={onAiAction}
              disabled={isAiProcessing}
              className="flex items-center gap-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-primary)] text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isAiProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-primary-500)]" />
              ) : aiActionIcon ? (
                aiActionIcon
              ) : (
                <Brain className="w-3.5 h-3.5 text-[var(--color-primary-500)]" />
              )}
              <span>{isAiProcessing ? 'Thinking...' : aiActionLabel}</span>
            </button>
          )}
        </div>
      </header>

      {/* Slide-over Navigation Drawer */}
      <NavigationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
