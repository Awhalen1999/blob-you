import type * as Party from 'partykit/server';
import type { Stroke } from '@/types/game';
import type { ClientMessage, ServerMessage, RoomState, PlayerRole, WagerStatus } from './types';

const NEXTJS_URL = process.env.NEXTJS_URL ?? 'http://localhost:3000';

/** Validate stroke data to prevent crashes from malformed input */
function isValidStroke(stroke: unknown): stroke is Stroke {
  if (!stroke || typeof stroke !== 'object') return false;
  const s = stroke as Record<string, unknown>;
  if (!Array.isArray(s.points)) return false;
  if (typeof s.timestamp !== 'number') return false;
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
    wagerStatus: 'none',
    wagerAmount: 0,
  };
}

export default class BlobRoom implements Party.Server {
  state: RoomState;

  // Wager-specific server state (not synced to clients directly)
  private hostDiscordId: string | null = null;
  private guestDiscordId: string | null = null;
  private hostWagerRequestId: string | null = null;
  private guestWagerRequestId: string | null = null;
  private hostReportedWinner: ('host' | 'guest' | 'tie') | null = null;
  private guestReportedWinner: ('host' | 'guest' | 'tie') | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(readonly room: Party.Room) {
    this.state = createInitialState();
  }

  private log(action: string, data?: Record<string, unknown>) {
    const entry = {
      room: this.room.id,
      action,
      phase: this.state.phase,
      wagerStatus: this.state.wagerStatus,
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

  private broadcastAll(message: ServerMessage) {
    const data = JSON.stringify(message);
    for (const conn of this.room.getConnections()) {
      conn.send(data);
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
      this.broadcastAll({
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

    this.broadcast({ type: 'player_left', role });

    this.stopPolling();
    this.state = createInitialState();
    this.hostDiscordId = null;
    this.guestDiscordId = null;
    this.hostWagerRequestId = null;
    this.guestWagerRequestId = null;
    this.hostReportedWinner = null;
    this.guestReportedWinner = null;
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
        this.handleJoin(sender, msg.name, msg.discordId);
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
      case 'propose_wager':
        this.handleProposeWager(sender, msg.amount);
        break;
      case 'accept_wager':
        this.handleAcceptWager(sender);
        break;
      case 'decline_wager':
        this.handleDeclineWager(sender);
        break;
      case 'report_winner':
        this.handleReportWinner(sender, msg.winner);
        break;
    }
  }

  private handleJoin(conn: Party.Connection, name: unknown, discordId?: string) {
    const playerName = typeof name === 'string' && name.length > 0 && name.length <= 50
      ? name.trim()
      : 'Player';

    if (this.state.hostId && this.state.guestId) {
      this.log('room_full', { connId: conn.id });
      this.send(conn, { type: 'room_full' });
      return;
    }

    const role: PlayerRole = this.state.hostId ? 'guest' : 'host';
    const hasDiscordId = typeof discordId === 'string' && discordId.length > 0;

    if (role === 'host') {
      this.state.hostId = conn.id;
      this.state.hostName = playerName;
      if (hasDiscordId) this.hostDiscordId = discordId!;
    } else {
      this.state.guestId = conn.id;
      this.state.guestName = playerName;
      if (hasDiscordId) this.guestDiscordId = discordId!;
    }

    this.log('join', { connId: conn.id, role, name: playerName, hasDiscordId });
    this.send(conn, { type: 'welcome', role, roomState: this.state });
    this.broadcast({ type: 'player_joined', role, name: playerName, hasDiscordId }, conn.id);
  }

  private handleLobbyReady(conn: Party.Connection) {
    const role = this.getRole(conn.id);
    if (!role || !this.state.hostId || !this.state.guestId) return;

    // Block ready if wager is in progress
    if (this.state.wagerStatus === 'proposed' || this.state.wagerStatus === 'pending_payment') {
      this.log('lobby_ready_blocked', { role, wagerStatus: this.state.wagerStatus });
      return;
    }

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

    if (role === 'host') {
      this.state.hostRematchRequested = true;
    } else {
      this.state.guestRematchRequested = true;
    }

    this.log('rematch_request', { role });
    this.broadcast({ type: 'player_rematch_requested', role }, conn.id);

    if (this.state.hostRematchRequested && this.state.guestRematchRequested) {
      // Preserve discord IDs across rematch
      const hDiscord = this.hostDiscordId;
      const gDiscord = this.guestDiscordId;

      this.stopPolling();
      this.state = {
        ...createInitialState(),
        hostId: this.state.hostId,
        guestId: this.state.guestId,
        hostName: this.state.hostName,
        guestName: this.state.guestName,
      };
      this.hostDiscordId = hDiscord;
      this.guestDiscordId = gDiscord;
      this.hostWagerRequestId = null;
      this.guestWagerRequestId = null;
      this.hostReportedWinner = null;
      this.guestReportedWinner = null;

      this.log('rematch_start');
      this.broadcastAll({ type: 'rematch_start' });
    }
  }

  // ===== WAGER FLOW =====

  private handleProposeWager(conn: Party.Connection, amount: unknown) {
    const role = this.getRole(conn.id);
    if (role !== 'host') return;
    if (!this.state.hostId || !this.state.guestId) return;
    if (!this.hostDiscordId || !this.guestDiscordId) {
      this.log('wager_propose_rejected', { reason: 'missing_discord_ids' });
      this.send(conn, { type: 'error', message: 'Both players must have Discord linked' });
      return;
    }
    if (this.state.wagerStatus !== 'none') return;

    const wagerAmount = typeof amount === 'number' && amount > 0 && Number.isFinite(amount)
      ? Math.floor(amount)
      : 0;
    if (wagerAmount <= 0) {
      this.send(conn, { type: 'error', message: 'Invalid wager amount' });
      return;
    }

    this.state.wagerStatus = 'proposed';
    this.state.wagerAmount = wagerAmount;
    this.log('wager_proposed', { amount: wagerAmount });

    // Tell both players about the proposal
    this.broadcastAll({ type: 'wager_status', status: 'proposed', amount: wagerAmount });
  }

  private handleAcceptWager(conn: Party.Connection) {
    const role = this.getRole(conn.id);
    if (role !== 'guest') return;
    if (this.state.wagerStatus !== 'proposed') return;

    this.log('wager_accepted');
    void this.initiateWager();
  }

  private handleDeclineWager(conn: Party.Connection) {
    const role = this.getRole(conn.id);
    if (role !== 'guest') return;
    if (this.state.wagerStatus !== 'proposed') return;

    this.state.wagerStatus = 'none';
    this.state.wagerAmount = 0;
    this.log('wager_declined');
    this.broadcastAll({ type: 'wager_status', status: 'none', amount: 0 });
  }

  private async initiateWager() {
    if (!this.hostDiscordId || !this.guestDiscordId) return;

    this.state.wagerStatus = 'pending_payment';
    this.broadcastAll({ type: 'wager_status', status: 'pending_payment', amount: this.state.wagerAmount });
    this.log('wager_initiating', { amount: this.state.wagerAmount });

    try {
      const res = await fetch(`${NEXTJS_URL}/api/stackcoin/wager/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostDiscordId: this.hostDiscordId,
          guestDiscordId: this.guestDiscordId,
          amount: this.state.wagerAmount,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        this.log('wager_create_failed', { status: res.status, body: text });
        this.resetWager();
        return;
      }

      const data = await res.json();
      this.hostWagerRequestId = data.hostRequestId;
      this.guestWagerRequestId = data.guestRequestId;
      this.log('wager_requests_created', { hostReqId: data.hostRequestId, guestReqId: data.guestRequestId });

      // Start polling for payment confirmation
      this.startPolling();
    } catch (err) {
      this.log('wager_create_error', { err: String(err) });
      this.resetWager();
    }
  }

  private startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      void this.pollWagerStatus();
    }, 5000);
  }

  private stopPolling() {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async pollWagerStatus() {
    if (!this.hostWagerRequestId || !this.guestWagerRequestId) return;
    if (this.state.wagerStatus !== 'pending_payment') {
      this.stopPolling();
      return;
    }

    try {
      const res = await fetch(
        `${NEXTJS_URL}/api/stackcoin/wager/status?hostReqId=${this.hostWagerRequestId}&guestReqId=${this.guestWagerRequestId}`
      );

      if (!res.ok) {
        this.log('wager_poll_failed', { status: res.status });
        return;
      }

      const { hostAccepted, guestAccepted } = await res.json();
      this.log('wager_poll_result', { hostAccepted, guestAccepted });

      if (hostAccepted && guestAccepted) {
        this.stopPolling();
        this.state.wagerStatus = 'confirmed';
        this.log('wager_confirmed');
        this.broadcastAll({ type: 'wager_status', status: 'confirmed', amount: this.state.wagerAmount });
      }
    } catch (err) {
      this.log('wager_poll_error', { err: String(err) });
    }
  }

  private handleReportWinner(conn: Party.Connection, winner: unknown) {
    const role = this.getRole(conn.id);
    if (!role) return;
    if (this.state.wagerStatus !== 'confirmed') return;
    if (!['host', 'guest', 'tie'].includes(winner as string)) return;

    const w = winner as 'host' | 'guest' | 'tie';

    if (role === 'host') {
      this.hostReportedWinner = w;
    } else {
      this.guestReportedWinner = w;
    }

    this.log('winner_reported', { role, winner: w });

    // Wait for both reports
    if (!this.hostReportedWinner || !this.guestReportedWinner) return;

    if (this.hostReportedWinner === this.guestReportedWinner) {
      void this.payoutWager(this.hostReportedWinner);
    } else {
      // Dispute — log it, don't auto-refund
      this.log('wager_dispute', { hostReport: this.hostReportedWinner, guestReport: this.guestReportedWinner });
      this.broadcastAll({ type: 'wager_dispute' });
    }
  }

  private async payoutWager(winner: 'host' | 'guest' | 'tie') {
    if (!this.hostDiscordId || !this.guestDiscordId) return;

    this.state.wagerStatus = 'complete';
    this.log('wager_paying_out', { winner, amount: this.state.wagerAmount });

    try {
      const res = await fetch(`${NEXTJS_URL}/api/stackcoin/wager/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner,
          hostDiscordId: this.hostDiscordId,
          guestDiscordId: this.guestDiscordId,
          amount: this.state.wagerAmount,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        this.log('wager_payout_failed', { status: res.status, body: text });
      } else {
        this.log('wager_payout_complete', { winner });
      }

      this.broadcastAll({ type: 'wager_payout', winner, amount: this.state.wagerAmount });
    } catch (err) {
      this.log('wager_payout_error', { err: String(err) });
      this.broadcastAll({ type: 'wager_dispute' });
    }
  }

  private resetWager() {
    this.stopPolling();
    this.state.wagerStatus = 'none';
    this.state.wagerAmount = 0;
    this.hostWagerRequestId = null;
    this.guestWagerRequestId = null;
    this.hostReportedWinner = null;
    this.guestReportedWinner = null;
    this.broadcastAll({ type: 'wager_status', status: 'none', amount: 0 });
    this.log('wager_reset');
  }
}

BlobRoom satisfies Party.Worker;
