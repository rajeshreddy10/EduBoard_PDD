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
  { id: '1', category: 'DocCanvas', q: 'What is DocCanvas Studio?', a: 'DocCanvas Studio is EduBoard\'s document annotation workspace. You can open any supported document (PDF, Word, PowerPoint, Images, Text) or draw directly on a blank canvas using Pen, Text Typing, Erase, Highlight, Laser Pointer, and Magnify tools.' },
  { id: '2', category: 'DocCanvas', q: 'Can I draw on DocCanvas Studio without opening a file?', a: 'Yes! DocCanvas Studio opens in a blank canvas mode by default, allowing you to draw freehand, add typed text, highlight, and save immediately without needing to open a file first.' },
  { id: '3', category: 'DocCanvas', q: 'How do I switch between writing and scrolling a document?', a: 'When a file is opened in DocCanvas, use the Write / Scroll mode toggle in the Document Viewer header bar. Switch to "Scroll" mode to scroll pages or navigate slides, and switch back to "Write" mode to annotate on top of the content.' },
  { id: '4', category: 'DrawSpace', q: 'What is DrawSpace Canvas?', a: 'DrawSpace Canvas is an interactive whiteboard for freehand drawing, text editing, and presentation equipped with a 30/70 side-by-side Reference Drawer, Waypoint camera glides, and Teacher Notes overlay.' },
  { id: '5', category: 'DrawSpace', q: 'How do Waypoint camera glides work?', a: 'Position your canvas view using pan/zoom, then click "Add Waypoint" in the header bar to save your camera coordinates. Clicking any saved waypoint chip smoothly glides your viewport back to that view position.' },
  { id: '6', category: 'DrawSpace', q: 'How do I open the Reference Drawer?', a: 'Click the "Reference" button in the board header to slide open a 30/70 side-by-side panel. You can load reference files or lesson materials on the left while keeping your main whiteboard workspace active on the right.' },
  { id: '7', category: 'Voice Board', q: 'How does Voice Board work?', a: 'Click "Voice ON" (or press Alt+V) and speak into your microphone. Spoken words are transcribed into text elements placed directly on the canvas, with real-time deduplication to prevent sentence repetition.' },
  { id: '8', category: 'Voice Board', q: 'How do I adjust font size or erase spoken text?', a: 'Select any text element on the canvas to increase or decrease font size (- / +), or click a text element while the Eraser tool is active to delete it.' },
  { id: '9', category: 'Saving', q: 'How do I save my boards?', a: 'Click the "Save" button in the board header. All drawings, text elements, and opened document annotations are saved to your account and synced to your cloud history.' },
  { id: '10', category: 'Saving', q: 'Where can I access past saved sessions?', a: 'Navigate to "Saved History" from the dashboard menu to view, open, export, or manage all saved board sessions.' },
  { id: '11', category: 'General', q: 'What file formats can I import?', a: 'EduBoard supports PDF (.pdf), PowerPoint (.ppt, .pptx), Word (.doc, .docx), plain text (.txt), and images (.png, .jpg, .jpeg).' },
];

const CATEGORIES = [
  { icon: Cpu, label: 'DocCanvas', color: 'text-purple-500 bg-purple-500/10' },
  { icon: FileText, label: 'DrawSpace', color: 'text-blue-500 bg-blue-500/10' },
  { icon: Mic, label: 'Voice Board', color: 'text-amber-500 bg-amber-500/10' },
  { icon: Save, label: 'Saving', color: 'text-indigo-500 bg-indigo-500/10' },
  { icon: Zap, label: 'General', color: 'text-emerald-500 bg-emerald-500/10' },
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
