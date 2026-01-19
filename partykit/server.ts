import type * as Party from 'partykit/server';
import type { Stroke } from '@/types/game';
import type { ClientMessage, ServerMessage, RoomState, PlayerRole } from './types';

/** Validate stroke data to prevent crashes from malformed input */
function isValidStroke(stroke: unknown): stroke is Stroke {
  if (!stroke || typeof stroke !== 'object') return false;
  const s = stroke as Record<string, unknown>;
  if (!Array.isArray(s.points)) return false;
  if (typeof s.timestamp !== 'number') return false;
  // Validate points array (limit size to prevent abuse)
  if (s.points.length > 10000) return false;
  for (const point of s.points) {
    if (!point || typeof point !== 'object') return false;
    const p = point as Record<string, unknown>;
    if (typeof p.x !== 'number' || typeof p.y !== 'number') return false;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  }
  return true;
}

function validateStrokes(strokes: unknown): Stroke[] | null {
  if (!Array.isArray(strokes)) return null;
  // Limit total strokes to prevent abuse
  if (strokes.length > 100) return null;
  for (const stroke of strokes) {
    if (!isValidStroke(stroke)) return null;
  }
  return strokes as Stroke[];
}

function createInitialState(): RoomState {
  return {
    hostId: null,
    guestId: null,
    hostName: null,
    guestName: null,
    hostLobbyReady: false,
    guestLobbyReady: false,
    hostReady: false,
    guestReady: false,
    hostStrokes: null,
    guestStrokes: null,
    hostRematchRequested: false,
    guestRematchRequested: false,
    phase: 'waiting',
  };
}

export default class BlobRoom implements Party.Server {
  state: RoomState;

  constructor(readonly room: Party.Room) {
    this.state = createInitialState();
  }

  private log(action: string, data?: Record<string, unknown>) {
    const entry = {
      room: this.room.id,
      action,
      phase: this.state.phase,
      players: [this.state.hostId, this.state.guestId].filter(Boolean).length,
      ...data,
    };
    console.log(`[WS] ${JSON.stringify(entry)}`);
  }

  private send(conn: Party.Connection, message: ServerMessage) {
    conn.send(JSON.stringify(message));
  }

  private broadcast(message: ServerMessage, exclude?: string) {
    const data = JSON.stringify(message);
    for (const conn of this.room.getConnections()) {
      if (conn.id !== exclude) {
        conn.send(data);
      }
    }
  }

  private getRole(connectionId: string): PlayerRole | null {
    if (connectionId === this.state.hostId) return 'host';
    if (connectionId === this.state.guestId) return 'guest';
    return null;
  }

  private checkDrawingStart() {
    if (this.state.hostLobbyReady && this.state.guestLobbyReady) {
      this.state.phase = 'drawing';
      this.log('phase_change', { newPhase: 'drawing' });
      this.broadcast({ type: 'drawing_start' });
    }
  }

  private checkBattleStart() {
    if (
      this.state.hostReady &&
      this.state.guestReady &&
      this.state.hostStrokes &&
      this.state.guestStrokes
    ) {
      this.state.phase = 'fighting';
      const seed = Math.floor(Math.random() * 2147483647);
      this.log('phase_change', { newPhase: 'fighting', seed });
      this.broadcast({
        type: 'battle_start',
        hostStrokes: this.state.hostStrokes,
        guestStrokes: this.state.guestStrokes,
        seed,
      });
    }
  }

  onConnect(conn: Party.Connection) {
    this.log('connect', { connId: conn.id });
  }

  onClose(conn: Party.Connection) {
    const role = this.getRole(conn.id);
    this.log('disconnect', { connId: conn.id, role });

    if (!role) return;

    // Broadcast before clearing state so message goes out
    this.broadcast({ type: 'player_left', role });

    // Anyone leaving = reset entire room (close it)
    this.state = createInitialState();
    this.log('room_closed', { reason: `${role}_left` });
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message);
    } catch {
      this.log('error', { type: 'invalid_json', connId: sender.id });
      return;
    }

    this.log('message', { type: msg.type, connId: sender.id });

    switch (msg.type) {
      case 'join':
        this.handleJoin(sender, msg.name);
        break;
      case 'lobby_ready':
        this.handleLobbyReady(sender);
        break;
      case 'lobby_unready':
        this.handleLobbyUnready(sender);
        break;
      case 'ready':
        this.handleReady(sender, msg.strokes);
        break;
      case 'rematch_request':
        this.handleRematchRequest(sender);
        break;
    }
  }

  private handleJoin(conn: Party.Connection, name: unknown) {
    // Validate name defensively
    const playerName = typeof name === 'string' && name.length > 0 && name.length <= 50
      ? name.trim()
      : 'Player';

    if (this.state.hostId && this.state.guestId) {
      this.log('room_full', { connId: conn.id });
      this.send(conn, { type: 'room_full' });
      return;
    }

    const role: PlayerRole = this.state.hostId ? 'guest' : 'host';

    if (role === 'host') {
      this.state.hostId = conn.id;
      this.state.hostName = playerName;
    } else {
      this.state.guestId = conn.id;
      this.state.guestName = playerName;
    }

    this.log('join', { connId: conn.id, role, name: playerName });
    this.send(conn, { type: 'welcome', role, roomState: this.state });
    this.broadcast({ type: 'player_joined', role, name: playerName }, conn.id);
  }

  private handleLobbyReady(conn: Party.Connection) {
    const role = this.getRole(conn.id);
    if (!role || !this.state.hostId || !this.state.guestId) return;

    if (role === 'host') {
      this.state.hostLobbyReady = true;
    } else {
      this.state.guestLobbyReady = true;
    }

    this.log('lobby_ready', { role });
    this.broadcast({ type: 'player_lobby_ready', role }, conn.id);
    this.checkDrawingStart();
  }

  private handleLobbyUnready(conn: Party.Connection) {
    const role = this.getRole(conn.id);
    if (!role) return;

    if (role === 'host') {
      this.state.hostLobbyReady = false;
    } else {
      this.state.guestLobbyReady = false;
    }

    this.log('lobby_unready', { role });
    this.broadcast({ type: 'player_lobby_unready', role }, conn.id);
  }

  private handleReady(conn: Party.Connection, strokes: unknown) {
    const role = this.getRole(conn.id);
    if (!role) return;

    // Validate strokes data defensively
    const validatedStrokes = validateStrokes(strokes);
    if (!validatedStrokes) {
      this.log('error', { type: 'invalid_strokes', connId: conn.id });
      this.send(conn, { type: 'error', message: 'Invalid stroke data' });
      return;
    }

    if (role === 'host') {
      this.state.hostReady = true;
      this.state.hostStrokes = validatedStrokes;
    } else {
      this.state.guestReady = true;
      this.state.guestStrokes = validatedStrokes;
    }

    this.log('ready', { role, strokeCount: validatedStrokes.length });
    this.broadcast({ type: 'player_ready', role }, conn.id);
    this.checkBattleStart();
  }

  private handleRematchRequest(conn: Party.Connection) {
    const role = this.getRole(conn.id);
    if (!role) return;

    // Toggle rematch request for this player
    if (role === 'host') {
      this.state.hostRematchRequested = true;
    } else {
      this.state.guestRematchRequested = true;
    }

    this.log('rematch_request', { role });
    this.broadcast({ type: 'player_rematch_requested', role }, conn.id);

    // Check if both players requested rematch
    if (this.state.hostRematchRequested && this.state.guestRematchRequested) {
      // Reset state for new game
      this.state.hostLobbyReady = false;
      this.state.guestLobbyReady = false;
      this.state.hostReady = false;
      this.state.guestReady = false;
      this.state.hostStrokes = null;
      this.state.guestStrokes = null;
      this.state.hostRematchRequested = false;
      this.state.guestRematchRequested = false;
      this.state.phase = 'waiting';

      this.log('rematch_start');
      this.broadcast({ type: 'rematch_start' });
    }
  }
}

BlobRoom satisfies Party.Worker;
