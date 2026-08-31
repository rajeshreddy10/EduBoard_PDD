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

export const historyService = {
  /**
   * Get all history records for a user from Firestore
   */
  async getHistory(userId: string): Promise<Board[]> {
    if (!userId) return [];
    try {
      const historyRef = collection(db, 'users', userId, 'history');
      const q = query(historyRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Also check top-level boards collection if user has legacy boards
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

  /**
   * Subscribe to real-time history changes for a user
   */
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

  /**
   * Get a single history item by ID
   */
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

  /**
   * Create or save a history record in Firestore
   */
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

      // Also sync to top-level boards collection for backward compatibility
      const topLevelRef = doc(db, 'boards', item.id);
      await setDoc(topLevelRef, payload, { merge: true });
    } catch (error) {
      console.error('Error saving history item to Firestore:', error);
      throw error;
    }
  },

  /**
   * Update an existing history item
   */
  async updateHistoryItem(userId: string, historyId: string, updates: Partial<Board>): Promise<void> {
    if (!userId || !historyId) return;
    try {
      const payload = sanitizePayload({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      const historyDocRef = doc(db, 'users', userId, 'history', historyId);
      await updateDoc(historyDocRef, payload);

      // Sync top-level board doc if it exists
      try {
        const topLevelRef = doc(db, 'boards', historyId);
        await updateDoc(topLevelRef, payload);
      } catch {
        // Ignore top-level sync error if doc doesn't exist
      }
    } catch (error) {
      console.error('Error updating history item in Firestore:', error);
      throw error;
    }
  },

  /**
   * Delete a history item
   */
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

  /**
   * Save a snapshot version of a board in Firestore
   */
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

      // Store in users/{userId}/history/{boardId}/versions/{versionId}
      const userVersionRef = doc(db, 'users', userId, 'history', boardId, 'versions', versionId);
      await setDoc(userVersionRef, payload);

      // Store in top-level boards/{boardId}/versions/{versionId}
      const topVersionRef = doc(db, 'boards', boardId, 'versions', versionId);
      await setDoc(topVersionRef, payload);

      return versionId;
    } catch (error) {
      console.warn('Error saving board version snapshot:', error);
      return '';
    }
  }
};

export const notificationService = {
  /**
   * Get user notifications from Firestore
   */
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

  /**
   * Subscribe to real-time notification updates
   */
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

  /**
   * Mark a notification as read
   */
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

  /**
   * Mark all notifications as read
   */
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

  /**
   * Delete a notification
   */
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

  /**
   * Add a new notification for a user
   */
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

export const userProfileService = {
  async uploadAvatar(userId: string, dataUrl: string): Promise<string> {
    if (!userId || !dataUrl) return dataUrl;
    if (!dataUrl.startsWith('data:')) return dataUrl; // Already a URL

    try {
      const avatarRef = ref(storage, `users/${userId}/avatar`);
      await uploadString(avatarRef, dataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(avatarRef);
      return downloadUrl;
    } catch (error) {
      console.warn('Firebase Storage avatar upload fallback (using base64 inline):', error);
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

      // Upload avatar to Firebase Storage if provided as data URL
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

export const classroomService = {
  async getClassrooms(): Promise<any[]> {
    try {
      const roomsRef = collection(db, 'classrooms');
      const snapshot = await getDocs(query(roomsRef, orderBy('createdAt', 'desc')));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.warn('Error fetching classrooms from Firestore:', error);
      return [];
    }
  },

  subscribeToClassrooms(callback: (rooms: any[]) => void): Unsubscribe | null {
    try {
      const roomsRef = collection(db, 'classrooms');
      return onSnapshot(roomsRef, (snapshot) => {
        const rooms = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(rooms);
      }, (error) => {
        console.warn('Classroom subscription warning:', error);
      });
    } catch (error) {
      console.error('Failed to setup classroom listener:', error);
      return null;
    }
  },

  async createClassroom(userId: string, roomData: { name: string; subject: string; maxStudents: number; teacherName: string }): Promise<any> {
    const id = `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const payload = sanitizePayload({
      id,
      code,
      name: roomData.name,
      subject: roomData.subject || 'General',
      teacherName: roomData.teacherName || 'Educator',
      createdBy: userId,
      studentCount: 1,
      maxStudents: roomData.maxStudents || 30,
      isLive: true,
      color,
      lastActivity: 'Just now',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      await setDoc(doc(db, 'classrooms', id), payload);
      if (userId) {
        await setDoc(doc(db, 'users', userId, 'classrooms', id), payload);
      }
      return payload;
    } catch (error) {
      console.error('Error creating classroom in Firestore:', error);
      throw error;
    }
  },

  async joinClassroom(userId: string, code: string): Promise<any | null> {
    try {
      const roomsRef = collection(db, 'classrooms');
      const q = query(roomsRef, where('code', '==', code.toUpperCase().trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const roomDoc = snapshot.docs[0];
      const roomData = roomDoc.data();
      const newCount = (roomData.studentCount || 0) + 1;

      await updateDoc(doc(db, 'classrooms', roomDoc.id), {
        studentCount: newCount,
        lastActivity: 'Just now',
      });

      if (userId) {
        await setDoc(doc(db, 'users', userId, 'joinedClassrooms', roomDoc.id), {
          ...roomData,
          joinedAt: new Date().toISOString(),
        });
      }

      return { id: roomDoc.id, ...roomData, studentCount: newCount };
    } catch (error) {
      console.error('Error joining classroom:', error);
      throw error;
    }
  }
};

export const cloudStorageService = {
  subscribeToUserFiles(userId: string, callback: (files: any[]) => void): Unsubscribe | null {
    if (!userId) return null;
    try {
      const filesRef = collection(db, 'users', userId, 'cloudFiles');
      const q = query(filesRef, orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const files = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(files);
      }, (error) => {
        console.warn('Cloud files subscription warning:', error);
      });
    } catch (error) {
      console.error('Failed to setup cloud files listener:', error);
      return null;
    }
  },

  async uploadFile(userId: string, file: File, type: 'board' | 'image' | 'export' | 'recording'): Promise<any> {
    if (!userId || !file) throw new Error('Missing parameters for upload');

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const storagePath = `users/${userId}/files/${fileId}_${file.name}`;
    
    // For browser environment, upload string or dataUrl as robust fallback if uploadBytes fails
    let downloadUrl = '';
    try {
      const fileRef = ref(storage, storagePath);
      const reader = new FileReader();
      
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await uploadString(fileRef, dataUrl, 'data_url');
      downloadUrl = await getDownloadURL(fileRef);
    } catch (storageErr) {
      console.warn('Storage upload fallback warning:', storageErr);
      downloadUrl = '';
    }

    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const fileDoc = sanitizePayload({
      id: fileId,
      name: file.name,
      type,
      size: formatSize(file.size),
      sizeBytes: file.size,
      mimeType: file.type,
      downloadUrl,
      storagePath,
      createdBy: userId,
      updatedAt: 'Just now',
      createdAt: new Date().toISOString(),
    });

    try {
      await setDoc(doc(db, 'users', userId, 'cloudFiles', fileId), fileDoc);
      return fileDoc;
    } catch (err) {
      console.error('Error saving cloud file document:', err);
      throw err;
    }
  },

  async deleteFile(userId: string, fileId: string): Promise<void> {
    if (!userId || !fileId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'cloudFiles', fileId));
    } catch (error) {
      console.error('Error deleting cloud file metadata:', error);
      throw error;
    }
  }
};

export const supportService = {
  async submitFeedback(userId: string, data: { rating?: number; feedback: string; email?: string }): Promise<void> {
    try {
      const docId = `fb_${Date.now()}`;
      await setDoc(doc(db, 'feedback', docId), sanitizePayload({
        id: docId,
        userId: userId || 'anonymous',
        rating: data.rating || 5,
        feedback: data.feedback,
        email: data.email || '',
        createdAt: serverTimestamp(),
      }));
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },

  async submitSupportTicket(userId: string, data: { name: string; email: string; subject: string; message: string }): Promise<void> {
    try {
      const ticketId = `ticket_${Date.now()}`;
      await setDoc(doc(db, 'support_tickets', ticketId), sanitizePayload({
        id: ticketId,
        userId: userId || 'anonymous',
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        status: 'open',
        createdAt: serverTimestamp(),
      }));
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      throw error;
    }
  }
};

