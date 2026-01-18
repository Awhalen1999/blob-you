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
};

export type PartyKitActions = {
  connect: (roomCode: string, playerName: string) => void;
  disconnect: () => void;
  sendLobbyReady: () => void;
  sendReady: (strokes: Stroke[]) => void;
  sendRematch: () => void;
};

type PartyKitContextValue = [PartyKitState, PartyKitActions];

const PartyKitContext = createContext<PartyKitContextValue | null>(null);

export function PartyKitProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<PartySocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Send a typed message to the server */
  const send = useCallback((message: ClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  /** Handle incoming server messages */
  const handleMessage = useCallback((event: MessageEvent) => {
    const msg = JSON.parse(event.data) as ServerMessage;

    switch (msg.type) {
      case 'welcome':
        setRole(msg.role);
        setRoomState(msg.roomState);
        setStatus('connected');
        break;

      case 'player_joined':
        setRoomState((prev) => {
          if (!prev) return prev;
          if (msg.role === 'host') {
            return { ...prev, hostName: msg.name, hostId: 'connected' };
          } else {
            return { ...prev, guestName: msg.name, guestId: 'connected' };
          }
        });
        break;

      case 'player_left':
        setRoomState((prev) => {
          if (!prev) return prev;
          if (msg.role === 'host') {
            return { ...prev, hostId: null, hostName: null, hostReady: false, hostStrokes: null };
          } else {
            return { ...prev, guestId: null, guestName: null, guestReady: false, guestStrokes: null };
          }
        });
        break;

      case 'player_ready':
        setRoomState((prev) => {
          if (!prev) return prev;
          if (msg.role === 'host') {
            return { ...prev, hostReady: true };
          } else {
            return { ...prev, guestReady: true };
          }
        });
        break;

      case 'player_lobby_ready':
        setRoomState((prev) => {
          if (!prev) return prev;
          if (msg.role === 'host') {
            return { ...prev, hostLobbyReady: true };
          } else {
            return { ...prev, guestLobbyReady: true };
          }
        });
        break;

      case 'drawing_start':
        setRoomState((prev) =>
          prev ? { ...prev, phase: 'drawing' } : prev
        );
        break;

      case 'battle_start':
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

      case 'rematch_start':
        setRoomState((prev) =>
          prev
            ? {
                ...prev,
                phase: 'drawing',
                hostReady: false,
                guestReady: false,
                hostStrokes: null,
                guestStrokes: null,
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

  /** Connect to a room */
  const connect = useCallback(
    (roomCode: string, playerName: string) => {
      // Clean up existing connection
      if (socketRef.current) {
        socketRef.current.close();
      }

      setStatus('connecting');
      setError(null);

      const socket = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomCode,
      });

      socket.addEventListener('open', () => {
        send({ type: 'join', name: playerName });
      });

      socket.addEventListener('message', handleMessage);

      socket.addEventListener('close', () => {
        setStatus('disconnected');
        setRole(null);
        setRoomState(null);
      });

      socket.addEventListener('error', () => {
        setError('Connection failed');
        setStatus('error');
      });

      socketRef.current = socket;
    },
    [send, handleMessage]
  );

  /** Disconnect from the room */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('disconnected');
    setRole(null);
    setRoomState(null);
    setError(null);
  }, []);

  /** Send lobby ready (before drawing starts) */
  const sendLobbyReady = useCallback(() => {
    send({ type: 'lobby_ready' });
  }, [send]);

  /** Send ready with strokes */
  const sendReady = useCallback(
    (strokes: Stroke[]) => {
      send({ type: 'ready', strokes });
    },
    [send]
  );

  /** Send rematch request */
  const sendRematch = useCallback(() => {
    send({ type: 'rematch' });
  }, [send]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const state: PartyKitState = { status, role, roomState, error };
  const actions: PartyKitActions = { connect, disconnect, sendLobbyReady, sendReady, sendRematch };

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
