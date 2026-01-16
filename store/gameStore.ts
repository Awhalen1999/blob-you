// store/gameStore.ts
import { create } from 'zustand';
import type { GamePhase, User, Stroke, BlobStats, GameMode, NPCDifficulty } from '@/types/game';

type GameStore = {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Game phase
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;

  // Game mode
  gameMode: GameMode | null;
  setGameMode: (mode: GameMode) => void;
  npcDifficulty: NPCDifficulty;
  setNPCDifficulty: (difficulty: NPCDifficulty) => void;

  // Room/Lobby
  roomCode: string | null;
  setRoomCode: (code: string | null) => void;
  isHost: boolean;
  setIsHost: (isHost: boolean) => void;
  opponent: User | null;
  setOpponent: (opponent: User | null) => void;

  // Drawing
  myStrokes: Stroke[];
  opponentStrokes: Stroke[];
  addMyStroke: (stroke: Stroke) => void;
  addOpponentStroke: (stroke: Stroke) => void;
  clearStrokes: () => void;
  
  inkRemaining: number;
  decreaseInk: (amount: number) => void;
  resetInk: () => void;
  
  drawingTimeLeft: number;
  setDrawingTimeLeft: (time: number) => void;

  // Fight
  myBlob: BlobStats | null;
  opponentBlob: BlobStats | null;
  setMyBlob: (blob: BlobStats) => void;
  setOpponentBlob: (blob: BlobStats) => void;
  
  winner: 'me' | 'opponent' | null;
  setWinner: (winner: 'me' | 'opponent' | null) => void;

  // Actions
  reset: () => void;
};

const INITIAL_INK = 100;
const DRAWING_TIME = 30;

export const useGameStore = create<GameStore>((set) => ({
  // Auth
  user: null,
  setUser: (user) => set({ user }),

  // Game phase
  phase: 'menu',
  setPhase: (phase) => set({ phase }),

  // Game mode
  gameMode: null,
  setGameMode: (mode) => set({ gameMode: mode }),
  npcDifficulty: 'medium',
  setNPCDifficulty: (difficulty) => set({ npcDifficulty: difficulty }),

  // Room
  roomCode: null,
  setRoomCode: (code) => set({ roomCode: code }),
  isHost: false,
  setIsHost: (isHost) => set({ isHost }),
  opponent: null,
  setOpponent: (opponent) => set({ opponent }),

  // Drawing
  myStrokes: [],
  opponentStrokes: [],
  addMyStroke: (stroke) => set((state) => ({ myStrokes: [...state.myStrokes, stroke] })),
  addOpponentStroke: (stroke) => set((state) => ({ opponentStrokes: [...state.opponentStrokes, stroke] })),
  clearStrokes: () => set({ myStrokes: [], opponentStrokes: [] }),
  
  inkRemaining: INITIAL_INK,
  decreaseInk: (amount) => set((state) => ({ inkRemaining: Math.max(0, state.inkRemaining - amount) })),
  resetInk: () => set({ inkRemaining: INITIAL_INK }),
  
  drawingTimeLeft: DRAWING_TIME,
  setDrawingTimeLeft: (time) => set({ drawingTimeLeft: time }),

  // Fight
  myBlob: null,
  opponentBlob: null,
  setMyBlob: (blob) => set({ myBlob: blob }),
  setOpponentBlob: (blob) => set({ opponentBlob: blob }),
  
  winner: null,
  setWinner: (winner) => set({ winner }),

  // Reset
  reset: () => set({
    phase: 'menu',
    gameMode: null,
    roomCode: null,
    isHost: false,
    opponent: null,
    myStrokes: [],
    opponentStrokes: [],
    inkRemaining: INITIAL_INK,
    drawingTimeLeft: DRAWING_TIME,
    myBlob: null,
    opponentBlob: null,
    winner: null,
  }),
}));