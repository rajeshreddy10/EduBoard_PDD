'use client';

export type GestureType = 'pinch' | 'five_open' | 'fist' | 'none';
export type EngineMode = 'write' | 'slop' | 'erase' | 'idle';

export interface GestureResult {
  gesture: GestureType;
  mode: EngineMode;
  confidence: number;
  fingertipX: number;
  fingertipY: number;
  fingers: boolean[];
  raw: FingerAnalysis;
}

interface FingerAnalysis {
  extendedCount: number;
  extensionScores: number[];
  skinPixelRatio: number;
  boundingBox: { x: number; y: number; w: number; h: number } | null;
  isPinching: boolean;
}

export interface GestureEngineConfig {
  confidenceThreshold: number;
  modeSwitchDebounceMs: number;
  trackingDebounceMs: number;
  smoothingFactor: number;
  frameHistorySize: number;
  requiredAgreement: number;
  pinchDistanceThreshold: number;
  skinYCrCb: { cr: [number, number]; cb: [number, number] };
}

const DEFAULT_CONFIG: GestureEngineConfig = {
  confidenceThreshold: 0.85,
  modeSwitchDebounceMs: 600,
  trackingDebounceMs: 80,
  smoothingFactor: 0.65,
  frameHistorySize: 12,
  requiredAgreement: 0.6,
  pinchDistanceThreshold: 0.12,
  skinYCrCb: { cr: [133, 173], cb: [77, 127] },
};

const FRAME_W = 160;
const FRAME_H = 120;

export class GestureEngineV2 {
  private config: GestureEngineConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;

  private currentGesture: GestureType = 'none';
  private currentMode: EngineMode = 'idle';
  private confidence = 0;

  private smoothedFingertip = { x: 0, y: 0 };
  private rawFingertip = { x: 0, y: 0 };

  private frameHistory: FingerAnalysis[] = [];
  private modeSwitchCooldown = 0;
  private trackingCooldown = 0;
  private lastSwitchTime = 0;
  private lastTrackTime = 0;

  private consecutiveFrames: Record<GestureType, number> = {
    pinch: 0, five_open: 0, fist: 0, none: 0,
  };

  public onGestureChange: ((result: GestureResult) => void) | null = null;
  public onTrackingUpdate: ((x: number, y: number, gesture: GestureType) => void) | null = null;

  constructor(config?: Partial<GestureEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.canvas = document.createElement('canvas');
    this.canvas.width = FRAME_W;
    this.canvas.height = FRAME_H;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  analyzeFrame(video: HTMLVideoElement): GestureResult {
    const now = Date.now();
    const ctx = this.ctx;
    if (!ctx || video.readyState < 2) {
      return this.buildResult();
    }

    ctx.drawImage(video, 0, 0, FRAME_W, FRAME_H);
    const imageData = ctx.getImageData(0, 0, FRAME_W, FRAME_H);

    const analysis = this.analyzeHand(imageData);
    this.frameHistory.push(analysis);
    if (this.frameHistory.length > this.config.frameHistorySize) {
      this.frameHistory.shift();
    }

    const rawGesture = this.classifyGesture(analysis);
    const agreedGesture = this.applyFrameHistoryVote(rawGesture);
    const gesture = agreedGesture;

    this.updateConsecutiveCounts(gesture, now);

    if (gesture !== 'none') {
      const rawPos = this.rawFingertip;
      this.smoothedFingertip = {
        x: rawPos.x * (1 - this.config.smoothingFactor) + this.smoothedFingertip.x * this.config.smoothingFactor,
        y: rawPos.y * (1 - this.config.smoothingFactor) + this.smoothedFingertip.y * this.config.smoothingFactor,
      };
    }

    const confidence = this.calculateConfidence(analysis, gesture);

    if (gesture !== 'none' && now - this.lastSwitchTime > this.config.modeSwitchDebounceMs) {
      this.currentGesture = gesture;
      this.currentMode = this.gestureToMode(gesture);
      this.confidence = confidence;
      this.lastSwitchTime = now;
    }

    if (gesture !== 'none' && now - this.lastTrackTime > this.config.trackingDebounceMs) {
      this.lastTrackTime = now;
      if (this.onTrackingUpdate) {
        this.onTrackingUpdate(
          this.smoothedFingertip.x,
          this.smoothedFingertip.y,
          gesture
        );
      }
    }

    const result = this.buildResult(analysis);

    if (this.onGestureChange) {
      this.onGestureChange(result);
    }

    return result;
  }

  getSmoothedPosition(): { x: number; y: number } {
    return { ...this.smoothedFingertip };
  }

  getCurrentMode(): EngineMode {
    return this.currentMode;
  }

  getCurrentGesture(): GestureType {
    return this.currentGesture;
  }

  getConfidence(): number {
    return this.confidence;
  }

  private analyzeHand(data: ImageData): FingerAnalysis {
    const pixels = data.data;
    const w = data.width;
    const h = data.height;

    let skinPixels = 0;
    let totalPixels = 0;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    const sections = [0, 0, 0, 0, 0];
    const sectionCounts = [0, 0, 0, 0, 0];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
        totalPixels++;

        const isSkin = this.isSkinColor(r, g, b);

        if (isSkin) {
          skinPixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          if (y < h * 0.55) {
            const secIdx = Math.min(Math.floor(x / (w / 5)), 4);
            sections[secIdx]++;
          }
          sectionCounts[Math.min(Math.floor(x / (w / 5)), 4)]++;
        }
      }
    }

    const skinRatio = skinPixels / Math.max(totalPixels, 1);
    const bbox = skinPixels > 30 ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null;

    const adaptiveThreshold = this.computeAdaptiveThreshold(sections, skinPixels, h, w);

    const extensionScores = sections.map((count, i) => {
      const total = sectionCounts[i] || 1;
      const upperRatio = count / total;
      return upperRatio;
    });

    const fingerThreshold = Math.max(adaptiveThreshold, 0.08);
    const extendedCount = extensionScores.filter(s => s > fingerThreshold).length;

    const hasThumb = sectionCounts[0] > 0 && sections[0] > sectionCounts[0] * 0.12;
    const hasIndex = sectionCounts[1] > 0 && sections[1] > sectionCounts[1] * 0.12;
    const hasMiddle = sectionCounts[2] > 0 && sections[2] > sectionCounts[2] * 0.12;
    const hasRing = sectionCounts[3] > 0 && sections[3] > sectionCounts[3] * 0.12;
    const hasPinky = sectionCounts[4] > 0 && sections[4] > sectionCounts[4] * 0.12;

    const pinchCheck = this.detectPinch(sections, sectionCounts);

    if (bbox) {
      this.rawFingertip = {
        x: ((bbox.x + bbox.w / 2) / w) * window.innerWidth,
        y: ((bbox.y) / h) * window.innerHeight,
      };
    }

    return {
      extendedCount,
      extensionScores,
      skinPixelRatio: skinRatio,
      boundingBox: bbox,
      isPinching: pinchCheck,
    };
  }

  private isSkinColor(r: number, g: number, b: number): boolean {
    const cr = r - (g + b) / 2;
    const cb = b - (r + g) / 2;
    const y = 0.299 * r + 0.587 * g + 0.114 * b;

    const crLo = this.config.skinYCrCb.cr[0] - 150;
    const crHi = this.config.skinYCrCb.cr[1] - 150;
    const cbLo = this.config.skinYCrCb.cb[0] - 128;
    const cbHi = this.config.skinYCrCb.cb[1] - 128;

    const crNorm = cr;
    const cbNorm = cb;
    const isSkin =
      crNorm > -20 && crNorm < 30 &&
      cbNorm > -50 && cbNorm < 0 &&
      y > 40 && y < 240 &&
      r > g && r > b &&
      Math.abs(g - b) < 50;

    const isSkinV2 =
      r > 50 && g > 20 && b > 10 &&
      r > g && r > b &&
      r - g > 8 &&
      r - b > 8 &&
      Math.abs(g - b) < 40;

    return isSkin || isSkinV2;
  }

  private computeAdaptiveThreshold(
    sections: number[], skinPixels: number, h: number, w: number
  ): number {
    const validSections = sections.filter(s => s > 0);
    if (validSections.length === 0) return 0.15;

    const avg = validSections.reduce((a, b) => a + b, 0) / validSections.length;
    const max = Math.max(...sections);
    const density = skinPixels / (h * w);

    if (density < 0.01) return 0.3;
    if (density < 0.03) return 0.2;

    return Math.max(0.08, avg * 0.5);
  }

  private detectPinch(sections: number[], sectionCounts: number[]): boolean {
    const thumbScore = sectionCounts[0] > 0 ? sections[0] / sectionCounts[0] : 0;
    const indexScore = sectionCounts[1] > 0 ? sections[1] / sectionCounts[1] : 0;

    const thumbActive = thumbScore > 0.1;
    const indexActive = indexScore > 0.1;

    const middleScore = sectionCounts[2] > 0 ? sections[2] / sectionCounts[2] : 0;
    const ringScore = sectionCounts[3] > 0 ? sections[3] / sectionCounts[3] : 0;
    const pinkyScore = sectionCounts[4] > 0 ? sections[4] / sectionCounts[4] : 0;

    const otherFingersActive = middleScore > 0.15 || ringScore > 0.15 || pinkyScore > 0.15;

    return thumbActive && indexActive && !otherFingersActive;
  }

  private classifyGesture(analysis: FingerAnalysis): GestureType {
    const { extendedCount, isPinching, extensionScores, skinPixelRatio } = analysis;

    if (skinPixelRatio < 0.005) return 'none';

    if (isPinching) return 'pinch';

    const avgExtension = extensionScores.reduce((a, b) => a + b, 0) / extensionScores.length;

    if (extendedCount >= 5 && avgExtension > 0.2) {
      return 'five_open';
    }

    if (extendedCount <= 1 && avgExtension < 0.1) {
      return 'fist';
    }

    return 'none';
  }

  private applyFrameHistoryVote(current: GestureType): GestureType {
    if (this.frameHistory.length < 3) return current;

    const votes: Record<GestureType, number> = {
      pinch: 0, five_open: 0, fist: 0, none: 0,
    };

    for (const frame of this.frameHistory) {
      const g = this.classifyGesture(frame);
      votes[g]++;
    }

    const recentWindow = this.frameHistory.slice(-Math.min(8, this.frameHistory.length));
    const recentVotes: Record<GestureType, number> = {
      pinch: 0, five_open: 0, fist: 0, none: 0,
    };
    for (const frame of recentWindow) {
      const g = this.classifyGesture(frame);
      recentVotes[g]++;
    }

    const totalRecent = recentWindow.length;
    let bestGesture: GestureType = current;
    let bestCount = 0;

    for (const [g, count] of Object.entries(recentVotes)) {
      const ratio = count / totalRecent;
      if (ratio > bestCount) {
        bestCount = ratio;
        bestGesture = g as GestureType;
      }
    }

    const totalAll = this.frameHistory.length;
    const overallAgreement = (votes[bestGesture] / totalAll) >= this.config.requiredAgreement;
    const recentAgreement = bestCount >= this.config.requiredAgreement;

    if (overallAgreement && recentAgreement && bestCount > 0.4) {
      return bestGesture;
    }

    if (recentAgreement && bestCount > 0.5) {
      return bestGesture;
    }

    if (totalAll >= this.config.frameHistorySize && bestCount > 0.35) {
      return bestGesture;
    }

    return current;
  }

  private updateConsecutiveCounts(gesture: GestureType, now: number) {
    for (const key of Object.keys(this.consecutiveFrames) as GestureType[]) {
      if (key === gesture) {
        this.consecutiveFrames[key]++;
      } else {
        this.consecutiveFrames[key] = Math.max(0, this.consecutiveFrames[key] - 1);
      }
    }
  }

  private calculateConfidence(analysis: FingerAnalysis, gesture: GestureType): number {
    if (gesture === 'none') return 0;

    const { skinPixelRatio, extensionScores } = analysis;
    const variance = this.computeVariance(extensionScores);

    let confidence = 0;

    switch (gesture) {
      case 'pinch':
        confidence = Math.min(1, skinPixelRatio * 15 + 0.5);
        break;
      case 'five_open':
        confidence = Math.min(1, skinPixelRatio * 12 + variance * 2 + 0.3);
        break;
      case 'fist':
        const avgExt = extensionScores.reduce((a, b) => a + b, 0) / extensionScores.length;
        confidence = Math.min(1, (1 - avgExt) * 1.5 + skinPixelRatio * 5);
        break;
    }

    const consecutiveBonus = Math.min(
      0.2,
      (this.consecutiveFrames[gesture] / this.config.frameHistorySize) * 0.2
    );
    confidence = Math.min(1, confidence + consecutiveBonus);

    return Math.max(0, Math.round(confidence * 1000) / 1000);
  }

  private computeVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => (v - mean) ** 2);
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private gestureToMode(gesture: GestureType): EngineMode {
    switch (gesture) {
      case 'pinch': return 'write';
      case 'five_open': return 'slop';
      case 'fist': return 'erase';
      default: return 'idle';
    }
  }

  private buildResult(analysis?: FingerAnalysis): GestureResult {
    return {
      gesture: this.currentGesture,
      mode: this.currentMode,
      confidence: this.confidence,
      fingertipX: this.smoothedFingertip.x,
      fingertipY: this.smoothedFingertip.y,
      fingers: [false, false, false, false, false],
      raw: analysis || {
        extendedCount: 0,
        extensionScores: [0, 0, 0, 0, 0],
        skinPixelRatio: 0,
        boundingBox: null,
        isPinching: false,
      },
    };
  }

  reset() {
    this.currentGesture = 'none';
    this.currentMode = 'idle';
    this.confidence = 0;
    this.frameHistory = [];
    this.smoothedFingertip = { x: 0, y: 0 };
    this.rawFingertip = { x: 0, y: 0 };
    this.lastSwitchTime = 0;
    this.lastTrackTime = 0;
    this.consecutiveFrames = { pinch: 0, five_open: 0, fist: 0, none: 0 };
  }

  destroy() {
    this.reset();
    this.onGestureChange = null;
    this.onTrackingUpdate = null;
  }
}
