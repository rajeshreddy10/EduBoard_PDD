'use client';

import React from 'react';
import { Layers, ChevronLeft, ChevronRight, RotateCcw, Plus, Eye, EyeOff } from 'lucide-react';

export interface StepGroup {
  id: string;
  stepNumber: number;
  label: string;
  strokeIds: string[];
  textIds: string[];
}

interface ProgressiveRevealBarProps {
  steps: StepGroup[];
  currentRevealStep: number; // 0 = initial blank, 1 = Step 1 revealed, 2 = Step 1 & 2 revealed, etc.
  isRevealActive: boolean;
  onToggleRevealMode: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onResetReveal: () => void;
  onGroupCurrentAsStep: () => void;
}

export const ProgressiveRevealBar: React.FC<ProgressiveRevealBarProps> = ({
  steps,
  currentRevealStep,
  isRevealActive,
  onToggleRevealMode,
  onNextStep,
  onPrevStep,
  onResetReveal,
  onGroupCurrentAsStep,
}) => {
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xs">
      {/* Group as Step Button */}
      <button
        onClick={onGroupCurrentAsStep}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-primary)] transition-all cursor-pointer"
        title="Group current board content into a sequential reveal step"
      >
        <Plus className="w-3.5 h-3.5 text-[var(--color-primary-500)]" />
        <span>Group Step ({steps.length + 1})</span>
      </button>

      {steps.length > 0 && (
        <>
          <div className="w-px h-5 bg-[var(--border-primary)]" />

          {/* Toggle Progressive Reveal Mode */}
          <button
            onClick={onToggleRevealMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isRevealActive
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle Step-by-Step Progressive Reveal"
          >
            {isRevealActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isRevealActive ? 'Reveal Active' : 'Start Reveal'}</span>
          </button>

          {isRevealActive && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onPrevStep}
                disabled={currentRevealStep <= 0}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30 cursor-pointer"
                title="Previous Step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)]">
                {currentRevealStep === 0 ? 'Blank' : `Step ${currentRevealStep} of ${steps.length}`}
              </span>

              <button
                onClick={onNextStep}
                disabled={currentRevealStep >= steps.length}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30 cursor-pointer"
                title="Next Step"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={onResetReveal}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-amber-500 hover:bg-[var(--bg-tertiary)] cursor-pointer"
                title="Reset to Blank Board"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
