/**
 * Blob Stats Calculator
 *
 * Calculates mass, damage, HP, and stability from a Matter.js body.
 * Uses actual body vertices for accurate physics-based stats.
 */

import Matter from 'matter-js';
import type { Stroke, BlobStats } from '@/types/game';
import { STATS } from './constants';
import {
  calculateArea,
  calculatePathLength,
  countSharpCorners,
  calculateSymmetry,
  mergeStrokes,
} from './geometry';

/**
 * Calculate all stats for a blob from its Matter.js body and original strokes.
 *
 * Stats are derived from:
 * - Mass: body vertex area (Shoelace formula)
 * - Damage: sharp corners on the body
 * - HP: ink used + body area
 * - Stability: shape symmetry
 */
export function calculateBlobStats(body: Matter.Body, strokes: Stroke[]): BlobStats {
  const vertices = body.vertices.map((v) => ({ x: v.x, y: v.y }));
  const area = calculateArea(vertices);

  // Mass: based on area
  const rawMass = area * STATS.MASS_MULTIPLIER;
  const mass = clamp(rawMass, STATS.MASS_MIN, STATS.MASS_MAX);
  Matter.Body.setMass(body, Math.max(1, mass));

  // Damage: based on sharp corners
  const sharpCorners = countSharpCorners(vertices, STATS.SHARP_ANGLE_THRESHOLD);
  const spikeCorners = countSharpCorners(vertices, STATS.SPIKE_ANGLE_THRESHOLD);
  const damage =
    STATS.BASE_DAMAGE +
    sharpCorners * STATS.DAMAGE_PER_SHARP +
    spikeCorners * STATS.DAMAGE_PER_SPIKE;

  // HP: based on ink used and area
  const inkUsed = strokes.reduce((sum, s) => sum + calculatePathLength(s.points), 0);
  const rawHp = STATS.BASE_HP + area * STATS.HP_PER_AREA + inkUsed * STATS.HP_PER_INK;
  const hp = Math.round(clamp(rawHp, STATS.HP_MIN, STATS.HP_MAX));

  // Stability: based on symmetry
  const symmetry = calculateSymmetry(vertices);
  const stability = Math.round(symmetry * STATS.STABILITY_BASE);

  return {
    mass: Math.round(mass),
    damage: Math.round(damage),
    hp,
    maxHp: hp,
    stability,
  };
}

/**
 * Preview stats before body creation (for UI feedback).
 * Less accurate but useful for showing stats during drawing.
 */
export function previewStats(strokes: Stroke[]): Partial<BlobStats> {
  if (strokes.length === 0) return {};

  const allPoints = mergeStrokes(strokes);
  const inkUsed = strokes.reduce((sum, s) => sum + calculatePathLength(s.points), 0);

  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));
  const approxArea = (maxX - minX) * (maxY - minY) * 0.6;

  const sharpCorners = countSharpCorners(allPoints, STATS.SHARP_ANGLE_THRESHOLD);
  const symmetry = calculateSymmetry(allPoints);

  return {
    hp: Math.round(
      clamp(
        STATS.BASE_HP + approxArea * STATS.HP_PER_AREA + inkUsed * STATS.HP_PER_INK,
        STATS.HP_MIN,
        STATS.HP_MAX
      )
    ),
    damage: Math.round(STATS.BASE_DAMAGE + sharpCorners * STATS.DAMAGE_PER_SHARP),
    stability: Math.round(symmetry * STATS.STABILITY_BASE),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
