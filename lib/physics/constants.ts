/**
 * Physics Engine Configuration
 *
 * All tunable values for game balancing.
 * Adjust these to change game feel without touching logic.
 */

import { Skull, Heart, Shield, Zap, Bomb } from 'lucide-react';

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
  /** Mass calculation (from area, compensates for 0.5 scale = 0.25 area) */
  MASS_MULTIPLIER: 0.003,
  MASS_MIN: 1,

  /** HP = mass × multiplier (tank builds) */
  HP_PER_MASS: 5,
  HP_MIN: 100,

  /** Sharpness thresholds (degrees) */
  EDGE_ANGLE_THRESHOLD: 135,  // Gentle bend (<135°)
  SHARP_ANGLE_THRESHOLD: 90,  // Sharp corner (<90°)
  SPIKE_ANGLE_THRESHOLD: 60,  // Dangerous spike (<60°)

  /** Damage from sharpness (glass cannon builds) */
  BASE_DAMAGE: 5,
  DAMAGE_PER_EDGE: 1,   // Gentle bends add a little
  DAMAGE_PER_SHARP: 3,  // Sharp corners add more
  DAMAGE_PER_SPIKE: 5,  // Spikes add the most

  /** Stat color thresholds (for UI) */
  DAMAGE_THRESHOLD_LOW: 8,    // Below = blue (weak)
  DAMAGE_THRESHOLD_MED: 15,   // Above = orange (good)
  DAMAGE_THRESHOLD_HIGH: 20,  // Above = red (great)
  MASS_THRESHOLD_LOW: 20,     // Below = blue (light)
  MASS_THRESHOLD_MED: 40,     // Above = orange (heavy)
  MASS_THRESHOLD_HIGH: 55,    // Above = red (massive)
  HP_THRESHOLD_LOW: 100,      // Below = blue (fragile)
  HP_THRESHOLD_MED: 200,      // Above = orange (tanky)
  HP_THRESHOLD_HIGH: 275,     // Above = red (massive tank)

  /** Stability */
  STABILITY_BASE: 100,
} as const;

/** Combat damage calculation */
export const COMBAT = {
  /** Minimum velocity to register a hit */
  MIN_IMPACT_VELOCITY: 2,
  /** Damage = attacker's sharpness stat directly */
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
  /** HP thresholds that trigger spawns (% of maxHp remaining) */
  TRIGGER_HP_PCT_1: 0.8,
  TRIGGER_HP_PCT_2: 0.6,
  TRIGGER_HP_PCT_3: 0.4,
  TRIGGER_HP_PCT_4: 0.2,

  /** Visual */
  RADIUS: 15,

  /** Effect values */
  DOUBLE_DAMAGE_MULT: 2,
  HEAL_AMOUNT: 20,
  REGEN_HEAL_AMOUNT: 2,
  BOMB_DAMAGE: 20,
} as const;

/** Power-up render colors (hex) */
export const POWERUP_COLORS = {
  damage: '#ef4444',
  heal: '#22c55e',
  shield: '#3b82f6',
  regen: '#f59e0b',
  bomb: '#000000',
} as const;

export const POWERUP_BORDER_COLORS = {
  damage: '#b91c1c',
  heal: '#15803d',
  shield: '#1d4ed8',
  regen: '#b45309',
  bomb: '#640000',
} as const;

/** Power-up icons */
export const POWERUP_ICONS = {
  damage: Skull,
  heal: Heart,
  shield: Shield,
  regen: Zap,
  bomb: Bomb,
} as const;

/** Power-up labels */
export const POWERUP_LABELS = {
  damage: '2x DMG',
  heal: '+20',
  shield: 'SHIELD',
  regen: 'REGEN',
  bomb: 'BOMB',
} as const;


