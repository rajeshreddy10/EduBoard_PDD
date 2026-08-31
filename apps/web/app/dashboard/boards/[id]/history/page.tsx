"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { History, ArrowLeft, RotateCcw, Clock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface VersionItem {
  id: string;
  createdAt: string;
  createdBy: string;
  title?: string;
  description?: string;
  strokes?: any[];
}

export default function BoardHistory() {
  const params = useParams();
  const boardId = params.id as string;
  const { user } = useAuth();
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVersions() {
      if (!user?.id || !boardId) {
        setLoading(false);
        return;
      }
      try {
        const vRef = collection(db, "users", user.id, "history", boardId, "versions");
        const q = query(vRef, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VersionItem));
        setVersions(list);
      } catch (err) {
        console.warn("Failed to load versions from Firestore:", err);
      } finally {
        setLoading(false);
      }
    }
    loadVersions();
  }, [user, boardId]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-6 h-6 text-[var(--color-primary-500)]" />
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Version History</h1>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] font-semibold">
            {loading ? "Loading snapshots..." : `${versions.length} saved version snapshots for this session`}
          </p>
        </div>
        <Link href={`/dashboard/boards/${boardId}`} className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--color-primary-500)] flex items-center gap-2 transition-all">
          <ArrowLeft size={14} />
          <span>Back to Editor</span>
        </Link>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-[var(--text-tertiary)]">Loading version snapshots...</div>
      ) : versions.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] text-center space-y-3">
          <Clock className="w-12 h-12 text-[var(--text-tertiary)] mx-auto opacity-40" />
          <p className="text-sm font-bold text-[var(--text-primary)]">No version snapshots recorded yet</p>
          <p className="text-xs text-[var(--text-tertiary)]">Click the Save button in the editor header to capture your first snapshot version.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {versions.map((v, idx) => (
            <div key={v.id} className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-emerald-500' : 'bg-blue-500/50'}`} />
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>{v.title || `Snapshot Version ${v.id}`}</span>
                    {idx === 0 && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600 uppercase">Current</span>}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] font-medium mt-0.5">
                    Saved by {v.createdBy || "You"} • {formatDate(v.createdAt)}
                  </div>
                </div>
              </div>
              <Link href={`/dashboard/boards/${boardId}`} className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--color-primary-500)] hover:bg-[var(--color-primary-500)] hover:text-white transition-all flex items-center gap-1">
                <RotateCcw size={12} />
                <span>Inspect</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

