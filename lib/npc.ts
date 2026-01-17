import type { Stroke, Point } from '@/types/game';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface NPCBlob {
  name: string;
  difficulty: Difficulty;
  color: string;
  strokes: Stroke[];
}

/**
 * Generate a circle shape
 */
function generateCircle(cx: number, cy: number, radius: number, segments: number = 32): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }
  return points;
}

/**
 * Generate a square shape
 */
function generateSquare(cx: number, cy: number, size: number): Point[] {
  const half = size / 2;
  return [
    { x: cx - half, y: cy - half },
    { x: cx + half, y: cy - half },
    { x: cx + half, y: cy + half },
    { x: cx - half, y: cy + half },
    { x: cx - half, y: cy - half }, // Close the shape
  ];
}

/**
 * Generate a triangle shape
 */
function generateTriangle(cx: number, cy: number, size: number): Point[] {
  const height = size * 0.866; // √3/2
  return [
    { x: cx, y: cy - height / 2 },
    { x: cx + size / 2, y: cy + height / 2 },
    { x: cx - size / 2, y: cy + height / 2 },
    { x: cx, y: cy - height / 2 }, // Close
  ];
}

/**
 * Generate a star shape
 */
function generateStar(cx: number, cy: number, outerRadius: number, innerRadius: number, points: number = 5): Point[] {
  const starPoints: Point[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    starPoints.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }
  starPoints.push(starPoints[0]); // Close
  return starPoints;
}

/**
 * Generate a spike ball shape
 */
function generateSpikeBall(cx: number, cy: number, baseRadius: number, spikeLength: number, spikes: number = 8): Point[] {
  const points: Point[] = [];
  const segmentsPerSpike = 3;

  for (let i = 0; i < spikes; i++) {
    const baseAngle = (i / spikes) * Math.PI * 2;
    const nextAngle = ((i + 1) / spikes) * Math.PI * 2;

    // Start of spike base
    points.push({
      x: cx + Math.cos(baseAngle) * baseRadius,
      y: cy + Math.sin(baseAngle) * baseRadius,
    });

    // Spike tip
    const midAngle = (baseAngle + nextAngle) / 2;
    points.push({
      x: cx + Math.cos(midAngle) * (baseRadius + spikeLength),
      y: cy + Math.sin(midAngle) * (baseRadius + spikeLength),
    });
  }

  points.push(points[0]); // Close
  return points;
}

/**
 * Generate an organic blob shape (wobbly circle)
 */
function generateOrganicBlob(cx: number, cy: number, avgRadius: number, wobble: number, segments: number = 24): Point[] {
  const points: Point[] = [];
  const seed = Math.random() * 1000;

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    // Simple noise using sin
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
 * Convert points to a stroke
 */
function pointsToStroke(points: Point[]): Stroke {
  return {
    points,
    timestamp: Date.now(),
  };
}

// Pre-defined NPC blobs
const NPC_BLOBS: NPCBlob[] = [
  // Easy
  {
    name: 'Blobby',
    difficulty: 'easy',
    color: '#60a5fa', // Blue
    strokes: [pointsToStroke(generateCircle(200, 200, 50))],
  },
  {
    name: 'Boxxy',
    difficulty: 'easy',
    color: '#a78bfa', // Purple
    strokes: [pointsToStroke(generateSquare(200, 200, 80))],
  },

  // Medium
  {
    name: 'Triforce',
    difficulty: 'medium',
    color: '#fbbf24', // Yellow
    strokes: [pointsToStroke(generateTriangle(200, 200, 100))],
  },
  {
    name: 'Goopy',
    difficulty: 'medium',
    color: '#34d399', // Green
    strokes: [pointsToStroke(generateOrganicBlob(200, 200, 55, 15))],
  },

  // Hard
  {
    name: 'Starro',
    difficulty: 'hard',
    color: '#f472b6', // Pink
    strokes: [pointsToStroke(generateStar(200, 200, 70, 30, 5))],
  },
  {
    name: 'Spike Lord',
    difficulty: 'hard',
    color: '#ef4444', // Red
    strokes: [pointsToStroke(generateSpikeBall(200, 200, 35, 35, 8))],
  },
];

/**
 * Get all NPCs for a difficulty
 */
export function getNPCsByDifficulty(difficulty: Difficulty): NPCBlob[] {
  return NPC_BLOBS.filter((npc) => npc.difficulty === difficulty);
}

/**
 * Get a random NPC for a difficulty
 */
export function getRandomNPC(difficulty: Difficulty): NPCBlob {
  const npcs = getNPCsByDifficulty(difficulty);
  if (npcs.length === 0) {
    // Fallback to easy if no NPCs found
    return NPC_BLOBS[0];
  }
  return npcs[Math.floor(Math.random() * npcs.length)];
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
