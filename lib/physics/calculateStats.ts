/**
 * Blob Stats Calculator
 *
 * Simple stat system based on shape:
 * - HP from mass (big blob = tank)
 * - Damage from sharpness (spiky blob = glass cannon)
 */

import Matter from 'matter-js';
import type { Stroke, BlobStats } from '@/types/game';
import { STATS } from './constants';
import {
  calculateArea,
  countSharpCorners,
  calculateSymmetry,
  mergeStrokes,
} from './geometry';

/**
 * Calculate all stats for a blob from its Matter.js body.
 *
 * HP = mass × 5 (min 100) - bigger shapes survive longer
 * Damage = sharpness - spikier shapes hit harder
 */
export function calculateBlobStats(body: Matter.Body, strokes: Stroke[]): BlobStats {
  void strokes; // Not used but kept for API compatibility
  const vertices = body.vertices.map((v) => ({ x: v.x, y: v.y }));
  const area = calculateArea(vertices);

  // Mass: based on area (1-50 range)
  const rawMass = area * STATS.MASS_MULTIPLIER;
  const mass = clamp(rawMass, STATS.MASS_MIN, STATS.MASS_MAX);
  Matter.Body.setMass(body, Math.max(1, mass));

  // HP: directly from mass (tank builds)
  const hp = Math.max(STATS.HP_MIN, Math.round(mass * STATS.HP_PER_MASS));

  // Damage: based on sharp corners (glass cannon builds)
  const sharpCorners = countSharpCorners(vertices, STATS.SHARP_ANGLE_THRESHOLD);
  const spikeCorners = countSharpCorners(vertices, STATS.SPIKE_ANGLE_THRESHOLD);
  const damage =
    STATS.BASE_DAMAGE +
    sharpCorners * STATS.DAMAGE_PER_SHARP +
    spikeCorners * STATS.DAMAGE_PER_SPIKE;

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
 */
export function previewStats(strokes: Stroke[]): Partial<BlobStats> {
  if (strokes.length === 0) return {};

  const allPoints = mergeStrokes(strokes);

  // Approximate area from bounding box
  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));
  const approxArea = (maxX - minX) * (maxY - minY) * 0.6;

  // Approximate mass from area
  const approxMass = clamp(approxArea * STATS.MASS_MULTIPLIER, STATS.MASS_MIN, STATS.MASS_MAX);

  const sharpCorners = countSharpCorners(allPoints, STATS.SHARP_ANGLE_THRESHOLD);
  const symmetry = calculateSymmetry(allPoints);

  return {
    hp: Math.max(STATS.HP_MIN, Math.round(approxMass * STATS.HP_PER_MASS)),
    damage: Math.round(STATS.BASE_DAMAGE + sharpCorners * STATS.DAMAGE_PER_SHARP),
    stability: Math.round(symmetry * STATS.STABILITY_BASE),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
