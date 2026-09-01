/**
 * EduBoard API Client
 *
 * Provides a unified interface for interacting with the backend services,
 * with built-in support for authentication, offline fallback via local store,
 * and automatic token refreshing.
 *
 * @module api
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { auth } from './firebase';
import {
  LoginRequest, SignupRequest, AuthResponse, User,
  Board, UserSettings, UserProfile, UsageStats,
  SharedBoard, BoardActivity,
} from './types';
import * as store from './store';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:3001/api`;
  }
  return 'http://localhost:3001/api';
};

class EduBoardAPI {
  private client: AxiosInstance;

  private normalizeBoard(payload: any): Board {
    const createdAt = payload?.created_at || payload?.createdAt || new Date().toISOString();
    const updatedAt = payload?.updated_at || payload?.updatedAt || createdAt;

    return {
      id: payload?.id || payload?._id || '',
      title: payload?.title || 'Untitled Board',
      description: payload?.description || '',
      createdAt,
      updatedAt,
      createdBy: payload?.owner_id || payload?.createdBy || 'me',
      isShared: Boolean(payload?.is_shared || payload?.isShared || payload?.collaborator_count),
      sharedWith: payload?.sharedWith || [],
      content: payload?.content || '',
      thumbnail: payload?.thumbnail || '',
      bgColor: payload?.background_color || payload?.bgColor || '#ffffff',
      width: payload?.width || 1920,
      height: payload?.height || 1080,
      zoom: payload?.zoom || 1,
      isInfiniteCanvas: Boolean(payload?.is_infinite_canvas ?? payload?.isInfiniteCanvas ?? true),
      tags: payload?.tags || [],
      folder: payload?.folder || '',
    };
  }

  constructor() {
    this.client = axios.create({
      baseURL: getApiBaseUrl(),
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000, // 30s for AI operations
    });

    this.client.interceptors.request.use(async (config) => {
      // Dynamically update baseURL if on client-side
      if (typeof window !== 'undefined' && config.baseURL?.includes('localhost') && window.location.hostname !== 'localhost') {
        config.baseURL = `http://${window.location.hostname}:3001/api`;
      }
      // Get the latest Firebase ID token automatically
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // 401 interceptor - Firebase usually handles refresh, so we just catch auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
           // Optional: Trigger global logout or re-auth if needed
        }
        return Promise.reject(error);
      }
    );
  }

  private async offlineFallback<T>(fallback: () => T): Promise<T> {
    return Promise.resolve(fallback());
  }

  // Auth methods now primarily for backward compatibility or backend profile sync
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Note: Use Firebase SDK directly in AuthContext for best results
    const response = await this.client.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', {
      email: data.email,
      password: data.password,
      fullName: data.name,
      name: data.name,
      role: data.role || 'student',
    });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    } finally {
      store.logout();
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.client.get<User>('/auth/me');
      return response.data;
    } catch {
      const u = store.getUser();
      if (u) return u;
      throw new Error('Not authenticated');
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const response = await this.client.post('/auth/verify-email', { token });
      return response.data;
    } catch {
      return { message: 'Email verified (offline mode)' };
    }
  }

  async resetPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await this.client.post('/auth/forgot-password', { email });
      return response.data;
    } catch {
      return { message: 'If that email exists, a reset link has been sent.' };
    }
  }

  async confirmPasswordReset(token: string, password: string): Promise<{ message: string }> {
    try {
      const response = await this.client.post('/auth/reset-password', { token, password });
      return response.data;
    } catch {
      return { message: 'Password reset successfully (offline mode)' };
    }
  }

  // ── Board Endpoints with offline fallback ──

  async createBoard(data: Partial<Board>): Promise<Board> {
    try {
      const response = await this.client.post<any>('/whiteboards', data);
      return this.normalizeBoard({ ...response.data, ...(data || {}) });
    } catch {
      return store.createBoard(data);
    }
  }

  async getBoards(): Promise<Board[]> {
    try {
      const response = await this.client.get<any>('/whiteboards');
      const payload = Array.isArray(response.data) ? response.data : response.data?.whiteboards || [];
      return payload.map((item: any) => this.normalizeBoard(item));
    } catch {
      return store.getBoards();
    }
  }

  async getBoard(id: string): Promise<Board> {
    try {
      const response = await this.client.get<any>(`/whiteboards/${id}`);
      return this.normalizeBoard(response.data);
    } catch {
      const board = store.getBoard(id);
      if (!board) throw new Error('Board not found');
      return board;
    }
  }

  async updateBoard(id: string, data: Partial<Board>): Promise<Board> {
    try {
      const response = await this.client.put<any>(`/whiteboards/${id}`, data);
      return this.normalizeBoard({ ...response.data, ...(data || {}) });
    } catch {
      const updated = store.updateBoard(id, data);
      if (!updated) throw new Error('Board not found');
      return updated;
    }
  }

  async deleteBoard(id: string): Promise<{ message: string }> {
    try {
      const response = await this.client.delete(`/whiteboards/${id}`);
      return response.data;
    } catch {
      store.deleteBoard(id);
      return { message: 'Board deleted' };
    }
  }

  async shareBoard(boardId: string, emails: string[], permission: 'view' | 'edit' | 'admin'): Promise<{ message: string }> {
    try {
      const response = await this.client.post(`/whiteboards/${boardId}/share`, { emails, permission });
      return response.data;
    } catch {
      return { message: 'Board shared (offline)' };
    }
  }

  async getSharedBoards(): Promise<SharedBoard[]> {
    try {
      const response = await this.client.get<SharedBoard[]>('/whiteboards/shared');
      return response.data;
    } catch {
      return [];
    }
  }

  async getBoardActivity(boardId: string): Promise<BoardActivity[]> {
    try {
      const response = await this.client.get<BoardActivity[]>(`/whiteboards/${boardId}/activity`);
      return response.data;
    } catch {
      return [];
    }
  }

  async exportBoard(boardId: string, format: 'pdf' | 'png' | 'json'): Promise<Blob> {
    const response = await this.client.get(`/whiteboards/${boardId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  // ── Profile Endpoints ──

  async getProfile(): Promise<UserProfile> {
    try {
      const response = await this.client.get<UserProfile>('/profile');
      return response.data;
    } catch {
      throw new Error('Profile unavailable offline');
    }
  }

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.client.put<UserProfile>('/profile', data);
    return response.data;
  }

  async uploadAvatar(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post<{ url: string }>('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // ── Settings Endpoints ──

  async getSettings(): Promise<UserSettings> {
    try {
      const response = await this.client.get<UserSettings>('/settings');
      return response.data;
    } catch {
      return store.getSettings();
    }
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const response = await this.client.put<UserSettings>('/settings', settings);
      return response.data;
    } catch {
      return store.updateSettings(settings);
    }
  }

  // ── Error handling ──

  getErrorMessage(error: AxiosError<any>): string {
    if (error.response?.data?.message) return error.response.data.message;
    if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
      return 'Backend server unavailable. Running in offline mode.';
    }
    if (error.message) return error.message;
    return 'An error occurred';
  }
}

export const api = new EduBoardAPI();
