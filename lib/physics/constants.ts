/**
 * Physics Engine Configuration
 *
 * All tunable values for game balancing.
 * Adjust these to change game feel without touching logic.
 */

import { Skull, Heart, Shield, Zap } from 'lucide-react';

/** Physics body properties */
export const PHYSICS = {
  /** Zero gravity for top-down arena */
  GRAVITY: { x: 0, y: 0 },

  /** Body material properties */
  RESTITUTION: 1.0,
  FRICTION: 0.01,
  FRICTION_AIR: 0.002,

  /** Initial velocity on spawn */
  INITIAL_SPEED: 5,
  INITIAL_SPIN: 0.05,

  /** Vertex simplification */
  MIN_VERTICES: 3,
  MAX_VERTICES: 30,
  SIMPLIFY_TOLERANCE: 5,

  /** Scale factor: drawing canvas → arena */
  BLOB_SCALE: 0.5,
} as const;

/** Blob stat calculation */
export const STATS = {
  /** Mass calculation */
  MASS_MULTIPLIER: 0.0008,
  MASS_MIN: 1,
  MASS_MAX: 50,

  /** Sharpness thresholds (degrees) */
  SHARP_ANGLE_THRESHOLD: 90,
  SPIKE_ANGLE_THRESHOLD: 60,

  /** Damage formula */
  BASE_DAMAGE: 5,
  DAMAGE_PER_SHARP: 3,
  DAMAGE_PER_SPIKE: 5,

  /** HP formula */
  BASE_HP: 50,
  HP_PER_AREA: 0.02,
  HP_PER_INK: 0.5,
  HP_MIN: 30,
  HP_MAX: 200,

  /** Stability */
  STABILITY_BASE: 100,
} as const;

/** Combat damage calculation */
export const COMBAT = {
  MIN_IMPACT_VELOCITY: 2,
  VELOCITY_FACTOR: 0.3,
  MASS_FACTOR: 0.08,
  SHARPNESS_FACTOR: 0.25,
} as const;

/** Arena dimensions */
export const ARENA = {
  WIDTH: 700,
  HEIGHT: 500,
  WALL_THICKNESS: 50,
  SPAWN_OFFSET: 200,
} as const;

/** Power-up configuration */
export const POWERUP = {
  /** HP thresholds that trigger spawns */
  TRIGGER_HP_1: 160,
  TRIGGER_HP_2: 120,
  TRIGGER_HP_3: 80,
  TRIGGER_HP_4: 40,

  /** Visual */
  RADIUS: 15,

  /** Effect values */
  DOUBLE_DAMAGE_MULT: 2,
  HEAL_AMOUNT: 20,
  REGEN_HEAL_AMOUNT: 2,
} as const;

/** Power-up render colors (hex) */
export const POWERUP_COLORS = {
  damage: '#ef4444',
  heal: '#22c55e',
  shield: '#3b82f6',
  regen: '#f59e0b',
} as const;

export const POWERUP_BORDER_COLORS = {
  damage: '#b91c1c',
  heal: '#15803d',
  shield: '#1d4ed8',
  regen: '#b45309',
} as const;

/** Power-up icons */
export const POWERUP_ICONS = {
  damage: Skull,
  heal: Heart,
  shield: Shield,
  regen: Zap,
} as const;

/** Power-up labels */
export const POWERUP_LABELS = {
  damage: '2x DMG',
  heal: '+20',
  shield: 'SHIELD',
  regen: 'REGEN',
} as const;


