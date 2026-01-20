'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import { ArrowLeft, Info } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { usePartyKitContext } from '@/contexts/PartyKitContext';
import { ARENA, PHYSICS, POWERUP, POWERUP_BORDER_COLORS, POWERUP_COLORS, POWERUP_ICONS, POWERUP_LABELS, STATS } from '@/lib/constants';
import { createBlobBody } from '@/lib/physics/createBlob';
import { createArenaWalls, calculateCollisionDamage } from '@/lib/physics/combat';
import { getRandomNPC } from '@/lib/npc';
import { SeededRandom } from '@/lib/random';
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

// Color helpers based on stat thresholds
function getDamageColor(damage: number): string {
  if (damage >= STATS.DAMAGE_THRESHOLD_HIGH) return 'text-red-500';
  if (damage >= STATS.DAMAGE_THRESHOLD_MED) return 'text-orange-400';
  if (damage < STATS.DAMAGE_THRESHOLD_LOW) return 'text-blue-400';
  return 'text-white/70';
}

function getMassColor(mass: number): string {
  if (mass >= STATS.MASS_THRESHOLD_HIGH) return 'text-red-500';
  if (mass >= STATS.MASS_THRESHOLD_MED) return 'text-orange-400';
  if (mass < STATS.MASS_THRESHOLD_LOW) return 'text-blue-400';
  return 'text-white/70';
}

function getHpColor(hp: number): string {
  if (hp >= STATS.HP_THRESHOLD_HIGH) return 'text-red-500';
  if (hp >= STATS.HP_THRESHOLD_MED) return 'text-orange-400';
  if (hp <= STATS.HP_THRESHOLD_LOW) return 'text-blue-400';
  return 'text-white/70';
}

function StatsTooltip({ stats, align = 'left' }: { stats: BlobStats | null; align?: 'left' | 'right' }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!stats) return null;

  const damageColor = getDamageColor(stats.damage);
  const massColor = getMassColor(stats.mass);
  const hpColor = getHpColor(stats.hp);

  return (
    <div className="relative flex items-center">
      <button
        className="text-white/70 hover:text-white transition-colors p-0.5 flex items-center"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <Info className="w-4 h-4" />
      </button>
      {isOpen && (
        <div
          className={`absolute bottom-full mb-2 bg-gray-900/95 border border-white/20 rounded-lg px-3 py-2 text-xs whitespace-nowrap z-50 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="font-bold text-white/90 mb-1.5 border-b border-white/10 pb-1">
            Stats Breakdown
          </div>
          <div className="space-y-1 text-white/70">
            <div className="flex justify-between gap-4">
              <span>Area:</span>
              <span className="text-white/90 font-mono">{stats.area.toLocaleString()}px²</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Edges:</span>
              <span className="text-white/90 font-mono">{stats.edges}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Corners:</span>
              <span className="text-white/90 font-mono">{stats.corners}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Spikes:</span>
              <span className="text-white/90 font-mono">{stats.spikes}</span>
            </div>
            <div className="border-t border-white/10 pt-1 mt-1.5">
              <div className="flex justify-between gap-4">
                <span>Mass:</span>
                <span className={`font-mono font-bold ${massColor}`}>{stats.mass}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>HP:</span>
                <span className={`font-mono font-bold ${hpColor}`}>{stats.hp}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Damage:</span>
                <span className={`font-mono font-bold ${damageColor}`}>{stats.damage}</span>
              </div>
            </div>
          </div>
        </div>
      )}
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

  // Seeded random for deterministic physics
  const rngRef = useRef<SeededRandom | null>(null);

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

  const {
    myStrokes,
    opponentStrokes,
    gameMode,
    opponent,
    isHost,
    battleSeed,
    setWinner,
    reset,
    setPhase,
    clearStrokes,
    resetInk,
    setBattleSeed,
  } = useGameStore();

  const [partyState, partyActions] = usePartyKitContext();

  const isMultiplayer = gameMode === 'multiplayer';

  // Rematch request state for multiplayer
  const myRematchRequested = isMultiplayer && partyState.role
    ? (partyState.role === 'host' 
        ? partyState.roomState?.hostRematchRequested 
        : partyState.roomState?.guestRematchRequested) || false
    : false;
  const opponentRematchRequested = isMultiplayer && partyState.role
    ? (partyState.role === 'host'
        ? partyState.roomState?.guestRematchRequested
        : partyState.roomState?.hostRematchRequested) || false
    : false;

  /** Spawn a power-up at a deterministic position */
  const spawnPowerUp = useCallback((threshold: number) => {
    if (!engineRef.current || !rngRef.current) return;
    if (triggeredThresholdsRef.current.has(threshold)) return;

    triggeredThresholdsRef.current.add(threshold);

    const rng = rngRef.current;
    const types: PowerUpType[] = ['damage', 'heal', 'shield', 'regen', 'bomb'];
    const type = rng.pick(types);

    const x = rng.range(100, ARENA.WIDTH - 100);
    const y = rng.range(100, ARENA.HEIGHT - 100);

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
    rngRef.current = null;
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
    (newHp: number, maxHp: number) => {
      // Check ALL thresholds (not else-if) to handle large HP drops
      // spawnPowerUp internally guards against duplicate spawns via triggeredThresholdsRef
      // Thresholds are % of maxHp: spawn at 80%, 60%, 40%, 20% remaining
      const hpPct = newHp / maxHp;
      if (hpPct <= POWERUP.TRIGGER_HP_PCT_1) spawnPowerUp(1);
      if (hpPct <= POWERUP.TRIGGER_HP_PCT_2) spawnPowerUp(2);
      if (hpPct <= POWERUP.TRIGGER_HP_PCT_3) spawnPowerUp(3);
      if (hpPct <= POWERUP.TRIGGER_HP_PCT_4) spawnPowerUp(4);
    },
    [spawnPowerUp]
  );

  /** Initialize physics engine and game state */
  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize seeded RNG - use battleSeed for multiplayer, random for NPC
    const seed = isMultiplayer && battleSeed !== null
      ? battleSeed
      : Math.floor(Math.random() * 2147483647);
    rngRef.current = new SeededRandom(seed);
    const rng = rngRef.current;

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

    // Determine which strokes go on which side
    // In multiplayer: host strokes = left, guest strokes = right (same for both clients)
    // For this client: "my" blob uses my strokes, but position depends on role
    const npc = isMultiplayer ? null : getRandomNPC();

    // Defensive: ensure NPC exists for offline mode
    if (!isMultiplayer && !npc) {
      console.error('[FightArena] Failed to load NPC');
      return cleanup;
    }

    let leftStrokes, rightStrokes, leftColor, rightColor, leftLabel: string, rightLabel: string;
    let myBlobIsLeft: boolean;

    if (isMultiplayer) {
      // Host's strokes always on left, guest's on right
      // From this client's perspective, determine which is "mine"
      if (isHost) {
        // I'm host: my strokes on left
        leftStrokes = myStrokes;
        rightStrokes = opponentStrokes;
        leftColor = '#4ade80';
        rightColor = '#f87171';
        myBlobIsLeft = true;
      } else {
        // I'm guest: host strokes on left, my strokes on right
        leftStrokes = opponentStrokes;
        rightStrokes = myStrokes;
        leftColor = '#f87171';
        rightColor = '#4ade80';
        myBlobIsLeft = false;
      }
      leftLabel = myBlobIsLeft ? 'player' : 'opponent';
      rightLabel = myBlobIsLeft ? 'opponent' : 'player';
    } else if (npc) {
      // NPC mode: player on left, NPC on right
      leftStrokes = myStrokes;
      rightStrokes = npc.strokes;
      leftColor = '#4ade80';
      rightColor = npc.color;
      leftLabel = 'player';
      rightLabel = 'opponent';
      myBlobIsLeft = true;
    } else {
      // Should never reach here due to guard above, but satisfy TypeScript
      return cleanup;
    }

    // Create left blob (always spawns on left side)
    const leftBlob = createBlobBody(leftStrokes, {
      x: ARENA.SPAWN_OFFSET,
      y: ARENA.HEIGHT / 2,
      scale: PHYSICS.BLOB_SCALE,
      label: leftLabel,
      color: leftColor,
    });

    // Create right blob (always spawns on right side)
    const rightBlob = createBlobBody(rightStrokes, {
      x: ARENA.WIDTH - ARENA.SPAWN_OFFSET,
      y: ARENA.HEIGHT / 2,
      scale: PHYSICS.BLOB_SCALE,
      label: rightLabel,
      color: rightColor,
    });

    // Handle blob creation failures - whoever's blob fails loses
    if (!leftBlob && !rightBlob) {
      // Both failed → player loses
      console.error('[FightArena] Both blobs failed to create');
      requestAnimationFrame(() => {
        setBattleOver(true);
        setIsVictory(false);
        setWinner('opponent');
      });
      return cleanup;
    }

    if (!leftBlob) {
      // Left blob failed → right wins
      console.error('[FightArena] Left blob failed to create');
      const winner = myBlobIsLeft ? 'opponent' : 'me';
      requestAnimationFrame(() => {
        setBattleOver(true);
        setIsVictory(winner === 'me');
        setWinner(winner);
      });
      return cleanup;
    }

    if (!rightBlob) {
      // Right blob failed → left wins
      console.error('[FightArena] Right blob failed to create');
      const winner = myBlobIsLeft ? 'me' : 'opponent';
      requestAnimationFrame(() => {
        setBattleOver(true);
        setIsVictory(winner === 'me');
        setWinner(winner);
      });
      return cleanup;
    }

    // Assign bodies to refs based on which is "mine"
    if (myBlobIsLeft) {
      playerBodyRef.current = leftBlob.body;
      playerStatsRef.current = leftBlob.stats;
      opponentBodyRef.current = rightBlob.body;
      opponentStatsRef.current = rightBlob.stats;
    } else {
      playerBodyRef.current = rightBlob.body;
      playerStatsRef.current = rightBlob.stats;
      opponentBodyRef.current = leftBlob.body;
      opponentStatsRef.current = leftBlob.stats;
    }

    // Add blobs to world
    Matter.Composite.add(engine.world, leftBlob.body);
    Matter.Composite.add(engine.world, rightBlob.body);

    // Set initial velocities using seeded random (deterministic)
    const leftAngle = rng.range(-0.25, 0.25);
    const rightAngle = Math.PI + rng.range(-0.25, 0.25);

    if (leftBlob) {
      Matter.Body.setVelocity(leftBlob.body, {
        x: PHYSICS.INITIAL_SPEED * Math.cos(leftAngle),
        y: PHYSICS.INITIAL_SPEED * Math.sin(leftAngle),
      });
      Matter.Body.setAngularVelocity(leftBlob.body, PHYSICS.INITIAL_SPIN);
    }

    if (rightBlob) {
      Matter.Body.setVelocity(rightBlob.body, {
        x: PHYSICS.INITIAL_SPEED * Math.cos(rightAngle),
        y: PHYSICS.INITIAL_SPEED * Math.sin(rightAngle),
      });
      Matter.Body.setAngularVelocity(rightBlob.body, -PHYSICS.INITIAL_SPIN);
    }

    // Set UI state
    requestAnimationFrame(() => {
      if (playerStatsRef.current) {
        setPlayerStats(playerStatsRef.current);
        setPlayerHp(playerStatsRef.current.hp);
        setPlayerMaxHp(playerStatsRef.current.maxHp);
      }
      if (opponentStatsRef.current) {
        setOpponentStats(opponentStatsRef.current);
        setOpponentHp(opponentStatsRef.current.hp);
        setOpponentMaxHp(opponentStatsRef.current.maxHp);
      }
      // npc is guaranteed non-null for offline mode due to guard above
      const displayName = isMultiplayer
        ? (opponent?.username || 'Opponent')
        : (npc?.name || 'Opponent');
      setOpponentName(displayName);
    });

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
                  // Use stats ref for maxHp to avoid stale closure
                  const maxHp = playerStatsRef.current?.maxHp ?? 100;
                  setPlayerHp((prev) => Math.min(prev + POWERUP.HEAL_AMOUNT, maxHp));
                  setPlayerPowerUps((prev) => [...prev, 'heal']);
                } else {
                  const maxHp = opponentStatsRef.current?.maxHp ?? 100;
                  setOpponentHp((prev) => Math.min(prev + POWERUP.HEAL_AMOUNT, maxHp));
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
              } else if (type === 'bomb') {
                // Bomb damages the opponent (opposite of heal)
                if (picker === 'player') {
                  setOpponentHp((prev) => Math.max(0, prev - POWERUP.BOMB_DAMAGE));
                  setPlayerPowerUps((prev) => [...prev, 'bomb']);
                } else {
                  setPlayerHp((prev) => Math.max(0, prev - POWERUP.BOMB_DAMAGE));
                  setOpponentPowerUps((prev) => [...prev, 'bomb']);
                }
              }
            }
          }
          continue;
        }

        // Wall collision - regen healing
        if (labels.includes('wall')) {
          if (labels.includes('player') && playerRegenRef.current) {
            const maxHp = playerStatsRef.current?.maxHp ?? 100;
            setPlayerHp((prev) => Math.min(prev + POWERUP.REGEN_HEAL_AMOUNT, maxHp));
          }
          if (labels.includes('opponent') && opponentRegenRef.current) {
            const maxHp = opponentStatsRef.current?.maxHp ?? 100;
            setOpponentHp((prev) => Math.min(prev + POWERUP.REGEN_HEAL_AMOUNT, maxHp));
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
              const maxHp = opponentStatsRef.current?.maxHp ?? 100;
              checkPowerUpSpawn(newHp, maxHp);
              return newHp;
            });
          }
          if (dmgToPlayer > 0) {
            setPlayerHp((prev) => {
              const newHp = Math.max(0, prev - dmgToPlayer);
              const maxHp = playerStatsRef.current?.maxHp ?? 100;
              checkPowerUpSpawn(newHp, maxHp);
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

    // Run physics with fixed timestep for determinism
    const runner = Matter.Runner.create({
      delta: 1000 / 60, // Fixed 60fps timestep
    });
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    return cleanup;
    // setWinner is called in this effect but is a stable Zustand setter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStrokes, opponentStrokes, gameMode, opponent?.username, isHost, battleSeed, isMultiplayer, cleanup, checkPowerUpSpawn]);

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
    // setWinner is a Zustand setter (stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerHp, opponentHp, battleOver]);

  // Handle server-initiated rematch (both players agreed)
  useEffect(() => {
    if (isMultiplayer && partyState.roomState?.phase === 'drawing' && battleOver) {
      // Schedule state updates after effect completes to avoid cascading renders
      setTimeout(() => {
        cleanup();
        setBattleOver(false);
        setWinner(null);
        setPlayerPowerUps([]);
        setOpponentPowerUps([]);
        setPowerUps([]);
        clearStrokes();
        resetInk();
        setBattleSeed(null);
        setPhase('drawing');
      }, 0);
    }
    // Zustand setters are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiplayer, partyState.roomState?.phase, battleOver, cleanup]);

  const handleRematch = () => {
    if (isMultiplayer) {
      // Online mode - send rematch request
      partyActions.sendRematchRequest();
    } else {
      // Offline mode - instant rematch
      cleanup();
      setBattleOver(false);
      setWinner(null);
      setPlayerPowerUps([]);
      setOpponentPowerUps([]);
      setPowerUps([]);
      clearStrokes();
      resetInk();
      setBattleSeed(null);
      setPhase('drawing');
    }
  };

  const handleMainMenu = () => {
    cleanup();
    if (isMultiplayer) {
      partyActions.disconnect();
    }
    reset();
  };

  // Stop battle immediately when opponent leaves
  useEffect(() => {
    if (isMultiplayer && partyState.opponentLeft) {
      cleanup();
    }
  }, [isMultiplayer, partyState.opponentLeft, cleanup]);

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-center">
      <Button
        onClick={handleMainMenu}
        variant="secondary"
        size="md"
        icon={<ArrowLeft className="w-4 h-4" />}
        className="absolute top-4 left-4 z-10"
      >
        {isMultiplayer ? 'Leave Lobby' : 'Main Menu'}
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
        <BattleResult 
          isVictory={isVictory} 
          isMultiplayer={isMultiplayer}
          myRematchRequested={myRematchRequested}
          opponentRematchRequested={opponentRematchRequested}
          onRematch={handleRematch} 
          onMainMenu={handleMainMenu} 
        />
      )}

      {/* Stats bar */}
      <div className="flex justify-between w-full max-w-[700px] mt-md px-sm text-white/70 text-sm min-h-[24px]">
        <div className="flex items-center gap-3">
          <span>
            <b>DMG:</b>{' '}
            <span className={`font-bold ${playerStats ? getDamageColor(playerStats.damage) : ''}`}>
              {playerStats?.damage ?? '-'}
            </span>
          </span>
          <span>
            <b>MASS:</b>{' '}
            <span className={`font-bold ${playerStats ? getMassColor(playerStats.mass) : ''}`}>
              {playerStats?.mass ?? '-'}
            </span>
          </span>
          <StatsTooltip stats={playerStats} align="left" />
          <div className="flex items-center gap-2">
            {playerPowerUps.map((powerUp, index) => (
              <PowerUpIndicator key={`${powerUp}-${index}`} type={powerUp} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {opponentPowerUps.map((powerUp, index) => (
              <PowerUpIndicator key={`${powerUp}-${index}`} type={powerUp} />
            ))}
          </div>
          <StatsTooltip stats={opponentStats} align="right" />
          <span>
            <b>MASS:</b>{' '}
            <span className={`font-bold ${opponentStats ? getMassColor(opponentStats.mass) : ''}`}>
              {opponentStats?.mass ?? '-'}
            </span>
          </span>
          <span>
            <b>DMG:</b>{' '}
            <span className={`font-bold ${opponentStats ? getDamageColor(opponentStats.damage) : ''}`}>
              {opponentStats?.damage ?? '-'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
