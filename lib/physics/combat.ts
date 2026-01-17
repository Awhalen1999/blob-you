/**
 * Combat System
 * 
 * Handles collision damage and arena setup.
 * Movement is physics-based (bouncing off walls and each other).
 */

import Matter from 'matter-js';
import type { BlobStats } from '@/types/game';
import { COMBAT, ARENA, PHYSICS } from './constants';

// ===========================================
// DAMAGE CALCULATION
// ===========================================

/**
 * Calculate damage from a collision.
 * 
 * Damage formula:
 *   (velocity × velocityFactor + mass × massFactor) × (1 + damage × sharpnessFactor)
 * 
 * - Faster collisions = more damage
 * - Heavier blobs = more damage
 * - Sharper blobs = damage multiplier
 */
export function calculateCollisionDamage(
  attacker: Matter.Body,
  attackerStats: BlobStats,
  defender: Matter.Body
): number {
  // Calculate relative velocity
  const relVelX = attacker.velocity.x - defender.velocity.x;
  const relVelY = attacker.velocity.y - defender.velocity.y;
  const relSpeed = Math.sqrt(relVelX * relVelX + relVelY * relVelY);
  
  // No damage if impact too slow
  if (relSpeed < COMBAT.MIN_IMPACT_VELOCITY) return 0;
  
  // Base damage from velocity and mass
  const velocityDamage = relSpeed * COMBAT.VELOCITY_FACTOR;
  const massDamage = attackerStats.mass * COMBAT.MASS_FACTOR;
  const baseDamage = velocityDamage + massDamage;
  
  // Sharpness multiplier (sharper shapes deal more damage)
  const sharpnessMultiplier = 1 + (attackerStats.damage * COMBAT.SHARPNESS_FACTOR);
  
  const totalDamage = baseDamage * sharpnessMultiplier;
  
  return Math.max(1, Math.round(totalDamage));
}

// ===========================================
// ARENA
// ===========================================

/**
 * Create arena boundary walls.
 * Walls have perfect restitution to bounce blobs back.
 */
export function createArenaWalls(): Matter.Body[] {
  const { WIDTH: w, HEIGHT: h, WALL_THICKNESS: t } = ARENA;
  
  const wallOptions = {
    isStatic: true,
    restitution: PHYSICS.RESTITUTION,
    friction: 0,
    label: 'wall',
    render: { fillStyle: '#1f2937' },
  } as const;
  
  return [
    Matter.Bodies.rectangle(w / 2, -t / 2, w + t * 2, t, wallOptions),         // Top
    Matter.Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, wallOptions),      // Bottom
    Matter.Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, wallOptions),         // Left
    Matter.Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, wallOptions),      // Right
  ];
}
