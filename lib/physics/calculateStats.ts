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

  // Mass: based on area (no upper cap)
  const rawMass = area * STATS.MASS_MULTIPLIER;
  const mass = Math.max(STATS.MASS_MIN, rawMass);
  Matter.Body.setMass(body, mass);

  // HP: directly from mass (tank builds)
  const hp = Math.max(STATS.HP_MIN, Math.round(mass * STATS.HP_PER_MASS));

  // Damage: based on sharpness tiers (glass cannon builds)
  // Count each tier: edges (90-120°), corners (<90°), spikes (<60°)
  const allEdges = countSharpCorners(vertices, STATS.EDGE_ANGLE_THRESHOLD);  // < 120°
  const sharpCorners = countSharpCorners(vertices, STATS.SHARP_ANGLE_THRESHOLD);  // < 90°
  const spikeCorners = countSharpCorners(vertices, STATS.SPIKE_ANGLE_THRESHOLD);  // < 60°
  
  // Edges are those between 90-120° (allEdges minus sharp corners)
  const edges = allEdges - sharpCorners;
  
  const damage =
    STATS.BASE_DAMAGE +
    edges * STATS.DAMAGE_PER_EDGE +
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
    // Detailed breakdown for UI
    edges,
    corners: sharpCorners,
    spikes: spikeCorners,
    area: Math.round(area),
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
  const approxMass = Math.max(STATS.MASS_MIN, approxArea * STATS.MASS_MULTIPLIER);

  const allEdges = countSharpCorners(allPoints, STATS.EDGE_ANGLE_THRESHOLD);
  const sharpCorners = countSharpCorners(allPoints, STATS.SHARP_ANGLE_THRESHOLD);
  const spikeCorners = countSharpCorners(allPoints, STATS.SPIKE_ANGLE_THRESHOLD);
  const edges = allEdges - sharpCorners;
  const symmetry = calculateSymmetry(allPoints);

  return {
    hp: Math.max(STATS.HP_MIN, Math.round(approxMass * STATS.HP_PER_MASS)),
    damage: Math.round(
      STATS.BASE_DAMAGE +
      edges * STATS.DAMAGE_PER_EDGE +
      sharpCorners * STATS.DAMAGE_PER_SHARP +
      spikeCorners * STATS.DAMAGE_PER_SPIKE
    ),
    stability: Math.round(symmetry * STATS.STABILITY_BASE),
    edges,
    corners: sharpCorners,
    spikes: spikeCorners,
    area: Math.round(approxArea),
  };
}
