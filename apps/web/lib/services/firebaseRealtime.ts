import {
  ref,
  set,
  get,
  onValue,
  off,
  push,
  onDisconnect,
  serverTimestamp as rtdbTimestamp
} from 'firebase/database';
import { rtdb } from '../firebase';

export interface UserPresence {
  userId: string;
  name: string;
  avatar?: string;
  online: boolean;
  lastSeen: any;
}

export interface CursorPosition {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  timestamp: any;
}

export const firebaseRealtimeService = {
  /**
   * Track online user presence on a specific board
   */
  trackUserPresence(userId: string, boardId: string, metadata: { name: string; avatar?: string }) {
    if (!userId || !boardId || !rtdb) return () => {};

    try {
      const userPresenceRef = ref(rtdb, `boards/${boardId}/presence/${userId}`);
      const presenceData: UserPresence = {
        userId,
        name: metadata.name || 'User',
        avatar: metadata.avatar || '',
        online: true,
        lastSeen: rtdbTimestamp(),
      };

      set(userPresenceRef, presenceData);
      onDisconnect(userPresenceRef).remove();

      return () => {
        set(userPresenceRef, { ...presenceData, online: false, lastSeen: rtdbTimestamp() });
      };
    } catch (err) {
      console.warn('Realtime Database presence tracking warning:', err);
      return () => {};
    }
  },

  /**
   * Listen to active users currently on a board
   */
  listenToActiveUsers(boardId: string, callback: (users: UserPresence[]) => void) {
    if (!boardId || !rtdb) return () => {};

    const presenceRef = ref(rtdb, `boards/${boardId}/presence`);
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const usersList: UserPresence[] = Object.values(val);
        callback(usersList.filter(u => u.online));
      } else {
        callback([]);
      }
    });

    return () => off(presenceRef, 'value', unsubscribe);
  },

  /**
   * Broadcast real-time cursor movement to collaborators
   */
  updateCursor(boardId: string, userId: string, cursor: { name: string; color: string; x: number; y: number }) {
    if (!boardId || !userId || !rtdb) return;

    try {
      const cursorRef = ref(rtdb, `boards/${boardId}/cursors/${userId}`);
      const data: CursorPosition = {
        userId,
        name: cursor.name,
        color: cursor.color,
        x: cursor.x,
        y: cursor.y,
        timestamp: rtdbTimestamp(),
      };
      set(cursorRef, data);
      onDisconnect(cursorRef).remove();
    } catch (err) {
      console.warn('Realtime Database cursor update warning:', err);
    }
  },

  /**
   * Listen to real-time cursors of other collaborators
   */
  listenToCursors(boardId: string, currentUserId: string, callback: (cursors: Record<string, CursorPosition>) => void) {
    if (!boardId || !rtdb) return () => {};

    const cursorsRef = ref(rtdb, `boards/${boardId}/cursors`);
    const unsubscribe = onValue(cursorsRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() as Record<string, CursorPosition>;
        const otherCursors: Record<string, CursorPosition> = {};
        for (const [uid, pos] of Object.entries(val)) {
          if (uid !== currentUserId) {
            otherCursors[uid] = pos;
          }
        }
        callback(otherCursors);
      } else {
        callback({});
      }
    });

    return () => off(cursorsRef, 'value', unsubscribe);
  },

  /**
   * Push live drawing stroke snippet for instant multi-user board rendering
   */
  pushLiveStroke(boardId: string, stroke: any) {
    if (!boardId || !rtdb) return;

    try {
      const strokesRef = ref(rtdb, `boards/${boardId}/liveStrokes`);
      const newStrokeRef = push(strokesRef);
      set(newStrokeRef, { ...stroke, timestamp: rtdbTimestamp() });
    } catch (err) {
      console.warn('Realtime Database stroke broadcast warning:', err);
    }
  },

  /**
   * Listen to incoming live drawing strokes
   */
  listenToLiveStrokes(boardId: string, callback: (stroke: any) => void) {
    if (!boardId || !rtdb) return () => {};

    const strokesRef = ref(rtdb, `boards/${boardId}/liveStrokes`);
    const unsubscribe = onValue(strokesRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const strokeKeys = Object.keys(val);
        const lastKey = strokeKeys[strokeKeys.length - 1];
        callback(val[lastKey]);
      }
    });

    return () => off(strokesRef, 'value', unsubscribe);
  }
};
