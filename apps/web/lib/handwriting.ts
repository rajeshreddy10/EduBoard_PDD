/**
 * handwriting.ts  (fixed)
 * Stroke-based handwriting recognition + OCR text utilities.
 *
 * Recognition priority chain:
 *   1. Backend /api/ai/handwriting  (GPT-4o vision via server)
 *   2. Empty string (graceful failure — OCR unavailable message shown)
 *
 * Note: Client-side Google Vision key removed for security.
 * All OCR goes through the backend which uses the server-side API key.
 */
import { placeWords, advanceNextLine, FlowState, PlacedWord, TEXT_DEFAULTS } from './textEngine';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ── Legacy exports (kept for backward compat with smart-board) ────────────

export interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
}

export interface TextFlowState {
  items: TextItem[];
  x: number;
  y: number;
}

/** Feature gate: handwriting-to-text is only active on blank boards. */
export function isHandwritingFeatureEnabled(isBlankBoard: boolean): boolean {
  return isBlankBoard;
}

/** Pixel width of a string using the shared board font. */
export function measureText(text: string): number {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const ff = TEXT_DEFAULTS.fontFamily === 'inherit' ? 'sans-serif' : TEXT_DEFAULTS.fontFamily;
  ctx.font = `${TEXT_DEFAULTS.fontSize}px ${ff}`;
  return ctx.measureText(text).width;
}

/** Computes the flow position after the last existing TextItem. */
export function createTextFlow(
  canvasWidth: number,
  existingItems: TextItem[],
  lastItem?: TextItem,
): TextFlowState {
  if (existingItems.length === 0) {
    return { items: [], x: TEXT_DEFAULTS.padding, y: TEXT_DEFAULTS.padding + TEXT_DEFAULTS.fontSize };
  }
  const last = lastItem || existingItems[existingItems.length - 1];
  let x = last.x + measureText(last.text) + TEXT_DEFAULTS.wordGap;
  let y = last.y;
  if (x > canvasWidth - TEXT_DEFAULTS.padding - 100) {
    x = TEXT_DEFAULTS.padding;
    y += TEXT_DEFAULTS.lineHeight;
  }
  return { items: [...existingItems], x, y };
}

/** Advances text flow to the start of the next line. */
export function addNextLine(flow: TextFlowState): TextFlowState {
  return { ...flow, x: TEXT_DEFAULTS.padding, y: flow.y + TEXT_DEFAULTS.lineHeight };
}

// ── Canvas stroke → base64 image ──────────────────────────────────────────

function strokesToImage(strokes: any[]): string | null {
  const penStrokes = strokes.filter(
    (s: any) => s && s.tool !== 'eraser',
  );
  if (penStrokes.length === 0) return null;

  // Extract all (x,y) points from either points array or x1/y1 legacy format
  const allPoints: { x: number; y: number }[] = [];
  penStrokes.forEach((s: any) => {
    if (Array.isArray(s.points) && s.points.length > 0) {
      allPoints.push(...s.points);
    } else if (s.x1 !== undefined && s.y1 !== undefined) {
      allPoints.push({ x: s.x1, y: s.y1 });
      if (s.x2 !== undefined && s.y2 !== undefined) {
        allPoints.push({ x: s.x2, y: s.y2 });
      }
    }
  });

  if (allPoints.length === 0) return null;

  const xs = allPoints.map((p) => p.x);
  const ys = allPoints.map((p) => p.y);
  const bxMin = Math.min(...xs), bxMax = Math.max(...xs);
  const byMin = Math.min(...ys), byMax = Math.max(...ys);
  const bw = Math.max(bxMax - bxMin, 1);
  const bh = Math.max(byMax - byMin, 1);

  const offscreen = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  const w = 800, h = 400;
  offscreen.width = w * dpr;
  offscreen.height = h * dpr;
  const ctx = offscreen.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const padding = 30;
  const sc = Math.min(
    (w - padding * 2) / bw,
    (h - padding * 2) / bh,
    3.0,
  );

  ctx.save();
  ctx.translate(padding - bxMin * sc, padding - byMin * sc);
  ctx.scale(sc, sc);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = Math.max(3, 4 / sc);

  penStrokes.forEach((s: any) => {
    ctx.beginPath();
    if (Array.isArray(s.points) && s.points.length > 0) {
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
    } else if (s.x1 !== undefined && s.y1 !== undefined) {
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
    }
    ctx.stroke();
  });
  ctx.restore();

  return offscreen.toDataURL('image/png');
}

// ── Backend OCR (GPT-4o via server) ──────────────────────────────────────

async function recognizeWithBackend(imageBase64: string): Promise<string> {
  const token =
    (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null) || '';

  const res = await fetch(`${API_BASE}/ai/handwriting`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ image: imageBase64 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Backend OCR ${res.status}`);
  }

  const data = await res.json();
  return (data.text ?? '').trim();
}

// ── Post-OCR text cleanup ─────────────────────────────────────────────────

/**
 * Sends raw OCR text to the backend /api/ai/format-text endpoint for
 * grammar correction, capitalisation, and spacing cleanup.
 * Falls back to the raw text if the request fails or returns 404.
 */
export async function cleanupOcrText(raw: string): Promise<string> {
  if (!raw.trim()) return raw;
  try {
    const token =
      (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null) || '';

    const res = await fetch(`${API_BASE}/ai/format-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text: raw, task: 'ocr_cleanup' }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.formatted ?? raw;
    }
    // 404 or other error → return raw text unchanged
  } catch { /* network error */ }
  return raw;
}

// ── Client-side OCR with Tesseract.js ────────────────────────────────────

let tesseractWorker: any = null;

async function getTesseractWorker() {
  if (!tesseractWorker) {
    const Tesseract = await import('tesseract.js');
    tesseractWorker = await Tesseract.createWorker('eng');
  }
  return tesseractWorker;
}

async function recognizeWithTesseract(imageBase64: string): Promise<string> {
  try {
    const worker = await getTesseractWorker();
    const { data } = await worker.recognize(imageBase64);
    return (data.text ?? '').trim();
  } catch (err) {
    console.warn('[handwriting] Tesseract OCR failed:', err);
    return '';
  }
}

// ── Main export: stroke array → recognized text ───────────────────────────

/**
 * Recognises handwriting from an array of canvas stroke objects.
 * Tries the backend first, then falls back to client-side Tesseract.js OCR.
 */
export async function recognizeHandwriting(strokes: any[]): Promise<string> {
  if (!strokes || strokes.length === 0) return '';

  const imageBase64 = strokesToImage(strokes);
  if (!imageBase64) return '';

  // Try backend first
  try {
    const text = await recognizeWithBackend(imageBase64);
    if (text) return text;
  } catch (err) {
    console.warn('[handwriting] Backend OCR unavailable:', err);
  }

  // Fallback to client-side Tesseract.js
  const text = await recognizeWithTesseract(imageBase64);
  if (text) return text;

  return '';
}

// ── New typed helpers (used by DocCanvas /gesture-board) ─────────────────────────────

export { placeWords, advanceNextLine };
export type { FlowState, PlacedWord };
