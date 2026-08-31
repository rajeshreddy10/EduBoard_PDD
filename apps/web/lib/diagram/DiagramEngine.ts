import { DrawingStroke } from '@/lib/types';

export interface DiagramElement {
  id: string;
  type: 'rectangle' | 'circle' | 'diamond' | 'arrow' | 'text' | 'line' | 'parallelogram';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text: string;
  points: number[];
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  fromAnchor: string;
  toAnchor: string;
  label: string;
}

export interface Diagram {
  id: string;
  type: 'flowchart' | 'uml' | 'mindmap' | 'architecture' | 'graph' | 'freeform';
  elements: DiagramElement[];
  connections: Connection[];
  metadata: {
    title: string;
    created: string;
    author: string;
  };
}

function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function simplifyPolyline(points: { x: number; y: number }[], tolerance: number): { x: number; y: number }[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    const left = simplifyPolyline(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPolyline(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function perpendicularDistance(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function angleBetween(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.sqrt(ab.x * ab.x + ab.y * ab.y) * Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  if (mag === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag)));
}

function getBoundingBox(points: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function pointsToCoordArray(points: number[]): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length - 1; i += 2) {
    result.push({ x: points[i], y: points[i + 1] });
  }
  return result;
}

function coordArrayToPoints(coords: { x: number; y: number }[]): number[] {
  const result: number[] = [];
  for (const c of coords) { result.push(c.x, c.y); }
  return result;
}

function detectShapeType(simple: { x: number; y: number }[]): DiagramElement['type'] {
  if (simple.length < 3) return 'line';
  const isClosed = Math.sqrt((simple[0].x - simple[simple.length - 1].x) ** 2 + (simple[0].y - simple[simple.length - 1].y) ** 2) < 30;
  const angles: number[] = [];
  for (let i = 1; i < simple.length - 1; i++) {
    angles.push(angleBetween(simple[i - 1], simple[i], simple[i + 1]));
  }
  if (isClosed && simple.length >= 4) {
    const rightAngles = angles.filter(a => Math.abs(a - Math.PI / 2) < 0.3 || Math.abs(a - Math.PI * 3 / 2) < 0.3).length;
    if (rightAngles >= 3) return 'rectangle';
    if (simple.length <= 6) {
      const bb = getBoundingBox(simple);
      const aspectRatio = bb.width / bb.height;
      if (Math.abs(aspectRatio - 1) < 0.3) return 'diamond';
    }
    const center = { x: 0, y: 0 };
    for (const p of simple) { center.x += p.x / simple.length; center.y += p.y / simple.length; }
    const radii = simple.map(p => Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2));
    const avgRadius = radii.reduce((s, r) => s + r, 0) / radii.length;
    const variance = radii.reduce((s, r) => s + (r - avgRadius) ** 2, 0) / radii.length;
    if (variance / avgRadius < 0.15) return 'circle';
  }
  if (!isClosed && simple.length >= 3) {
    const last3 = simple.slice(-3);
    const tipAngle = angleBetween(last3[0], last3[1], last3[2]);
    if (tipAngle < 0.8) return 'arrow';
  }
  if (simple.length >= 4) {
    const bb = getBoundingBox(simple);
    const dx = simple[1].x - simple[0].x;
    const dy = simple[1].y - simple[0].y;
    const dx2 = simple[3].x - simple[2].x;
    const dy2 = simple[3].y - simple[2].y;
    if (Math.abs(dx - dx2) < 20 && Math.abs(dy - dy2) < 20) return 'parallelogram';
  }
  return 'line';
}

export class DiagramEngine {
  processStrokes(strokes: DrawingStroke[]): Diagram {
    const elements: DiagramElement[] = [];
    const connections: Connection[] = [];
    for (const stroke of strokes) {
      if (stroke.tool === 'text' && stroke.text) {
        elements.push({
          id: genId(),
          type: 'text',
          x: stroke.x || stroke.points[0]?.x || 0,
          y: stroke.y || stroke.points[0]?.y || 0,
          width: (stroke.fontSize || 16) * stroke.text.length * 0.6,
          height: stroke.fontSize || 20,
          rotation: stroke.rotation || 0,
          fill: 'transparent',
          stroke: stroke.color,
          strokeWidth: 0,
          text: stroke.text,
          points: [],
        });
        continue;
      }
      if (stroke.points.length < 2) continue;
      const coords = stroke.points;
      const simple = simplifyPolyline(coords, 5);
      const shapeType = stroke.shape as DiagramElement['type'] | undefined;
      const detected = shapeType && ['rectangle', 'circle', 'diamond', 'arrow', 'line', 'parallelogram'].includes(shapeType)
        ? shapeType as DiagramElement['type']
        : detectShapeType(simple);
      const bb = getBoundingBox(coords);
      const corrected = this.correctShape(detected, bb, simple);
      elements.push({
        id: genId(),
        type: detected,
        x: corrected.x,
        y: corrected.y,
        width: corrected.width,
        height: corrected.height,
        rotation: stroke.rotation || 0,
        fill: stroke.fillColor || 'transparent',
        stroke: stroke.color,
        strokeWidth: stroke.width || 2,
        text: stroke.text || '',
        points: coordArrayToPoints(simple),
      });
    }
    const diagramType = this.detectDiagramType(elements);
    return {
      id: genId(),
      type: diagramType,
      elements,
      connections,
      metadata: {
        title: 'Untitled Diagram',
        created: new Date().toISOString(),
        author: 'User',
      },
    };
  }

  recognizeShape(points: number[]): DiagramElement['type'] {
    const coords = pointsToCoordArray(points);
    if (coords.length < 2) return 'line';
    const simple = simplifyPolyline(coords, 5);
    return detectShapeType(simple);
  }

  private correctShape(type: DiagramElement['type'], bb: { x: number; y: number; width: number; height: number }, _simple: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } {
    const grid = 10;
    const snapX = Math.round(bb.x / grid) * grid;
    const snapY = Math.round(bb.y / grid) * grid;
    if (type === 'circle') {
      const size = Math.max(bb.width, bb.height);
      return { x: snapX, y: snapY, width: size, height: size };
    }
    if (type === 'diamond') {
      const size = Math.max(bb.width, bb.height);
      return { x: snapX, y: snapY, width: size, height: size };
    }
    if (type === 'rectangle' || type === 'parallelogram') {
      const w = Math.round(bb.width / grid) * grid || grid;
      const h = Math.round(bb.height / grid) * grid || grid;
      return { x: snapX, y: snapY, width: Math.max(w, grid), height: Math.max(h, grid) };
    }
    return { x: snapX, y: snapY, width: Math.max(Math.round(bb.width / grid) * grid, grid), height: Math.max(Math.round(bb.height / grid) * grid, grid) };
  }

  detectDiagramType(elements: DiagramElement[]): Diagram['type'] {
    if (elements.length === 0) return 'freeform';
    const types = new Set(elements.map(e => e.type));
    if (types.has('diamond') || (types.has('rectangle') && elements.filter(e => e.type === 'arrow').length > 0)) return 'flowchart';
    if (types.has('rectangle') && elements.filter(e => e.type === 'text').length > 2) return 'uml';
    if (elements.length > 5 && types.has('line')) return 'graph';
    if (elements.filter(e => e.type === 'text').length > 3) return 'mindmap';
    return 'architecture';
  }

  generateDiagram(type: Diagram['type'], elements: DiagramElement[]): Diagram {
    const beautified = this.beautify(elements);
    return {
      id: genId(),
      type,
      elements: beautified,
      connections: [],
      metadata: {
        title: 'Generated Diagram',
        created: new Date().toISOString(),
        author: 'User',
      },
    };
  }

  beautify(elements: DiagramElement[]): DiagramElement[] {
    if (elements.length === 0) return [];
    const grid = 20;
    const aligned = elements.map(el => {
      const snapX = Math.round(el.x / grid) * grid;
      const snapY = Math.round(el.y / grid) * grid;
      return { ...el, x: snapX, y: snapY };
    });
    const avgWidth = aligned.reduce((s, e) => s + e.width, 0) / aligned.length;
    const avgHeight = aligned.reduce((s, e) => s + e.height, 0) / aligned.length;
    const sized = aligned.map(el => {
      if (el.type === 'circle' || el.type === 'diamond') {
        const size = Math.max(avgWidth, avgHeight) * 0.8;
        return { ...el, width: size, height: size };
      }
      return {
        ...el,
        width: Math.max(el.width, avgWidth * 0.6),
        height: Math.max(el.height, avgHeight * 0.6),
      };
    });
    const sorted = [...sized].sort((a, b) => a.x - b.x);
    const spacing = 30;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.x < prev.x + prev.width + spacing) {
        sorted[i] = { ...curr, x: prev.x + prev.width + spacing };
      }
      if (Math.abs(curr.y - prev.y) < 10) {
        sorted[i] = { ...curr, y: prev.y };
      }
    }
    return sorted;
  }

  exportSVG(diagram: Diagram): string {
    const padding = 40;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of diagram.elements) {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
      if (el.x + el.width > maxX) maxX = el.x + el.width;
      if (el.y + el.height > maxY) maxY = el.y + el.height;
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;
    const offsetX = padding - minX;
    const offsetY = padding - minY;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n`;
    svg += `<defs>\n`;
    svg += `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">\n`;
    svg += `<polygon points="0 0, 10 3.5, 0 7" fill="var(--color-primary-500)" />\n`;
    svg += `</marker>\n`;
    svg += `</defs>\n`;
    svg += `<rect width="100%" height="100%" fill="var(--bg-primary)" />\n`;

    for (const el of diagram.elements) {
      const cx = el.x + offsetX;
      const cy = el.y + offsetY;
      const strokeAttr = `stroke="${el.stroke}" stroke-width="${el.strokeWidth}" fill="${el.fill}"`;
      switch (el.type) {
        case 'rectangle':
          svg += `<rect x="${cx}" y="${cy}" width="${el.width}" height="${el.height}" rx="4" ${strokeAttr} />\n`;
          break;
        case 'circle':
          svg += `<ellipse cx="${cx + el.width / 2}" cy="${cy + el.height / 2}" rx="${el.width / 2}" ry="${el.height / 2}" ${strokeAttr} />\n`;
          break;
        case 'diamond':
          svg += `<polygon points="${cx + el.width / 2},${cy} ${cx + el.width},${cy + el.height / 2} ${cx + el.width / 2},${cy + el.height} ${cx},${cy + el.height / 2}" ${strokeAttr} />\n`;
          break;
        case 'arrow':
          svg += `<line x1="${cx}" y1="${cy}" x2="${cx + el.width}" y2="${cy + el.height}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" marker-end="url(#arrowhead)" />\n`;
          break;
        case 'line':
          svg += `<line x1="${cx}" y1="${cy}" x2="${cx + el.width}" y2="${cy + el.height}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" />\n`;
          break;
        case 'parallelogram':
          svg += `<polygon points="${cx + 10},${cy} ${cx + el.width},${cy} ${cx + el.width - 10},${cy + el.height} ${cx},${cy + el.height}" ${strokeAttr} />\n`;
          break;
        case 'text':
          svg += `<text x="${cx}" y="${cy + 16}" font-family="Inter, sans-serif" font-size="14" fill="${el.stroke}">${escapeXml(el.text)}</text>\n`;
          break;
      }
      if (el.text && el.type !== 'text') {
        svg += `<text x="${cx + el.width / 2}" y="${cy + el.height / 2 + 5}" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="${el.stroke}">${escapeXml(el.text)}</text>\n`;
      }
    }
    svg += `</svg>`;
    return svg;
  }

  exportPNG(diagram: Diagram): Promise<string> {
    return new Promise((resolve, reject) => {
      const svgContent = this.exportSVG(diagram);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context not available')); return; }
      const img = new Image();
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to render SVG')); };
      img.src = url;
    });
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export const diagramEngine = new DiagramEngine();
