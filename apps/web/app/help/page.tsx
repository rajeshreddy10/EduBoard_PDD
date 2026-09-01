'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle, Search, ChevronDown, ChevronUp, MessageSquare, Zap, Cpu, Save, Settings, FileText, Mic } from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';

interface FAQItem {
  id: string;
  category: string;
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  { id: '1', category: 'Dashboard & History', q: 'What is the EduBoard Dashboard?', a: 'The Dashboard is your main control hub. It provides an overview of your recent whiteboards, quick board creation launchers, class stats, and direct access to your saved cloud history.' },
  { id: '2', category: 'Dashboard & History', q: 'How do I access and resume past saved sessions?', a: 'Click "Saved History" or "Boards" in the main menu to view all your saved sessions. You can resume editing, export to PDF/PNG, or share any past session with students.' },
  { id: '3', category: 'Smart Board', q: 'What tools are available in Smart Board (DrawSpace)?', a: 'Smart Board includes freehand Pen, Eraser, Vanishing Laser Pointer, Focus Spotlight, Color Swatches, Text Typing, Grid Background styles, Progressive Reveal steps, 30/70 Reference Drawer, and Export options.' },
  { id: '4', category: 'Smart Board', q: 'How do I open and use the Reference Drawer?', a: 'Click the small "Reference" button in the board header to slide open a 30/70 side-by-side drawer. You can load lesson notes or reference materials on the left while keeping your main canvas active on the right.' },
  { id: '5', category: 'Gesture Control', q: 'How does Gesture Controlled Smart Board work?', a: 'Launch Gesture Board from the main menu. Using MediaPipe & TensorFlow webcam tracking, you can draw with your index finger, pan with an open palm, erase with a pinch gesture, clear with a fist, or select text with a peace sign.' },
  { id: '6', category: 'Voice & AI', q: 'How does Voice Board speech transcription work?', a: 'Click the "Voice ON" button (or press Alt+V) and speak into your microphone. Your spoken words are automatically transcribed into canvas text elements with real-time sentence deduplication.' },
  { id: '7', category: 'Classrooms', q: 'How do I host or join a live classroom session?', a: 'Navigate to "Classrooms" in the main menu to create or join a session. Features include real-time stroke synchronization, student chat, hand raising, live poll voting, and attendance tracking.' },
  { id: '8', category: 'Settings & Mobile', q: 'How do I connect my mobile phone to my laptop app?', a: 'Connect both your mobile phone and laptop to the same Wi-Fi network. Open Chrome/Safari on your phone or launch the EduBoard Android App and navigate to http://<laptop-ip>:3000 (e.g. http://10.101.120.243:3000).' },
];

const CATEGORIES = [
  { icon: Cpu, label: 'Smart Board', color: 'text-purple-500 bg-purple-500/10' },
  { icon: FileText, label: 'Gesture Control', color: 'text-blue-500 bg-blue-500/10' },
  { icon: Mic, label: 'Voice & AI', color: 'text-amber-500 bg-amber-500/10' },
  { icon: Save, label: 'Classrooms', color: 'text-indigo-500 bg-indigo-500/10' },
  { icon: Settings, label: 'Settings & Mobile', color: 'text-emerald-500 bg-emerald-500/10' },
];

export default function HelpPage() {
  return (
    <DashboardLayout>
      <HelpContent />
    </DashboardLayout>
  );
}

function HelpContent() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredFaqs = FAQS.filter(faq =>
    faq.q.toLowerCase().includes(search.toLowerCase()) ||
    faq.a.toLowerCase().includes(search.toLowerCase()) ||
    faq.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-8 animate-fade-in">
      {/* Studio Help Hero Banner */}
      <header className="p-8 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xs relative overflow-hidden text-center space-y-4">
        <button onClick={() => router.back()} className="absolute left-4 top-4 p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] text-[var(--color-primary-500)] border border-[var(--border-primary)] flex items-center justify-center mx-auto">
          <HelpCircle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Help & Guide Center</h1>
          <p className="text-xs text-[var(--text-tertiary)] font-medium">Find answers to common questions and learn how to master EduBoard tools</p>
        </div>
        <div className="max-w-md mx-auto relative pt-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for a topic or tool…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-primary-500)]"
          />
        </div>
      </header>

      {/* Category Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {CATEGORIES.map(({ icon: Icon, label, color }) => (
          <button
            key={label}
            onClick={() => setSearch(label)}
            className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] transition-all text-center cursor-pointer group studio-card-hover"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{label}</span>
          </button>
        ))}
      </div>

      {/* FAQ List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Frequently Asked Questions</h2>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">{filteredFaqs.length} items</span>
        </div>

        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-[var(--border-primary)]">
              <p className="text-xs text-[var(--text-tertiary)] font-medium">No results found for "{search}"</p>
              <button onClick={() => setSearch('')} className="mt-2 text-xs font-bold text-[var(--color-primary-500)]">Clear search filter</button>
            </div>
          ) : (
            filteredFaqs.map((faq) => (
              <div key={faq.id} className={`rounded-2xl bg-[var(--bg-secondary)] border transition-all ${openId === faq.id ? 'border-[var(--color-primary-500)]/40 shadow-xs' : 'border-[var(--border-primary)]'}`}>
                <button
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left cursor-pointer"
                >
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-[var(--color-primary-500)] uppercase tracking-wider mb-1 block">{faq.category}</span>
                    <p className="font-bold text-[var(--text-primary)] text-xs sm:text-sm">{faq.q}</p>
                  </div>
                  <div className="shrink-0 mt-0.5">
                    {openId === faq.id ? <ChevronUp className="w-4 h-4 text-[var(--color-primary-500)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
                  </div>
                </button>
                {openId === faq.id && (
                  <div className="px-5 pb-5 animate-fade-in">
                    <div className="h-px bg-[var(--border-primary)] mb-3" />
                    <p className="text-[var(--text-secondary)] leading-relaxed text-xs font-medium">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Support Box */}
      <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Need additional support?</h3>
          <p className="text-xs text-[var(--text-tertiary)] font-medium mt-0.5">Our team is available to assist with any questions or technical issues.</p>
        </div>
        <button onClick={() => router.push('/help/contact')} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary-500)] text-white font-semibold text-xs rounded-xl hover:bg-[var(--color-primary-600)] transition-all cursor-pointer shadow-xs shrink-0">
          <MessageSquare className="w-4 h-4" />
          <span>Contact Support</span>
        </button>
      </div>

    </div>
  );
}
