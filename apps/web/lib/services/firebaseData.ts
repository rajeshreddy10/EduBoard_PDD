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
      console.log('[Firebase Firestore] [Menu Option: Saved History] Fetching board history for user:', userId);
      const historyRef = collection(db, 'users', userId, 'history');
      const q = query(historyRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('[Firebase Firestore] [Menu Option: Saved History] User subcollection empty, falling back to top-level boards collection');
        const boardsRef = collection(db, 'boards');
        const legacyQuery = query(boardsRef, where('createdBy', '==', userId));
        const legacySnap = await getDocs(legacyQuery);
        const legacyBoards = legacySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
        console.log(`[Firebase Firestore] [Menu Option: Saved History] Retrieved ${legacyBoards.length} legacy history boards.`);
        return legacyBoards;
      }

      const boards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
      console.log(`[Firebase Firestore] [Menu Option: Saved History] Retrieved ${boards.length} history boards.`);
      return boards;
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: Saved History] Error fetching user history:', error);
      return [];
    }
  },

  subscribeToHistory(userId: string, callback: (items: Board[]) => void): Unsubscribe | null {
    if (!userId) return null;
    try {
      console.log('[Firebase Firestore] [Menu Option: Saved History] Subscribing to live history updates for user:', userId);
      const historyRef = collection(db, 'users', userId, 'history');
      const q = query(historyRef, orderBy('updatedAt', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
        console.log(`[Firebase Firestore] [Menu Option: Saved History] Live update: ${items.length} boards loaded`);
        callback(items);
      }, (error) => {
        console.warn('[Firebase Firestore] [Menu Option: Saved History] History subscription error:', error);
      });
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: Saved History] Failed to setup history listener:', error);
      return null;
    }
  },

  async getHistoryItem(userId: string, historyId: string): Promise<Board | null> {
    if (!userId || !historyId) return null;
    try {
      console.log(`[Firebase Firestore] [Menu Option: Saved History] Fetching board item ${historyId} for user ${userId}`);
      const itemRef = doc(db, 'users', userId, 'history', historyId);
      const docSnap = await getDoc(itemRef);
      if (docSnap.exists()) {
        console.log(`[Firebase Firestore] [Menu Option: Saved History] Found board item ${historyId}`);
        return { id: docSnap.id, ...docSnap.data() } as Board;
      }
      return null;
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: Saved History] Error fetching history item:', error);
      return null;
    }
  },

  async saveHistoryItem(userId: string, item: Board): Promise<void> {
    if (!userId || !item.id) return;
    try {
      console.log(`[Firebase Firestore] [Menu Option: Saved History] Saving board item ${item.id} ("${item.title}") to Firestore for user ${userId}`);
      const historyDocRef = doc(db, 'users', userId, 'history', item.id);
      const payload = sanitizePayload({
        ...item,
        createdBy: userId,
        updatedAt: item.updatedAt || new Date().toISOString(),
      });
      await setDoc(historyDocRef, payload, { merge: true });

      const topLevelRef = doc(db, 'boards', item.id);
      await setDoc(topLevelRef, payload, { merge: true });
      console.log(`[Firebase Firestore] [Menu Option: Saved History] Saved board item ${item.id} successfully.`);
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: Saved History] Error saving history item:', error);
      throw error;
    }
  },

  async updateHistoryItem(userId: string, historyId: string, updates: Partial<Board>): Promise<void> {
    if (!userId || !historyId) return;
    try {
      console.log(`[Firebase Firestore] [Menu Option: Saved History] Updating board ${historyId} in Firestore`);
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
      console.log(`[Firebase Firestore] [Menu Option: Saved History] Updated board ${historyId} successfully.`);
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: Saved History] Error updating history item:', error);
      throw error;
    }
  },

  async deleteHistoryItem(userId: string, historyId: string): Promise<void> {
    if (!userId || !historyId) return;
    try {
      console.log(`[Firebase Firestore] [Menu Option: Saved History] Deleting history item ${historyId} for user ${userId}`);
      const historyDocRef = doc(db, 'users', userId, 'history', historyId);
      await deleteDoc(historyDocRef);

      try {
        const topLevelRef = doc(db, 'boards', historyId);
        await deleteDoc(topLevelRef);
      } catch {
        // Ignore top-level deletion error
      }
      console.log(`[Firebase Firestore] [Menu Option: Saved History] Deleted history item ${historyId} successfully.`);
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: Saved History] Error deleting history item:', error);
      throw error;
    }
  },

  async saveBoardVersion(userId: string, boardId: string, versionData: Partial<Board>): Promise<string> {
    if (!userId || !boardId) return '';
    try {
      const versionId = `v_${Date.now()}`;
      console.log(`[Firebase Firestore] [Menu Option: Saved History] Saving version snapshot ${versionId} for board ${boardId}`);
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
      console.warn('[Firebase Firestore] [Menu Option: Saved History] Error saving board version snapshot:', error);
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
      console.log('[Firebase Firestore] [Menu Option: Notifications] Fetching user notifications for user:', userId);
      const notifRef = collection(db, 'users', userId, 'notifications');
      const q = query(notifRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      console.log(`[Firebase Firestore] [Menu Option: Notifications] Fetched ${notifications.length} notifications.`);
      return notifications;
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: Notifications] Error fetching notifications:', error);
      return [];
    }
  },

  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void): Unsubscribe | null {
    if (!userId) return null;
    try {
      console.log('[Firebase Firestore] [Menu Option: Notifications] Subscribing to live notifications for user:', userId);
      const notifRef = collection(db, 'users', userId, 'notifications');
      const q = query(notifRef, orderBy('timestamp', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        console.log(`[Firebase Firestore] [Menu Option: Notifications] Live update: ${notifs.length} notifications loaded`);
        callback(notifs);
      }, (error) => {
        console.warn('[Firebase Firestore] [Menu Option: Notifications] Notifications subscription warning:', error);
      });
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: Notifications] Error subscribing to notifications:', error);
      return null;
    }
  },

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    if (!userId || !notificationId) return;
    try {
      console.log(`[Firebase Firestore] [Menu Option: Notifications] Marking notification ${notificationId} as read`);
      const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: Notifications] Error marking notification read:', error);
      throw error;
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    if (!userId) return;
    try {
      console.log(`[Firebase Firestore] [Menu Option: Notifications] Marking all notifications as read for user ${userId}`);
      const notifRef = collection(db, 'users', userId, 'notifications');
      const q = query(notifRef, where('read', '==', false));
      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs.map(d => 
        updateDoc(doc(db, 'users', userId, 'notifications', d.id), { read: true })
      );
      await Promise.all(updatePromises);
      console.log(`[Firebase Firestore] [Menu Option: Notifications] Marked ${snapshot.docs.length} notifications as read.`);
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: Notifications] Error marking all notifications read:', error);
      throw error;
    }
  },

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    if (!userId || !notificationId) return;
    try {
      console.log(`[Firebase Firestore] [Menu Option: Notifications] Deleting notification ${notificationId}`);
      const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
      await deleteDoc(notifRef);
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: Notifications] Error deleting notification:', error);
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
        console.log(`[Firebase Firestore] [Menu Option: Notifications] Adding notification ${id} ("${newNotif.title}") for user ${userId}`);
        const notifRef = doc(db, 'users', userId, 'notifications', id);
        await setDoc(notifRef, newNotif);
      } catch (error) {
        console.error('[Firebase Firestore] [Menu Option: Notifications] Error saving notification to Firestore:', error);
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
      console.log(`[Firebase Storage] [Menu Option: User Profile] Uploading avatar image for user ${userId}`);
      const avatarRef = ref(storage, `users/${userId}/avatar`);
      await uploadString(avatarRef, dataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(avatarRef);
      console.log(`[Firebase Storage] [Menu Option: User Profile] Avatar uploaded successfully: ${downloadUrl}`);
      return downloadUrl;
    } catch (error) {
      console.warn('[Firebase Storage] [Menu Option: User Profile] Avatar upload fallback to data URL:', error);
      return dataUrl;
    }
  },

  async getProfile(userId: string): Promise<User | null> {
    if (!userId) return null;
    try {
      console.log(`[Firebase Firestore] [Menu Option: User Profile / Theme] Fetching user profile document for ${userId}`);
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        console.log(`[Firebase Firestore] [Menu Option: User Profile / Theme] User profile found for ${userId}`);
        return { id: snap.id, ...snap.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: User Profile] Error fetching profile:', error);
      return null;
    }
  },

  async updateProfile(userId: string, data: Partial<User>): Promise<void> {
    if (!userId) return;
    try {
      console.log(`[Firebase Firestore] [Menu Option: User Profile / Theme] Updating profile in Firestore for user ${userId}`, data);
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
      console.log(`[Firebase Firestore] [Menu Option: User Profile / Theme] Profile updated successfully for ${userId}`);
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: User Profile] Error updating profile:', error);
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
      console.log(`[Firebase Firestore] [Menu Option: System Settings] Fetching system settings preferences for user ${userId}`);
      const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        console.log(`[Firebase Firestore] [Menu Option: System Settings] System settings loaded for ${userId}`);
        return snap.data();
      }
      return null;
    } catch (error) {
      console.warn('[Firebase Firestore] [Menu Option: System Settings] Error fetching user settings:', error);
      return null;
    }
  },

  async saveSettings(userId: string, settingsData: any): Promise<void> {
    if (!userId) return;
    try {
      console.log(`[Firebase Firestore] [Menu Option: System Settings] Saving system settings preferences for user ${userId}`, settingsData);
      const payload = sanitizePayload({
        ...settingsData,
        updatedAt: new Date().toISOString(),
      });
      const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
      await setDoc(settingsRef, payload, { merge: true });
      console.log(`[Firebase Firestore] [Menu Option: System Settings] System settings saved successfully for ${userId}`);
    } catch (error) {
      console.error('[Firebase Firestore] [Menu Option: System Settings] Error saving user settings:', error);
      throw error;
    }
  }
};

