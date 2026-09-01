"use client";
import React, { useState } from "react";
import Link from "next/link";

const MEMBERS = [
  { name: "You (Rajesh)", email: "rajesh@company.com", initials: "RK", color: "#3b82f6", role: "Owner" },
  { name: "Jane Doe", email: "jane@company.com", initials: "JD", color: "#10b981", role: "Editor" },
  { name: "Alex Morgan", email: "alex@company.com", initials: "AM", color: "#f59e0b", role: "Viewer" },
];

export default function ShareBoard() {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("edit");

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b" }}>Share Board</h1>
          <p style={{ fontSize: "0.8125rem", color: "#64748b" }}>Q3 Architecture Plan</p>
        </div>
        <Link href="/dashboard/boards/1" className="glass-button" style={{ padding: "0.625rem 1rem", borderRadius: "0.75rem", fontSize: "0.8125rem", color: "#475569", textDecoration: "none" }}>← Back</Link>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1e293b", marginBottom: "1rem" }}>Invite People</h2>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input className="glass-input" style={{ flex: 1 }} placeholder="Enter email address..." value={email} onChange={e => setEmail(e.target.value)} />
          <select value={permission} onChange={e => setPermission(e.target.value)} className="glass-input" style={{ width: 120 }}>
            <option value="view">Viewer</option>
            <option value="edit">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button style={{ padding: "0 1.25rem", borderRadius: "0.75rem", border: "none", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#1e293b", fontWeight: 600, cursor: "pointer", fontSize: "0.8125rem" }}>
            Invite
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1e293b", marginBottom: "1rem" }}>Members ({MEMBERS.length})</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {MEMBERS.map(m => (
            <div key={m.email} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0", borderBottom: "1px solid #e2e8f0" }}>
              <div className="avatar avatar-md" style={{ background: m.color }}>{m.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#1e293b" }}>{m.name}</div>
                <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>{m.email}</div>
              </div>
              <span className={`badge ${m.role === "Owner" ? "badge-rose" : m.role === "Editor" ? "badge-green" : "badge-blue"}`}>{m.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
