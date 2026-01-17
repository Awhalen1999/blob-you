import type Matter from 'matter-js';

/** 2D coordinate */
export type Point = {
  x: number;
  y: number;
};

/** Drawing stroke with timestamp */
export type Stroke = {
  points: Point[];
  timestamp: number;
};

/** Blob combat stats */
export type BlobStats = {
  mass: number;
  damage: number;
  hp: number;
  maxHp: number;
  stability: number;
};

/** Matter.js body with calculated stats */
export type BlobBody = {
  body: Matter.Body;
  stats: BlobStats;
};

/** Game flow phases */
export type GamePhase = 'menu' | 'lobby' | 'drawing' | 'fighting' | 'gameover';

/** User profile */
export type User = {
  id: string;
  username: string;
  avatar: string;
};

/** Game mode selection */
export type GameMode = 'npc' | 'multiplayer';

/** NPC difficulty levels */
export type NPCDifficulty = 'easy' | 'medium' | 'hard';

/** Power-up types */
export type PowerUpType = 'damage' | 'heal' | 'shield' | 'regen';

/** Power-up on the arena field */
export type ArenaPoweUp = {
  id: number;
  x: number;
  y: number;
  type: PowerUpType;
};
