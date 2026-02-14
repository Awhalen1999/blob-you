'use client';

import { Trophy } from 'lucide-react';

interface HealthBarProps {
  current: number;
  max: number;
  label: string;
  isPlayer?: boolean;
  wins?: number;
}

export default function HealthBar({ current, max, label, isPlayer = false, wins = 0 }: HealthBarProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));

  // Color states based on HP
  const isCritical = percentage <= 20;
  const isLow = percentage <= 40;

  // Bar fill color
  const getBarColor = () => {
    if (isCritical) return 'bg-red-500';
    if (isLow) return 'bg-orange-400';
    return isPlayer ? 'bg-green-400' : 'bg-blue-400';
  };

  // Border color
  const getBorderColor = () => {
    if (isCritical) return 'border-red-400/70';
    if (isLow) return 'border-orange-400/70';
    return 'border-white/40';
  };

  return (
    <div className={`flex flex-col gap-1 ${isPlayer ? 'items-start' : 'items-end'}`}>
      {/* Label */}
      <div className={`flex items-center gap-1.5 ${isPlayer ? '' : 'flex-row-reverse'}`}>
        <span className="text-xs font-bold text-white/80 uppercase tracking-wide">
          {label}
        </span>
        {wins > 0 && (
          <div className="flex items-center gap-0.5">
            <Trophy className="w-3 h-3 text-yellow-400" />
            {wins > 1 && (
              <span className="text-[10px] font-bold text-yellow-400">x{wins}</span>
            )}
          </div>
        )}
      </div>

      {/* HP bar container */}
      <div
        className={`
          w-48 h-6 bg-black/60 border-4 rounded-sm relative overflow-hidden
          transition-all duration-200
          ${getBorderColor()}
          ${isCritical ? 'animate-pulse' : ''}
        `}
      >
        {/* HP fill */}
        <div
          className={`
            absolute top-0 bottom-0 transition-all duration-300 ease-out
            ${getBarColor()}
            ${isPlayer ? 'left-0' : 'right-0'}
          `}
          style={{ width: `${percentage}%` }}
        >
          {/* Shine effect */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
            }}
          />
        </div>

        {/* Segment lines */}
        <div className="absolute inset-0 flex pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex-1 border-r border-white/10 last:border-r-0" />
          ))}
        </div>

        {/* HP number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`
              text-xs font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]
              ${isCritical ? 'text-red-100' : ''}
            `}
          >
            {Math.round(current)} / {max}
          </span>
        </div>
      </div>
    </div>
  );
}
