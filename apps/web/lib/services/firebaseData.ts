import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Board, Notification, User } from '../types';

function sanitizePayload(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizePayload);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = sanitizePayload(val);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * History & Saved History Service (Firebase Firestore)
 */
export const historyService = {
  async getHistory(userId: string): Promise<Board[]> {
    if (!userId) return [];
    try {
      const historyRef = collection(db, 'users', userId, 'history');
      const q = query(historyRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        const boardsRef = collection(db, 'boards');
        const legacyQuery = query(boardsRef, where('createdBy', '==', userId));
        const legacySnap = await getDocs(legacyQuery);
        return legacySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
      }

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
    } catch (error) {
      console.error('Error fetching user history from Firestore:', error);
      return [];
    }
  },

  subscribeToHistory(userId: string, callback: (items: Board[]) => void): Unsubscribe | null {
    if (!userId) return null;
    try {
      const historyRef = collection(db, 'users', userId, 'history');
      const q = query(historyRef, orderBy('updatedAt', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
        callback(items);
      }, (error) => {
        console.warn('History subscription error:', error);
      });
    } catch (error) {
      console.error('Failed to setup history listener:', error);
      return null;
    }
  },

  async getHistoryItem(userId: string, historyId: string): Promise<Board | null> {
    if (!userId || !historyId) return null;
    try {
      const itemRef = doc(db, 'users', userId, 'history', historyId);
      const docSnap = await getDoc(itemRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Board;
      }
      return null;
    } catch (error) {
      console.error('Error fetching history item:', error);
      return null;
    }
  },

  async saveHistoryItem(userId: string, item: Board): Promise<void> {
    if (!userId || !item.id) return;
    try {
      const historyDocRef = doc(db, 'users', userId, 'history', item.id);
      const payload = sanitizePayload({
        ...item,
        createdBy: userId,
        updatedAt: item.updatedAt || new Date().toISOString(),
      });
      await setDoc(historyDocRef, payload, { merge: true });

      const topLevelRef = doc(db, 'boards', item.id);
      await setDoc(topLevelRef, payload, { merge: true });
    } catch (error) {
      console.error('Error saving history item to Firestore:', error);
      throw error;
    }
  },

  async updateHistoryItem(userId: string, historyId: string, updates: Partial<Board>): Promise<void> {
    if (!userId || !historyId) return;
    try {
      const payload = sanitizePayload({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      const historyDocRef = doc(db, 'users', userId, 'history', historyId);
      await updateDoc(historyDocRef, payload);

      try {
        const topLevelRef = doc(db, 'boards', historyId);
        await updateDoc(topLevelRef, payload);
      } catch {
        // Ignore top-level sync error
      }
    } catch (error) {
      console.error('Error updating history item in Firestore:', error);
      throw error;
    }
  },

  async deleteHistoryItem(userId: string, historyId: string): Promise<void> {
    if (!userId || !historyId) return;
    try {
      const historyDocRef = doc(db, 'users', userId, 'history', historyId);
      await deleteDoc(historyDocRef);

      try {
        const topLevelRef = doc(db, 'boards', historyId);
        await deleteDoc(topLevelRef);
      } catch {
        // Ignore top-level deletion error
      }
    } catch (error) {
      console.error('Error deleting history item from Firestore:', error);
      throw error;
    }
  },

  async saveBoardVersion(userId: string, boardId: string, versionData: Partial<Board>): Promise<string> {
    if (!userId || !boardId) return '';
    try {
      const versionId = `v_${Date.now()}`;
      const payload = sanitizePayload({
        ...versionData,
        id: versionId,
        boardId,
        createdBy: userId,
        createdAt: new Date().toISOString(),
      });

      const userVersionRef = doc(db, 'users', userId, 'history', boardId, 'versions', versionId);
      await setDoc(userVersionRef, payload);

      const topVersionRef = doc(db, 'boards', boardId, 'versions', versionId);
      await setDoc(topVersionRef, payload);

      return versionId;
    } catch (error) {
      console.warn('Error saving board version snapshot:', error);
      return '';
    }
  }
};

/**
 * Notifications Service (Firebase Firestore)
 */
export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    if (!userId) return [];
    try {
      const notifRef = collection(db, 'users', userId, 'notifications');
      const q = query(notifRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void): Unsubscribe | null {
    if (!userId) return null;
    try {
      const notifRef = collection(db, 'users', userId, 'notifications');
      const q = query(notifRef, orderBy('timestamp', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        callback(notifs);
      }, (error) => {
        console.warn('Notifications subscription warning:', error);
      });
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      return null;
    }
  },

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    if (!userId || !notificationId) return;
    try {
      const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error('Error marking notification read:', error);
      throw error;
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const notifRef = collection(db, 'users', userId, 'notifications');
      const q = query(notifRef, where('read', '==', false));
      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs.map(d => 
        updateDoc(doc(db, 'users', userId, 'notifications', d.id), { read: true })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications read:', error);
      throw error;
    }
  },

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    if (!userId || !notificationId) return;
    try {
      const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
      await deleteDoc(notifRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  async addNotification(userId: string, notification: Partial<Notification>): Promise<Notification> {
    const id = notification.id || `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newNotif: Notification = {
      id,
      type: notification.type || 'info',
      title: notification.title || 'Notification',
      message: notification.message || '',
      timestamp: notification.timestamp || new Date().toISOString(),
      read: false,
      actionable: notification.actionable || false,
      actionUrl: notification.actionUrl || '',
    };

    if (userId) {
      try {
        const notifRef = doc(db, 'users', userId, 'notifications', id);
        await setDoc(notifRef, newNotif);
      } catch (error) {
        console.error('Error saving notification to Firestore:', error);
      }
    }

    return newNotif;
  }
};

/**
 * User Profile & Avatar Service (Firebase Firestore & Storage)
 */
export const userProfileService = {
  async uploadAvatar(userId: string, dataUrl: string): Promise<string> {
    if (!userId || !dataUrl) return dataUrl;
    if (!dataUrl.startsWith('data:')) return dataUrl;

    try {
      const avatarRef = ref(storage, `users/${userId}/avatar`);
      await uploadString(avatarRef, dataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(avatarRef);
      return downloadUrl;
    } catch (error) {
      console.warn('Firebase Storage avatar upload fallback:', error);
      return dataUrl;
    }
  },

  async getProfile(userId: string): Promise<User | null> {
    if (!userId) return null;
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile from Firestore:', error);
      return null;
    }
  },

  async updateProfile(userId: string, data: Partial<User>): Promise<void> {
    if (!userId) return;
    try {
      const payload = { ...data };
      if (payload.avatar && payload.avatar.startsWith('data:')) {
        payload.avatar = await this.uploadAvatar(userId, payload.avatar);
      }

      const cleanPayload = sanitizePayload({
        ...payload,
        updatedAt: serverTimestamp()
      });

      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, cleanPayload, { merge: true });
    } catch (error) {
      console.error('Error updating user profile in Firestore:', error);
      throw error;
    }
  }
};

/**
 * Theme & System Settings Service (Firebase Firestore)
 */
export const userSettingsService = {
  async getSettings(userId: string): Promise<any | null> {
    if (!userId) return null;
    try {
      const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (error) {
      console.warn('Error fetching user settings from Firestore:', error);
      return null;
    }
  },

  async saveSettings(userId: string, settingsData: any): Promise<void> {
    if (!userId) return;
    try {
      const payload = sanitizePayload({
        ...settingsData,
        updatedAt: new Date().toISOString(),
      });
      const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
      await setDoc(settingsRef, payload, { merge: true });
    } catch (error) {
      console.error('Error saving user settings to Firestore:', error);
      throw error;
    }
  }
};
