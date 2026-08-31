'use client';

import { LangCode } from '@/lib/i18n';
import { ServerTranscriber, ServerSTTResult } from './ServerTranscriber';

export interface VoiceConfig {
  language: LangCode;
  continuous: boolean;
  interimResults: boolean;
  autoPunctuation: boolean;
  autoFormat: boolean;
  silenceTimeout: number;
  confidence: number;
  commandsEnabled: boolean;
  useServerSTT: boolean;
  serverOnly: boolean;
  chunkIntervalMs: number;
}

export interface VoiceResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  language: string;
  timestamp: number;
  processed?: string;
  source?: 'browser' | 'server';
}

export interface FormattedText {
  original: string;
  formatted: string;
  corrections: { original: string; corrected: string; type: string }[];
}

export type VoiceListener = (event: string, data?: any) => void;
export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    SpeechGrammarList: any;
    webkitSpeechGrammarList: any;
  }
}

const PUNCTUATION_MAP: Record<string, string> = {
  'period': '.',
  'dot': '.',
  'point': '.',
  'full stop': '.',
  'comma': ',',
  'question mark': '?',
  'question': '?',
  'exclamation mark': '!',
  'exclamation point': '!',
  'exclamation': '!',
  'new line': '\n',
  'new paragraph': '\n\n',
  'colon': ':',
  'semicolon': ';',
  'apostrophe': "'",
  'quote': '"',
  'open quote': '"',
  'close quote': '"',
  'dash': '-',
  'hyphen': '-',
  'ellipsis': '...',
  'space': ' ',
};

const LANG_MAP: Record<LangCode, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  hi: 'hi-IN',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ko: 'ko-KR',
};

export class VoiceEngine {
  private recognition: any = null;
  private config: VoiceConfig;
  private status: VoiceStatus = 'idle';
  private listeners: Set<VoiceListener> = new Set();
  private silenceTimer: NodeJS.Timeout | null = null;
  private finalTranscripts: string[] = [];
  private interimTranscript = '';
  private isSpeaking = false;
  private serverTranscriber: ServerTranscriber;
  private browserSupported = false;
  private serverSupported = false;
  private pendingServerResults: ServerSTTResult[] = [];

  constructor(config?: Partial<VoiceConfig>) {
    this.config = {
      language: 'en',
      continuous: true,
      interimResults: true,
      autoPunctuation: true,
      autoFormat: true,
      silenceTimeout: 2000,
      confidence: 0.6,
      commandsEnabled: true,
      useServerSTT: true,
      serverOnly: false,
      chunkIntervalMs: 3000,
      ...config,
    };

    this.serverTranscriber = new ServerTranscriber({
      language: this.config.language,
      chunkIntervalMs: this.config.chunkIntervalMs,
      formatResponse: true,
    });

    if (typeof window !== 'undefined') {
      this.browserSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      this.serverSupported = this.serverTranscriber.isSupported();
    }

    this.serverTranscriber.subscribe((event, data) => {
      switch (event) {
        case 'statusChanged':
          if (data === 'recording') {
            this.status = 'listening';
            this.notify('statusChanged', 'listening');
          } else if (data === 'sending' || data === 'processing') {
            this.status = 'processing';
            this.notify('statusChanged', 'processing');
          }
          break;
        case 'interimResult':
          this.notify('interimResult', {
            transcript: data.transcript,
            processed: data.processed,
            isFinal: false,
            confidence: data.confidence,
            source: 'server',
          });
          break;
        case 'error':
          this.notify('error', { message: data.message, source: 'server' });
          break;
      }
    });
  }

  subscribe(listener: VoiceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: string, data?: any) {
    this.listeners.forEach(l => l(event, data));
  }

  getStatus(): VoiceStatus {
    return this.status;
  }

  getTranscript(): string {
    return this.finalTranscripts.join(' ');
  }

  getActiveSource(): 'browser' | 'server' | 'none' {
    if (this.status === 'listening' || this.status === 'processing') {
      if (this.recognition) return 'browser';
      if (this.serverTranscriber.getStatus() === 'recording' || this.serverTranscriber.getStatus() === 'sending') return 'server';
    }
    return 'none';
  }

  isSupported(): boolean {
    return this.browserSupported || this.serverSupported;
  }

  getCapabilities(): { browser: boolean; server: boolean } {
    return { browser: this.browserSupported, server: this.serverSupported };
  }

  async updateConfig(partial: Partial<VoiceConfig>) {
    const wasListening = this.status === 'listening';
    if (wasListening) await this.stop();
    this.config = { ...this.config, ...partial };
    this.serverTranscriber.setLanguage(this.config.language);
    if (wasListening) await this.start();
    this.notify('configChanged', this.config);
  }

  async start() {
    if (typeof window === 'undefined') return;
    if (this.status === 'listening') return;

    this.status = 'processing';
    this.notify('statusChanged', 'processing');

    if (this.config.serverOnly && this.serverSupported) {
      const ok = await this.startServerSTT();
      if (!ok) {
        this.status = 'error';
        this.notify('error', { message: 'Server STT failed to start' });
      }
      return;
    }

    if (this.config.useServerSTT && this.serverSupported) {
      const success = await this.startServerSTT();
      if (success) return;
      if (this.browserSupported) {
        this.startBrowserSTT();
        return;
      }
      this.status = 'error';
      this.notify('error', { message: 'Server STT failed and no browser STT available' });
      return;
    }

    if (this.browserSupported) {
      this.startBrowserSTT();
      return;
    }

    if (this.serverSupported) {
      const ok = await this.startServerSTT();
      if (!ok) {
        this.status = 'error';
        this.notify('error', { message: 'Server STT failed to start' });
      }
      return;
    }

    this.status = 'error';
    this.notify('error', { message: 'Speech recognition not supported in this browser and no server fallback available' });
  }

  private async startServerSTT(): Promise<boolean> {
    const success = await this.serverTranscriber.start();
    if (success) {
      this.status = 'listening';
      this.notify('statusChanged', 'listening');
    }
    return success;
  }

  private startBrowserSTT() {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        this.fallbackToServer();
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.lang = LANG_MAP[this.config.language] || 'en-US';
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        this.status = 'listening';
        this.notify('statusChanged', 'listening');
      };

      this.recognition.onresult = (event: any) => {
        this.interimTranscript = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;

          if (result.isFinal) {
            if (confidence < this.config.confidence && this.serverSupported) {
              continue;
            }
            finalText += transcript;
            this.handleFinalResult(transcript, confidence, i);
          } else {
            this.interimTranscript += transcript;
          }
        }

        this.notify('interimResult', {
          transcript: this.interimTranscript,
          isFinal: false,
          source: 'browser',
        });

        if (finalText) {
          const voiceResult: VoiceResult = {
            transcript: finalText,
            isFinal: true,
            confidence: 0.9,
            language: this.config.language,
            timestamp: Date.now(),
            source: 'browser',
          };
          this.notify('result', voiceResult);
        }

        this.resetSilenceTimer();
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return;
        if ((event.error === 'aborted' || event.error === 'audio-capture') && this.serverSupported) {
          this.fallbackToServer();
          return;
        }
        this.status = 'error';
        this.notify('error', { message: event.error, event });
      };

      this.recognition.onend = () => {
        if (this.status === 'listening') {
          try { this.recognition?.start(); } catch {}
        } else {
          this.status = 'idle';
          this.notify('statusChanged', 'idle');
        }
      };

      this.recognition.start();
    } catch (err: any) {
      if (this.serverSupported) {
        this.fallbackToServer();
      } else {
        this.status = 'error';
        this.notify('error', { message: err.message });
      }
    }
  }

  private async fallbackToServer() {
    this.notify('statusChanged', 'processing');
    this.notify('error', { message: 'Browser STT unavailable, switching to server mode', recoverable: true });
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
      this.recognition = null;
    }
    await this.startServerSTT();
  }

  async stop() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
      this.recognition = null;
    }

    if (this.serverTranscriber.getStatus() === 'recording' || this.serverTranscriber.getStatus() === 'sending') {
      await this.serverTranscriber.flush();
      this.serverTranscriber.stop();
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.status = 'idle';
    this.notify('statusChanged', 'idle');
  }

  async stopAndFlush(): Promise<ServerSTTResult | null> {
    let serverResult: ServerSTTResult | null = null;

    if (this.serverTranscriber.getStatus() === 'recording' || this.serverTranscriber.getStatus() === 'sending') {
      serverResult = await this.serverTranscriber.flush();
      this.serverTranscriber.stop();
    }

    this.stop();

    if (serverResult?.success) {
      const voiceResult: VoiceResult = {
        transcript: serverResult.processed || serverResult.transcript,
        isFinal: true,
        confidence: serverResult.confidence,
        language: serverResult.language,
        timestamp: Date.now(),
        processed: serverResult.processed,
        source: 'server',
      };
      this.notify('result', voiceResult);
    }

    return serverResult;
  }

  async toggle() {
    if (this.status === 'listening') await this.stop();
    else await this.start();
  }

  speak(text: string, language?: LangCode) {
    if (typeof window === 'undefined') return;
    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_MAP[language || this.config.language] || 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.status = 'speaking';
      this.notify('statusChanged', 'speaking');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.status = 'idle';
      this.notify('statusChanged', 'idle');
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.status = 'idle';
      this.notify('error', { message: 'Speech synthesis error' });
    };

    window.speechSynthesis.speak(utterance);
  }

  cancelSpeech() {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  private handleFinalResult(transcript: string, confidence: number, index: number) {
    if (confidence < this.config.confidence) return;

    let processed = transcript.trim();

    if (this.config.autoPunctuation) {
      processed = this.applyPunctuation(processed);
    }

    if (this.config.autoFormat) {
      processed = this.applyFormatting(processed);
    }

    const isCommand = this.detectAndHandleCommand(processed);
    if (isCommand) return;

    this.finalTranscripts.push(processed);
    this.notify('finalResult', {
      transcript: processed,
      original: transcript,
      confidence,
      timestamp: Date.now(),
      index,
      source: 'browser',
    });
  }

  private applyPunctuation(text: string): string {
    let result = text.toLowerCase();

    for (const [phrase, punct] of Object.entries(PUNCTUATION_MAP)) {
      const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
      result = result.replace(regex, punct);
    }

    result = result.replace(/\s+([.,!?:;])/g, '$1 ');
    result = result.replace(/(\d+)\s+(\d+)/g, '$1$2');

    let formatted = '';
    const sentences = result.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      formatted += trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + ' ';
    }

    return formatted.trim();
  }

  private applyFormatting(text: string): string {
    let result = text;

    result = result.replace(/\bi\b/g, 'I');
    result = result.replace(/\bim\b/g, "I'm");
    result = result.replace(/\bive\b/g, "I've");
    result = result.replace(/\bid\b/g, "I'd");
    result = result.replace(/\bll\b/g, "'ll");
    result = result.replace(/\b(\w+)ve\b/g, "$1've");
    result = result.replace(/\b(\w+)re\b/g, "$1're");
    result = result.replace(/\b(\w+)nt\b/g, "$1n't");
    result = result.replace(/\b(\w+)s\b(?=\s+(?:is|are|was|were|has|have|does|did|here|there))/g, "$1's");

    result = result.replace(/\bdont\b/g, "don't");
    result = result.replace(/\bcan't\b/g, "can't");
    result = result.replace(/\bwont\b/g, "won't");
    result = result.replace(/\bdidnt\b/g, "didn't");
    result = result.replace(/\bdoesnt\b/g, "doesn't");
    result = result.replace(/\bisnt\b/g, "isn't");
    result = result.replace(/\barent\b/g, "aren't");
    result = result.replace(/\bwasnt\b/g, "wasn't");
    result = result.replace(/\bwerent\b/g, "weren't");
    result = result.replace(/\bhavent\b/g, "haven't");
    result = result.replace(/\bhasnt\b/g, "hasn't");
    result = result.replace(/\bcouldnt\b/g, "couldn't");
    result = result.replace(/\bwouldnt\b/g, "wouldn't");
    result = result.replace(/\bshouldnt\b/g, "shouldn't");
    result = result.replace(/\btheyll\b/g, "they'll");
    result = result.replace(/\bwell\b(?=\s+(?:be|have|go|do|see|get|make|take|find|keep|start|stop))/g, "we'll");
    result = result.replace(/\byoull\b/g, "you'll");

    return result;
  }

  private detectAndHandleCommand(text: string): boolean {
    if (!this.config.commandsEnabled) return false;
    const lower = text.toLowerCase().trim();

    const commands: { pattern: RegExp; action: string }[] = [
      { pattern: /^(clear|erase)\s+(board|all|everything|canvas)/i, action: 'clear_board' },
      { pattern: /^(undo|go back)/i, action: 'undo' },
      { pattern: /^(redo|forward)/i, action: 'redo' },
      { pattern: /^save (board|work)/i, action: 'save' },
      { pattern: /^new (board|page|canvas)/i, action: 'new_board' },
      { pattern: /^(export|download)/i, action: 'export' },
      { pattern: /^(color|colour)\s+(red|blue|green|yellow|purple|pink|orange|black|white)/i, action: 'change_color' },
      { pattern: /^(increase|bigger|larger)\s+(size|width|stroke)/i, action: 'increase_size' },
      { pattern: /^(decrease|smaller|thinner)\s+(size|width|stroke)/i, action: 'decrease_size' },
      { pattern: /^(zoom|scale)\s+(in|out)/i, action: 'zoom' },
      { pattern: /^(start|begin)\s+(recording|record)/i, action: 'start_recording' },
      { pattern: /^(stop|end)\s+(recording|record)/i, action: 'stop_recording' },
      { pattern: /^(show|hide)\s+(toolbar|tools|panel)/i, action: 'toggle_toolbar' },
      { pattern: /^(dark|light|night|day)\s+mode/i, action: 'toggle_theme' },
    ];

    for (const cmd of commands) {
      const match = lower.match(cmd.pattern);
      if (match) {
        this.notify('command', { action: cmd.action, original: text, match: match[0] });
        return true;
      }
    }

    return false;
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.silenceTimer = setTimeout(() => {
      this.notify('silenceDetected', { duration: this.config.silenceTimeout });
    }, this.config.silenceTimeout);
  }

  async setLanguage(language: LangCode) {
    this.config.language = language;
    this.serverTranscriber.setLanguage(language);
    if (this.status === 'listening') {
      await this.stop();
      await this.start();
    }
  }

  async destroy() {
    await this.stop();
    this.serverTranscriber.destroy();
    this.listeners.clear();
    this.finalTranscripts = [];
    this.interimTranscript = '';
    this.pendingServerResults = [];
  }
}

export const voiceEngine = new VoiceEngine({ commandsEnabled: false, useServerSTT: true });
