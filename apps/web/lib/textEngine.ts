/**
 * textEngine.ts
 * Shared text formatting utilities for DrawSpace & DocCanvas.
 * Both boards import TEXT_DEFAULTS and use helpers from here.
 */

// ── Typography constants shared across all writing modes ──────────────────
export const TEXT_DEFAULTS = {
  fontFamily: 'inherit',
  fontSize: 24,          // px (24-size specification)
  lineHeight: 32,        // px
  padding: 24,           // px from canvas/editor edge
  wordGap: 12,           // px between words
  color: '#1e293b',
} as const;

// ── Word / line measurement ───────────────────────────────────────────────

let _measureCanvas: HTMLCanvasElement | null = null;

function getMeasureCtx(): CanvasRenderingContext2D {
  if (typeof document === 'undefined') throw new Error('Browser only');
  if (!_measureCanvas) {
    _measureCanvas = document.createElement('canvas');
  }
  const ctx = _measureCanvas.getContext('2d')!;
  const ff = TEXT_DEFAULTS.fontFamily === 'inherit' ? 'sans-serif' : TEXT_DEFAULTS.fontFamily;
  ctx.font = `${TEXT_DEFAULTS.fontSize}px ${ff}`;
  return ctx;
}

/** Returns the rendered pixel width of a string using the shared font. */
export function measureText(text: string): number {
  try {
    return getMeasureCtx().measureText(text).width;
  } catch {
    // SSR fallback: approximate at ~12px per char
    return text.length * 12;
  }
}

// ── Word-wrap helper ──────────────────────────────────────────────────────

export interface WrappedLine {
  words: string[];
  y: number;
}

/**
 * Breaks an array of words into lines that fit within `containerWidth`.
 * Returns the lines and their y-positions starting at `startY`.
 */
export function wrapWords(
  words: string[],
  containerWidth: number,
  startX = TEXT_DEFAULTS.padding,
  startY = TEXT_DEFAULTS.padding + TEXT_DEFAULTS.fontSize,
): WrappedLine[] {
  const maxX = containerWidth - TEXT_DEFAULTS.padding;
  const lines: WrappedLine[] = [];
  let currentLine: string[] = [];
  let cx = startX;
  let cy = startY;

  for (const word of words) {
    const ww = measureText(word) + TEXT_DEFAULTS.wordGap;
    if (cx + ww > maxX && currentLine.length > 0) {
      lines.push({ words: currentLine, y: cy });
      currentLine = [];
      cx = TEXT_DEFAULTS.padding;
      cy += TEXT_DEFAULTS.lineHeight;
    }
    currentLine.push(word);
    cx += ww;
  }
  if (currentLine.length > 0) {
    lines.push({ words: currentLine, y: cy });
  }
  return lines;
}

// ── TextItem for canvas-based placement ──────────────────────────────────

export interface PlacedWord {
  id: string;
  text: string;
  x: number;
  y: number;
}

export interface FlowState {
  x: number;
  y: number;
}

/**
 * Places an array of words into PlacedWord objects, continuing from a
 * FlowState (x, y cursor). Returns the placed words and the new FlowState.
 * @param autoWrap If false, text will stay on the same line indefinitely until manual break.
 */
export function placeWords(
  words: string[],
  flow: FlowState,
  containerWidth: number,
  autoWrap: boolean = true
): { placed: PlacedWord[]; nextFlow: FlowState } {
  const maxX = containerWidth - TEXT_DEFAULTS.padding;
  const placed: PlacedWord[] = [];
  let cx = flow.x;
  let cy = flow.y;

  for (const word of words) {
    const ww = measureText(word);

    // Only wrap if autoWrap is true and we exceeded the width
    if (autoWrap && cx + ww > maxX && cx > TEXT_DEFAULTS.padding) {
      cx = TEXT_DEFAULTS.padding;
      cy += TEXT_DEFAULTS.lineHeight;
    }

    placed.push({
      id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: word,
      x: cx,
      y: cy,
    });
    cx += ww + TEXT_DEFAULTS.wordGap;
  }

  return { placed, nextFlow: { x: cx, y: cy } };
}

/**
 * Advances the flow cursor to the start of the next line.
 */
export function advanceNextLine(flow: FlowState): FlowState {
  return {
    x: TEXT_DEFAULTS.padding,
    y: flow.y + TEXT_DEFAULTS.lineHeight,
  };
}

/**
 * Computes the initial flow state for a fresh canvas.
 */
export function initialFlow(): FlowState {
  return {
    x: TEXT_DEFAULTS.padding,
    y: TEXT_DEFAULTS.padding + TEXT_DEFAULTS.fontSize,
  };
}

// ── Voice / OCR text insertion at cursor ─────────────────────────────────

/**
 * Inserts `text` at the current caret position inside a contenteditable element.
 * Falls back to appending if no caret is active.
 */
export function insertTextAtCursor(text: string): void {
  if (typeof document === 'undefined') return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    // No active caret — try to find focused contenteditable and append
    const el = document.activeElement as HTMLElement;
    if (el?.isContentEditable) {
      el.textContent = (el.textContent ?? '') + text;
    }
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  // Wrap in a text node so the text uses the element's inherited font styles
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  // Move caret after inserted text
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
}

// ── Text cleanup helpers ──────────────────────────────────────────────────

/**
 * Normalises OCR/STT output:
 *  - Collapses multiple spaces
 *  - Capitalises first word of each sentence
 *  - Trims leading/trailing whitespace
 */
export function normaliseText(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/(^\s*|\.\s+)([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase())
    .trim();
}

/**
 * Splits text into word tokens (non-empty).
 */
export function tokeniseWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

// ── CSS string for the shared editor surface ─────────────────────────────

/**
 * Returns an inline CSS style string that applies TEXT_DEFAULTS to any
 * contenteditable div used as the writing surface.
 */
export function editorSurfaceStyle(extraCss = ''): string {
  return [
    `font-family: ${TEXT_DEFAULTS.fontFamily}`,
    `font-size: ${TEXT_DEFAULTS.fontSize}px`,
    `line-height: ${TEXT_DEFAULTS.lineHeight}px`,
    `padding: ${TEXT_DEFAULTS.padding}px`,
    `color: ${TEXT_DEFAULTS.color}`,
    `word-wrap: break-word`,
    `white-space: pre-wrap`,
    `outline: none`,
    `min-height: 100%`,
    `box-sizing: border-box`,
    extraCss,
  ]
    .filter(Boolean)
    .join('; ');
}
