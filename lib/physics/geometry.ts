/**
 * Geometry Utilities
 *
 * Pure math functions for shape analysis.
 * No Matter.js dependencies - works with simple {x, y} points.
 */

import type { Point } from '@/types/game';

/**
 * Calculate polygon area using the Shoelace formula.
 * Works for any simple polygon (no self-intersections).
 */
export function calculateArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Calculate angle at a vertex (in degrees).
 * Returns the interior angle formed by prev → current → next.
 */
export function calculateVertexAngle(prev: Point, current: Point, next: Point): number {
  const v1 = { x: prev.x - current.x, y: prev.y - current.y };
  const v2 = { x: next.x - current.x, y: next.y - current.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 180;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Count corners sharper than the threshold angle.
 */
export function countSharpCorners(points: Point[], thresholdDegrees: number): number {
  if (points.length < 3) return 0;

  let count = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];

    const angle = calculateVertexAngle(prev, curr, next);
    if (angle < thresholdDegrees) {
      count++;
    }
  }

  return count;
}

/**
 * Calculate centroid (center of mass) of points.
 */
export function calculateCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };

  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
}

/**
 * Calculate symmetry score (0-1).
 * 1 = perfectly symmetric, 0 = very asymmetric.
 */
export function calculateSymmetry(points: Point[]): number {
  if (points.length < 3) return 0.5;

  const centroid = calculateCentroid(points);

  const distances = points.map((p) =>
    Math.sqrt((p.x - centroid.x) ** 2 + (p.y - centroid.y) ** 2)
  );

  const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
  if (avgDist === 0) return 1;

  const variance =
    distances.reduce((sum, d) => sum + (d - avgDist) ** 2, 0) / distances.length;
  const stdDev = Math.sqrt(variance);

  return Math.max(0, Math.min(1, 1 - stdDev / avgDist));
}

/**
 * Calculate total path length.
 */
export function calculatePathLength(points: Point[]): number {
  if (points.length < 2) return 0;

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

/**
 * Simplify path using Douglas-Peucker algorithm.
 * Reduces vertex count while preserving shape.
 */
export function simplifyPath(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  }

  const t =
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
  const nearestX = lineStart.x + t * dx;
  const nearestY = lineStart.y + t * dy;

  return Math.sqrt((point.x - nearestX) ** 2 + (point.y - nearestY) ** 2);
}

/**
 * Normalize points to be centered at origin.
 */
export function normalizePoints(points: Point[]): Point[] {
  if (points.length === 0) return [];

  const centroid = calculateCentroid(points);
  return points.map((p) => ({
    x: p.x - centroid.x,
    y: p.y - centroid.y,
  }));
}

/**
 * Get bounding box of points.
 */
export function getBoundingBox(points: Point[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Create convex hull from points (Graham scan).
 */
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points;

  const sorted = [...points];
  let lowest = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (
      sorted[i].y < sorted[lowest].y ||
      (sorted[i].y === sorted[lowest].y && sorted[i].x < sorted[lowest].x)
    ) {
      lowest = i;
    }
  }

  [sorted[0], sorted[lowest]] = [sorted[lowest], sorted[0]];
  const pivot = sorted[0];

  const rest = sorted.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
    const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
    return angleA - angleB;
  });

  const hull: Point[] = [pivot];
  for (const point of rest) {
    while (
      hull.length > 1 &&
      crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0
    ) {
      hull.pop();
    }
    hull.push(point);
  }

  return hull;
}

function crossProduct(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Merge multiple stroke point arrays into one.
 */
export function mergeStrokes(strokes: { points: Point[] }[]): Point[] {
  if (strokes.length === 0) return [];
  return strokes.flatMap((s) => s.points);
}
