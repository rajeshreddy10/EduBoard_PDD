"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { History, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useBoard } from "@/lib/BoardContext";

export default function BoardActivity() {
  const params = useParams();
  const boardId = params.id as string;
  const { user } = useAuth();
  const { boards } = useBoard();

  const currentBoard = boards.find(b => b.id === boardId);
  const title = currentBoard?.title || "Workspace Session";
  const updatedTime = currentBoard?.updatedAt ? new Date(currentBoard.updatedAt).toLocaleString() : "Recently";

  const logs = [
    { user: user?.name || "You", initials: (user?.name || "U")[0], action: "Saved canvas session to Cloud Firestore", time: updatedTime, type: "save" },
    { user: user?.name || "You", initials: (user?.name || "U")[0], action: "Session metadata synced", time: updatedTime, type: "sync" },
    { user: user?.name || "You", initials: (user?.name || "U")[0], action: "Session initialized in workspace", time: currentBoard?.createdAt ? new Date(currentBoard.createdAt).toLocaleString() : "Recently", type: "create" },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-6 h-6 text-[var(--color-primary-500)]" />
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Session Activity Log</h1>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] font-semibold">{title}</p>
        </div>
        <Link href={`/dashboard/boards/${boardId}`} className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--color-primary-500)] flex items-center gap-2 transition-all">
          <ArrowLeft size={14} />
          <span>Back to Editor</span>
        </Link>
      </div>

      <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)] text-[var(--text-tertiary)] uppercase text-[10px] font-extrabold tracking-wider">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Action</th>
              <th className="p-4">Time</th>
              <th className="p-4">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-primary)]">
            {logs.map((log, i) => (
              <tr key={i} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--color-primary-500)] text-white text-[10px] font-extrabold flex items-center justify-center">
                      {log.initials}
                    </div>
                    <span>{log.user}</span>
                  </div>
                </td>
                <td className="p-4 text-[var(--text-secondary)] font-medium">{log.action}</td>
                <td className="p-4 text-[var(--text-tertiary)] font-semibold">{log.time}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 uppercase">{log.type}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

