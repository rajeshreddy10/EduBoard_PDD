import { encryption } from './Encryption';

export interface Version {
  id: string;
  boardId: string;
  data: any;
  timestamp: number;
  checksum: string;
  size: number;
  userId: string;
}

export interface SyncQueueItem {
  id: string;
  boardId: string;
  action: 'update' | 'delete' | 'create';
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

interface SyncStatus {
  lastSynced: number | null;
  pendingCount: number;
  totalVersions: number;
  storageUsed: number;
  isOnline: boolean;
  isAutoSaveEnabled: boolean;
  isEncryptionEnabled: boolean;
}

const STORAGE_KEYS = {
  versions: 'sync_versions',
  queue: 'sync_queue',
  syncSettings: 'sync_settings',
  encryptionKey: 'sync_encryption_key',
  lastSynced: 'sync_last_synced',
};

function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function set(key: string, value: any) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function estimateSize(data: any): number {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return new Blob([str]).size;
}

export class SyncEngine {
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private _isAutoSaveEnabled: boolean = true;
  private _isEncryptionEnabled: boolean = false;
  private encryptionKey: string = '';
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private _maxVersionsPerBoard: number = 50;

  constructor() {
    if (typeof window !== 'undefined') {
      const settings = get(STORAGE_KEYS.syncSettings, { autoSave: true, encryption: false });
      this._isAutoSaveEnabled = settings.autoSave;
      this._isEncryptionEnabled = settings.encryption;
      this.encryptionKey = get(STORAGE_KEYS.encryptionKey, '');
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }

  private handleStorageEvent(e: StorageEvent) {
    if (e.key && e.key.startsWith('sync_')) {
      const boardId = e.key.replace('sync_', '');
      const listeners = this.listeners.get(boardId);
      if (listeners) {
        const data = e.newValue ? JSON.parse(e.newValue) : null;
        listeners.forEach(cb => cb(data));
      }
    }
  }

  onBoardChange(boardId: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(boardId)) {
      this.listeners.set(boardId, new Set());
    }
    this.listeners.get(boardId)!.add(callback);
    return () => {
      this.listeners.get(boardId)?.delete(callback);
    };
  }

  async save(boardId: string, data: any, userId: string = 'u1'): Promise<Version> {
    let processedData = data;
    let checksum = await encryption.getChecksum(data);

    if (this._isEncryptionEnabled && this.encryptionKey) {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      processedData = await encryption.encrypt(dataStr, this.encryptionKey);
      checksum = await encryption.getChecksum(processedData);
    }

    const version: Version = {
      id: genId(),
      boardId,
      data: processedData,
      timestamp: Date.now(),
      checksum,
      size: estimateSize(processedData),
      userId,
    };

    const versions = this.getVersions(boardId);
    versions.unshift(version);

    if (versions.length > this._maxVersionsPerBoard) {
      versions.length = this._maxVersionsPerBoard;
    }

    const allVersions = get<Record<string, Version[]>>(STORAGE_KEYS.versions, {});
    allVersions[boardId] = versions;
    set(STORAGE_KEYS.versions, allVersions);

    const queue = this.getPendingChanges();
    const pendingIdx = queue.findIndex(q => q.boardId === boardId && q.status === 'pending');
    if (pendingIdx >= 0) {
      queue[pendingIdx] = {
        ...queue[pendingIdx],
        data: processedData,
        timestamp: Date.now(),
        retryCount: 0,
      };
    } else {
      queue.push({
        id: genId(),
        boardId,
        action: 'update',
        data: processedData,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
      });
    }
    set(STORAGE_KEYS.queue, queue);

    const listeners = this.listeners.get(boardId);
    if (listeners) {
      listeners.forEach(cb => cb(version));
    }

    return version;
  }

  async load(boardId: string): Promise<{ data: any; version: Version | null }> {
    const versions = this.getVersions(boardId);
    if (versions.length === 0) return { data: null, version: null };

    const latest = versions[0];
    let data = latest.data;

    if (this._isEncryptionEnabled && this.encryptionKey) {
      try {
        const decrypted = await encryption.decrypt(data, this.encryptionKey);
        data = JSON.parse(decrypted);
      } catch {
        data = latest.data;
      }
    }

    return { data, version: latest };
  }

  getVersionHistory(boardId: string): Version[] {
    return this.getVersions(boardId);
  }

  async restoreVersion(boardId: string, versionId: string): Promise<Version | null> {
    const versions = this.getVersions(boardId);
    const version = versions.find(v => v.id === versionId);
    if (!version) return null;

    const restored: Version = {
      ...version,
      id: genId(),
      timestamp: Date.now(),
    };

    versions.unshift(restored);
    if (versions.length > this._maxVersionsPerBoard) {
      versions.length = this._maxVersionsPerBoard;
    }

    const allVersions = get<Record<string, Version[]>>(STORAGE_KEYS.versions, {});
    allVersions[boardId] = versions;
    set(STORAGE_KEYS.versions, allVersions);

    return restored;
  }

  getPendingChanges(): SyncQueueItem[] {
    return get<SyncQueueItem[]>(STORAGE_KEYS.queue, []);
  }

  async sync(): Promise<{ synced: number; failed: number }> {
    const queue = this.getPendingChanges();
    let synced = 0;
    let failed = 0;

    const updatedQueue: SyncQueueItem[] = [];
    for (const item of queue) {
      if (item.status === 'completed') {
        updatedQueue.push(item);
        continue;
      }

      const syncingItem: SyncQueueItem = { ...item, status: 'syncing' };
      try {
        await this.processSyncItem(syncingItem);
        updatedQueue.push({ ...syncingItem, status: 'completed', retryCount: item.retryCount + 1 });
        synced++;
      } catch {
        const retryItem: SyncQueueItem = {
          ...syncingItem,
          status: item.retryCount >= 5 ? 'failed' : 'pending',
          retryCount: item.retryCount + 1,
        };
        updatedQueue.push(retryItem);
        failed++;
      }
    }

    set(STORAGE_KEYS.queue, updatedQueue.filter(q => q.status !== 'completed'));
    set(STORAGE_KEYS.lastSynced, Date.now());

    return { synced, failed };
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (Math.random() > 0.95) throw new Error('Simulated sync failure');
  }

  clearPendingChange(id: string) {
    const queue = this.getPendingChanges();
    set(STORAGE_KEYS.queue, queue.filter(q => q.id !== id));
  }

  clearAllPending() {
    set(STORAGE_KEYS.queue, []);
  }

  getSyncStatus(): SyncStatus {
    const pending = this.getPendingChanges();
    const versions = get<Record<string, Version[]>>(STORAGE_KEYS.versions, {});
    let totalVersions = 0;
    let storageUsed = 0;
    for (const boardId in versions) {
      totalVersions += versions[boardId].length;
      for (const v of versions[boardId]) {
        storageUsed += v.size;
      }
    }

    return {
      lastSynced: get<number | null>(STORAGE_KEYS.lastSynced, null),
      pendingCount: pending.filter(p => p.status === 'pending' || p.status === 'failed').length,
      totalVersions,
      storageUsed,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isAutoSaveEnabled: this._isAutoSaveEnabled,
      isEncryptionEnabled: this._isEncryptionEnabled,
    };
  }

  enableAutoSave(enabled: boolean) {
    this._isAutoSaveEnabled = enabled;
    if (!enabled) {
      this.autoSaveTimers.forEach(timer => clearTimeout(timer));
      this.autoSaveTimers.clear();
    }
    this.saveSettings();
  }

  enableEncryption(enabled: boolean) {
    this._isEncryptionEnabled = enabled;
    this.saveSettings();
  }

  async setEncryptionKey(key: string) {
    this.encryptionKey = key;
    set(STORAGE_KEYS.encryptionKey, key);
  }

  async generateEncryptionKey(): Promise<string> {
    const key = await encryption.generateKey();
    this.encryptionKey = key;
    set(STORAGE_KEYS.encryptionKey, key);
    return key;
  }

  clearEncryptionKey() {
    this.encryptionKey = '';
    localStorage.removeItem(STORAGE_KEYS.encryptionKey);
  }

  getEncryptionKey(): string {
    return this.encryptionKey;
  }

  autoSave(boardId: string, data: any, userId?: string): void {
    if (!this._isAutoSaveEnabled) return;
    const existing = this.autoSaveTimers.get(boardId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.save(boardId, data, userId);
      this.autoSaveTimers.delete(boardId);
    }, 2000);
    this.autoSaveTimers.set(boardId, timer);
  }

  cancelAutoSave(boardId: string): void {
    const timer = this.autoSaveTimers.get(boardId);
    if (timer) { clearTimeout(timer); this.autoSaveTimers.delete(boardId); }
  }

  private getVersions(boardId: string): Version[] {
    const all = get<Record<string, Version[]>>(STORAGE_KEYS.versions, {});
    return all[boardId] || [];
  }

  private saveSettings() {
    set(STORAGE_KEYS.syncSettings, {
      autoSave: this._isAutoSaveEnabled,
      encryption: this._isEncryptionEnabled,
    });
  }

  getStorageBreakdown(): { boards: number; drawings: number; settings: number; cache: number } {
    const estimate = (key: string) => {
      const val = localStorage.getItem(key);
      return val ? new Blob([val]).size : 0;
    };
    return {
      boards: estimate('sbb_boards') + estimate('sbb_drawings'),
      drawings: estimate('sbb_drawings'),
      settings: estimate('sbb_settings') + estimate(STORAGE_KEYS.syncSettings),
      cache: estimate('sbb_chat_history') + estimate('sbb_activities'),
    };
  }

  clearCache() {
    const cacheKeys = ['sbb_chat_history', 'sbb_activities', 'sbb_notifications'];
    cacheKeys.forEach(k => localStorage.removeItem(k));
    const versions = get<Record<string, Version[]>>(STORAGE_KEYS.versions, {});
    for (const boardId in versions) {
      if (versions[boardId].length > 10) {
        versions[boardId] = versions[boardId].slice(0, 10);
      }
    }
    set(STORAGE_KEYS.versions, versions);
  }

  exportAllData(): string {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    return JSON.stringify(data, null, 2);
  }

  async restoreFromBackup(jsonData: string): Promise<number> {
    try {
      const data = JSON.parse(jsonData);
      let count = 0;
      for (const key in data) {
        if (key.startsWith('sbb_') || key.startsWith('sync_')) {
          localStorage.setItem(key, JSON.stringify(data[key]));
          count++;
        }
      }
      return count;
    } catch {
      throw new Error('Invalid backup data');
    }
  }
}

export const syncEngine = new SyncEngine();
