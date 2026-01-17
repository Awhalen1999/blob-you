/**
 * Physics Engine
 * 
 * Clean exports for the physics system.
 */

// Configuration
export * from './constants';

// Geometry utilities
export {
  calculateArea,
  calculateVertexAngle,
  countSharpCorners,
  calculateCentroid,
  calculateSymmetry,
  calculatePathLength,
  simplifyPath,
  normalizePoints,
  getBoundingBox,
  convexHull,
  mergeStrokes,
} from './geometry';

// Stats calculation
export { calculateBlobStats, previewStats } from './calculateStats';

// Blob creation
export { createBlobBody, scaleBlobToFit } from './createBlob';
export type { CreateBlobOptions } from './createBlob';

// Combat
export {
  calculateCollisionDamage,
  applyChargeForce,
  applySpin,
  applyGravityPull,
  createArenaWalls,
  decideCombatAction,
  executeCombatAction,
} from './combat';
export type { CombatAction } from './combat';

