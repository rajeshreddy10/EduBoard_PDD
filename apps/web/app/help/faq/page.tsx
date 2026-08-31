'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Search, ThumbsUp, ThumbsDown } from 'lucide-react';

interface FAQItem { id: string; q: string; a: string; category: string; helpful?: number; }

const FAQS: FAQItem[] = [
  { id: '1', category: 'DocCanvas', q: 'What is DocCanvas Studio?', a: 'DocCanvas Studio is EduBoard\'s document annotation workspace. You can open any supported document (PDF, Word, PowerPoint, Images, Text) or draw directly on a blank canvas using Pen, Text Typing, Erase, Highlight, Laser Pointer, and Magnify tools.', helpful: 142 },
  { id: '2', category: 'DocCanvas', q: 'Can I draw on DocCanvas Studio without opening a file?', a: 'Yes! DocCanvas Studio opens in blank canvas mode by default, allowing you to draw freehand, add typed text, highlight, and save immediately without needing to open a file first.', helpful: 118 },
  { id: '3', category: 'DocCanvas', q: 'How do I switch between writing and scrolling a document?', a: 'When a file is opened in DocCanvas, use the Write / Scroll mode toggle in the Document Viewer header bar. Switch to "Scroll" mode to scroll pages or navigate slides, and switch back to "Write" mode to annotate on top of the content.', helpful: 95 },
  { id: '4', category: 'DrawSpace', q: 'What is DrawSpace Canvas?', a: 'DrawSpace Canvas is an interactive whiteboard for freehand drawing, text editing, and presentation equipped with a 30/70 side-by-side Reference Drawer, Waypoint camera glides, and Teacher Notes overlay.', helpful: 130 },
  { id: '5', category: 'DrawSpace', q: 'How do Waypoint camera glides work?', a: 'Position your canvas view using pan/zoom, then click "Add Waypoint" in the header bar to save your camera coordinates. Clicking any saved waypoint chip smoothly glides your viewport back to that view position.', helpful: 88 },
  { id: '6', category: 'DrawSpace', q: 'How do I open the Reference Drawer?', a: 'Click the "Reference" button in the board header to slide open a 30/70 side-by-side panel. You can load reference files or lesson materials on the left while keeping your main whiteboard workspace active on the right.', helpful: 104 },
  { id: '7', category: 'Voice Board', q: 'How does Voice Board work?', a: 'Click "Voice ON" (or press Alt+V) and speak into your microphone. Spoken words are transcribed into text elements placed directly on the canvas, with real-time deduplication to prevent sentence repetition.', helpful: 165 },
  { id: '8', category: 'Voice Board', q: 'How do I adjust font size or erase spoken text?', a: 'Select any text element on the canvas to increase or decrease font size (- / +), or click a text element while the Eraser tool is active to delete it.', helpful: 76 },
  { id: '9', category: 'Saving', q: 'How do I save my boards?', a: 'Click the "Save" button in the board header. All drawings, text elements, and opened document annotations are saved to your account and synced to your cloud history.', helpful: 184 },
  { id: '10', category: 'Saving', q: 'Where can I access past saved sessions?', a: 'Navigate to "Saved History" from the dashboard menu to view, open, export, or manage all saved board sessions.', helpful: 112 },
  { id: '11', category: 'General', q: 'What file formats can I import?', a: 'EduBoard supports PDF (.pdf), PowerPoint (.ppt, .pptx), Word (.doc, .docx), plain text (.txt), and images (.png, .jpg, .jpeg).', helpful: 150 },
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
