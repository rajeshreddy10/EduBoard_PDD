'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/branding/Logo';
import {
  ArrowRight, ArrowLeft, Sparkles, Mic, LayoutDashboard,
  NotebookPen, Users, CheckCircle2, ChevronRight, Play
} from 'lucide-react';

const STEPS = [
  {
    id: 1,
    title: 'Welcome to EduBoard',
    badge: 'Next-Gen AI Workspace',
    description: 'EduBoard connects AI voice transcription, webcam gesture control, interactive whiteboards, and real-time classroom collaboration into one unified workspace.',
    icon: Sparkles,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    highlights: [
      'Interactive Smart Whiteboards with PDF/PNG Export',
      'AI Voice-to-Text Speech Transcription on Canvas',
      'Contactless MediaPipe & TensorFlow Gesture Controls',
      'Real-Time Student Classrooms & Live Polling'
    ]
  },
  {
    id: 2,
    title: 'Smart Board (DrawSpace)',
    badge: 'Interactive Canvas',
    description: 'DrawSpace provides freehand Pen, Eraser, Vanishing Laser Pointer, Focus Spotlight, Color Swatches, and a 30/70 side-by-side Reference Drawer.',
    icon: LayoutDashboard,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    highlights: [
      '30/70 Side-by-Side Reference Drawer for lesson notes',
      'Vanishing Laser Pointer with fading 2-second trail',
      'Focus Spotlight tool for highlighting key content',
      'Auto-save with cloud history resume & PDF export'
    ]
  },
  {
    id: 3,
    title: 'Gesture Controlled Board (DocCanvas)',
    badge: 'Contactless AI Control',
    description: 'Annotate PDF, Word, PowerPoint, Images, and Text files using webcam gestures or standard touch/mouse inputs in DocCanvas Studio.',
    icon: NotebookPen,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    highlights: [
      'Index Finger: Draw & Write on canvas',
      'Open Palm: Smooth Pan & Scroll viewport',
      'Pinch Gesture: Eraser tool activation',
      'Write / Scroll mode toggle for multi-page documents'
    ]
  },
  {
    id: 4,
    title: 'Voice Controlled Board & AI',
    badge: 'Speech & AI Tutor',
    description: 'Speak naturally to transcribe text onto your whiteboard with automatic sentence deduplication, instant AI Quizzes, and Lecture Summaries.',
    icon: Mic,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    highlights: [
      'Real-time Speech-to-Text (STT) canvas transcription',
      'Sentence deduplication to prevent repeated phrases',
      'AI Quiz & Summary Generator from lesson content',
      'Shortcut key Alt+V to toggle Voice ON / OFF'
    ]
  },
  {
    id: 5,
    title: 'Classrooms & Mobile Connection',
    badge: 'Real-Time Sync & LAN',
    description: 'Host interactive classrooms with live stroke sync, student chat, hand raising, polls, attendance, and connect mobile phones on your local Wi-Fi.',
    icon: Users,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    highlights: [
      'Sub-second Socket.IO whiteboard collaboration',
      'Live student polling & instant attendance tracking',
      'Local Wi-Fi IP setup (e.g. http://10.101.120.243:3000)',
      'Cross-platform support on Web, Desktop, and Android'
    ]
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      router.push('/dashboard');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between p-6">
      {/* Top Header Navigation */}
      <header className="max-w-4xl mx-auto w-full flex justify-between items-center py-3">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--bg-secondary)]"
          >
            Skip to Dashboard
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)] transition-all shadow-xs"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Onboarding Wizard Card */}
      <main className="max-w-2xl mx-auto my-auto w-full">
        <div className="p-8 sm:p-10 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xl space-y-6 animate-fade-in relative overflow-hidden">
          
          {/* Step Progress Pills */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentStep === idx
                      ? 'w-8 bg-[var(--color-primary-500)]'
                      : idx < currentStep
                      ? 'w-3 bg-emerald-500/60'
                      : 'w-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'
                  }`}
                  title={`Step ${idx + 1}: ${s.title}`}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>

          {/* Badge & Icon Header */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${step.color}`}>
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary-500)] block">
                {step.badge}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                {step.title}
              </h1>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
            {step.description}
          </p>

          {/* Highlights List */}
          <div className="space-y-2.5 pt-2">
            {step.highlights.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--text-primary)] font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Wizard Controls */}
          <div className="pt-6 border-t border-[var(--border-primary)] flex items-center justify-between gap-3">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)] transition-all cursor-pointer shadow-md"
            >
              <span>{currentStep === STEPS.length - 1 ? 'Go to Dashboard' : 'Next Step'}</span>
              {currentStep === STEPS.length - 1 ? <Play className="w-3.5 h-3.5" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center py-3 text-[11px] text-[var(--text-tertiary)]">
        EduBoard v3.1 — AI-Powered Smart Board Workspace & Cross-Platform Suite
      </footer>
    </div>
  );
}
