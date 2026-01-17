/**
 * Physics Engine
 * 
 * Clean exports for the blob battle system.
 */

// Configuration (tunable values)
export * from './constants';

// Geometry (pure math utilities)
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
export { calculateCollisionDamage, createArenaWalls } from './combat';
