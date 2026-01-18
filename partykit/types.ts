import type { Stroke } from '@/types/game';

/** Player role in a room */
export type PlayerRole = 'host' | 'guest';

/** Room state synchronized to all clients */
export type RoomState = {
  hostId: string | null;
  guestId: string | null;
  hostName: string | null;
  guestName: string | null;
  // Lobby ready (clicked "Start Drawing")
  hostLobbyReady: boolean;
  guestLobbyReady: boolean;
  // Drawing ready (submitted strokes)
  hostReady: boolean;
  guestReady: boolean;
  hostStrokes: Stroke[] | null;
  guestStrokes: Stroke[] | null;
  phase: 'waiting' | 'drawing' | 'fighting';
};

// ===========================================
// CLIENT → SERVER MESSAGES
// ===========================================

export type JoinMessage = {
  type: 'join';
  name: string;
};

export type LobbyReadyMessage = {
  type: 'lobby_ready';
};

export type ReadyMessage = {
  type: 'ready';
  strokes: Stroke[];
};

export type RematchMessage = {
  type: 'rematch';
};

export type ClientMessage = JoinMessage | LobbyReadyMessage | ReadyMessage | RematchMessage;

// ===========================================
// SERVER → CLIENT MESSAGES
// ===========================================

export type WelcomeMessage = {
  type: 'welcome';
  role: PlayerRole;
  roomState: RoomState;
};

export type PlayerJoinedMessage = {
  type: 'player_joined';
  role: PlayerRole;
  name: string;
};

export type PlayerLeftMessage = {
  type: 'player_left';
  role: PlayerRole;
};

export type PlayerLobbyReadyMessage = {
  type: 'player_lobby_ready';
  role: PlayerRole;
};

export type DrawingStartMessage = {
  type: 'drawing_start';
};

export type PlayerReadyMessage = {
  type: 'player_ready';
  role: PlayerRole;
};

export type BattleStartMessage = {
  type: 'battle_start';
  hostStrokes: Stroke[];
  guestStrokes: Stroke[];
};

export type RematchStartMessage = {
  type: 'rematch_start';
};

export type RoomFullMessage = {
  type: 'room_full';
};

export type ErrorMessage = {
  type: 'error';
  message: string;
};

export type ServerMessage =
  | WelcomeMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerLobbyReadyMessage
  | DrawingStartMessage
  | PlayerReadyMessage
  | BattleStartMessage
  | RematchStartMessage
  | RoomFullMessage
  | ErrorMessage;
