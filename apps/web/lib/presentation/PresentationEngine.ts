'use client';

export type SlideTheme = 'dark' | 'light' | 'neon' | 'educational';
export type TransitionEffect = 'fade' | 'slide' | 'zoom' | 'none';

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'drawing';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  style?: Record<string, string>;
}

export interface Slide {
  id: string;
  title: string;
  content: string;
  theme: SlideTheme;
  transition: TransitionEffect;
  speakerNotes: string;
  background: string;
  elements: SlideElement[];
}

export type PresentationListener = (event: string, data?: any) => void;

export class PresentationEngine {
  private slides: Slide[] = [];
  private currentIndex: number = 0;
  private listeners: PresentationListener[] = [];
  private timerInterval: NodeJS.Timeout | null = null;
  private elapsedSeconds: number = 0;
  private isTimerRunning: boolean = false;

  constructor(initialSlides?: Slide[]) {
    if (initialSlides) {
      this.slides = initialSlides.map(s => ({
        ...s,
        elements: s.elements || [],
      }));
    } else {
      this.slides = [this.createDefaultSlide()];
    }
    this.currentIndex = 0;
  }

  private createDefaultSlide(): Slide {
    return {
      id: this.generateId(),
      title: 'Untitled Slide',
      content: '',
      theme: 'dark',
      transition: 'fade',
      speakerNotes: '',
      background: 'var(--bg-primary)',
      elements: [],
    };
  }

  private generateId(): string {
    return `slide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private notify(event: string, data?: any) {
    this.listeners.forEach(l => l(event, data));
  }

  subscribe(listener: PresentationListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  async createFromContent(content: string): Promise<void> {
    const lines = content.split('\n').filter(l => l.trim());
    const newSlides: Slide[] = [];
    let currentSlide: Slide | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        if (currentSlide) newSlides.push(currentSlide);
        const level = trimmed.match(/^#+/)?.[0].length || 1;
        currentSlide = {
          ...this.createDefaultSlide(),
          title: trimmed.replace(/^#+\s*/, ''),
          id: this.generateId(),
        };
      } else if (currentSlide) {
        currentSlide.content += (currentSlide.content ? '\n\n' : '') + trimmed;
      }
    }
    if (currentSlide) newSlides.push(currentSlide);

    if (newSlides.length > 0) {
      this.slides = newSlides;
      this.currentIndex = 0;
    }
    this.notify('slidesChanged', { count: this.slides.length });
  }

  addSlide(slide: Slide): void {
    const newSlide: Slide = {
      ...slide,
      id: slide.id || this.generateId(),
      elements: slide.elements || [],
    };
    this.slides.splice(this.currentIndex + 1, 0, newSlide);
    this.notify('slidesChanged', { count: this.slides.length });
  }

  removeSlide(index: number): void {
    if (this.slides.length <= 1) return;
    this.slides.splice(index, 1);
    if (this.currentIndex >= this.slides.length) {
      this.currentIndex = this.slides.length - 1;
    }
    this.notify('slidesChanged', { count: this.slides.length });
    this.notify('currentSlideChanged', this.getCurrentSlide());
  }

  reorder(from: number, to: number): void {
    if (from < 0 || from >= this.slides.length || to < 0 || to >= this.slides.length) return;
    const [moved] = this.slides.splice(from, 1);
    this.slides.splice(to, 0, moved);
    if (this.currentIndex === from) {
      this.currentIndex = to;
    } else if (this.currentIndex > from && this.currentIndex <= to) {
      this.currentIndex--;
    } else if (this.currentIndex < from && this.currentIndex >= to) {
      this.currentIndex++;
    }
    this.notify('slidesChanged', { count: this.slides.length });
  }

  getCurrentSlide(): Slide | null {
    return this.slides[this.currentIndex] || null;
  }

  getSlide(index: number): Slide | null {
    return this.slides[index] || null;
  }

  next(): boolean {
    if (this.currentIndex < this.slides.length - 1) {
      this.currentIndex++;
      this.notify('currentSlideChanged', this.getCurrentSlide());
      return true;
    }
    return false;
  }

  prev(): boolean {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.notify('currentSlideChanged', this.getCurrentSlide());
      return true;
    }
    return false;
  }

  goTo(index: number): boolean {
    if (index >= 0 && index < this.slides.length) {
      this.currentIndex = index;
      this.notify('currentSlideChanged', this.getCurrentSlide());
      return true;
    }
    return false;
  }

  getSlideCount(): number {
    return this.slides.length;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getSlides(): Slide[] {
    return [...this.slides];
  }

  updateSlide(index: number, updates: Partial<Slide>): void {
    if (index >= 0 && index < this.slides.length) {
      this.slides[index] = { ...this.slides[index], ...updates };
      this.notify('slideUpdated', { index, slide: this.slides[index] });
    }
  }

  async exportPDF(): Promise<Blob> {
    const content = this.slides.map((slide, i) => (
      `Slide ${i + 1}: ${slide.title}\n${slide.content}\n\n${slide.speakerNotes ? `Notes: ${slide.speakerNotes}` : ''}`
    )).join('\n---\n');

    return new Blob([content], { type: 'text/plain' });
  }

  startTimer(): void {
    if (this.isTimerRunning) return;
    this.isTimerRunning = true;
    this.elapsedSeconds = 0;
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds++;
      this.notify('timerTick', { elapsed: this.elapsedSeconds });
    }, 1000);
  }

  stopTimer(): void {
    this.isTimerRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getElapsedTime(): number {
    return this.elapsedSeconds;
  }

  resetTimer(): void {
    this.stopTimer();
    this.elapsedSeconds = 0;
    this.notify('timerTick', { elapsed: 0 });
  }

  isTimerActive(): boolean {
    return this.isTimerRunning;
  }

  destroy(): void {
    this.stopTimer();
    this.listeners = [];
  }
}

export default PresentationEngine;
