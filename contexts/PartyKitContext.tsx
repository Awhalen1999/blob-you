'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useState, ReactNode } from 'react';
import PartySocket from 'partysocket';
import type { Stroke } from '@/types/game';
import type { ServerMessage, RoomState, PlayerRole, ClientMessage } from '@/partykit/types';

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'localhost:1999';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type PartyKitState = {
  status: ConnectionStatus;
  role: PlayerRole | null;
  roomState: RoomState | null;
  error: string | null;
  battleSeed: number | null;
  opponentLeft: PlayerRole | null;
};

export type PartyKitActions = {
  connect: (roomCode: string, playerName: string) => void;
  disconnect: () => void;
  sendLobbyReady: () => void;
  sendLobbyUnready: () => void;
  sendReady: (strokes: Stroke[]) => void;
  sendRematchRequest: () => void;
  clearOpponentLeft: () => void;
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
        break;

      case 'player_joined':
        setRoomState((prev) => {
          if (!prev) return prev;
          return msg.role === 'host'
            ? { ...prev, hostName: msg.name, hostId: 'connected' }
            : { ...prev, guestName: msg.name, guestId: 'connected' };
        });
        break;

      case 'player_left':
        setOpponentLeft(msg.role);
        setRoomState((prev) => {
          if (!prev) return prev;
          return msg.role === 'host'
            ? { ...prev, hostId: null, hostName: null, hostReady: false, hostStrokes: null, phase: 'waiting' }
            : { ...prev, guestId: null, guestName: null, guestReady: false, guestStrokes: null, phase: 'waiting' };
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
    }
  }, []);

  const connect = useCallback(
    (roomCode: string, playerName: string) => {
      // Clean up existing connection first
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      log('send', 'connecting', { room: roomCode });
      setStatus('connecting');
      setError(null);
      setOpponentLeft(null);

      const socket = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomCode,
      });

      // CRITICAL: Assign socket to ref BEFORE adding event listeners
      // This ensures send() works in the open handler
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        log('recv', 'connected');
        // Send join message directly on this socket instance
        // to avoid any ref timing issues
        if (socket.readyState === WebSocket.OPEN) {
          log('send', 'join');
          socket.send(JSON.stringify({ type: 'join', name: playerName }));
        }
      });

      socket.addEventListener('message', handleMessage);

      socket.addEventListener('close', () => {
        log('recv', 'disconnected');
        // Only update state if this is still the active socket
        if (socketRef.current === socket) {
          setStatus('disconnected');
          setRole(null);
          setRoomState(null);
        }
      });

      socket.addEventListener('error', () => {
        log('recv', 'error');
        // Only update state if this is still the active socket
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
  }, []);

  const clearOpponentLeft = useCallback(() => {
    setOpponentLeft(null);
  }, []);

  const sendLobbyReady = useCallback(() => {
    // Guard: must have role and be connected
    if (!role) return;
    const sent = send({ type: 'lobby_ready' });
    if (!sent) return;
    // Update own state immediately since server doesn't echo back to sender
    setRoomState((prev) => {
      if (!prev) return prev;
      return role === 'host'
        ? { ...prev, hostLobbyReady: true }
        : { ...prev, guestLobbyReady: true };
    });
  }, [send, role]);

  const sendLobbyUnready = useCallback(() => {
    // Guard: must have role and be connected
    if (!role) return;
    const sent = send({ type: 'lobby_unready' });
    if (!sent) return;
    // Update own state immediately since server doesn't echo back to sender
    setRoomState((prev) => {
      if (!prev) return prev;
      return role === 'host'
        ? { ...prev, hostLobbyReady: false }
        : { ...prev, guestLobbyReady: false };
    });
  }, [send, role]);

  const sendReady = useCallback(
    (strokes: Stroke[]) => {
      // Guard: must be connected
      send({ type: 'ready', strokes });
    },
    [send]
  );

  const sendRematchRequest = useCallback(() => {
    // Guard: must have role and be connected
    if (!role) return;
    const sent = send({ type: 'rematch_request' });
    if (!sent) return;
    // Optimistic update - immediately reflect our rematch request
    setRoomState((prev) => {
      if (!prev) return prev;
      return role === 'host'
        ? { ...prev, hostRematchRequested: true }
        : { ...prev, guestRematchRequested: true };
    });
  }, [send, role]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const state: PartyKitState = { status, role, roomState, error, battleSeed, opponentLeft };
  const actions: PartyKitActions = { connect, disconnect, sendLobbyReady, sendLobbyUnready, sendReady, sendRematchRequest, clearOpponentLeft };

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
