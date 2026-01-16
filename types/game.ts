export type Point = {
    x: number;
    y: number;
  };
  
  export type Stroke = {
    points: Point[];
    timestamp: number;
  };
  
  export type BlobStats = {
    mass: number;
    damage: number;
    hp: number;
    maxHp: number;
    stability: number;
  };
  
  export type BlobBody = {
    body: Matter.Body;
    stats: BlobStats;
  };
  
  export type GamePhase = 'menu' | 'lobby' | 'drawing' | 'fighting' | 'gameover';
  
  export type User = {
    id: string;
    username: string;
    avatar: string;
  };
  
  export type GameMode = 'npc' | 'multiplayer';
  
  export type NPCDifficulty = 'easy' | 'medium' | 'hard';