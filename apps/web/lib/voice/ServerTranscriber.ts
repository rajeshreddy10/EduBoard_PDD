'use client';

import { LangCode } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ServerSTTConfig {
  language: LangCode;
  chunkIntervalMs: number;
  minChunkLengthMs: number;
  maxChunkLengthMs: number;
  silenceThresholdMs: number;
  formatResponse: boolean;
  task: 'transcribe' | 'translate';
}

export interface ServerSTTResult {
  success: boolean;
  transcript: string;
  processed: string;
  confidence: number;
  language: string;
  durationMs: number;
  wordCount: number;
  isFinal: boolean;
  error?: string;
}

export type ServerSTTStatus = 'idle' | 'recording' | 'sending' | 'processing' | 'error';

export type ServerSTTListener = (event: string, data?: any) => void;

export class ServerTranscriber {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private status: ServerSTTStatus = 'idle';
  private listeners: Set<ServerSTTListener> = new Set();
  private chunkTimer: NodeJS.Timeout | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private lastChunkTime = 0;
  private config: ServerSTTConfig;
  private consecutiveErrors = 0;
  private totalAudioDuration = 0;

  constructor(config?: Partial<ServerSTTConfig>) {
    this.config = {
      language: 'en',
      chunkIntervalMs: 3000,
      minChunkLengthMs: 500,
      maxChunkLengthMs: 15000,
      silenceThresholdMs: 1500,
      formatResponse: true,
      task: 'transcribe',
      ...config,
    };
  }

  subscribe(listener: ServerSTTListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: string, data?: any) {
    this.listeners.forEach(l => l(event, data));
  }

  getStatus(): ServerSTTStatus {
    return this.status;
  }

  getTotalAudioDuration(): number {
    return this.totalAudioDuration;
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    if (typeof MediaRecorder === 'undefined') return false;
    try { return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'); } catch { return false; }
  }

  async start(): Promise<boolean> {
    if (this.status === 'recording') return true;
    if (typeof window === 'undefined') return false;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });

      const mimeType = this.getSupportedMimeType();
      if (!mimeType) {
        this.status = 'error';
        this.notify('error', { message: 'No supported audio MIME type found' });
        return false;
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });

      this.audioChunks = [];
      this.consecutiveErrors = 0;
      this.totalAudioDuration = 0;
      this.lastChunkTime = Date.now();

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.status = 'recording';
        this.notify('statusChanged', 'recording');
        this.startChunkTimer();
      };

      this.mediaRecorder.onstop = () => {
        this.stopChunkTimer();
        this.flushAudio();
        this.cleanup();
      };

      this.mediaRecorder.onerror = (event: Event) => {
        const err = (event as any).error;
        this.status = 'error';
        this.notify('error', { message: err?.message || 'MediaRecorder error' });
        this.cleanup();
      };

      this.mediaRecorder.start(250);
      return true;
    } catch (err: any) {
      this.status = 'error';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.notify('error', { message: 'Microphone access denied' });
      } else if (err.name === 'NotFoundError') {
        this.notify('error', { message: 'No microphone found' });
      } else {
        this.notify('error', { message: err.message || 'Failed to start recording' });
      }
      this.cleanup();
      return false;
    }
  }

  stop() {
    this.stopChunkTimer();
    this.status = 'idle';
    this.notify('statusChanged', 'idle');

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    } else {
      this.cleanup();
    }
  }

  private cleanup() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  private getSupportedMimeType(): string | null {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return null;
  }

  private startChunkTimer() {
    this.chunkTimer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.lastChunkTime;

      if (elapsed >= this.config.chunkIntervalMs && this.audioChunks.length > 0) {
        this.flushAudio();
        this.lastChunkTime = now;
      }
    }, 500);
  }

  private stopChunkTimer() {
    if (this.chunkTimer) {
      clearInterval(this.chunkTimer);
      this.chunkTimer = null;
    }
  }

  private async flushAudio() {
    if (this.audioChunks.length === 0) return;

    const chunks = [...this.audioChunks];
    this.audioChunks = [];

    const blob = new Blob(chunks);

    if (blob.size < 1024) return;

    this.status = 'sending';
    this.notify('statusChanged', 'sending');

    try {
      const result = await this.sendAudioToServer(blob);
      this.consecutiveErrors = 0;

      if (result.success) {
        this.totalAudioDuration += result.durationMs || 0;
        this.notify('interimResult', {
          transcript: result.transcript,
          processed: result.processed,
          isFinal: false,
          confidence: result.confidence,
        });
      }
    } catch (err: any) {
      this.consecutiveErrors++;
      this.notify('error', { message: err.message || 'Transcription failed' });

      if (this.consecutiveErrors >= 3) {
        this.notify('error', { message: 'Server unreachable after 3 attempts. Consider using browser STT.' });
      }
    } finally {
      if (this.status === 'sending') {
        this.status = 'recording';
        this.notify('statusChanged', 'recording');
      }
    }
  }

  private async sendAudioToServer(blob: Blob): Promise<ServerSTTResult> {
    const mimeType = blob.type || 'audio/webm';
    const reader = new FileReader();

    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read audio blob'));
      reader.readAsDataURL(blob);
    });

    const base64Audio = await base64Promise;

    const body = JSON.stringify({
      audio: base64Audio,
      language: this.config.language,
      formatResponse: this.config.formatResponse,
      task: this.config.task,
      temperature: 0,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${API_BASE}/voice/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          transcript: '',
          processed: '',
          confidence: 0,
          language: this.config.language,
          durationMs: 0,
          wordCount: 0,
          isFinal: false,
          error: data.error || `Server responded with ${response.status}`,
        };
      }

      return {
        success: true,
        transcript: data.transcript || '',
        processed: data.processed || data.transcript || '',
        confidence: data.confidence || 0,
        language: data.language || this.config.language,
        durationMs: data.durationMs || 0,
        wordCount: data.wordCount || 0,
        isFinal: true,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, transcript: '', processed: '', confidence: 0, language: this.config.language, durationMs: 0, wordCount: 0, isFinal: false, error: 'Request timed out' };
      }
      return { success: false, transcript: '', processed: '', confidence: 0, language: this.config.language, durationMs: 0, wordCount: 0, isFinal: false, error: err.message || 'Network error' };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async flush(): Promise<ServerSTTResult | null> {
    if (this.audioChunks.length === 0) return null;

    const chunks = [...this.audioChunks];
    this.audioChunks = [];
    const blob = new Blob(chunks);

    if (blob.size < 512) return null;

    this.status = 'processing';
    this.notify('statusChanged', 'processing');

    try {
      const result = await this.sendAudioToServer(blob);
      if (result.success) {
        this.totalAudioDuration += result.durationMs || 0;
      }
      return result;
    } catch (err: any) {
      this.notify('error', { message: err.message });
      return null;
    } finally {
      this.status = 'idle';
      this.notify('statusChanged', 'idle');
    }
  }

  setLanguage(language: LangCode) {
    this.config.language = language;
  }

  destroy() {
    this.stop();
    this.listeners.clear();
    this.audioChunks = [];
    this.totalAudioDuration = 0;
  }
}
