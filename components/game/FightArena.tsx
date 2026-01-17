'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import { useGameStore } from '@/store/gameStore';
import { ARENA, PHYSICS } from '@/lib/physics/constants';
import { createBlobBody } from '@/lib/physics/createBlob';
import {
  createArenaWalls,
  calculateCollisionDamage,
} from '@/lib/physics/combat';
import { getRandomNPC } from '@/lib/npc';
import type { BlobStats } from '@/types/game';
import HealthBar from './HealthBar';
import BattleResult from './BattleResult';

export default function FightArena() {
  // Refs for Matter.js objects
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const playerBodyRef = useRef<Matter.Body | null>(null);
  const opponentBodyRef = useRef<Matter.Body | null>(null);

  // Stats refs (for use in collision handler)
  const playerStatsRef = useRef<BlobStats | null>(null);
  const opponentStatsRef = useRef<BlobStats | null>(null);

  // UI state
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [opponentHp, setOpponentHp] = useState(100);
  const [opponentMaxHp, setOpponentMaxHp] = useState(100);
  const [playerStats, setPlayerStats] = useState<BlobStats | null>(null);
  const [opponentStats, setOpponentStats] = useState<BlobStats | null>(null);
  const [battleOver, setBattleOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const {
    myStrokes,
    npcDifficulty,
    setWinner,
    reset,
    setPhase,
    clearStrokes,
    resetInk,
    setDrawingTimeLeft,
  } = useGameStore();

  // Cleanup function
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
    playerStatsRef.current = null;
    opponentStatsRef.current = null;
  }, []);

  // Initialize physics world
  useEffect(() => {
    if (!containerRef.current) return;

    // Create engine with zero gravity
    const engine = Matter.Engine.create({ gravity: PHYSICS.GRAVITY });
    engineRef.current = engine;

    // Create renderer
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

    // Add arena walls
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
      setPlayerStats(playerBlob.stats);
      setPlayerHp(playerBlob.stats.hp);
      setPlayerMaxHp(playerBlob.stats.maxHp);
      
      // Give player initial velocity (toward opponent, with some randomness)
      const angle = Math.random() * 0.5 - 0.25; // Slight random angle
      Matter.Body.setVelocity(playerBlob.body, {
        x: PHYSICS.INITIAL_SPEED * Math.cos(angle),
        y: PHYSICS.INITIAL_SPEED * Math.sin(angle),
      });
      Matter.Body.setAngularVelocity(playerBlob.body, PHYSICS.INITIAL_SPIN);
    }

    // Create opponent blob (NPC)
    const npc = getRandomNPC(npcDifficulty);
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
      setOpponentStats(opponentBlob.stats);
      setOpponentHp(opponentBlob.stats.hp);
      setOpponentMaxHp(opponentBlob.stats.maxHp);
      
      // Give opponent initial velocity (toward player, with some randomness)
      const angle = Math.PI + (Math.random() * 0.5 - 0.25); // Opposite direction
      Matter.Body.setVelocity(opponentBlob.body, {
        x: PHYSICS.INITIAL_SPEED * Math.cos(angle),
        y: PHYSICS.INITIAL_SPEED * Math.sin(angle),
      });
      Matter.Body.setAngularVelocity(opponentBlob.body, -PHYSICS.INITIAL_SPIN);
    }

    // Handle collisions - both blobs take damage on impact
    Matter.Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        const pStats = playerStatsRef.current;
        const oStats = opponentStatsRef.current;

        if (!pStats || !oStats) continue;

        // Check if this is a player-opponent collision (either order)
        const isPlayerA = bodyA.label === 'player';
        const isPlayerB = bodyB.label === 'player';
        const isOpponentA = bodyA.label === 'opponent';
        const isOpponentB = bodyB.label === 'opponent';

        if ((isPlayerA && isOpponentB) || (isOpponentA && isPlayerB)) {
          const playerBody = isPlayerA ? bodyA : bodyB;
          const opponentBody = isOpponentA ? bodyA : bodyB;

          // Player damages opponent
          const dmgToOpponent = calculateCollisionDamage(playerBody, pStats, opponentBody);
          if (dmgToOpponent > 0) {
            setOpponentHp(prev => Math.max(0, prev - dmgToOpponent));
            console.log(`Player dealt ${dmgToOpponent} damage`);
          }

          // Opponent damages player
          const dmgToPlayer = calculateCollisionDamage(opponentBody, oStats, playerBody);
          if (dmgToPlayer > 0) {
            setPlayerHp(prev => Math.max(0, prev - dmgToPlayer));
            console.log(`Opponent dealt ${dmgToPlayer} damage`);
          }
        }
      }
    });

    // Enforce constant speed - direction changes but speed stays fixed
    Matter.Events.on(engine, 'afterUpdate', () => {
      const normalizeSpeed = (body: Matter.Body | null) => {
        if (!body) return;
        const vx = body.velocity.x;
        const vy = body.velocity.y;
        const currentSpeed = Math.sqrt(vx * vx + vy * vy);
        if (currentSpeed > 0.01) {
          const scale = PHYSICS.INITIAL_SPEED / currentSpeed;
          Matter.Body.setVelocity(body, { x: vx * scale, y: vy * scale });
        }
      };
      normalizeSpeed(playerBodyRef.current);
      normalizeSpeed(opponentBodyRef.current);
    });

    // Start physics
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    return cleanup;
  }, [myStrokes, npcDifficulty, cleanup]);

  // Check for battle end
  useEffect(() => {
    if (battleOver) return;

    if (playerHp <= 0) {
      setBattleOver(true);
      setIsVictory(false);
      setWinner('opponent');
    } else if (opponentHp <= 0) {
      setBattleOver(true);
      setIsVictory(true);
      setWinner('me');
    }
  }, [playerHp, opponentHp, battleOver, setWinner]);

  // Handlers
  const handleRematch = () => {
    cleanup();
    setBattleOver(false);
    setWinner(null);
    clearStrokes();
    resetInk();
    setDrawingTimeLeft(30);
    setPhase('drawing');
  };

  const handleMainMenu = () => {
    cleanup();
    reset();
  };

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-center">
      {/* Back button */}
      <button
        onClick={handleMainMenu}
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-black/60 text-white border-2 border-white/30 rounded-md text-sm font-bold hover:bg-black/80 hover:border-white/50 transition-all"
      >
        ← Back
      </button>

      {/* Health bars */}
      <div className="flex justify-between w-full max-w-[700px] mb-md px-sm">
        <HealthBar current={playerHp} max={playerMaxHp} label="Your Blob" isPlayer />
        <HealthBar current={opponentHp} max={opponentMaxHp} label="Opponent" />
      </div>

      {/* Arena */}
      <div className="relative">
        <div ref={containerRef} style={{ width: ARENA.WIDTH, height: ARENA.HEIGHT }} />
        {battleOver && (
          <BattleResult
            isVictory={isVictory}
            onRematch={handleRematch}
            onMainMenu={handleMainMenu}
          />
        )}
      </div>

      {/* Stats display */}
      <div className="flex justify-between w-full max-w-[700px] mt-md px-sm text-white/70 text-sm">
        <div className="space-x-4">
          <span><b>DMG:</b> {playerStats?.damage ?? '-'}</span>
          <span><b>MASS:</b> {playerStats?.mass ?? '-'}</span>
        </div>
        <div className="space-x-4">
          <span><b>MASS:</b> {opponentStats?.mass ?? '-'}</span>
          <span><b>DMG:</b> {opponentStats?.damage ?? '-'}</span>
        </div>
      </div>
    </div>
  );
}
