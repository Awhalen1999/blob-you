'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import { Skull, HeartPlus, Shield, Zap } from 'lucide-react'
import { useGameStore } from '@/store/gameStore';
import { ARENA, PHYSICS, POWERUP } from '@/lib/physics/constants';
import { createBlobBody } from '@/lib/physics/createBlob';
import { createArenaWalls, calculateCollisionDamage } from '@/lib/physics/combat';
import { getRandomNPC } from '@/lib/npc';
import type { BlobStats } from '@/types/game';
import HealthBar from './HealthBar';
import BattleResult from './BattleResult';

type PowerUpType = 'damage' | 'heal' | 'shield' | 'regen';

function PowerUpIndicator({ type }: { type: PowerUpType }) {
  const config = {
    damage: { bg: 'bg-red-500', border: 'border-red-700', icon: Skull, label: '2x DMG' },
    heal: { bg: 'bg-green-500', border: 'border-green-700', icon: HeartPlus, label: '+20' },
    shield: { bg: 'bg-blue-500', border: 'border-blue-700', icon: Shield, label: 'SHIELD' },
    regen: { bg: 'bg-amber-500', border: 'border-amber-700', icon: Zap, label: 'REGEN' },
  };
  
  const { bg, border, icon: Icon, label } = config[type];
  
  return (
    <div 
      className={`
        inline-flex items-center gap-1 px-2 py-0.5
        ${bg} ${border}
        border-2 border-b-[3px]
        rounded
        font-bold text-[10px] uppercase tracking-wide
        text-white
        relative
      `}
      style={{
        textShadow: '0 1px 1px rgba(0,0,0,0.5)',
        boxShadow: '0 2px 0 rgba(0,0,0,0.3)',
      }}
    >
      <Icon className="w-3 h-3" />
      <span className="leading-none">{label}</span>
    </div>
  );
}

export default function FightArena() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const playerBodyRef = useRef<Matter.Body | null>(null);
  const opponentBodyRef = useRef<Matter.Body | null>(null);
  const powerUpBodiesRef = useRef<Map<number, { body: Matter.Body; type: PowerUpType }>>(new Map());

  const playerStatsRef = useRef<BlobStats | null>(null);
  const opponentStatsRef = useRef<BlobStats | null>(null);

  const triggeredThresholdsRef = useRef<Set<number>>(new Set());
  const playerDamageMultRef = useRef(1);
  const opponentDamageMultRef = useRef(1);
  const playerShieldRef = useRef(false);
  const opponentShieldRef = useRef(false);
  const playerRegenRef = useRef(false);
  const opponentRegenRef = useRef(false);

  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [opponentHp, setOpponentHp] = useState(100);
  const [opponentMaxHp, setOpponentMaxHp] = useState(100);
  const [playerStats, setPlayerStats] = useState<BlobStats | null>(null);
  const [opponentStats, setOpponentStats] = useState<BlobStats | null>(null);
  const [battleOver, setBattleOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [opponentName, setOpponentName] = useState('Opponent');

  // Power-up UI state
  const [powerUps, setPowerUps] = useState<Array<{ id: number; x: number; y: number; type: PowerUpType }>>([]);
  const [playerPowerUps, setPlayerPowerUps] = useState<PowerUpType[]>([]);
  const [opponentPowerUps, setOpponentPowerUps] = useState<PowerUpType[]>([]);

  const { myStrokes, setWinner, reset, setPhase, clearStrokes, resetInk, setDrawingTimeLeft } = useGameStore();

  const spawnPowerUp = useCallback((threshold: number) => {
    if (!engineRef.current) return;

    // Check if this specific threshold has already been triggered
    if (triggeredThresholdsRef.current.has(threshold)) return;

    // Mark this threshold as triggered (can never trigger again)
    triggeredThresholdsRef.current.add(threshold);
    const types: PowerUpType[] = ['damage', 'heal', 'shield', 'regen'];
    const type = types[Math.floor(Math.random() * types.length)];

    const colors: Record<PowerUpType, string> = {
      damage: '#ef4444',  // red
      heal: '#22c55e',    // green
      shield: '#3b82f6',  // blue
      regen: '#f59e0b',   // amber
    };

    const x = 100 + Math.random() * (ARENA.WIDTH - 200);
    const y = 100 + Math.random() * (ARENA.HEIGHT - 200);

    const powerUp = Matter.Bodies.circle(x, y, POWERUP.RADIUS, {
      label: 'powerup',
      isStatic: true,
      isSensor: true,
      render: {
        fillStyle: colors[type],
      },
    });

    const bodyId = powerUp.id;
    powerUpBodiesRef.current.set(bodyId, { body: powerUp, type });
    Matter.Composite.add(engineRef.current.world, powerUp);
    setPowerUps(prev => [...prev, { id: bodyId, x, y, type }]);
  }, []);

  const cleanup = useCallback(() => {
    if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
    if (renderRef.current) {
      Matter.Render.stop(renderRef.current);
      renderRef.current.canvas.remove();
    }
    if (engineRef.current) Matter.Engine.clear(engineRef.current);

    engineRef.current = null;
    renderRef.current = null;
    runnerRef.current = null;
    playerBodyRef.current = null;
    opponentBodyRef.current = null;
    powerUpBodiesRef.current.clear();
    playerStatsRef.current = null;
    opponentStatsRef.current = null;
    triggeredThresholdsRef.current.clear();
    playerDamageMultRef.current = 1;
    opponentDamageMultRef.current = 1;
    playerShieldRef.current = false;
    opponentShieldRef.current = false;
    playerRegenRef.current = false;
    opponentRegenRef.current = false;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = Matter.Engine.create({ gravity: PHYSICS.GRAVITY });
    engineRef.current = engine;

    const render = Matter.Render.create({
      element: containerRef.current,
      engine,
      options: {
        width: ARENA.WIDTH,
        height: ARENA.HEIGHT,
        wireframes: false,
        background: '#111827',
      },
    });
    renderRef.current = render;
    render.canvas.style.borderRadius = '6px';
    render.canvas.style.border = '4px solid rgba(255, 255, 255, 0.4)';

    Matter.Composite.add(engine.world, createArenaWalls());

    const playerBlob = createBlobBody(myStrokes, {
      x: ARENA.SPAWN_OFFSET,
      y: ARENA.HEIGHT / 2,
      scale: PHYSICS.BLOB_SCALE,
      label: 'player',
      color: '#4ade80',
    });

    if (playerBlob) {
      Matter.Composite.add(engine.world, playerBlob.body);
      playerBodyRef.current = playerBlob.body;
      playerStatsRef.current = playerBlob.stats;

      requestAnimationFrame(() => {
        setPlayerStats(playerBlob.stats);
        setPlayerHp(playerBlob.stats.hp);
        setPlayerMaxHp(playerBlob.stats.maxHp);
      });

      const angle = Math.random() * 0.5 - 0.25;
      Matter.Body.setVelocity(playerBlob.body, {
        x: PHYSICS.INITIAL_SPEED * Math.cos(angle),
        y: PHYSICS.INITIAL_SPEED * Math.sin(angle),
      });
      Matter.Body.setAngularVelocity(playerBlob.body, PHYSICS.INITIAL_SPIN);
    }

    const npc = getRandomNPC();
    const opponentBlob = createBlobBody(npc.strokes, {
      x: ARENA.WIDTH - ARENA.SPAWN_OFFSET,
      y: ARENA.HEIGHT / 2,
      scale: PHYSICS.BLOB_SCALE,
      label: 'opponent',
      color: npc.color,
    });

    if (opponentBlob) {
      Matter.Composite.add(engine.world, opponentBlob.body);
      opponentBodyRef.current = opponentBlob.body;
      opponentStatsRef.current = opponentBlob.stats;

      requestAnimationFrame(() => {
        setOpponentName(npc.name);
        setOpponentStats(opponentBlob.stats);
        setOpponentHp(opponentBlob.stats.hp);
        setOpponentMaxHp(opponentBlob.stats.maxHp);
      });

      const angle = Math.PI + (Math.random() * 0.5 - 0.25);
      Matter.Body.setVelocity(opponentBlob.body, {
        x: PHYSICS.INITIAL_SPEED * Math.cos(angle),
        y: PHYSICS.INITIAL_SPEED * Math.sin(angle),
      });
      Matter.Body.setAngularVelocity(opponentBlob.body, -PHYSICS.INITIAL_SPIN);
    }

    Matter.Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        const labels = [bodyA.label, bodyB.label];

        if (labels.includes('powerup')) {
          const picker = labels.includes('player') ? 'player' : labels.includes('opponent') ? 'opponent' : null;
          const powerUpBody = bodyA.label === 'powerup' ? bodyA : bodyB;
          
          if (picker) {
            const powerUpData = powerUpBodiesRef.current.get(powerUpBody.id);
            if (powerUpData) {
              // Remove from world and tracking
              Matter.Composite.remove(engine.world, powerUpData.body);
              powerUpBodiesRef.current.delete(powerUpBody.id);
              setPowerUps(prev => prev.filter(p => p.id !== powerUpBody.id));

              const type = powerUpData.type;
              if (type === 'damage') {
                if (picker === 'player') {
                  playerDamageMultRef.current *= POWERUP.DOUBLE_DAMAGE_MULT;
                  setPlayerPowerUps(prev => [...prev, 'damage']);
                } else {
                  opponentDamageMultRef.current *= POWERUP.DOUBLE_DAMAGE_MULT;
                  setOpponentPowerUps(prev => [...prev, 'damage']);
                }
              } else if (type === 'heal') {
                if (picker === 'player') {
                  setPlayerHp(prev => Math.min(prev + POWERUP.HEAL_AMOUNT, playerMaxHp));
                  setPlayerPowerUps(prev => [...prev, 'heal']);
                } else {
                  setOpponentHp(prev => Math.min(prev + POWERUP.HEAL_AMOUNT, opponentMaxHp));
                  setOpponentPowerUps(prev => [...prev, 'heal']);
                }
              } else if (type === 'shield') {
                if (picker === 'player') {
                  playerShieldRef.current = true;
                  setPlayerPowerUps(prev => [...prev, 'shield']);
                } else {
                  opponentShieldRef.current = true;
                  setOpponentPowerUps(prev => [...prev, 'shield']);
                }
              } else if (type === 'regen') {
                if (picker === 'player') {
                  playerRegenRef.current = true;
                  setPlayerPowerUps(prev => [...prev, 'regen']);
                } else {
                  opponentRegenRef.current = true;
                  setOpponentPowerUps(prev => [...prev, 'regen']);
                }
              }
            }
          }
          continue;
        }

        // Wall collision - regen healing
        if (labels.includes('wall')) {
          if (labels.includes('player') && playerRegenRef.current) {
            setPlayerHp(prev => Math.min(prev + POWERUP.REGEN_HEAL_AMOUNT, playerMaxHp));
          }
          if (labels.includes('opponent') && opponentRegenRef.current) {
            setOpponentHp(prev => Math.min(prev + POWERUP.REGEN_HEAL_AMOUNT, opponentMaxHp));
          }
          continue;
        }

        const pStats = playerStatsRef.current;
        const oStats = opponentStatsRef.current;
        if (!pStats || !oStats) continue;

        const isPlayerA = bodyA.label === 'player';
        const isOpponentA = bodyA.label === 'opponent';
        const isPlayerB = bodyB.label === 'player';
        const isOpponentB = bodyB.label === 'opponent';

        if ((isPlayerA && isOpponentB) || (isOpponentA && isPlayerB)) {
          const playerBody = isPlayerA ? bodyA : bodyB;
          const opponentBody = isOpponentA ? bodyA : bodyB;

          let dmgToOpponent = calculateCollisionDamage(playerBody, pStats, opponentBody) * playerDamageMultRef.current;
          let dmgToPlayer = calculateCollisionDamage(opponentBody, oStats, playerBody) * opponentDamageMultRef.current;

          // Shield blocks damage
          if (opponentShieldRef.current && dmgToOpponent > 0) {
            opponentShieldRef.current = false;
            setOpponentPowerUps(prev => prev.filter(p => p !== 'shield'));
            dmgToOpponent = 0;
          }
          if (playerShieldRef.current && dmgToPlayer > 0) {
            playerShieldRef.current = false;
            setPlayerPowerUps(prev => prev.filter(p => p !== 'shield'));
            dmgToPlayer = 0;
          }

          if (dmgToOpponent > 0) {
            setOpponentHp(prev => {
              const newHp = Math.max(0, prev - dmgToOpponent);
              if (newHp <= POWERUP.TRIGGER_HP_4) spawnPowerUp(POWERUP.TRIGGER_HP_4);
              else if (newHp <= POWERUP.TRIGGER_HP_3) spawnPowerUp(POWERUP.TRIGGER_HP_3);
              else if (newHp <= POWERUP.TRIGGER_HP_2) spawnPowerUp(POWERUP.TRIGGER_HP_2);
              else if (newHp <= POWERUP.TRIGGER_HP_1) spawnPowerUp(POWERUP.TRIGGER_HP_1);
              return newHp;
            });
          }
          if (dmgToPlayer > 0) {
            setPlayerHp(prev => {
              const newHp = Math.max(0, prev - dmgToPlayer);
              if (newHp <= POWERUP.TRIGGER_HP_4) spawnPowerUp(POWERUP.TRIGGER_HP_4);
              else if (newHp <= POWERUP.TRIGGER_HP_3) spawnPowerUp(POWERUP.TRIGGER_HP_3);
              else if (newHp <= POWERUP.TRIGGER_HP_2) spawnPowerUp(POWERUP.TRIGGER_HP_2);
              else if (newHp <= POWERUP.TRIGGER_HP_1) spawnPowerUp(POWERUP.TRIGGER_HP_1);
              return newHp;
            });
          }
        }
      }
    });

    Matter.Events.on(engine, 'afterUpdate', () => {
      const normalizeSpeed = (body: Matter.Body | null) => {
        if (!body) return;
        const { x: vx, y: vy } = body.velocity;
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > 0.01) {
          const scale = PHYSICS.INITIAL_SPEED / speed;
          Matter.Body.setVelocity(body, { x: vx * scale, y: vy * scale });
        }
      };
      normalizeSpeed(playerBodyRef.current);
      normalizeSpeed(opponentBodyRef.current);
    });

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    return cleanup;
  }, [myStrokes, cleanup, playerMaxHp, opponentMaxHp, spawnPowerUp]);

  useEffect(() => {
    if (battleOver) return;

    if (playerHp <= 0) {
      if (engineRef.current && playerBodyRef.current) {
        Matter.Composite.remove(engineRef.current.world, playerBodyRef.current);
      }
      requestAnimationFrame(() => {
        setBattleOver(true);
        setIsVictory(false);
        setWinner('opponent');
      });
    } else if (opponentHp <= 0) {
      if (engineRef.current && opponentBodyRef.current) {
        Matter.Composite.remove(engineRef.current.world, opponentBodyRef.current);
      }
      requestAnimationFrame(() => {
        setBattleOver(true);
        setIsVictory(true);
        setWinner('me');
      });
    }
  }, [playerHp, opponentHp, battleOver, setWinner]);

  const handleRematch = () => {
    cleanup();
    setBattleOver(false);
    setWinner(null);
    setPlayerPowerUps([]);
    setOpponentPowerUps([]);
    setPowerUps([]);
    clearStrokes();
    resetInk();
    setDrawingTimeLeft(15);
    setPhase('drawing');
  };

  const handleMainMenu = () => {
    cleanup();
    reset();
  };

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-center">
      <button
        onClick={handleMainMenu}
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-black/60 text-white border-2 border-white/30 rounded-md text-sm font-bold hover:bg-black/80 hover:border-white/50 transition-all"
      >
        ← Back
      </button>

      {/* Health bars */}
      <div className="flex justify-between w-full max-w-[700px] mb-md px-sm">
        <HealthBar current={playerHp} max={playerMaxHp} label="Your Blob" isPlayer />
        <HealthBar current={opponentHp} max={opponentMaxHp} label={opponentName} />
      </div>

      {/* Arena with power-up icon overlay */}
      <div className="relative">
        <div ref={containerRef} style={{ width: ARENA.WIDTH, height: ARENA.HEIGHT }} />

        {/* Power-up icon overlays - centered on each power-up */}
        {/* +4 accounts for the canvas border */}
        {powerUps.map((powerUp) => {
          const IconMap = { damage: Skull, heal: HeartPlus, shield: Shield, regen: Zap };
          const Icon = IconMap[powerUp.type];
          return (
            <div
              key={powerUp.id}
              className="absolute pointer-events-none"
              style={{
                left: powerUp.x + 4,
                top: powerUp.y + 4,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Icon className="w-4 h-4 text-white drop-shadow-lg" />
            </div>
          );
        })}
      </div>

      {battleOver && (
        <BattleResult isVictory={isVictory} onRematch={handleRematch} onMainMenu={handleMainMenu} />
      )}

      <div className="flex justify-between w-full max-w-[700px] mt-md px-sm text-white/70 text-sm min-h-[24px]">
        <div className="flex items-center gap-4">
          <span><b>DMG:</b> {playerStats?.damage ?? '-'}</span>
          <span><b>MASS:</b> {playerStats?.mass ?? '-'}</span>
          <div className="flex items-center gap-2">
            {playerPowerUps.map((powerUp, index) => (
              <PowerUpIndicator key={`${powerUp}-${index}`} type={powerUp} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {opponentPowerUps.map((powerUp, index) => (
              <PowerUpIndicator key={`${powerUp}-${index}`} type={powerUp} />
            ))}
          </div>
          <span><b>MASS:</b> {opponentStats?.mass ?? '-'}</span>
          <span><b>DMG:</b> {opponentStats?.damage ?? '-'}</span>
        </div>
      </div>
    </div>
  );
}
