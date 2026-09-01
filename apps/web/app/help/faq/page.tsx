'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Search, ThumbsUp, ThumbsDown } from 'lucide-react';

interface FAQItem { id: string; q: string; a: string; category: string; helpful?: number; }

const FAQS: FAQItem[] = [
  // Dashboard & History
  { id: '1', category: 'Dashboard & History', q: 'What is the EduBoard Dashboard?', a: 'The Dashboard is your main control hub. It provides an overview of your recent whiteboards, quick board creation launchers, class stats, and direct access to your saved cloud history.', helpful: 165 },
  { id: '2', category: 'Dashboard & History', q: 'How do I access and resume past saved sessions?', a: 'Click "Saved History" or "Boards" in the main menu to view all your saved sessions. You can resume editing, export to PDF/PNG, or share any past session with students.', helpful: 142 },

  // Smart Board (DrawSpace)
  { id: '3', category: 'Smart Board', q: 'What tools are available in Smart Board (DrawSpace)?', a: 'Smart Board includes freehand Pen, Eraser, Vanishing Laser Pointer, Focus Spotlight, Color Swatches, Text Typing, Grid Background styles, Progressive Reveal steps, 30/70 Reference Drawer, and Export options.', helpful: 189 },
  { id: '4', category: 'Smart Board', q: 'How do I open and use the Reference Drawer?', a: 'Click the small "Reference" button in the board header to slide open a 30/70 side-by-side drawer. You can load lesson notes or reference materials on the left while keeping your main canvas active on the right.', helpful: 128 },
  { id: '5', category: 'Smart Board', q: 'How do I export my whiteboard drawings?', a: 'Click the Save or Export button in the board header to export your canvas session as a high-resolution PDF document, PNG image, or JSON data file.', helpful: 110 },

  // Gesture Control (DocCanvas)
  { id: '6', category: 'Gesture Control', q: 'How does Gesture Controlled Smart Board work?', a: 'Launch Gesture Board from the main menu. Using MediaPipe & TensorFlow webcam tracking, you can draw with your index finger, pan with an open palm, erase with a pinch gesture, clear with a fist, or select text with a peace sign.', helpful: 195 },
  { id: '7', category: 'Gesture Control', q: 'What document formats can I annotate in DocCanvas?', a: 'DocCanvas supports PDF (.pdf), Word (.doc, .docx), PowerPoint (.ppt, .pptx), Text (.txt), and Images (.png, .jpg). You can switch between "Write" mode to annotate and "Scroll" mode to flip pages.', helpful: 134 },

  // Voice Control & AI
  { id: '8', category: 'Voice & AI', q: 'How does Voice Board speech transcription work?', a: 'Click the "Voice ON" button (or press Alt+V) and speak into your microphone. Your spoken words are automatically transcribed into canvas text elements with real-time sentence deduplication.', helpful: 172 },
  { id: '9', category: 'Voice & AI', q: 'How do I generate AI Quizzes and Summaries?', a: 'Click the AI action button in the board header or voice toolbar to generate instant quizzes, lecture summaries, or ask the AI assistant questions based on your lesson content.', helpful: 156 },

  // Classrooms & Collaboration
  { id: '10', category: 'Classrooms', q: 'How do I host or join a live classroom session?', a: 'Navigate to "Classrooms" in the main menu to create or join a session. Features include real-time stroke synchronization, student chat, hand raising, live poll voting, and attendance tracking.', helpful: 180 },
  { id: '11', category: 'Classrooms', q: 'How does real-time collaboration work?', a: 'Socket.IO powers instant sub-second stroke and cursor synchronization across all connected web and mobile participants in a classroom.', helpful: 125 },

  // Analytics & Security
  { id: '12', category: 'Analytics & Profile', q: 'What statistics can I track in Analytics?', a: 'The Analytics menu section displays student engagement metrics, class participation charts, drawing time stats, and exportable reports.', helpful: 98 },
  { id: '13', category: 'Analytics & Profile', q: 'How do I manage profile security and password reset?', a: 'Go to Profile -> Security in the main menu to change your password, view active login sessions, manage security keys, or update your profile avatar.', helpful: 115 },

  // Settings & Mobile LAN
  { id: '14', category: 'Settings & Mobile', q: 'How do I connect my mobile phone to my laptop app?', a: 'Connect both your mobile phone and laptop to the same Wi-Fi network. Open Chrome/Safari on your phone or launch the EduBoard Android App and navigate to http://<laptop-ip>:3000 (e.g. http://10.101.120.243:3000).', helpful: 210 },
  { id: '15', category: 'Settings & Mobile', q: 'How do I switch themes or languages?', a: 'Go to Settings in the main menu to toggle between Dark/Light modes or select your preferred display language.', helpful: 105 },
];

const CATEGORIES = ['All', ...Array.from(new Set(FAQS.map(f => f.category)))];

export default function FAQPage() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [helpful, setHelpful] = useState<Record<string, boolean | null>>({});

  const filtered = FAQS.filter(f =>
    (category === 'All' || f.category === category) &&
    (f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="px-6 py-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)]"><ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" /></button>
        <div>
          <h1 className="font-bold text-[var(--text-primary)]">Frequently Asked Questions</h1>
          <p className="text-xs text-[var(--text-tertiary)]">{FAQS.length} questions answered</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FAQs…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)] transition-colors text-xs font-medium" />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                category === cat ? 'bg-[var(--color-primary-500)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:border-[var(--color-primary-500)]/40'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ items */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-[var(--border-primary)]">
              <p className="text-xs font-medium">No FAQs match your search.</p>
              <button onClick={() => router.push('/help/contact')} className="mt-2 text-xs font-bold text-[var(--color-primary-500)] hover:opacity-80">
                Can't find your answer? Contact support →
              </button>
            </div>
          )}
          {filtered.map(faq => (
            <div key={faq.id} className={`rounded-2xl bg-[var(--bg-secondary)] border transition-all ${open === faq.id ? 'border-[var(--color-primary-500)]/40 shadow-xs' : 'border-[var(--border-primary)]'}`}>
              <button
                onClick={() => setOpen(open === faq.id ? null : faq.id)}
                className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left cursor-pointer"
              >
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-[var(--color-primary-500)] uppercase tracking-wider mb-1 block">{faq.category}</span>
                  <p className="font-bold text-[var(--text-primary)] text-xs sm:text-sm">{faq.q}</p>
                </div>
                <div className="shrink-0 mt-1">
                  {open === faq.id ? <ChevronUp className="w-4 h-4 text-[var(--color-primary-500)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
                </div>
              </button>
              {open === faq.id && (
                <div className="px-5 pb-5">
                  <div className="h-px bg-[var(--border-primary)] mb-3" />
                  <p className="text-[var(--text-secondary)] leading-relaxed text-xs font-medium">{faq.a}</p>
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--border-primary)]">
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Was this helpful?</span>
                    <button onClick={() => setHelpful(h => ({ ...h, [faq.id]: true }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${helpful[faq.id] === true ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-green-500/10 hover:text-green-400'}`}>
                      <ThumbsUp className="w-3.5 h-3.5" /> Yes ({(faq.helpful || 0) + (helpful[faq.id] === true ? 1 : 0)})
                    </button>
                    <button onClick={() => setHelpful(h => ({ ...h, [faq.id]: false }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${helpful[faq.id] === false ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400'}`}>
                      <ThumbsDown className="w-3.5 h-3.5" /> No
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
