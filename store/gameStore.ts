import { create } from 'zustand';
import type { GamePhase, User, Stroke, GameMode } from '@/types/game';

type GameStore = {
  // Core game state
  phase: GamePhase;
  gameMode: GameMode | null;
  isHost: boolean;

  // Room
  roomCode: string | null;
  opponent: User | null;

  // Drawing
  myStrokes: Stroke[];
  opponentStrokes: Stroke[];
  inkRemaining: number;

  // Battle
  battleSeed: number | null;
  winner: 'me' | 'opponent' | 'tie' | null;
  playerSessionWins: number;
  opponentSessionWins: number;

  // Actions
  setPhase: (phase: GamePhase) => void;
  setGameMode: (mode: GameMode) => void;
  setIsHost: (isHost: boolean) => void;
  setRoomCode: (code: string | null) => void;
  setOpponent: (opponent: User | null) => void;
  addMyStroke: (stroke: Stroke) => void;
  setOpponentStrokes: (strokes: Stroke[]) => void;
  clearStrokes: () => void;
  decreaseInk: (amount: number) => void;
  resetInk: () => void;
  setBattleSeed: (seed: number | null) => void;
  setWinner: (winner: 'me' | 'opponent' | 'tie' | null) => void;
  addPlayerWin: () => void;
  addOpponentWin: () => void;
  reset: () => void;
};

const INITIAL_INK = 100;

const initialState = {
  phase: 'menu' as GamePhase,
  gameMode: null as GameMode | null,
  isHost: false,
  roomCode: null,
  opponent: null,
  myStrokes: [] as Stroke[],
  opponentStrokes: [] as Stroke[],
  inkRemaining: INITIAL_INK,
  battleSeed: null,
  winner: null,
  playerSessionWins: 0,
  opponentSessionWins: 0,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setIsHost: (isHost) => set({ isHost }),
  setRoomCode: (code) => set({ roomCode: code }),
  setOpponent: (opponent) => set({ opponent }),

  addMyStroke: (stroke) => set((state) => ({ myStrokes: [...state.myStrokes, stroke] })),
  setOpponentStrokes: (strokes) => set({ opponentStrokes: strokes }),
  clearStrokes: () => set({ myStrokes: [], opponentStrokes: [] }),

  decreaseInk: (amount) => set((state) => ({ inkRemaining: Math.max(0, state.inkRemaining - amount) })),
  resetInk: () => set({ inkRemaining: INITIAL_INK }),

  setBattleSeed: (seed) => set({ battleSeed: seed }),
  setWinner: (winner) => set({ winner }),
  addPlayerWin: () => set((state) => ({ playerSessionWins: state.playerSessionWins + 1 })),
  addOpponentWin: () => set((state) => ({ opponentSessionWins: state.opponentSessionWins + 1 })),

  reset: () => set(initialState),
}));
