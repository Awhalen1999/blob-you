/**
 * Physics Engine Configuration
 * 
 * All tunable values in one place for easy balancing.
 * Adjust these to change game feel without touching logic.
 */

// ===========================================
// PHYSICS
// ===========================================

export const PHYSICS = {
  /** Zero gravity for top-down arena */
  GRAVITY: { x: 0, y: 0 },
  
  /** Body properties */
  RESTITUTION: 1.0,       // Perfect bounce (no energy loss)
  FRICTION: 0.01,         // Very low surface friction
  FRICTION_AIR: 0.002,    // Almost no air resistance - keeps moving!
  
  /** Initial velocity on spawn */
  INITIAL_SPEED: 5,       // Starting speed
  INITIAL_SPIN: 0.05,     // Starting angular velocity
  
  /** Vertex simplification */
  MIN_VERTICES: 3,
  MAX_VERTICES: 30,
  SIMPLIFY_TOLERANCE: 5,  // Douglas-Peucker tolerance
  
  /** Scale factor: drawing canvas → arena */
  BLOB_SCALE: 0.5,
};

// ===========================================
// STATS CALCULATION
// ===========================================

export const STATS = {
  /** Mass: area × multiplier */
  MASS_MULTIPLIER: 0.0008,
  MASS_MIN: 1,
  MASS_MAX: 50,
  
  /** Sharpness: angle threshold (degrees) */
  SHARP_ANGLE_THRESHOLD: 90,   // Angles below this count as "sharp"
  SPIKE_ANGLE_THRESHOLD: 60,   // Extra sharp = bonus damage
  
  /** Damage formula */
  BASE_DAMAGE: 5,
  DAMAGE_PER_SHARP: 3,         // Per sharp corner
  DAMAGE_PER_SPIKE: 5,         // Per extra-sharp corner
  
  /** HP formula */
  BASE_HP: 50,
  HP_PER_AREA: 0.02,           // Larger = more HP
  HP_PER_INK: 0.5,             // More ink used = more HP
  HP_MIN: 30,
  HP_MAX: 200,
  
  /** Stability: affects tipping */
  STABILITY_BASE: 100,
};

// ===========================================
// COMBAT
// ===========================================

export const COMBAT = {
  /** Damage calculation */
  MIN_IMPACT_VELOCITY: 2,      // Below this = no damage (higher threshold for bouncing)
  VELOCITY_FACTOR: 0.5,        // How much speed affects damage
  MASS_FACTOR: 0.15,           // How much mass affects damage
  SHARPNESS_FACTOR: 0.12,      // How much sharpness affects damage
};

// ===========================================
// ARENA
// ===========================================

export const ARENA = {
  WIDTH: 700,
  HEIGHT: 500,
  WALL_THICKNESS: 50,
  SPAWN_OFFSET: 200,           // Distance from center for spawn
};
