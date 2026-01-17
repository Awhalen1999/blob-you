'use client';

interface BattleResultProps {
  isVictory: boolean;
  onRematch: () => void;
  onMainMenu: () => void;
}

export default function BattleResult({ isVictory, onRematch, onMainMenu }: BattleResultProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
      <div className="flex flex-col items-center gap-md p-lg">
        {/* Result text */}
        <h1
          className={`
            text-6xl font-black tracking-wider
            ${isVictory
              ? 'text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]'
              : 'text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.5)]'
            }
          `}
          style={{
            textShadow: isVictory
              ? '0 0 10px rgba(74,222,128,0.8), 0 0 30px rgba(74,222,128,0.4)'
              : '0 0 10px rgba(248,113,113,0.8), 0 0 30px rgba(248,113,113,0.4)',
          }}
        >
          {isVictory ? 'VICTORY!' : 'DEFEAT'}
        </h1>

        {/* Sub text */}
        <p className="text-white/70 text-lg font-medium">
          {isVictory
            ? 'Your blob emerged triumphant!'
            : 'Your blob has been defeated...'}
        </p>

        {/* Buttons */}
        <div className="flex gap-md mt-md">
          <button
            onClick={onRematch}
            className="px-8 py-3 bg-gray-800 text-white border-4 border-white/30 rounded-md text-lg font-bold hover:bg-gray-700 hover:border-white/50 transition-all"
          >
            Rematch
          </button>

          <button
            onClick={onMainMenu}
            className="px-8 py-3 bg-gray-800 text-white border-4 border-white/30 rounded-md text-lg font-bold hover:bg-gray-700 hover:border-white/50 transition-all"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
