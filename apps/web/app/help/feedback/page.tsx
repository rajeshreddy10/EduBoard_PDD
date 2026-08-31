'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, Send, CheckCircle, MessageSquare, Smile, Frown, Meh } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';

const ASPECTS = ['DocCanvas', 'Voice Board', 'Collaboration', 'UI Design', 'Performance', 'AI Features', 'Classrooms'];

export default function FeedbackPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [nps, setNps] = useState<number | null>(null);
  const [aspects, setAspects] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleAspect = (a: string) => setAspects(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const submit = async () => {
    if (!rating) return;
    setLoading(true);
    try {
      await new Promise(res => setTimeout(res, 400));
      setSubmitted(true);
    } catch (err) {
      console.error('Feedback submit error:', err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const moodIcon = rating >= 4 ? <Smile className="w-6 h-6 text-green-400" /> : rating >= 2 ? <Meh className="w-6 h-6 text-yellow-400" /> : rating > 0 ? <Frown className="w-6 h-6 text-red-400" /> : null;

  if (submitted) return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Thank you! 🎉</h2>
        <p className="text-[var(--text-secondary)] mb-6">Your feedback helps us build a better EduBoard for everyone.</p>
        <button onClick={() => router.back()} className="px-6 py-3 rounded-2xl text-white font-semibold" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>Done</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="px-6 py-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)]"><ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" /></button>
        <div><h1 className="font-bold text-[var(--text-primary)]">Share Feedback</h1><p className="text-xs text-[var(--text-tertiary)]">Help us improve EduBoard</p></div>
      </header>
      <main className="max-w-lg mx-auto px-6 py-10 space-y-8">
        {/* Star rating */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-2">
            {moodIcon}
            <h2 className="text-lg font-semibold text-[var(--text-primary)] ml-2">How would you rate EduBoard?</h2>
          </div>
          <div className="flex justify-center gap-2 mt-4">
            {[1,2,3,4,5].map(s => (
              <button key={s} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)} onClick={() => setRating(s)}
                className="transition-transform hover:scale-125">
                <Star className={`w-10 h-10 transition-colors ${s <= (hovered || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--border-primary)]'}`} />
              </button>
            ))}
          </div>
          {rating > 0 && <p className="text-sm text-[var(--text-tertiary)] mt-2">{['','Very poor','Poor','Average','Good','Excellent!'][rating]}</p>}
        </div>

        {/* NPS */}
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-3">How likely are you to recommend EduBoard to a colleague? (0–10)</p>
          <div className="flex gap-1 flex-wrap">
            {Array.from({length:11},(_,i)=>i).map(n => (
              <button key={n} onClick={() => setNps(n)}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all border ${nps === n ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white' : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--color-primary-500)]/40'}`}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[var(--text-tertiary)]">Not likely</span>
            <span className="text-xs text-[var(--text-tertiary)]">Extremely likely</span>
          </div>
        </div>

        {/* Aspects */}
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-3">What did you like most? (select all that apply)</p>
          <div className="flex flex-wrap gap-2">
            {ASPECTS.map(a => (
              <button key={a} onClick={() => toggleAspect(a)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${aspects.includes(a) ? 'bg-[var(--color-primary-500)]/10 border-[var(--color-primary-500)] text-[var(--color-primary-500)]' : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="text-sm font-medium text-[var(--text-primary)] mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[var(--color-primary-500)]" /> Any additional comments?</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Tell us what you love or what we can improve…" rows={4}
            className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--color-primary-500)] transition-colors" />
        </div>

        <button onClick={submit} disabled={!rating || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold disabled:opacity-50 transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </main>
    </div>
  );
}
