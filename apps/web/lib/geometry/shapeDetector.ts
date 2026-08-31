/**
 * Dynamic Auto-Geometry Shape Polishing Detector
 * Analyzes raw freehand drawing points to detect intentional geometric shapes:
 * - Circle
 * - Rectangle / Square
 * - Straight Line
 * - Triangle
 * - Arrow
 */

export interface Point {
  x: number;
  y: number;
}

export type DetectedShapeType = 'circle' | 'rectangle' | 'line' | 'triangle' | 'arrow';

export interface PolishedShapeResult {
  type: DetectedShapeType;
  confidence: number; // 0 to 1
  polishedPoints: Point[];
  bounds: { x: number; y: number; width: number; height: number };
}

export function detectPolishedShape(points: Point[]): PolishedShapeResult | null {
  if (!points || points.length < 5) return null;

  const numPoints = points.length;
  const start = points[0];
  const end = points[numPoints - 1];

  // 1. Calculate Bounding Box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let totalLength = 0;

  for (let i = 0; i < numPoints; i++) {
    const pt = points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;

    if (i > 0) {
      const prev = points[i - 1];
      totalLength += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 10 || height < 10) return null; // Too small

  const startEndDist = Math.hypot(end.x - start.x, end.y - start.y);
  const closureRatio = startEndDist / Math.max(1, totalLength); // Close to 0 -> Closed shape

  // 2. Check for Straight Line (Open path with start-to-end distance ~ total length)
  const lineDirectness = startEndDist / Math.max(1, totalLength);
  if (closureRatio > 0.75 && lineDirectness > 0.88) {
    // Check if it's an Arrow (drawn with quick tip at the end)
    const isArrow = checkIsArrow(points);
    if (isArrow) {
      return {
        type: 'arrow',
        confidence: 0.9,
        polishedPoints: createArrowPoints(start, end),
        bounds: { x: minX, y: minY, width, height }
      };
    }

    return {
      type: 'line',
      confidence: 0.95,
      polishedPoints: [start, end],
      bounds: { x: minX, y: minY, width, height }
    };
  }

  // 3. Check Closed Shapes (Circle, Rectangle, Triangle)
  if (closureRatio < 0.35) {
    const area = width * height;
    const perimeter = 2 * (width + height);
    const circularity = (4 * Math.PI * area) / Math.max(1, perimeter * perimeter);
    const aspectRatio = Math.min(width, height) / Math.max(width, height);

    // Circle / Ellipse Detection
    if (circularity > 0.55 && aspectRatio > 0.6) {
      const cx = minX + width / 2;
      const cy = minY + height / 2;
      const rx = width / 2;
      const ry = height / 2;
      const circlePoints: Point[] = [];
      const steps = 36;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * 2 * Math.PI;
        circlePoints.push({
          x: cx + rx * Math.cos(theta),
          y: cy + ry * Math.sin(theta)
        });
      }

      return {
        type: 'circle',
        confidence: 0.92,
        polishedPoints: circlePoints,
        bounds: { x: minX, y: minY, width, height }
      };
    }

    // Rectangle / Square Detection (Low circularity, ~4 corners)
    const corners = detectCorners(points);
    if (corners.length >= 3 && corners.length <= 5) {
      const rectPoints: Point[] = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
        { x: minX, y: minY }
      ];

      return {
        type: 'rectangle',
        confidence: 0.88,
        polishedPoints: rectPoints,
        bounds: { x: minX, y: minY, width, height }
      };
    }

    // Triangle Detection (3 sharp corners)
    if (corners.length === 3) {
      return {
        type: 'triangle',
        confidence: 0.85,
        polishedPoints: [...corners, corners[0]],
        bounds: { x: minX, y: minY, width, height }
      };
    }
  }

  // Low confidence -> Return null (Keep rough handwriting)
  return null;
}

function checkIsArrow(points: Point[]): boolean {
  if (points.length < 8) return false;
  // Look at last 20% of points for a sharp direction shift
  const lastSegment = points.slice(Math.floor(points.length * 0.8));
  let sharpTurns = 0;
  for (let i = 1; i < lastSegment.length - 1; i++) {
    const p1 = lastSegment[i - 1];
    const p2 = lastSegment[i];
    const p3 = lastSegment[i + 1];
    const angle = Math.abs(Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p2.y - p1.y, p2.x - p1.x));
    if (angle > Math.PI / 4) sharpTurns++;
  }
  return sharpTurns >= 1;
}

function createArrowPoints(start: Point, end: Point): Point[] {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLen = 16;
  const headAngle = Math.PI / 6;

  const leftWing = {
    x: end.x - headLen * Math.cos(angle - headAngle),
    y: end.y - headLen * Math.sin(angle - headAngle)
  };
  const rightWing = {
    x: end.x - headLen * Math.cos(angle + headAngle),
    y: end.y - headLen * Math.sin(angle + headAngle)
  };

  return [start, end, leftWing, end, rightWing];
}

function detectCorners(points: Point[]): Point[] {
  const corners: Point[] = [];
  const step = Math.max(1, Math.floor(points.length / 20));

  for (let i = step; i < points.length - step; i += step) {
    const p1 = points[i - step];
    const p2 = points[i];
    const p3 = points[i + step];

    const a1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const a2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    let angleDiff = Math.abs(a2 - a1);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    if (angleDiff > Math.PI / 3) {
      // Avoid duplicate corners close together
      if (corners.length === 0 || Math.hypot(p2.x - corners[corners.length - 1].x, p2.y - corners[corners.length - 1].y) > 20) {
        corners.push(p2);
      }
    }
  }

  return corners;
}
