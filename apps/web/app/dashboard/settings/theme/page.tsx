"use client";
import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { type ThemeId } from "@/lib/theme";
import { Palette, Sun, Moon, Sparkles, CheckCircle2, Flame, Shield, Cpu } from 'lucide-react';

export default function ThemeSettings() {
  const { theme, accentColor, setTheme, setAccentColor } = useTheme();
  const [status, setStatus] = useState<string | null>(null);

  const themes: { id: ThemeId; name: string; desc: string; icon: React.ElementType }[] = [
    { id: 'light', name: "Classic Paper", desc: "Clean daylight light mode", icon: Sun },
    { id: 'dark', name: "Deep Aurora", desc: "Dark cinematic slate", icon: Moon },
    { id: 'midnight', name: "Midnight Navy", desc: "Ultra-dark space environment", icon: Shield },
    { id: 'sunset', name: "Sunset Crimson", desc: "Warm dusk atmosphere", icon: Flame },
    { id: 'emerald', name: "Emerald Forest", desc: "Calming botanical green", icon: Sparkles },
    { id: 'cyberpunk', name: "Cyber Neon", desc: "Futuristic purple workspace", icon: Cpu },
  ];

  const accents = ["#3b82f6", "#818cf8", "#6366f1", "#06b6d4", "#10b981", "#db2777", "#f59e0b", "#ef4444", "#a855f7"];

  const handleThemeSelect = (id: ThemeId) => {
    setTheme(id);
    setStatus('Theme synchronized across application');
    setTimeout(() => setStatus(null), 2500);
  };

  const handleAccentSelect = (c: string) => {
    setAccentColor(c);
    setStatus('Accent color updated');
    setTimeout(() => setStatus(null), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">System Appearance</h1>
        <p className="text-xs font-mono text-[var(--text-tertiary)] uppercase tracking-widest">Configure Global Application Theme & Accent Palette</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="space-y-4">
           <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-primary-500)]" /> Theme Presets
           </h3>
           <div className="grid gap-3">
              {themes.map(t => {
                const Icon = t.icon;
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleThemeSelect(t.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all border text-left cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10 shadow-md'
                        : 'border-[var(--border-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-[var(--color-primary-500)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[var(--text-primary)] tracking-tight">{t.name}</div>
                      <div className="text-xs text-[var(--text-tertiary)] truncate">{t.desc}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-[var(--color-primary-500)] flex-shrink-0" />}
                  </button>
                );
              })}
           </div>
        </section>

        <section className="space-y-4">
           <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--color-primary-500)]" /> Primary Accent
           </h3>
           <div className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] space-y-6 shadow-sm">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {accents.map(c => (
                  <button
                    key={c}
                    onClick={() => handleAccentSelect(c)}
                    className={`aspect-square rounded-full transition-all flex items-center justify-center cursor-pointer ${
                      accentColor === c ? 'ring-4 ring-[var(--color-primary-500)]/40 scale-110 shadow-md' : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  >
                    {accentColor === c && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                  </button>
                ))}
              </div>
              <div className="pt-4 border-t border-[var(--border-primary)] flex justify-between items-center text-xs font-mono font-bold uppercase">
                <span className="text-[var(--text-tertiary)]">Current Accent</span>
                <span className="text-[var(--color-primary-500)] flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: accentColor }} />
                  {accentColor}
                </span>
              </div>
           </div>
        </section>
      </div>

      {status && (
        <div className="fixed bottom-6 right-6 animate-slide-up px-5 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--color-primary-500)] text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider shadow-2xl z-[100] flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-[var(--color-primary-500)] animate-ping" />
           {status}
        </div>
      )}
    </div>
  );
}

