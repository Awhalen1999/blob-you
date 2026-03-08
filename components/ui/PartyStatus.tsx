'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { usePartyKitContext } from '@/contexts/PartyKitContext';
import { useGameStore } from '@/store/gameStore';

export function PartyStatus() {
  const [partyState] = usePartyKitContext();
  const gameMode = useGameStore((s) => s.gameMode);

  if (gameMode !== 'multiplayer' || partyState.status === 'disconnected') {
    return null;
  }

  const opponentName = partyState.role === 'host'
    ? partyState.roomState?.guestName
    : partyState.roomState?.hostName;

  const isConnected = partyState.role === 'host'
    ? !!partyState.roomState?.guestId
    : !!partyState.roomState?.hostId;

  return (
    <div className="fixed bottom-12 right-4 z-50">
      <div
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
          border backdrop-blur-md transition-all shadow-lg
          ${isConnected
            ? 'bg-green-500/20 border-green-500 text-green-300'
            : 'bg-red-500/20 border-red-500 text-red-300'
          }
        `}
      >
        {isConnected ? (
          <>
            <Wifi className="w-3 h-3" />
            <span>{opponentName}</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span>Waiting for opponent</span>
          </>
        )}
      </div>
    </div>
  );
}
