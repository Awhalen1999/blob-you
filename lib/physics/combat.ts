/**
 * Combat System
 *
 * Simple damage: attacker's sharpness stat = damage dealt.
 * Both blobs move at same speed, so damage is purely shape-based.
 */

import Matter from 'matter-js';
import type { BlobStats } from '@/types/game';
import { COMBAT, ARENA, PHYSICS } from '../constants';

/**
 * Calculate damage from a collision.
 *
 * Damage = attacker's sharpness stat (min 5)
 * Simple and predictable: spiky blob = more damage per hit.
 */
export function calculateCollisionDamage(
  attacker: Matter.Body,
  attackerStats: BlobStats,
  defender: Matter.Body
): number {
  const relVelX = attacker.velocity.x - defender.velocity.x;
  const relVelY = attacker.velocity.y - defender.velocity.y;
  const relSpeed = Math.sqrt(relVelX * relVelX + relVelY * relVelY);

  // Need minimum velocity to register a hit
  if (relSpeed < COMBAT.MIN_IMPACT_VELOCITY) return 0;

  // Damage = sharpness stat directly
  return attackerStats.damage;
}

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
    Matter.Bodies.rectangle(w / 2, -t / 2, w + t * 2, t, wallOptions),
    Matter.Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, wallOptions),
    Matter.Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, wallOptions),
    Matter.Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, wallOptions),
  ];
}
