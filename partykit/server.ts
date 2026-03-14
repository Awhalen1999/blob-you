import type * as Party from 'partykit/server';
import { PostHog } from 'posthog-node';
import { Client } from 'stackcoin';
import type { Stroke } from '@/types/game';
import type { ClientMessage, ServerMessage, RoomState, PlayerRole } from './types';

const PAYMENT_TIMEOUT_MS = 300_000; // 5 minutes
const POLL_INTERVAL_MS = 3_000;

let _posthog: PostHog | null = null;
function getPostHog(): PostHog | null {
  const key = process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!_posthog) {
    _posthog = new PostHog(key, { host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com' });
  }
  return _posthog;
}

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

  private hostDiscordId: string | null = null;
  private guestDiscordId: string | null = null;
  private hostAccepted = false;
  private guestAccepted = false;
  private hostReportedWinner: ('host' | 'guest' | 'tie') | null = null;
  private guestReportedWinner: ('host' | 'guest' | 'tie') | null = null;
  private paymentTimeout: ReturnType<typeof setTimeout> | null = null;
  private reportTimeout: ReturnType<typeof setTimeout> | null = null;

  // StackCoin SDK state
  private stkClient: InstanceType<typeof Client> | null = null;
  private hostRequestId: number | null = null;
  private guestRequestId: number | null = null;
  private hostStkUserId: number | null = null;
  private guestStkUserId: number | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(readonly room: Party.Room) {
    this.state = createInitialState();
  }

  private getStkClient(): InstanceType<typeof Client> {
    if (!this.stkClient) {
      const token = process.env.STACKCOIN_BOT_TOKEN as string | undefined;
      if (!token) throw new Error('STACKCOIN_BOT_TOKEN not set');
      this.stkClient = new Client({ token });
    }
    return this.stkClient;
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

      if (this.state.wagerStatus === 'confirmed') {
        this.reportTimeout = setTimeout(() => {
          this.log('report_timeout');
          getPostHog()?.capture({
            distinctId: this.room.id,
            event: 'report_timeout',
            properties: { amount: this.state.wagerAmount },
          });
          void this.issueRefundAndReset();
        }, 180_000);
      }
    }
  }

  // ===== WebSocket lifecycle =====

  onConnect(conn: Party.Connection) {
    this.log('connect', { connId: conn.id });
  }

  async onClose(conn: Party.Connection) {
    const role = this.getRole(conn.id);
    this.log('disconnect', { connId: conn.id, role });

    if (!role) return;

    this.broadcast({ type: 'player_left', role });

    if (this.state.wagerStatus !== 'none' && this.state.wagerStatus !== 'complete') {
      await this.issueRefundAndReset();
    }

    this.state = createInitialState();
    this.hostDiscordId = null;
    this.guestDiscordId = null;
    this.resetWager(false);
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
      this.state = {
        ...createInitialState(),
        hostId: this.state.hostId,
        guestId: this.state.guestId,
        hostName: this.state.hostName,
        guestName: this.state.guestName,
      };
      this.resetWager(false);

      this.log('rematch_start');
      this.broadcastAll({ type: 'rematch_start' });
    }
  }

  // ===== WAGER FLOW (StackCoin SDK — all in-process) =====

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

    this.log('wager_declined');
    this.resetWager();
  }

  private async initiateWager() {
    if (!this.hostDiscordId || !this.guestDiscordId) {
      this.log('wager_initiating_skipped', { reason: 'missing_discord_ids' });
      this.broadcastAll({ type: 'error', message: 'Wager failed: Both players must be signed in with Discord.' });
      this.resetWager();
      return;
    }

    this.state.wagerStatus = 'pending_payment';
    this.broadcastAll({ type: 'wager_status', status: 'pending_payment', amount: this.state.wagerAmount });
    this.log('wager_initiating', { amount: this.state.wagerAmount });

    try {
      const client = this.getStkClient();

      const [hostUsers, guestUsers] = await Promise.all([
        client.getUsers({ discordId: this.hostDiscordId }),
        client.getUsers({ discordId: this.guestDiscordId }),
      ]);
      const hostUser = hostUsers[0];
      const guestUser = guestUsers[0];

      if (!hostUser?.id || !guestUser?.id) {
        this.log('wager_user_lookup_failed', { hostFound: !!hostUser?.id, guestFound: !!guestUser?.id });
        this.broadcastAll({ type: 'error', message: 'Could not find StackCoin users.' });
        this.resetWager();
        return;
      }

      this.hostStkUserId = hostUser.id;
      this.guestStkUserId = guestUser.id;

      const label = `blob.you wager — ${this.state.wagerAmount} STK (accept within 5 min)`;
      const [hostRes, guestRes] = await Promise.all([
        client.createRequest(hostUser.id, this.state.wagerAmount, { label }),
        client.createRequest(guestUser.id, this.state.wagerAmount, { label }),
      ]);

      this.hostRequestId = hostRes.request_id;
      this.guestRequestId = guestRes.request_id;

      this.log('wager_requests_created', {
        hostReqId: this.hostRequestId,
        guestReqId: this.guestRequestId,
      });

      getPostHog()?.capture({
        distinctId: this.room.id,
        event: 'wager_created',
        properties: {
          amount: this.state.wagerAmount,
          host_discord_id: this.hostDiscordId,
          guest_discord_id: this.guestDiscordId,
        },
      });

      this.startPolling();

      this.paymentTimeout = setTimeout(() => {
        if (this.state.wagerStatus === 'pending_payment') {
          this.log('payment_timeout');
          getPostHog()?.capture({
            distinctId: this.room.id,
            event: 'payment_timeout',
            properties: {
              amount: this.state.wagerAmount,
              hostAccepted: this.hostAccepted,
              guestAccepted: this.guestAccepted,
            },
          });
          void this.issueRefundAndReset();
        }
      }, PAYMENT_TIMEOUT_MS);
    } catch (err) {
      this.log('wager_create_error', { err: String(err) });
      this.broadcastAll({
        type: 'error',
        message: `Wager failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      this.resetWager();
    }
  }

  private startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      void this.pollRequestStatus();
    }, POLL_INTERVAL_MS);
  }

  private stopPolling() {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async pollRequestStatus() {
    if (this.state.wagerStatus !== 'pending_payment') {
      this.stopPolling();
      return;
    }
    if (!this.hostRequestId || !this.guestRequestId) return;

    try {
      const client = this.getStkClient();
      const [hostReq, guestReq] = await Promise.all([
        client.getRequest(this.hostRequestId),
        client.getRequest(this.guestRequestId),
      ]);

      if (hostReq.status === 'accepted' && !this.hostAccepted) {
        this.hostAccepted = true;
        this.log('stk_request_accepted', { role: 'host', requestId: this.hostRequestId });
      }
      if (guestReq.status === 'accepted' && !this.guestAccepted) {
        this.guestAccepted = true;
        this.log('stk_request_accepted', { role: 'guest', requestId: this.guestRequestId });
      }

      if (this.hostAccepted && this.guestAccepted) {
        this.stopPolling();
        if (this.paymentTimeout !== null) {
          clearTimeout(this.paymentTimeout);
          this.paymentTimeout = null;
        }

        this.state.wagerStatus = 'confirmed';
        this.log('wager_confirmed');
        this.broadcastAll({ type: 'wager_status', status: 'confirmed', amount: this.state.wagerAmount });

        getPostHog()?.capture({
          distinctId: this.room.id,
          event: 'wager_payment_confirmed',
          properties: { amount: this.state.wagerAmount },
        });
      }
    } catch (err) {
      this.log('poll_error', { err: String(err) });
    }
  }

  // ===== Payout & Refund (direct SDK calls) =====

  private async issueRefundAndReset() {
    if (this.state.wagerStatus === 'none' || this.state.wagerStatus === 'complete') return;

    const hostPaid = this.hostAccepted;
    const guestPaid = this.guestAccepted;

    this.log('refund_check', { hostPaid, guestPaid, amount: this.state.wagerAmount });

    if (hostPaid || guestPaid) {
      try {
        const client = this.getStkClient();
        const label = 'blob.you — wager refund';
        const tasks: Promise<unknown>[] = [];

        if (hostPaid && this.hostStkUserId) {
          tasks.push(client.send(this.hostStkUserId, this.state.wagerAmount, { label }));
        }
        if (guestPaid && this.guestStkUserId) {
          tasks.push(client.send(this.guestStkUserId, this.state.wagerAmount, { label }));
        }

        await Promise.all(tasks);
        this.log('refund_issued', { hostPaid, guestPaid });

        getPostHog()?.capture({
          distinctId: this.room.id,
          event: 'wager_refund_issued',
          properties: {
            reason: 'disconnect',
            host_paid: hostPaid,
            guest_paid: guestPaid,
            amount: this.state.wagerAmount,
          },
        });
      } catch (err) {
        this.log('refund_error', { err: String(err) });
      }
    }

    this.resetWager();
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

    if (!this.hostReportedWinner || !this.guestReportedWinner) return;

    if (this.reportTimeout !== null) {
      clearTimeout(this.reportTimeout);
      this.reportTimeout = null;
    }

    if (this.hostReportedWinner === this.guestReportedWinner) {
      void this.payoutWager(this.hostReportedWinner);
    } else {
      this.log('wager_dispute', {
        hostReport: this.hostReportedWinner,
        guestReport: this.guestReportedWinner,
      });
      this.broadcastAll({ type: 'wager_dispute' });

      getPostHog()?.capture({
        distinctId: this.room.id,
        event: 'wager_dispute',
        properties: {
          host_report: this.hostReportedWinner,
          guest_report: this.guestReportedWinner,
          amount: this.state.wagerAmount,
        },
      });

      void this.issueRefundAndReset();
    }
  }

  private async payoutWager(winner: 'host' | 'guest' | 'tie') {
    if (!this.hostStkUserId || !this.guestStkUserId) return;

    this.log('wager_paying_out', { winner, amount: this.state.wagerAmount });

    try {
      const client = this.getStkClient();

      if (winner === 'tie') {
        await Promise.all([
          client.send(this.hostStkUserId, this.state.wagerAmount, { label: 'blob.you — tie refund' }),
          client.send(this.guestStkUserId, this.state.wagerAmount, { label: 'blob.you — tie refund' }),
        ]);
      } else {
        const winnerId = winner === 'host' ? this.hostStkUserId : this.guestStkUserId;
        await client.send(winnerId, this.state.wagerAmount * 2, { label: 'blob.you — wager win' });
      }

      if (this.state.wagerStatus !== 'confirmed') return;

      this.state.wagerStatus = 'complete';
      this.log('wager_payout_complete', { winner });
      this.broadcastAll({ type: 'wager_payout', winner, amount: this.state.wagerAmount });

      getPostHog()?.capture({
        distinctId: this.room.id,
        event: 'wager_payout_success',
        properties: { winner, amount: this.state.wagerAmount },
      });
    } catch (err) {
      this.log('wager_payout_error', { err: String(err) });
      void this.issueRefundAndReset();
    }
  }

  private resetWager(broadcast = true) {
    this.stopPolling();
    if (this.paymentTimeout !== null) {
      clearTimeout(this.paymentTimeout);
      this.paymentTimeout = null;
    }
    if (this.reportTimeout !== null) {
      clearTimeout(this.reportTimeout);
      this.reportTimeout = null;
    }
    this.state.wagerStatus = 'none';
    this.state.wagerAmount = 0;
    this.hostAccepted = false;
    this.guestAccepted = false;
    this.hostReportedWinner = null;
    this.guestReportedWinner = null;
    this.hostRequestId = null;
    this.guestRequestId = null;
    this.hostStkUserId = null;
    this.guestStkUserId = null;
    if (broadcast) {
      this.broadcastAll({ type: 'wager_status', status: 'none', amount: 0 });
    }
    this.log('wager_reset');
  }
}

BlobRoom satisfies Party.Worker;
