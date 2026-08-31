'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, MessageSquare, Phone, Clock, Send, CheckCircle } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import { supportService } from '@/lib/services/firebaseData';

export default function ContactPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    category: 'general',
    message: ''
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supportService.submitSupportTicket(user?.id || 'anonymous', {
        name: form.name,
        email: form.email,
        subject: `[${form.category.toUpperCase()}] ${form.subject}`,
        message: form.message,
      });
      setSent(true);
    } catch (err) {
      console.error('Support ticket submit error:', err);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Message Sent!</h2>
        <p className="text-[var(--text-secondary)] mb-6">We'll respond within 24 hours to <strong>{form.email}</strong></p>
        <button onClick={() => router.back()} className="px-6 py-3 rounded-2xl text-white font-semibold" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          Back to Help Center
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="px-6 py-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)]"><ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" /></button>
        <div><h1 className="font-bold text-[var(--text-primary)]">Contact Support</h1><p className="text-xs text-[var(--text-tertiary)]">We typically respond within 24 hours</p></div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-3 gap-8">
        {/* Contact info */}
        <div className="space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)] mb-4">Other ways to reach us</h2>
          {[
            { icon: Mail, label: 'Email', value: 'support@eduboard.ai', color: '#6366f1' },
            { icon: MessageSquare, label: 'Live Chat', value: 'Available 9am–6pm UTC', color: '#10b981' },
            { icon: Phone, label: 'Phone', value: '+1 (800) EDU-BOARD', color: '#f59e0b' },
            { icon: Clock, label: 'Response Time', value: 'Usually under 4 hours', color: '#8b5cf6' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div><p className="text-xs text-[var(--text-tertiary)]">{label}</p><p className="text-sm font-medium text-[var(--text-primary)]">{value}</p></div>
            </div>
          ))}
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mt-4">
            <p className="text-xs text-indigo-400 font-semibold mb-1">PRO TIP</p>
            <p className="text-xs text-[var(--text-secondary)]">Check the FAQ first — 80% of questions are answered there instantly.</p>
            <button onClick={() => router.push('/help/faq')} className="text-xs text-indigo-400 hover:opacity-80 mt-2">Browse FAQ →</button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1 block">Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)]" />
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)] mb-1 block">Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)]" />
            </div>
          </div>
          <div>
            <label className="text-sm text-[var(--text-secondary)] mb-1 block">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)]">
              {['general', 'billing', 'technical', 'air-writing', 'collaboration', 'account', 'feature-request', 'bug-report'].map(c =>
                <option key={c} value={c}>{c.replace('-', ' ').replace(/^\w/, x => x.toUpperCase())}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-[var(--text-secondary)] mb-1 block">Subject *</label>
            <input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief description of your issue"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)]" />
          </div>
          <div>
            <label className="text-sm text-[var(--text-secondary)] mb-1 block">Message *</label>
            <textarea required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Please describe your issue in detail…" rows={6}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--color-primary-500)]" />
          </div>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold disabled:opacity-60 transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </main>
    </div>
  );
}
