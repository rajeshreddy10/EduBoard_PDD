/**
 * Chalk-Talk Web Audio API Synthesized Drawing Soundscape Engine
 * 100% Lightweight, local, non-blocking, zero network dependencies.
 * Sound Presets: 'marker' | 'chalk' | 'pencil'
 */

export type SoundStyle = 'marker' | 'chalk' | 'pencil';

class DrawingSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private isPlaying = false;
  private enabled = false; // Off by default
  private currentStyle: SoundStyle = 'marker';

  private initAudioContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setStyle(style: SoundStyle) {
    this.currentStyle = style;
  }

  public start() {
    if (!this.enabled) return;
    this.initAudioContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.isPlaying) return;

    try {
      // Create 1-second white noise buffer
      const bufferSize = this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = buffer;
      this.noiseNode.loop = true;

      this.filterNode = this.ctx.createBiquadFilter();
      this.gainNode = this.ctx.createGain();

      // Configure audio characteristics per style
      if (this.currentStyle === 'chalk') {
        this.filterNode.type = 'bandpass';
        this.filterNode.frequency.value = 1200;
        this.filterNode.Q.value = 1.8;
        this.gainNode.gain.value = 0.08;
      } else if (this.currentStyle === 'pencil') {
        this.filterNode.type = 'highpass';
        this.filterNode.frequency.value = 2500;
        this.gainNode.gain.value = 0.04;
      } else {
        // Marker
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 800;
        this.gainNode.gain.value = 0.06;
      }

      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.noiseNode.start();
      this.isPlaying = true;
    } catch (err) {
      console.warn('[DrawingSoundEngine] Start sound warning:', err);
    }
  }

  public updateVelocity(velocity: number) {
    if (!this.enabled || !this.isPlaying || !this.gainNode || !this.ctx) return;
    try {
      const clampedVelocity = Math.min(Math.max(velocity, 0.1), 50);
      const baseGain = this.currentStyle === 'chalk' ? 0.08 : this.currentStyle === 'pencil' ? 0.04 : 0.06;
      const targetGain = Math.min(0.2, baseGain * (0.8 + clampedVelocity * 0.05));
      this.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    } catch {}
  }

  public stop() {
    if (!this.isPlaying) return;
    try {
      if (this.noiseNode) {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
        this.noiseNode = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
      if (this.filterNode) {
        this.filterNode.disconnect();
        this.filterNode = null;
      }
    } catch {}
    this.isPlaying = false;
  }
}

export const drawingSoundEngine = new DrawingSoundEngine();
