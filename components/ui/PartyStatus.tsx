'use client';

import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { usePartyKitContext } from '@/contexts/PartyKitContext';
import { useGameStore } from '@/store/gameStore';

export function PartyStatus() {
  const [partyState] = usePartyKitContext();
  const gameMode = useGameStore((s) => s.gameMode);

  const [showDisconnectMessage, setShowDisconnectMessage] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredRef = useRef(false);

  // When opponent leaves, show message for 3 seconds
  useEffect(() => {
    if (partyState.opponentLeft && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;

      // Schedule setState for next tick to avoid synchronous setState in effect
      timerRef.current = setTimeout(() => {
        setShowDisconnectMessage(true);

        // Hide after 3 seconds
        hideTimerRef.current = setTimeout(() => {
          setShowDisconnectMessage(false);
          hasTriggeredRef.current = false;
        }, 3000);
      }, 0);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [partyState.opponentLeft]);

  if (showDisconnectMessage) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border backdrop-blur-md shadow-lg bg-red-500/20 border-red-500 text-red-300">
          <WifiOff className="w-3 h-3" />
          <span>Opponent disconnected</span>
        </div>
      </div>
    );
  }

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
    <div className="fixed bottom-4 right-4 z-50">
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
