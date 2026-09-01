"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useBoard } from "@/lib/BoardContext";
import { getBoard } from "@/lib/store";
import { historyService } from "@/lib/services/firebaseData";
import type { Board } from "@/lib/types";

export default function SavedBoardRedirectClient() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { boards } = useBoard();
  const boardId = (params?.id as string) || '';

  useEffect(() => {
    let isMounted = true;

    async function loadAndRedirect() {
      if (!boardId) return;

      let b = boards.find(item => item.id === boardId) || getBoard(boardId);

      if (!b && user?.id) {
        try {
          const firestoreBoard = await historyService.getHistoryItem(user.id, boardId);
          if (firestoreBoard) {
            b = firestoreBoard as Board;
          }
        } catch (err) {
          console.warn("Failed to fetch board from Firestore:", err);
        }
      }

      if (!isMounted) return;

      const targetId = boardId;
      const idLower = (b?.id || targetId).toLowerCase();
      const titleLower = (b?.title || '').toLowerCase();

      if (idLower.startsWith('doccanvas') || idLower.startsWith('gesture') || titleLower.includes('doccanvas')) {
        router.replace(`/gesture-board?id=${encodeURIComponent(targetId)}`);
        return;
      }

      if (idLower.startsWith('voiceboard') || titleLower.includes('voice')) {
        router.replace(`/voice-control?id=${encodeURIComponent(targetId)}`);
        return;
      }

      router.replace(`/normal-board?id=${encodeURIComponent(targetId)}`);
    }

    loadAndRedirect();
    return () => { isMounted = false; };
  }, [boardId, boards, user?.id, router]);

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white text-xs font-semibold gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      <span>Loading saved board session...</span>
    </div>
  );
}
