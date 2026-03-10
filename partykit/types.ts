import type { Stroke } from '@/types/game';

/** Player role in a room */
export type PlayerRole = 'host' | 'guest';

/** Wager status state machine */
export type WagerStatus = 'none' | 'proposed' | 'pending_payment' | 'confirmed' | 'complete';

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
  // Rematch requests
  hostRematchRequested: boolean;
  guestRematchRequested: boolean;
  phase: 'waiting' | 'drawing' | 'fighting';
  // Wager
  wagerStatus: WagerStatus;
  wagerAmount: number;
};

// ===========================================
// CLIENT → SERVER MESSAGES
// ===========================================

export type JoinMessage = {
  type: 'join';
  name: string;
  discordId?: string;
};

export type LobbyReadyMessage = {
  type: 'lobby_ready';
};

export type LobbyUnreadyMessage = {
  type: 'lobby_unready';
};

export type ReadyMessage = {
  type: 'ready';
  strokes: Stroke[];
};

export type RematchRequestMessage = {
  type: 'rematch_request';
};

export type ProposeWagerMessage = {
  type: 'propose_wager';
  amount: number;
};

export type AcceptWagerMessage = {
  type: 'accept_wager';
};

export type DeclineWagerMessage = {
  type: 'decline_wager';
};

export type ReportWinnerMessage = {
  type: 'report_winner';
  winner: 'host' | 'guest' | 'tie';
};

export type ClientMessage =
  | JoinMessage
  | LobbyReadyMessage
  | LobbyUnreadyMessage
  | ReadyMessage
  | RematchRequestMessage
  | ProposeWagerMessage
  | AcceptWagerMessage
  | DeclineWagerMessage
  | ReportWinnerMessage;

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
  hasDiscordId: boolean;
};

export type PlayerLeftMessage = {
  type: 'player_left';
  role: PlayerRole;
};

export type PlayerLobbyReadyMessage = {
  type: 'player_lobby_ready';
  role: PlayerRole;
};

export type PlayerLobbyUnreadyMessage = {
  type: 'player_lobby_unready';
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
  seed: number;
};

export type PlayerRematchRequestedMessage = {
  type: 'player_rematch_requested';
  role: PlayerRole;
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

export type WagerStatusMessage = {
  type: 'wager_status';
  status: WagerStatus;
  amount: number;
};

export type WagerPayoutMessage = {
  type: 'wager_payout';
  winner: 'host' | 'guest' | 'tie';
  amount: number;
};

export type WagerDisputeMessage = {
  type: 'wager_dispute';
};

export type ServerMessage =
  | WelcomeMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerLobbyReadyMessage
  | PlayerLobbyUnreadyMessage
  | DrawingStartMessage
  | PlayerReadyMessage
  | BattleStartMessage
  | PlayerRematchRequestedMessage
  | RematchStartMessage
  | RoomFullMessage
  | ErrorMessage
  | WagerStatusMessage
  | WagerPayoutMessage
  | WagerDisputeMessage;
