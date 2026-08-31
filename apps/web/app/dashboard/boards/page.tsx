'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { History, Plus, Search, Grid, List, Trash2 } from 'lucide-react';
import { useBoard } from '@/lib/BoardContext';
import type { Board } from '@/lib/types';

const GRADIENTS = [
  'linear-gradient(135deg, #3b82f6, #6366f1)', 'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)', 'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)', 'linear-gradient(135deg, #ec4899, #f59e0b)',
];

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return 'Recently';
  }
}

export default function HistoryHub() {
  const { boards, deleteBoard } = useBoard();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'shared' | 'personal'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${title}" from history?`)) {
      try {
        setDeletingId(id);
        await deleteBoard(id);
      } catch (err) {
        console.error('Failed to delete board:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filtered = boards.filter(b => {
    if (filter === 'shared' && !b.isShared) return false;
    if (filter === 'personal' && b.isShared) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--color-primary-500)]" />
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">Workspace History</h1>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] font-semibold mt-0.5">{boards.length} saved history records in your workspace</p>
        </div>
        <Link href="/normal-board" className="px-4 py-2 rounded-xl bg-[var(--color-primary-500)] text-white text-xs font-bold hover:bg-[var(--color-primary-600)] transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0">
          <Plus size={16} />
          <span>New Session</span>
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/20" placeholder="Search history..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex p-1 rounded-xl bg-[var(--bg-tertiary)] gap-1 shrink-0">
            {(['all', 'shared', 'personal'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${filter === f ? 'bg-[var(--color-primary-500)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-xl shrink-0">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${view === 'grid' ? 'bg-[var(--bg-secondary)] text-[var(--color-primary-500)] shadow-sm' : 'text-[var(--text-tertiary)]'}`} title="Grid view">
            <Grid size={16} />
          </button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${view === 'list' ? 'bg-[var(--bg-secondary)] text-[var(--color-primary-500)] shadow-sm' : 'text-[var(--text-tertiary)]'}`} title="List view">
            <List size={16} />
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="p-8 rounded-3xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] text-center space-y-3">
          <History className="w-10 h-10 text-[var(--text-tertiary)] mx-auto opacity-40" />
          <p className="text-sm font-bold text-[var(--text-primary)]">No history records found</p>
          <p className="text-xs text-[var(--text-tertiary)]">Start drawing on DrawSpace or Voice Board to create and save your first workspace session.</p>
          <Link href="/normal-board" className="inline-block px-4 py-2 rounded-xl bg-[var(--color-primary-500)] text-white text-xs font-bold hover:bg-[var(--color-primary-600)] transition-all cursor-pointer">
            Create Session Now
          </Link>
        </div>
      )}

      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((board, i) => (
            <div key={board.id} className="relative group h-full">
              <Link href={`/dashboard/boards/${board.id}`} className="block h-full">
                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-sm hover:shadow-md hover:border-[var(--color-primary-500)]/40 transition-all cursor-pointer space-y-3 flex flex-col justify-between h-full">
                  <div>
                    <div style={{ background: GRADIENTS[i % GRADIENTS.length] }} className="h-24 rounded-xl relative mb-3 p-2">
                      {board.isShared && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white absolute top-2 right-2 shadow-sm">Shared</span>}
                      <button
                        onClick={(e) => handleDelete(e, board.id, board.title)}
                        disabled={deletingId === board.id}
                        className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/40 hover:bg-red-500 text-white transition-all cursor-pointer opacity-80 hover:opacity-100 z-10"
                        title="Delete History Record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] truncate mb-1">{board.title}</h3>
                    <p className="text-xs text-[var(--text-tertiary)] line-clamp-2 leading-relaxed">{board.description || 'Saved workspace history session.'}</p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-primary)] flex items-center justify-between text-[10px] text-[var(--text-tertiary)] font-semibold">
                    <span>{timeAgo(board.updatedAt)}</span>
                    <span className="text-[var(--color-primary-500)] font-bold">Open Session →</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)] text-[var(--text-tertiary)] uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="p-3.5">Session / Title</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Last Active</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {filtered.map((board, i) => (
                <tr key={board.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                  <td className="p-3.5">
                    <Link href={`/dashboard/boards/${board.id}`} className="flex items-center gap-3 text-[var(--text-primary)] font-bold hover:text-[var(--color-primary-500)]">
                      <div style={{ background: GRADIENTS[i % GRADIENTS.length] }} className="w-8 h-8 rounded-lg shrink-0" />
                      <span className="truncate max-w-[200px]">{board.title}</span>
                    </Link>
                  </td>
                  <td className="p-3.5 text-[var(--text-secondary)] font-medium max-w-xs truncate">{board.description || 'Saved session file'}</td>
                  <td className="p-3.5 text-[var(--text-tertiary)] font-semibold">{timeAgo(board.updatedAt)}</td>
                  <td className="p-3.5">
                    {board.isShared ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500">Shared</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-500">Personal</span>}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={(e) => handleDelete(e, board.id, board.title)}
                      disabled={deletingId === board.id}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete History Record"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
