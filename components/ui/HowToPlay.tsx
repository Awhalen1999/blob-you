'use client';

import { useState } from 'react';
import { HelpCircle, Skull, Heart, Shield, Zap, Bomb } from 'lucide-react';
import { POWERUP_COLORS, POWERUP_BORDER_COLORS } from '@/lib/constants';

export function HowToPlay() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-10">
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-white/70 hover:text-white hover:bg-white/15 transition-colors text-sm"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <HelpCircle className="w-4 h-4" />
        <span>How to Play</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-gray-900/95 border border-white/20 rounded-lg px-4 py-3 text-xs w-72 shadow-xl">
          {/* Game Overview */}
          <div className="font-bold text-white/90 mb-2 border-b border-white/10 pb-1.5">
            Game Overview
          </div>
          <p className="text-white/70 mb-3 leading-relaxed">
            Draw a blob/shape to create your fighter. Your blob&apos;s stats are calculated from its shape, then battle in the arena!
          </p>

          {/* Stats */}
          <div className="font-bold text-white/90 mb-2 border-b border-white/10 pb-1.5">
            Stats
          </div>
          <div className="space-y-1.5 text-white/70 mb-2">
            <div className="flex justify-between">
              <span className="font-medium">HP</span>
              <span>Mass x 5 (bigger = tankier)</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">DMG</span>
              <span>Sharp angles = more damage</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Mass</span>
              <span>Based on blob area</span>
            </div>
          </div>
          <p className="text-white/50 text-[10px] mb-3 italic">
            Round shapes maximize surface area for more HP. Sharp points add damage but reduce area.
          </p>

          {/* Power-ups */}
          <div className="font-bold text-white/90 mb-2 border-b border-white/10 pb-1.5">
            Power-ups
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center border"
                style={{ backgroundColor: POWERUP_COLORS.damage, borderColor: POWERUP_BORDER_COLORS.damage }}
              >
                <Skull className="w-3 h-3 text-white" />
              </div>
              <span className="text-white/70">2x Damage multiplier</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center border"
                style={{ backgroundColor: POWERUP_COLORS.heal, borderColor: POWERUP_BORDER_COLORS.heal }}
              >
                <Heart className="w-3 h-3 text-white" />
              </div>
              <span className="text-white/70">Heal +20 HP</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center border"
                style={{ backgroundColor: POWERUP_COLORS.shield, borderColor: POWERUP_BORDER_COLORS.shield }}
              >
                <Shield className="w-3 h-3 text-white" />
              </div>
              <span className="text-white/70">Take 0 damage from next hit</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center border"
                style={{ backgroundColor: POWERUP_COLORS.regen, borderColor: POWERUP_BORDER_COLORS.regen }}
              >
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="text-white/70">Regenerate +2 HP per wall bounce</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center border"
                style={{ backgroundColor: POWERUP_COLORS.bomb, borderColor: POWERUP_BORDER_COLORS.bomb }}
              >
                <Bomb className="w-3 h-3 text-white" />
              </div>
              <span className="text-white/70">Deal 20 damage to opponent</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
