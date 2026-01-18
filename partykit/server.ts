import type * as Party from 'partykit/server';
import type { Stroke } from '@/types/game';
import type { ClientMessage, ServerMessage, RoomState, PlayerRole } from './types';

/** Initial empty room state */
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
    phase: 'waiting',
  };
}

export default class BlobRoom implements Party.Server {
  state: RoomState;

  constructor(readonly room: Party.Room) {
    this.state = createInitialState();
  }

  /** Send a message to a specific connection */
  private send(conn: Party.Connection, message: ServerMessage) {
    conn.send(JSON.stringify(message));
  }

  /** Broadcast a message to all connections */
  private broadcast(message: ServerMessage, exclude?: string) {
    const data = JSON.stringify(message);
    for (const conn of this.room.getConnections()) {
      if (conn.id !== exclude) {
        conn.send(data);
      }
    }
  }

  /** Get the role for a connection ID */
  private getRole(connectionId: string): PlayerRole | null {
    if (connectionId === this.state.hostId) return 'host';
    if (connectionId === this.state.guestId) return 'guest';
    return null;
  }

  /** Check if both players are lobby-ready → start drawing */
  private checkDrawingStart() {
    if (this.state.hostLobbyReady && this.state.guestLobbyReady) {
      this.state.phase = 'drawing';
      this.broadcast({ type: 'drawing_start' });
    }
  }

  /** Check if both players submitted strokes → start battle */
  private checkBattleStart() {
    if (
      this.state.hostReady &&
      this.state.guestReady &&
      this.state.hostStrokes &&
      this.state.guestStrokes
    ) {
      this.state.phase = 'fighting';
      this.broadcast({
        type: 'battle_start',
        hostStrokes: this.state.hostStrokes,
        guestStrokes: this.state.guestStrokes,
      });
    }
  }

  onConnect(conn: Party.Connection) {
    console.log(`[${this.room.id}] Connection: ${conn.id}`);
  }

  onClose(conn: Party.Connection) {
    console.log(`[${this.room.id}] Disconnect: ${conn.id}`);

    const role = this.getRole(conn.id);
    if (!role) return;

    // Clear the player slot
    if (role === 'host') {
      this.state.hostId = null;
      this.state.hostName = null;
      this.state.hostLobbyReady = false;
      this.state.hostReady = false;
      this.state.hostStrokes = null;
    } else {
      this.state.guestId = null;
      this.state.guestName = null;
      this.state.guestLobbyReady = false;
      this.state.guestReady = false;
      this.state.guestStrokes = null;
    }

    // Notify remaining player
    this.broadcast({ type: 'player_left', role });

    // Reset phase
    if (this.state.phase !== 'waiting') {
      this.state.phase = 'waiting';
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message);
    } catch {
      console.error(`[${this.room.id}] Invalid JSON from ${sender.id}`);
      return;
    }

    console.log(`[${this.room.id}] ${msg.type} from ${sender.id}`);

    switch (msg.type) {
      case 'join':
        this.handleJoin(sender, msg.name);
        break;
      case 'lobby_ready':
        this.handleLobbyReady(sender);
        break;
      case 'ready':
        this.handleReady(sender, msg.strokes);
        break;
      case 'rematch':
        this.handleRematch();
        break;
    }
  }

  private handleJoin(conn: Party.Connection, name: string) {
    // Check if room is full
    if (this.state.hostId && this.state.guestId) {
      this.send(conn, { type: 'room_full' });
      return;
    }

    // Assign role
    let role: PlayerRole;
    if (!this.state.hostId) {
      role = 'host';
      this.state.hostId = conn.id;
      this.state.hostName = name;
    } else {
      role = 'guest';
      this.state.guestId = conn.id;
      this.state.guestName = name;
    }

    // Send welcome to the new player
    this.send(conn, {
      type: 'welcome',
      role,
      roomState: this.state,
    });

    // Notify other player
    this.broadcast({ type: 'player_joined', role, name }, conn.id);
  }

  private handleLobbyReady(conn: Party.Connection) {
    const role = this.getRole(conn.id);
    if (!role) return;

    // Can only lobby-ready if both players are present
    if (!this.state.hostId || !this.state.guestId) return;

    if (role === 'host') {
      this.state.hostLobbyReady = true;
    } else {
      this.state.guestLobbyReady = true;
    }

    // Notify other player
    this.broadcast({ type: 'player_lobby_ready', role }, conn.id);

    // Check if both ready to start drawing
    this.checkDrawingStart();
  }

  private handleReady(conn: Party.Connection, strokes: Stroke[]) {
    const role = this.getRole(conn.id);
    if (!role) return;

    if (role === 'host') {
      this.state.hostReady = true;
      this.state.hostStrokes = strokes;
    } else {
      this.state.guestReady = true;
      this.state.guestStrokes = strokes;
    }

    // Notify other player
    this.broadcast({ type: 'player_ready', role }, conn.id);

    // Check if both ready
    this.checkBattleStart();
  }

  private handleRematch() {
    // Reset for new round
    this.state.hostLobbyReady = false;
    this.state.guestLobbyReady = false;
    this.state.hostReady = false;
    this.state.guestReady = false;
    this.state.hostStrokes = null;
    this.state.guestStrokes = null;
    this.state.phase = 'waiting';

    this.broadcast({ type: 'rematch_start' });
  }
}

BlobRoom satisfies Party.Worker;
