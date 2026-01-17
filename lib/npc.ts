import type { Stroke, Point } from '@/types/game';

export interface NPCBlob {
  name: string;
  color: string;
  strokes: Stroke[];
}

// NPC shapes should be similar SIZE to what players draw (not path length)
// Players draw on a 600x450 canvas, typical blob is ~80-120px radius

/**
 * Generate a circle shape - tanky, high HP, low damage
 */
function generateCircle(cx: number, cy: number, radius: number = 80, segments: number = 24): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }
  return points;
}

/**
 * Generate a square - 4 corners, balanced
 */
function generateSquare(cx: number, cy: number, size: number = 140): Point[] {
  const half = size / 2;
  return [
    { x: cx - half, y: cy - half },
    { x: cx + half, y: cy - half },
    { x: cx + half, y: cy + half },
    { x: cx - half, y: cy + half },
    { x: cx - half, y: cy - half },
  ];
}

/**
 * Generate a triangle - 3 sharp corners
 */
function generateTriangle(cx: number, cy: number, size: number = 160): Point[] {
  const height = size * 0.866;
  return [
    { x: cx, y: cy - height / 2 },
    { x: cx + size / 2, y: cy + height / 2 },
    { x: cx - size / 2, y: cy + height / 2 },
    { x: cx, y: cy - height / 2 },
  ];
}

/**
 * Generate a star - 5 sharp points, high damage
 */
function generateStar(cx: number, cy: number, numPoints: number = 5): Point[] {
  const outerRadius = 180; // Doubled from 90
  const innerRadius = 80; // Doubled from 40
  const starPoints: Point[] = [];
  
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (i / (numPoints * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    starPoints.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }
  starPoints.push(starPoints[0]);
  return starPoints;
}

/**
 * Generate a spike ball - lots of sharp points, glass cannon
 */
function generateSpikeBall(cx: number, cy: number, spikes: number = 8): Point[] {
  const baseRadius = 90; // Doubled from 45
  const spikeLength = 100; // Doubled from 50
  const points: Point[] = [];

  for (let i = 0; i < spikes; i++) {
    const baseAngle = (i / spikes) * Math.PI * 2;
    const nextAngle = ((i + 1) / spikes) * Math.PI * 2;

    // Base point
    points.push({
      x: cx + Math.cos(baseAngle) * baseRadius,
      y: cy + Math.sin(baseAngle) * baseRadius,
    });

    // Spike tip (sharp!)
    const midAngle = (baseAngle + nextAngle) / 2;
    points.push({
      x: cx + Math.cos(midAngle) * (baseRadius + spikeLength),
      y: cy + Math.sin(midAngle) * (baseRadius + spikeLength),
    });
  }

  points.push(points[0]);
  return points;
}

/**
 * Generate an organic blob shape (wobbly circle)
 */
function generateOrganicBlob(cx: number, cy: number, segments: number = 20): Point[] {
  const avgRadius = 150; // Doubled from 75
  const wobble = 40; // Doubled from 20
  const points: Point[] = [];
  const seed = Math.random() * 1000;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const noise = Math.sin(seed + angle * 3) * wobble + Math.sin(seed * 2 + angle * 5) * wobble * 0.5;
    const radius = avgRadius + noise;
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }
  return points;
}

/**
 * Generate a diamond (rotated square) - 4 sharp corners
 */
function generateDiamond(cx: number, cy: number): Point[] {
  const width = 120; // Doubled from 60
  const height = 200; // Doubled from 100
  return [
    { x: cx, y: cy - height / 2 },
    { x: cx + width / 2, y: cy },
    { x: cx, y: cy + height / 2 },
    { x: cx - width / 2, y: cy },
    { x: cx, y: cy - height / 2 },
  ];
}

/**
 * Convert points to a stroke
 */
function pointsToStroke(points: Point[]): Stroke {
  return {
    points,
    timestamp: Date.now(),
  };
}

// Pre-defined NPC blobs - sized to match typical player drawings
// Numbers: (200, 200) = center coordinates, third number = shape-specific size (doubled)
const NPC_BLOBS: NPCBlob[] = [
  {
    name: 'Blobby',
    color: '#60a5fa',
    strokes: [pointsToStroke(generateCircle(200, 200, 140))], // radius = 140 (was 70)
  },
  {
    name: 'Boxxy',
    color: '#a78bfa',
    strokes: [pointsToStroke(generateSquare(200, 200, 180))], // side length = 180 (reduced from 240 for balance)
  },
  {
    name: 'Triforce',
    color: '#fbbf24',
    strokes: [pointsToStroke(generateTriangle(200, 200, 260))], // side length = 260 (was 130)
  },
  {
    name: 'Goopy',
    color: '#FF2ED5',
    strokes: [pointsToStroke(generateOrganicBlob(200, 200))], // uses hardcoded size (will update function)
  },
  {
    name: 'Gem',
    color: '#06b6d4',
    strokes: [pointsToStroke(generateDiamond(200, 200))], // uses hardcoded size (will update function)
  },
  {
    name: 'Starro',
    color: '#f472b6',
    strokes: [pointsToStroke(generateStar(200, 200, 5))], // uses hardcoded size (will update function)
  },
  {
    name: 'Spike Lord',
    color: '#ef4444',
    strokes: [pointsToStroke(generateSpikeBall(200, 200, 8))], // uses hardcoded size (will update function)
  },
];

/**
 * Get a random NPC from all available NPCs
 */
export function getRandomNPC(): NPCBlob {
  return NPC_BLOBS[Math.floor(Math.random() * NPC_BLOBS.length)];
}

/**
 * Get NPC strokes by name
 */
export function getNPCByName(name: string): NPCBlob | undefined {
  return NPC_BLOBS.find((npc) => npc.name === name);
}

/**
 * Get all available NPC names
 */
export function getAllNPCNames(): string[] {
  return NPC_BLOBS.map((npc) => npc.name);
}
