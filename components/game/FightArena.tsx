'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import { ArrowLeft } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { ARENA, PHYSICS, POWERUP, POWERUP_BORDER_COLORS, POWERUP_COLORS, POWERUP_ICONS, POWERUP_LABELS } from '@/lib/physics/constants';
import { createBlobBody } from '@/lib/physics/createBlob';
import { createArenaWalls, calculateCollisionDamage } from '@/lib/physics/combat';
import { getRandomNPC } from '@/lib/npc';
import type { BlobStats, PowerUpType, ArenaPoweUp } from '@/types/game';
import HealthBar from './HealthBar';
import BattleResult from './BattleResult';
import Button from '@/components/ui/Button';

function PowerUpIndicator({ type }: { type: PowerUpType }) {
  const Icon = POWERUP_ICONS[type];
  const label = POWERUP_LABELS[type];
  const bgColor = POWERUP_COLORS[type];
  const borderColor = POWERUP_BORDER_COLORS[type];

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 border-2 border-b-[3.5px] rounded font-bold text-[10px] uppercase tracking-wide text-white relative"
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        textShadow: '0 1px 1px rgba(0,0,0,0.5)',
      }}
    >
      <Icon className="w-3 h-3" />
      <span className="leading-none">{label}</span>
    </div>
  );
}

export default function FightArena() {
  // Matter.js refs
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const playerBodyRef = useRef<Matter.Body | null>(null);
  const opponentBodyRef = useRef<Matter.Body | null>(null);
  const powerUpBodiesRef = useRef<Map<number, { body: Matter.Body; type: PowerUpType }>>(
    new Map()
  );

  // Stats refs (for physics callbacks)
  const playerStatsRef = useRef<BlobStats | null>(null);
  const opponentStatsRef = useRef<BlobStats | null>(null);

  // Power-up state refs (for physics callbacks)
  const triggeredThresholdsRef = useRef<Set<number>>(new Set());
  const playerDamageMultRef = useRef(1);
  const opponentDamageMultRef = useRef(1);
  const playerShieldRef = useRef(false);
  const opponentShieldRef = useRef(false);
  const playerRegenRef = useRef(false);
  const opponentRegenRef = useRef(false);

  // UI state
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
  const [powerUps, setPowerUps] = useState<ArenaPoweUp[]>([]);
  const [playerPowerUps, setPlayerPowerUps] = useState<PowerUpType[]>([]);
  const [opponentPowerUps, setOpponentPowerUps] = useState<PowerUpType[]>([]);

  const { myStrokes, setWinner, reset, setPhase, clearStrokes, resetInk, setDrawingTimeLeft } =
    useGameStore();

  /** Spawn a power-up at a random position */
  const spawnPowerUp = useCallback((threshold: number) => {
    if (!engineRef.current) return;
    if (triggeredThresholdsRef.current.has(threshold)) return;

    triggeredThresholdsRef.current.add(threshold);

    const types: PowerUpType[] = ['damage', 'heal', 'shield', 'regen'];
    const type = types[Math.floor(Math.random() * types.length)];

    const x = 100 + Math.random() * (ARENA.WIDTH - 200);
    const y = 100 + Math.random() * (ARENA.HEIGHT - 200);

    const powerUp = Matter.Bodies.circle(x, y, POWERUP.RADIUS, {
      label: 'powerup',
      isStatic: true,
      isSensor: true,
      render: { fillStyle: POWERUP_COLORS[type] },
    });

    const bodyId = powerUp.id;
    powerUpBodiesRef.current.set(bodyId, { body: powerUp, type });
    Matter.Composite.add(engineRef.current.world, powerUp);
    setPowerUps((prev) => [...prev, { id: bodyId, x, y, type }]);
  }, []);

  /** Clean up Matter.js resources */
  const cleanup = useCallback(() => {
    if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
    if (renderRef.current) {
      Matter.Render.stop(renderRef.current);
      renderRef.current.canvas.remove();
    }
    if (engineRef.current) Matter.Engine.clear(engineRef.current);

    // Reset all refs
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

  /** Check HP thresholds and spawn power-ups */
  const checkPowerUpSpawn = useCallback(
    (newHp: number) => {
      if (newHp <= POWERUP.TRIGGER_HP_4) spawnPowerUp(POWERUP.TRIGGER_HP_4);
      else if (newHp <= POWERUP.TRIGGER_HP_3) spawnPowerUp(POWERUP.TRIGGER_HP_3);
      else if (newHp <= POWERUP.TRIGGER_HP_2) spawnPowerUp(POWERUP.TRIGGER_HP_2);
      else if (newHp <= POWERUP.TRIGGER_HP_1) spawnPowerUp(POWERUP.TRIGGER_HP_1);
    },
    [spawnPowerUp]
  );

  /** Initialize physics engine and game state */
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

    // Create player blob
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

    // Create opponent blob
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

    // Collision handler
    Matter.Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        const labels = [bodyA.label, bodyB.label];

        // Power-up collision
        if (labels.includes('powerup')) {
          const picker = labels.includes('player')
            ? 'player'
            : labels.includes('opponent')
              ? 'opponent'
              : null;
          const powerUpBody = bodyA.label === 'powerup' ? bodyA : bodyB;

          if (picker) {
            const powerUpData = powerUpBodiesRef.current.get(powerUpBody.id);
            if (powerUpData) {
              Matter.Composite.remove(engine.world, powerUpData.body);
              powerUpBodiesRef.current.delete(powerUpBody.id);
              setPowerUps((prev) => prev.filter((p) => p.id !== powerUpBody.id));

              const type = powerUpData.type;
              if (type === 'damage') {
                if (picker === 'player') {
                  playerDamageMultRef.current *= POWERUP.DOUBLE_DAMAGE_MULT;
                  setPlayerPowerUps((prev) => [...prev, 'damage']);
                } else {
                  opponentDamageMultRef.current *= POWERUP.DOUBLE_DAMAGE_MULT;
                  setOpponentPowerUps((prev) => [...prev, 'damage']);
                }
              } else if (type === 'heal') {
                if (picker === 'player') {
                  setPlayerHp((prev) => Math.min(prev + POWERUP.HEAL_AMOUNT, playerMaxHp));
                  setPlayerPowerUps((prev) => [...prev, 'heal']);
                } else {
                  setOpponentHp((prev) => Math.min(prev + POWERUP.HEAL_AMOUNT, opponentMaxHp));
                  setOpponentPowerUps((prev) => [...prev, 'heal']);
                }
              } else if (type === 'shield') {
                if (picker === 'player') {
                  playerShieldRef.current = true;
                  setPlayerPowerUps((prev) => [...prev, 'shield']);
                } else {
                  opponentShieldRef.current = true;
                  setOpponentPowerUps((prev) => [...prev, 'shield']);
                }
              } else if (type === 'regen') {
                if (picker === 'player') {
                  playerRegenRef.current = true;
                  setPlayerPowerUps((prev) => [...prev, 'regen']);
                } else {
                  opponentRegenRef.current = true;
                  setOpponentPowerUps((prev) => [...prev, 'regen']);
                }
              }
            }
          }
          continue;
        }

        // Wall collision - regen healing
        if (labels.includes('wall')) {
          if (labels.includes('player') && playerRegenRef.current) {
            setPlayerHp((prev) => Math.min(prev + POWERUP.REGEN_HEAL_AMOUNT, playerMaxHp));
          }
          if (labels.includes('opponent') && opponentRegenRef.current) {
            setOpponentHp((prev) => Math.min(prev + POWERUP.REGEN_HEAL_AMOUNT, opponentMaxHp));
          }
          continue;
        }

        // Blob vs blob collision
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

          let dmgToOpponent =
            calculateCollisionDamage(playerBody, pStats, opponentBody) *
            playerDamageMultRef.current;
          let dmgToPlayer =
            calculateCollisionDamage(opponentBody, oStats, playerBody) *
            opponentDamageMultRef.current;

          // Shield blocks damage
          if (opponentShieldRef.current && dmgToOpponent > 0) {
            opponentShieldRef.current = false;
            setOpponentPowerUps((prev) => prev.filter((p) => p !== 'shield'));
            dmgToOpponent = 0;
          }
          if (playerShieldRef.current && dmgToPlayer > 0) {
            playerShieldRef.current = false;
            setPlayerPowerUps((prev) => prev.filter((p) => p !== 'shield'));
            dmgToPlayer = 0;
          }

          if (dmgToOpponent > 0) {
            setOpponentHp((prev) => {
              const newHp = Math.max(0, prev - dmgToOpponent);
              checkPowerUpSpawn(newHp);
              return newHp;
            });
          }
          if (dmgToPlayer > 0) {
            setPlayerHp((prev) => {
              const newHp = Math.max(0, prev - dmgToPlayer);
              checkPowerUpSpawn(newHp);
              return newHp;
            });
          }
        }
      }
    });

    // Speed normalization
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
  }, [myStrokes, cleanup, playerMaxHp, opponentMaxHp, checkPowerUpSpawn]);

  /** Handle battle end */
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
      <Button
        onClick={handleMainMenu}
        variant="secondary"
        size="md"
        icon={<ArrowLeft className="w-4 h-4" />}
        className="absolute top-4 left-4 z-10"
      >
        Back
      </Button>

      {/* Health bars */}
      <div className="flex justify-between w-full max-w-[700px] mb-md px-sm">
        <HealthBar current={playerHp} max={playerMaxHp} label="Your Blob" isPlayer />
        <HealthBar current={opponentHp} max={opponentMaxHp} label={opponentName} />
      </div>

      {/* Arena with power-up overlays */}
      <div className="relative">
        <div ref={containerRef} style={{ width: ARENA.WIDTH, height: ARENA.HEIGHT }} />

        {powerUps.map((powerUp) => {
          const Icon = POWERUP_ICONS[powerUp.type];
          return (
            <div
              key={powerUp.id}
              className="absolute pointer-events-none flex items-center justify-center rounded-full w-8 h-8 border-2"
              style={{
                backgroundColor: POWERUP_COLORS[powerUp.type],
                borderColor: POWERUP_BORDER_COLORS[powerUp.type],
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 0 rgba(0,0,0,0.35)',
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

      {/* Stats bar */}
      <div className="flex justify-between w-full max-w-[700px] mt-md px-sm text-white/70 text-sm min-h-[24px]">
        <div className="flex items-center gap-4">
          <span>
            <b>DMG:</b>{' '}
            <span className={playerStats?.damage 
              ? playerStats.damage >= 20 
                ? 'text-red-500 font-bold' 
                : playerStats.damage >= 15 
                  ? 'text-orange-400 font-bold' 
                  : 'text-white/70'
              : ''
            }>
              {playerStats?.damage ?? '-'}
            </span>
          </span>
          <span>
            <b>MASS:</b>{' '}
            <span className={playerStats?.mass 
              ? playerStats.mass >= 20
                ? 'text-red-500 font-bold' 
                : playerStats.mass >= 15 
                  ? 'text-orange-400 font-bold' 
                  : 'text-white/70'
              : ''
            }>
              {playerStats?.mass ?? '-'}
            </span>
          </span>
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
          <span>
            <b>MASS:</b>{' '}
            <span className={opponentStats?.mass 
              ? opponentStats.mass >= 20 
                ? 'text-red-500 font-bold' 
                : opponentStats.mass >= 15 
                  ? 'text-orange-400 font-bold' 
                  : 'text-white/70'
              : ''
            }>
              {opponentStats?.mass ?? '-'}
            </span>
          </span>
          <span>
            <b>DMG:</b>{' '}
            <span className={opponentStats?.damage 
              ? opponentStats.damage >= 20 
                ? 'text-red-500 font-bold' 
                : opponentStats.damage >= 15 
                  ? 'text-orange-400 font-bold' 
                  : 'text-white/70'
              : ''
            }>
              {opponentStats?.damage ?? '-'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
