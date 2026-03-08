'use client';

import { Check } from 'lucide-react';
import Button from '@/components/ui/Button';

interface BattleResultProps {
  isVictory: boolean;
  isTie: boolean;
  isMultiplayer: boolean;
  isGamba?: boolean;
  myRematchRequested: boolean;
  opponentRematchRequested: boolean;
  onRematch: () => void;
  onMainMenu: () => void;
}

export default function BattleResult({
  isVictory,
  isTie,
  isMultiplayer,
  isGamba = false,
  myRematchRequested,
  opponentRematchRequested,
  onRematch,
  onMainMenu
}: BattleResultProps) {
  const bothReady = myRematchRequested && opponentRematchRequested;

  const titleColor = isTie ? 'text-yellow-400' : isVictory ? 'text-green-400' : 'text-red-500';
  const titleShadow = isTie
    ? '4px 4px 0px #a16207, 8px 8px 0px rgba(0,0,0,0.3), 0 0 20px rgba(250,204,21,0.4)'
    : isVictory
    ? '4px 4px 0px #15803d, 8px 8px 0px rgba(0,0,0,0.3), 0 0 20px rgba(74,222,128,0.4)'
    : '4px 4px 0px #b91c1c, 8px 8px 0px rgba(0,0,0,0.3), 0 0 20px rgba(239,68,68,0.4)';
  const titleText = isTie ? 'DRAW!' : isVictory ? 'VICTORY!' : 'DEFEAT';
  const subText = isTie
    ? 'BOTH BLOBS HAVE FALLEN...'
    : isVictory
    ? 'YOUR BLOB HAS WON THE BATTLE!'
    : 'YOUR BLOB HAS BEEN DEFEATED...';

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div className="flex flex-col items-center gap-6 p-lg">
        {/* Result text - retro Nintendo style */}
        <h1
          className={`text-7xl font-black uppercase tracking-wider ${titleColor}`}
          style={{ textShadow: titleShadow, letterSpacing: '0.15em' }}
        >
          {titleText}
        </h1>

        {/* Sub text - retro style */}
        <p
          className="text-white text-xl font-bold uppercase tracking-wide"
          style={{
            textShadow: '2px 2px 0px rgba(0,0,0,0.5), 0 0 10px rgba(0,0,0,0.3)',
          }}
        >
          {subText}
        </p>

        {/* Rematch status for multiplayer - consistent spacing */}
        <div className="min-h-[32px] flex items-center justify-center">
          {isMultiplayer && myRematchRequested && !bothReady && (
            <div className="flex items-center gap-2 text-green-400 font-bold">
              <Check className="w-5 h-5" />
              <span>Rematch requested</span>
            </div>
          )}

          {isMultiplayer && opponentRematchRequested && !myRematchRequested && (
            <div className="flex items-center gap-2 text-green-400 font-bold">
              <Check className="w-5 h-5" />
              <span>Opponent wants a rematch!</span>
            </div>
          )}

          {isMultiplayer && bothReady && (
            <div className="text-green-400 font-bold text-lg animate-pulse">
              Starting rematch...
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          {isMultiplayer && !isGamba ? (
            <>
              <Button
                onClick={onRematch}
                variant={myRematchRequested ? 'secondary' : 'danger'}
                size="lg"
                disabled={myRematchRequested || bothReady}
              >
                {myRematchRequested ? 'Waiting...' : 'Rematch'}
              </Button>

              <Button onClick={onMainMenu} variant="primary" size="lg">
                Leave Lobby
              </Button>
            </>
          ) : isMultiplayer && isGamba ? (
            <Button onClick={onMainMenu} variant="primary" size="lg">
              Back to Menu
            </Button>
          ) : (
            <>
              <Button onClick={onRematch} variant="danger" size="lg">
                Rematch
              </Button>

              <Button onClick={onMainMenu} variant="primary" size="lg">
                Main Menu
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
