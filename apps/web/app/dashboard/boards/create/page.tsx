"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function CreateBoard() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [template, setTemplate] = useState("blank");

  const templates = [
    { id: "blank", name: "Blank Canvas", icon: "📄", desc: "Start from scratch" },
    { id: "brainstorm", name: "Brainstorm", icon: "💡", desc: "Mind mapping layout" },
    { id: "wireframe", name: "Wireframe", icon: "🖼️", desc: "UI wireframing" },
    { id: "notes", name: "Meeting Notes", icon: "📝", desc: "Structured note-taking" },
    { id: "kanban", name: "Kanban Board", icon: "📋", desc: "Task management" },
    { id: "presentation", name: "Presentation", icon: "🎤", desc: "Slide deck" },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.25rem" }}>Create New Board</h1>
      <p style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: "2rem" }}>Choose a template and customize your workspace</p>

      <div className="glass-panel" style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.5rem" }}>Board Title</label>
          <input className="glass-input" placeholder="My awesome board..." value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: "1rem" }} />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.5rem" }}>Description (optional)</label>
          <textarea className="glass-input" placeholder="What's this board about?" rows={3} value={desc} onChange={e => setDesc(e.target.value)} style={{ resize: "vertical" }} />
        </div>

        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.75rem" }}>Choose Template</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
          {templates.map(t => (
            <div key={t.id} onClick={() => setTemplate(t.id)} className="glass-panel-hover" style={{ padding: "1.25rem", textAlign: "center", cursor: "pointer", borderColor: template === t.id ? "rgba(59,130,246,0.5)" : undefined, boxShadow: template === t.id ? "0 0 0 2px rgba(59,130,246,0.2)" : undefined }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{t.icon}</div>
              <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1e293b" }}>{t.name}</div>
              <div style={{ fontSize: "0.6875rem", color: "#64748b", marginTop: "0.125rem" }}>{t.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={() => router.back()} className="glass-button" style={{ padding: "0.75rem 1.5rem", borderRadius: "0.75rem", color: "#475569", fontSize: "0.8125rem" }}>Cancel</button>
          <button onClick={async () => {
            try {
              const board = await api.createBoard({ title: title || 'Untitled Board', description: desc, bgColor: '#ffffff' });
              router.push(`/dashboard/boards/${board.id}`);
            } catch {
              router.push('/dashboard/boards');
            }
          }} style={{ padding: "0.75rem 1.5rem", borderRadius: "0.75rem", border: "none", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#1e293b", fontWeight: 600, cursor: "pointer", fontSize: "0.8125rem" }}>
            Create Board →
          </button>
        </div>
      </div>
    </div>
  );
}
