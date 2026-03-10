'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useState, ReactNode } from 'react';
import PartySocket from 'partysocket';
import type { Stroke } from '@/types/game';
import type { ServerMessage, RoomState, PlayerRole, ClientMessage, WagerStatus } from '@/partykit/types';

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'localhost:1999';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type PartyKitState = {
  status: ConnectionStatus;
  role: PlayerRole | null;
  roomState: RoomState | null;
  error: string | null;
  battleSeed: number | null;
  opponentLeft: PlayerRole | null;
  opponentHasDiscord: boolean;
  // Wager state: derived from roomState (single source of truth)
  wagerStatus: WagerStatus;
  wagerAmount: number;
  // Outcome flags: set once when wager resolves, cleared on reset
  wagerPayout: { winner: 'host' | 'guest' | 'tie'; amount: number } | null;
  wagerDisputed: boolean;
};

export type PartyKitActions = {
  connect: (roomCode: string, playerName: string, discordId?: string) => void;
  disconnect: () => void;
  sendLobbyReady: () => void;
  sendLobbyUnready: () => void;
  sendReady: (strokes: Stroke[]) => void;
  sendRematchRequest: () => void;
  clearOpponentLeft: () => void;
  sendProposeWager: (amount: number) => void;
  sendAcceptWager: () => void;
  sendDeclineWager: () => void;
  sendReportWinner: (winner: 'host' | 'guest' | 'tie') => void;
};

type PartyKitContextValue = [PartyKitState, PartyKitActions];

const PartyKitContext = createContext<PartyKitContextValue | null>(null);

function log(direction: 'send' | 'recv', type: string, data?: Record<string, unknown>) {
  const arrow = direction === 'send' ? '→' : '←';
  if (data) {
    console.log(`[WS ${arrow}] ${type}`, data);
  } else {
    console.log(`[WS ${arrow}] ${type}`);
  }
}

export function PartyKitProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<PartySocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [battleSeed, setBattleSeed] = useState<number | null>(null);
  const [opponentLeft, setOpponentLeft] = useState<PlayerRole | null>(null);
  const [opponentHasDiscord, setOpponentHasDiscord] = useState(false);
  // Outcome flags — only these two are standalone (they don't exist in RoomState)
  const [wagerPayout, setWagerPayout] = useState<{ winner: 'host' | 'guest' | 'tie'; amount: number } | null>(null);
  const [wagerDisputed, setWagerDisputed] = useState(false);

  // Derive wager status/amount from roomState (single source of truth)
  const wagerStatus: WagerStatus = roomState?.wagerStatus ?? 'none';
  const wagerAmount: number = roomState?.wagerAmount ?? 0;

  const send = useCallback((message: ClientMessage): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      log('send', 'dropped_not_connected', { type: message.type });
      return false;
    }
    log('send', message.type);
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(event.data) as ServerMessage;
    } catch {
      log('recv', 'invalid_json', { raw: String(event.data).slice(0, 100) });
      return;
    }
    log('recv', msg.type);

    switch (msg.type) {
      case 'welcome':
        setRole(msg.role);
        setRoomState(msg.roomState);
        setStatus('connected');
        // So the player who joins second (e.g. guest) knows the existing opponent's Discord status
        const opponentDiscord = msg.role === 'host' ? msg.roomState.guestHasDiscord : msg.roomState.hostHasDiscord;
        setOpponentHasDiscord(opponentDiscord);
        break;

      case 'player_joined':
        setOpponentHasDiscord(msg.hasDiscordId);
        setRoomState((prev) => {
          if (!prev) return prev;
          return msg.role === 'host'
            ? { ...prev, hostName: msg.name, hostId: 'connected' }
            : { ...prev, guestName: msg.name, guestId: 'connected' };
        });
        break;

      case 'player_left':
        setOpponentLeft(msg.role);
        setOpponentHasDiscord(false);
        setWagerPayout(null);
        setWagerDisputed(false);
        setRoomState((prev) => {
          if (!prev) return prev;
          return msg.role === 'host'
            ? { ...prev, hostId: null, hostName: null, hostHasDiscord: false, hostReady: false, hostStrokes: null, phase: 'waiting', wagerStatus: 'none', wagerAmount: 0 }
            : { ...prev, guestId: null, guestName: null, guestHasDiscord: false, guestReady: false, guestStrokes: null, phase: 'waiting', wagerStatus: 'none', wagerAmount: 0 };
        });
        break;

      case 'player_ready':
        setRoomState((prev) => {
          if (!prev) return prev;
          return msg.role === 'host'
            ? { ...prev, hostReady: true }
            : { ...prev, guestReady: true };
        });
        break;

      case 'player_lobby_ready':
        setRoomState((prev) => {
          if (!prev) return prev;
          return msg.role === 'host'
            ? { ...prev, hostLobbyReady: true }
            : { ...prev, guestLobbyReady: true };
        });
        break;

      case 'player_lobby_unready':
        setRoomState((prev) => {
          if (!prev) return prev;
          return msg.role === 'host'
            ? { ...prev, hostLobbyReady: false }
            : { ...prev, guestLobbyReady: false };
        });
        break;

      case 'drawing_start':
        setRoomState((prev) => prev ? { ...prev, phase: 'drawing' } : prev);
        break;

      case 'battle_start':
        setBattleSeed(msg.seed);
        setRoomState((prev) =>
          prev
            ? {
                ...prev,
                phase: 'fighting',
                hostStrokes: msg.hostStrokes,
                guestStrokes: msg.guestStrokes,
              }
            : prev
        );
        break;

      case 'player_rematch_requested':
        setRoomState((prev) => {
          if (!prev) return prev;
          return msg.role === 'host'
            ? { ...prev, hostRematchRequested: true }
            : { ...prev, guestRematchRequested: true };
        });
        break;

      case 'rematch_start':
        setBattleSeed(null);
        setWagerPayout(null);
        setWagerDisputed(false);
        setRoomState((prev) =>
          prev
            ? {
                ...prev,
                phase: 'drawing',
                hostReady: false,
                guestReady: false,
                hostStrokes: null,
                guestStrokes: null,
                hostRematchRequested: false,
                guestRematchRequested: false,
                wagerStatus: 'none',
                wagerAmount: 0,
              }
            : prev
        );
        break;

      case 'room_full':
        setError('Room is full');
        setStatus('error');
        break;

      case 'error':
        setError(msg.message);
        setStatus('error');
        break;

      // Wager state flows through roomState (single source of truth)
      case 'wager_status':
        setRoomState((prev) => prev ? { ...prev, wagerStatus: msg.status, wagerAmount: msg.amount } : prev);
        break;

      // Happy path: payout succeeded
      case 'wager_payout':
        setRoomState((prev) => prev ? { ...prev, wagerStatus: 'complete' } : prev);
        setWagerPayout({ winner: msg.winner, amount: msg.amount });
        break;

      // Sad path: dispute → server will also send wager_status 'none' via resetWager
      case 'wager_dispute':
        setWagerDisputed(true);
        break;
    }
  }, []);

  const connect = useCallback(
    (roomCode: string, playerName: string, discordId?: string) => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      log('send', 'connecting', { room: roomCode });
      setStatus('connecting');
      setError(null);
      setOpponentLeft(null);
      setOpponentHasDiscord(false);
      setWagerPayout(null);
      setWagerDisputed(false);

      const socket = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomCode,
      });

      socketRef.current = socket;

      socket.addEventListener('open', () => {
        log('recv', 'connected');
        if (socket.readyState === WebSocket.OPEN) {
          log('send', 'join');
          socket.send(JSON.stringify({ type: 'join', name: playerName, discordId }));
        }
      });

      socket.addEventListener('message', handleMessage);

      socket.addEventListener('close', () => {
        log('recv', 'disconnected');
        if (socketRef.current === socket) {
          setStatus('disconnected');
          setRole(null);
          setRoomState(null);
        }
      });

      socket.addEventListener('error', () => {
        log('recv', 'error');
        if (socketRef.current === socket) {
          setError('Connection failed');
          setStatus('error');
        }
      });
    },
    [handleMessage]
  );

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      log('send', 'disconnect');
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('disconnected');
    setRole(null);
    setRoomState(null);
    setError(null);
    setBattleSeed(null);
    setOpponentLeft(null);
    setOpponentHasDiscord(false);
    setWagerPayout(null);
    setWagerDisputed(false);
  }, []);

  const clearOpponentLeft = useCallback(() => {
    setOpponentLeft(null);
  }, []);

  const sendLobbyReady = useCallback(() => {
    if (!role) return;
    const sent = send({ type: 'lobby_ready' });
    if (!sent) return;
    setRoomState((prev) => {
      if (!prev) return prev;
      return role === 'host'
        ? { ...prev, hostLobbyReady: true }
        : { ...prev, guestLobbyReady: true };
    });
  }, [send, role]);

  const sendLobbyUnready = useCallback(() => {
    if (!role) return;
    const sent = send({ type: 'lobby_unready' });
    if (!sent) return;
    setRoomState((prev) => {
      if (!prev) return prev;
      return role === 'host'
        ? { ...prev, hostLobbyReady: false }
        : { ...prev, guestLobbyReady: false };
    });
  }, [send, role]);

  const sendReady = useCallback(
    (strokes: Stroke[]) => {
      send({ type: 'ready', strokes });
    },
    [send]
  );

  const sendRematchRequest = useCallback(() => {
    if (!role) return;
    const sent = send({ type: 'rematch_request' });
    if (!sent) return;
    setRoomState((prev) => {
      if (!prev) return prev;
      return role === 'host'
        ? { ...prev, hostRematchRequested: true }
        : { ...prev, guestRematchRequested: true };
    });
  }, [send, role]);

  const sendProposeWager = useCallback((amount: number) => {
    send({ type: 'propose_wager', amount });
  }, [send]);

  const sendAcceptWager = useCallback(() => {
    send({ type: 'accept_wager' });
  }, [send]);

  const sendDeclineWager = useCallback(() => {
    send({ type: 'decline_wager' });
  }, [send]);

  const sendReportWinner = useCallback((winner: 'host' | 'guest' | 'tie') => {
    send({ type: 'report_winner', winner });
  }, [send]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const state: PartyKitState = {
    status, role, roomState, error, battleSeed, opponentLeft,
    opponentHasDiscord, wagerStatus, wagerAmount, wagerPayout, wagerDisputed,
  };
  const actions: PartyKitActions = {
    connect, disconnect, sendLobbyReady, sendLobbyUnready, sendReady,
    sendRematchRequest, clearOpponentLeft,
    sendProposeWager, sendAcceptWager, sendDeclineWager, sendReportWinner,
  };

  return (
    <PartyKitContext.Provider value={[state, actions]}>
      {children}
    </PartyKitContext.Provider>
  );
}

export function usePartyKitContext(): PartyKitContextValue {
  const context = useContext(PartyKitContext);
  if (!context) {
    throw new Error('usePartyKitContext must be used within a PartyKitProvider');
  }
  return context;
}
