'use client';

import { checkSpelling, autoCorrect } from '@/lib/spellcheck';

export interface AirStroke {
  points: { x: number; y: number; t: number }[];
  color: string;
  width: number;
}

export interface AirWritingConfig {
  color: string;
  width: number;
  autoCorrect: boolean;
  language: string;
  sensitivity: number;
  smoothing: boolean;
  predictionEnabled: boolean;
}

export interface RecognizedWord {
  text: string;
  x: number;
  y: number;
  confidence: number;
  width: number;
  height: number;
}

export interface AirWritingState {
  isActive: boolean;
  currentStroke: AirStroke | null;
  strokes: AirStroke[];
  words: RecognizedWord[];
  cursorX: number;
  cursorY: number;
  lineHeight: number;
  config: AirWritingConfig;
}

export type AirWritingListener = (event: string, data?: any) => void;

const DEFAULT_CONFIG: AirWritingConfig = {
  color: '#6366f1',
  width: 3,
  autoCorrect: true,
  language: 'en',
  sensitivity: 70,
  smoothing: true,
  predictionEnabled: true,
};

export class AirWritingEngine {
  private state: AirWritingState;
  private listeners: Set<AirWritingListener> = new Set();
  private mediaPipeHands: any = null;
  private isInitialized = false;
  private wordBuffer: string[] = [];
  private lastGestureTime = 0;
  private gestureCooldown = 300;

  constructor() {
    this.state = {
      isActive: false,
      currentStroke: null,
      strokes: [],
      words: [],
      cursorX: 50,
      cursorY: 100,
      lineHeight: 48,
      config: { ...DEFAULT_CONFIG },
    };
  }

  subscribe(listener: AirWritingListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: string, data?: any) {
    this.listeners.forEach(l => l(event, data));
  }

  getState(): AirWritingState {
    return { ...this.state, config: { ...this.state.config } };
  }

  updateConfig(partial: Partial<AirWritingConfig>) {
    this.state.config = { ...this.state.config, ...partial };
    this.notify('configChanged', this.state.config);
  }

  activate() {
    this.state.isActive = true;
    this.notify('activated');
  }

  deactivate() {
    this.state.isActive = false;
    this.state.currentStroke = null;
    this.notify('deactivated');
  }

  toggle() {
    if (this.state.isActive) this.deactivate();
    else this.activate();
  }

  startStroke(x: number, y: number) {
    if (!this.state.isActive) return;
    const stroke: AirStroke = {
      points: [{ x, y, t: Date.now() }],
      color: this.state.config.color,
      width: this.state.config.width,
    };
    this.state.currentStroke = stroke;
    this.notify('strokeStarted', stroke);
  }

  continueStroke(x: number, y: number) {
    if (!this.state.currentStroke) return;
    this.state.currentStroke.points.push({ x, y, t: Date.now() });
    this.state.cursorX = x;
    this.state.cursorY = y;
    this.notify('strokeUpdated', this.state.currentStroke);
  }

  endStroke() {
    if (!this.state.currentStroke) return;
    this.state.strokes.push(this.state.currentStroke);
    this.recognizeGestureStroke(this.state.currentStroke);
    this.state.currentStroke = null;
    this.notify('strokeEnded');
  }

  private async recognizeGestureStroke(stroke: AirStroke) {
    const now = Date.now();
    if (now - this.lastGestureTime < this.gestureCooldown) return;
    this.lastGestureTime = now;

    const gesture = this.classifyStroke(stroke);
    if (!gesture) return;

    if (gesture.type === 'character' && gesture.text) {
      this.wordBuffer.push(gesture.text);
      const word = this.wordBuffer.join('');
      const recognized: RecognizedWord = {
        text: word,
        x: this.state.cursorX,
        y: this.state.cursorY,
        confidence: gesture.confidence,
        width: word.length * 14,
        height: this.state.lineHeight,
      };

      if (this.state.config.autoCorrect) {
        const corrected = autoCorrect(recognized.text);
        const spellChecked = checkSpelling(corrected.text);
        recognized.text = spellChecked.correctedText;
      }

      const exists = this.state.words.find(w =>
        Math.abs(w.x - recognized.x) < 20 && Math.abs(w.y - recognized.y) < 20
      );
      if (!exists) {
        this.state.words.push(recognized);
        this.notify('wordRecognized', recognized);
        this.advanceCursor(recognized.text);
      }
    } else if (gesture.type === 'space') {
      this.wordBuffer = [];
      this.state.cursorX += 20;
      this.notify('spaceInserted');
    } else if (gesture.type === 'newline') {
      this.wordBuffer = [];
      this.state.cursorX = 50;
      this.state.cursorY += this.state.lineHeight;
      this.notify('newLineInserted');
    } else if (gesture.type === 'erase') {
      this.state.words.pop();
      this.notify('wordErased');
    } else if (gesture.type === 'clear') {
      this.state.words = [];
      this.state.strokes = [];
      this.state.cursorX = 50;
      this.state.cursorY = 100;
      this.notify('allCleared');
    }
  }

  private classifyStroke(stroke: AirStroke): { type: string; text?: string; confidence: number } | null {
    if (stroke.points.length < 3) return null;
    const dx = stroke.points[stroke.points.length - 1].x - stroke.points[0].x;
    const dy = stroke.points[stroke.points.length - 1].y - stroke.points[0].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = stroke.points[stroke.points.length - 1].t - stroke.points[0].t;

    if (dist < 10 && duration < 200) return null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > 200 && absDy < 30) return { type: 'space', confidence: 0.8 };

    if (absDy > 100 && absDx < 20) {
      const downward = dy > 0;
      if (downward && absDy > 150) return { type: 'newline', confidence: 0.85 };
    }

    if (stroke.points.length > 20) {
      const wiggle = this.calculateWiggle(stroke);
      if (wiggle > 0.7) {
        return { type: 'erase', confidence: 0.75 };
      }
    }

    const predictedChar = this.predictCharacter(stroke);
    if (predictedChar) {
      return { type: 'character', text: predictedChar.char, confidence: predictedChar.confidence };
    }

    return null;
  }

  private calculateWiggle(stroke: AirStroke): number {
    if (stroke.points.length < 5) return 0;
    let directionChanges = 0;
    for (let i = 2; i < stroke.points.length; i++) {
      const prevDx = stroke.points[i - 1].x - stroke.points[i - 2].x;
      const currDx = stroke.points[i].x - stroke.points[i - 1].x;
      if (Math.sign(prevDx) !== Math.sign(currDx) && Math.abs(currDx) > 5) {
        directionChanges++;
      }
    }
    return directionChanges / stroke.points.length;
  }

  private predictCharacter(stroke: AirStroke): { char: string; confidence: number } | null {
    if (stroke.points.length < 5) return null;

    const bounds = this.getBounds(stroke);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const aspectRatio = width / (height || 1);

    const startX = stroke.points[0].x - bounds.minX;
    const startY = stroke.points[0].y - bounds.minY;
    const endX = stroke.points[stroke.points.length - 1].x - bounds.minX;
    const endY = stroke.points[stroke.points.length - 1].y - bounds.minY;

    const normalizedPoints = stroke.points.map(p => ({
      x: (p.x - bounds.minX) / (width || 1),
      y: (p.y - bounds.minY) / (height || 1),
    }));

    if (this.isCircle(normalizedPoints)) return { char: 'o', confidence: 0.7 };
    if (this.isVerticalLine(normalizedPoints, aspectRatio)) return { char: 'l', confidence: 0.65 };
    if (this.isHorizontalLine(normalizedPoints, aspectRatio)) return { char: '-', confidence: 0.6 };
    if (this.isVShape(normalizedPoints)) return { char: 'v', confidence: 0.6 };
    if (this.isWShape(normalizedPoints)) return { char: 'w', confidence: 0.55 };
    if (this.isUShape(normalizedPoints)) return { char: 'u', confidence: 0.6 };
    if (this.isNSHape(normalizedPoints)) return { char: 'n', confidence: 0.55 };
    if (this.isMSHape(normalizedPoints)) return { char: 'm', confidence: 0.5 };
    if (this.isCSHape(normalizedPoints)) return { char: 'c', confidence: 0.65 };
    if (this.isSSHape(normalizedPoints)) return { char: 's', confidence: 0.5 };

    return null;
  }

  private getBounds(stroke: AirStroke) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of stroke.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  private isCircle(points: { x: number; y: number }[]): boolean {
    if (points.length < 8) return false;
    const centerX = points.reduce((s, p) => s + p.x, 0) / points.length;
    const centerY = points.reduce((s, p) => s + p.y, 0) / points.length;
    const radii = points.map(p => Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2));
    const avgR = radii.reduce((s, r) => s + r, 0) / radii.length;
    const variance = radii.reduce((s, r) => s + (r - avgR) ** 2, 0) / radii.length;
    return variance < 0.05;
  }

  private isVerticalLine(points: { x: number; y: number }[], aspectRatio: number): boolean {
    return aspectRatio < 0.3 && points.length > 5;
  }

  private isHorizontalLine(points: { x: number; y: number }[], aspectRatio: number): boolean {
    return aspectRatio > 3 && points.length > 5;
  }

  private isVShape(points: { x: number; y: number }[]): boolean {
    if (points.length < 5) return false;
    const mid = Math.floor(points.length / 2);
    return points[0].y < points[mid].y && points[points.length - 1].y < points[mid].y;
  }

  private isWShape(points: { x: number; y: number }[]): boolean {
    if (points.length < 10) return false;
    let troughs = 0;
    for (let i = 2; i < points.length - 2; i++) {
      if (points[i].y > points[i - 1].y && points[i].y > points[i + 1].y) troughs++;
    }
    return troughs >= 2;
  }

  private isUShape(points: { x: number; y: number }[]): boolean {
    if (points.length < 6) return false;
    const mid = Math.floor(points.length / 2);
    return points[0].y > points[mid].y && points[points.length - 1].y > points[mid].y;
  }

  private isNSHape(points: { x: number; y: number }[]): boolean {
    if (points.length < 6) return false;
    const mid = Math.floor(points.length / 2);
    return points[0].y < points[mid].y && points[points.length - 1].y < points[mid].y
      && Math.abs(points[0].x - points[points.length - 1].x) < 0.3;
  }

  private isMSHape(points: { x: number; y: number }[]): boolean {
    if (points.length < 8) return false;
    let peaks = 0;
    for (let i = 2; i < points.length - 2; i++) {
      if (points[i].y < points[i - 1].y && points[i].y < points[i + 1].y) peaks++;
    }
    return peaks >= 2;
  }

  private isCSHape(points: { x: number; y: number }[]): boolean {
    if (points.length < 5) return false;
    const start = points[0];
    const end = points[points.length - 1];
    return Math.abs(start.x - end.x) < 0.2 && Math.abs(start.y - end.y) < 0.3;
  }

  private isSSHape(points: { x: number; y: number }[]): boolean {
    if (points.length < 8) return false;
    const mid = Math.floor(points.length / 2);
    return (points[0].y < points[mid].y && points[points.length - 1].y < points[mid].y)
      || (points[0].y > points[mid].y && points[points.length - 1].y > points[mid].y);
  }

  private advanceCursor(text: string) {
    this.state.cursorX += text.length * 14 + 10;
    if (this.state.cursorX > 1200) {
      this.state.cursorX = 50;
      this.state.cursorY += this.state.lineHeight;
    }
  }

  processMediaPipeLandmarks(landmarks: { x: number; y: number; z: number }[]) {
    if (!this.state.isActive || landmarks.length < 21) return;
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];
    const middleTip = landmarks[12];
    const wrist = landmarks[0];

    const indexX = (1 - indexTip.x) * window.innerWidth;
    const indexY = indexTip.y * window.innerHeight;
    const thumbX = (1 - thumbTip.x) * window.innerWidth;
    const thumbY = thumbTip.y * window.innerHeight;

    const indexDist = Math.sqrt(
      (indexTip.x - wrist.x) ** 2 + (indexTip.y - wrist.y) ** 2 + (indexTip.z - wrist.z) ** 2
    );
    const pinchDist = Math.sqrt(
      (indexTip.x - thumbTip.x) ** 2 + (indexTip.y - thumbTip.y) ** 2
    );
    const isPinching = pinchDist < 0.08;

    const tipToWrist = Math.abs(indexTip.y - wrist.y);
    const isPointing = tipToWrist > 0.3 && indexDist > 0.3;

    if (isPinching && isPointing) {
      if (!this.state.currentStroke) {
        this.startStroke(indexX, indexY);
      } else {
        this.continueStroke(indexX, indexY);
      }
    } else if (this.state.currentStroke) {
      this.endStroke();
    }

    this.state.cursorX = indexX;
    this.state.cursorY = indexY;
    this.notify('cursorMoved', { x: indexX, y: indexY });
  }

  getAllText(): string {
    return this.state.words.map(w => w.text).join(' ');
  }

  setCursorPosition(x: number, y: number) {
    this.state.cursorX = x;
    this.state.cursorY = y;
  }

  insertWord(text: string) {
    const word: RecognizedWord = {
      text,
      x: this.state.cursorX,
      y: this.state.cursorY,
      confidence: 1,
      width: text.length * 14,
      height: this.state.lineHeight,
    };
    this.state.words.push(word);
    this.advanceCursor(text);
    this.notify('wordRecognized', word);
  }

  insertNewLine() {
    this.state.cursorX = 50;
    this.state.cursorY += this.state.lineHeight;
    this.wordBuffer = [];
    this.notify('newLineInserted');
  }

  clearAll() {
    this.state.words = [];
    this.state.strokes = [];
    this.state.currentStroke = null;
    this.state.cursorX = 50;
    this.state.cursorY = 100;
    this.wordBuffer = [];
    this.notify('allCleared');
  }

  undo() {
    this.state.words.pop();
    this.notify('wordErased');
  }

  destroy() {
    this.listeners.clear();
    this.deactivate();
  }
}

export const airWritingEngine = new AirWritingEngine();
