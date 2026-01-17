/**
 * Blob Body Creator
 * 
 * Converts player strokes into Matter.js physics bodies.
 */

import Matter from 'matter-js';
import type { Stroke, BlobStats, BlobBody } from '@/types/game';
import { PHYSICS } from './constants';
import { calculateBlobStats } from './calculateStats';
import {
  mergeStrokes,
  simplifyPath,
  normalizePoints,
  convexHull,
  getBoundingBox,
} from './geometry';

export interface CreateBlobOptions {
  x: number;
  y: number;
  scale?: number;
  label?: string;
  color?: string;
}

/**
 * Create a Matter.js body from strokes.
 * Returns body with calculated stats, or fallback circle if conversion fails.
 */
export function createBlobBody(
  strokes: Stroke[],
  options: CreateBlobOptions
): BlobBody | null {
  if (strokes.length === 0) return null;
  
  // 1. Merge all stroke points
  const rawPoints = mergeStrokes(strokes);
  if (rawPoints.length < PHYSICS.MIN_VERTICES) {
    return createFallbackBlob(options);
  }
  
  // 2. Simplify path to reduce vertices
  let points = simplifyPath(rawPoints, PHYSICS.SIMPLIFY_TOLERANCE);
  
  // 3. Create convex hull (Matter.js works best with convex shapes)
  points = convexHull(points);
  if (points.length < PHYSICS.MIN_VERTICES) {
    return createFallbackBlob(options);
  }
  
  // 4. Limit max vertices
  if (points.length > PHYSICS.MAX_VERTICES) {
    points = simplifyPath(points, PHYSICS.SIMPLIFY_TOLERANCE * 2);
  }
  
  // 5. Center at origin and scale
  const scale = options.scale ?? 1;
  const normalized = normalizePoints(points);
  const scaled = normalized.map(p => ({ x: p.x * scale, y: p.y * scale }));
  
  // 6. Convert to Matter.js vertices
  const vertices = scaled.map(p => Matter.Vector.create(p.x, p.y));
  
  // 7. Create the body
  try {
    const body = Matter.Bodies.fromVertices(
      options.x,
      options.y,
      [vertices],
      {
        label: options.label ?? 'blob',
        restitution: PHYSICS.RESTITUTION,
        friction: PHYSICS.FRICTION,
        frictionAir: PHYSICS.FRICTION_AIR,
        render: {
          fillStyle: options.color ?? '#4ade80',
          strokeStyle: '#1f2937',
          lineWidth: 3,
        },
      },
      true // Flag to calculate inertia from vertices
    );
    
    if (!body) {
      return createFallbackBlob(options);
    }
    
    // 8. Calculate and apply stats
    const stats = calculateBlobStats(body, strokes);
    
    return { body, stats };
  } catch {
    return createFallbackBlob(options);
  }
}

/**
 * Create a fallback circular blob when stroke conversion fails.
 */
function createFallbackBlob(options: CreateBlobOptions): BlobBody {
  const radius = 30;
  
  const body = Matter.Bodies.circle(options.x, options.y, radius, {
    label: options.label ?? 'blob',
    restitution: PHYSICS.RESTITUTION,
    friction: PHYSICS.FRICTION,
    frictionAir: PHYSICS.FRICTION_AIR,
    render: {
      fillStyle: options.color ?? '#4ade80',
      strokeStyle: '#1f2937',
      lineWidth: 3,
    },
  });
  
  // Default stats for fallback blob
  const stats: BlobStats = {
    mass: 10,
    damage: 5,
    hp: 50,
    maxHp: 50,
    stability: 80,
  };
  
  Matter.Body.setMass(body, stats.mass);
  
  return { body, stats };
}

/**
 * Calculate scale factor to fit blob within bounds.
 */
export function scaleBlobToFit(
  strokes: Stroke[],
  maxWidth: number,
  maxHeight: number
): number {
  const allPoints = mergeStrokes(strokes);
  const bbox = getBoundingBox(allPoints);
  
  if (bbox.width === 0 || bbox.height === 0) return 1;
  
  const scaleX = maxWidth / bbox.width;
  const scaleY = maxHeight / bbox.height;
  
  // Don't scale up, only down
  return Math.min(scaleX, scaleY, 1);
}
