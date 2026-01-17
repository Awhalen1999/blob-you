'use client';

import Button from '@/components/ui/Button';

interface BattleResultProps {
  isVictory: boolean;
  onRematch: () => void;
  onMainMenu: () => void;
}

export default function BattleResult({ isVictory, onRematch, onMainMenu }: BattleResultProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div className="flex flex-col items-center gap-6 p-lg">
        {/* Result text - retro Nintendo style */}
        <h1
          className={`
            text-7xl font-black uppercase tracking-[0.1em]
            ${isVictory ? 'text-green-400' : 'text-red-500'}
          `}
          style={{
            textShadow: isVictory
              ? '4px 4px 0px #15803d, 8px 8px 0px rgba(0,0,0,0.3), 0 0 20px rgba(74,222,128,0.4)'
              : '4px 4px 0px #b91c1c, 8px 8px 0px rgba(0,0,0,0.3), 0 0 20px rgba(239,68,68,0.4)',
            letterSpacing: '0.15em',
          }}
        >
          {isVictory ? 'VICTORY!' : 'DEFEAT'}
        </h1>

        {/* Sub text - retro style */}
        <p
          className="text-white text-xl font-bold uppercase tracking-wide"
          style={{
            textShadow: '2px 2px 0px rgba(0,0,0,0.5), 0 0 10px rgba(0,0,0,0.3)',
          }}
        >
          {isVictory
            ? 'YOUR BLOB EMERGED TRIUMPHANT!'
            : 'YOUR BLOB HAS BEEN DEFEATED...'}
        </p>

        {/* Buttons */}
        <div className="flex gap-4 mt-4">
          <Button onClick={onRematch} variant="danger" size="lg">
            Rematch
          </Button>

          <Button onClick={onMainMenu} variant="primary" size="lg">
            Main Menu
          </Button>
        </div>
      </div>
    </div>
  );
}
