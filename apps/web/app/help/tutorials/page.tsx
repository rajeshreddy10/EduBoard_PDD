'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Clock, BookOpen, Star, Lock } from 'lucide-react';

const TUTORIALS = [
  { id: '1', title: 'Getting Started with EduBoard', duration: '4:32', category: 'Basics', thumbnail: '🚀', views: '12.4k', free: true },
  { id: '2', title: 'DocCanvas — Document & Blank Canvas Guide', duration: '8:15', category: 'DocCanvas', thumbnail: '📄', views: '9.8k', free: true },
  { id: '3', title: 'Setting Up Your First Classroom', duration: '6:44', category: 'Classroom', thumbnail: '🏫', views: '7.2k', free: true },
  { id: '4', title: 'Real-Time Collaboration Explained', duration: '5:20', category: 'Collaboration', thumbnail: '👥', views: '5.9k', free: true },
  { id: '5', title: 'Reference Drawer & Waypoint Controls', duration: '11:03', category: 'DrawSpace', thumbnail: '📍', views: '4.3k', free: true },
  { id: '6', title: 'Voice Board Live Transcription', duration: '7:51', category: 'Voice Board', thumbnail: '🎤', views: '6.1k', free: true },
  { id: '7', title: 'Exporting Boards in 12 Formats', duration: '3:28', category: 'Export', thumbnail: '📤', views: '3.7k', free: true },
  { id: '8', title: 'Running Quizzes & Polls Live', duration: '9:12', category: 'Classroom', thumbnail: '📊', views: '5.5k', free: false },
];

const CATS = ['All', ...Array.from(new Set(TUTORIALS.map(t => t.category)))];

export default function TutorialsPage() {
  const router = useRouter();
  const [cat, setCat] = React.useState('All');
  const filtered = cat === 'All' ? TUTORIALS : TUTORIALS.filter(t => t.category === cat);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="px-6 py-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)]"><ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" /></button>
        <div><h1 className="font-bold text-[var(--text-primary)]">Video Tutorials</h1><p className="text-xs text-[var(--text-tertiary)]">{TUTORIALS.length} video guides</p></div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${cat === c ? 'bg-[var(--color-primary-500)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:border-[var(--color-primary-500)]/40'}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="group rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--color-primary-500)]/40 overflow-hidden transition-all hover:shadow-xl cursor-pointer">
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center relative">
                <span className="text-5xl">{t.thumbnail}</span>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    {t.free ? <Play className="w-6 h-6 text-white ml-0.5" /> : <Lock className="w-5 h-5 text-white" />}
                  </div>
                </div>
                {!t.free && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-yellow-500 text-black text-xs font-bold flex items-center gap-1">
                    <Star className="w-3 h-3" /> PRO
                  </span>
                )}
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-xs font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {t.duration}
                </span>
              </div>
              <div className="p-3">
                <span className="text-xs text-[var(--color-primary-500)] font-semibold">{t.category}</span>
                <p className="text-sm font-semibold text-[var(--text-primary)] mt-1 line-clamp-2">{t.title}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{t.views} views</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
