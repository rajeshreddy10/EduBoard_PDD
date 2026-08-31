"use client";
import React, { useEffect, useState } from "react";
import { LANGUAGES, getStoredLanguage, getStoredSpellLang, applyLanguage, applySpellLang, type LangCode } from "@/lib/i18n";

export default function LanguageSettings() {
  const [lang, setLang] = useState<LangCode>('en');
  const [spellLang, setSpellLang] = useState<LangCode>('en');

  useEffect(() => {
    setLang(getStoredLanguage());
    setSpellLang(getStoredSpellLang());
  }, []);

  const handleLang = (code: LangCode) => {
    setLang(code);
    applyLanguage(code);
  };

  const handleSpellLang = (code: LangCode) => {
    setSpellLang(code);
    applySpellLang(code);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Language</h1>
      <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginBottom: "1.5rem" }}>Set your preferred language for the interface and spell check</p>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1rem" }}>Interface Language</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
          {LANGUAGES.map(l => (
            <div key={l.code} onClick={() => handleLang(l.code)} style={{ padding: "0.875rem 1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: 12, border: "1px solid", borderColor: lang === l.code ? "rgba(59,130,246,0.5)" : "var(--border-glass)", background: "var(--bg-glass)" }}>
              <span style={{ fontSize: "1.25rem" }}>{l.flag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-primary)" }}>{l.name}</div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>{l.native}</div>
              </div>
              {lang === l.code && <span style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.125rem 0.5rem", borderRadius: 999, background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>Active</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1rem" }}>Spell Check Language</h2>
        <select value={spellLang} onChange={e => handleSpellLang(e.target.value as LangCode)} className="glass-input" style={{ maxWidth: 300 }}>
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
        </select>
      </div>
    </div>
  );
}
