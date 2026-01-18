'use client';

import { useState, useEffect } from 'react';
import { LogOut, Loader2, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import AuthForm from '@/components/auth/AuthForm';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useGameStore } from '@/store/gameStore';
import { usePartyKitContext } from '@/contexts/PartyKitContext';
import DrawingCanvas from '@/components/game/DrawingCanvas';
import FightArena from '@/components/game/FightArena';
import Button from '@/components/ui/Button';

type MenuView = 'main' | 'lobby' | 'join';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Home() {
  const { user, loading } = useAuth();
  const [menuView, setMenuView] = useState<MenuView>('main');
  const [roomCode, setRoomCodeLocal] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const { phase, setPhase, setGameMode, setRoomCode, setIsHost, setOpponent } = useGameStore();
  const [partyState, partyActions] = usePartyKitContext();

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Player';

  // Sync PartyKit state to game store
  useEffect(() => {
    if (partyState.roomState?.phase === 'fighting') {
      setPhase('fighting');
    } else if (partyState.roomState?.phase === 'drawing' && partyState.roomState.hostId && partyState.roomState.guestId) {
      setPhase('drawing');
    }
  }, [partyState.roomState?.phase, partyState.roomState?.hostId, partyState.roomState?.guestId, setPhase]);

  // Update opponent info when they join
  useEffect(() => {
    if (!partyState.roomState || !partyState.role) return;

    const opponentName = partyState.role === 'host'
      ? partyState.roomState.guestName
      : partyState.roomState.hostName;

    if (opponentName) {
      setOpponent({ id: 'opponent', username: opponentName, avatar: '' });
    }
  }, [partyState.roomState, partyState.role, setOpponent]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthForm />;
  }

  // Drawing phase
  if (phase === 'drawing') {
    return <DrawingCanvas />;
  }

  // Fighting phase
  if (phase === 'fighting') {
    return <FightArena />;
  }

  const handleGenerateCode = () => {
    const code = generateRoomCode();
    setRoomCodeLocal(code);
    setRoomCode(code);
    setIsHost(true);
    setGameMode('multiplayer');
    setMenuView('lobby');
    partyActions.connect(code, displayName);
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinRoom = () => {
    if (joinCode.length === 6) {
      const code = joinCode.toUpperCase();
      setRoomCodeLocal(code);
      setRoomCode(code);
      setIsHost(false);
      setGameMode('multiplayer');
      setMenuView('lobby');
      partyActions.connect(code, displayName);
    }
  };

  const handleFightNPC = () => {
    setGameMode('npc');
    setPhase('drawing');
  };

  const handleBack = () => {
    partyActions.disconnect();
    setMenuView('main');
    setRoomCodeLocal('');
    setJoinCode('');
    setCopied(false);
    setRoomCode(null);
    setIsHost(false);
  };

  const handleStartDrawing = () => {
    partyActions.sendLobbyReady();
  };

  // Lobby View (waiting for opponent or ready to start)
  if (menuView === 'lobby') {
    const isConnecting = partyState.status === 'connecting';
    const isConnected = partyState.status === 'connected';
    const hasOpponent = partyState.roomState?.hostId && partyState.roomState?.guestId;
    const opponentName = partyState.role === 'host'
      ? partyState.roomState?.guestName
      : partyState.roomState?.hostName;
    const myLobbyReady = partyState.role === 'host'
      ? partyState.roomState?.hostLobbyReady
      : partyState.roomState?.guestLobbyReady;
    const opponentLobbyReady = partyState.role === 'host'
      ? partyState.roomState?.guestLobbyReady
      : partyState.roomState?.hostLobbyReady;

    return (
      <div className="transparent-bg w-full max-w-md mx-auto p-lg rounded-sm border border-white/20">
        <header className="mb-md text-center">
          <h1 className="text-xl font-bold text-white">
            {hasOpponent ? 'READY TO BATTLE!' : 'WAITING FOR OPPONENT'}
          </h1>
        </header>

        {/* Room code display */}
        <div className="bg-black/40 border-2 border-white/30 rounded-sm p-md mb-md relative">
          <p className="text-xs text-center text-white/50 mb-1">ROOM CODE</p>
          <p className="text-4xl font-bold text-center text-white tracking-[0.3em] font-mono">
            {roomCode}
          </p>
          <button
            onClick={handleCopyCode}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Connection status */}
        <div className="text-center mb-md">
          {isConnecting && (
            <div className="flex items-center justify-center gap-2 text-white/70">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting...</span>
            </div>
          )}
          {partyState.status === 'error' && (
            <p className="text-red-400">{partyState.error || 'Connection failed'}</p>
          )}
          {isConnected && !hasOpponent && (
            <p className="text-white/70">Share the code with your friend!</p>
          )}
          {isConnected && hasOpponent && (
            <p className="text-green-400 font-bold">{opponentName} joined!</p>
          )}
        </div>

        {/* Players */}
        <div className="flex justify-between mb-md px-4">
          <div className="text-center">
            <p className="text-xs text-white/50 mb-1">YOU</p>
            <p className="text-white font-bold">{displayName}</p>
            {myLobbyReady ? (
              <p className="text-xs text-green-400">READY</p>
            ) : partyState.role ? (
              <p className="text-xs text-white/30">({partyState.role})</p>
            ) : null}
          </div>
          <div className="text-center">
            <p className="text-xs text-white/50 mb-1">OPPONENT</p>
            {hasOpponent ? (
              <>
                <p className="text-white font-bold">{opponentName}</p>
                {opponentLobbyReady && (
                  <p className="text-xs text-green-400">READY</p>
                )}
              </>
            ) : (
              <p className="text-white/30">...</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleStartDrawing}
            disabled={!hasOpponent || myLobbyReady}
            variant="success"
            size="lg"
            fullWidth
          >
            {myLobbyReady ? (opponentLobbyReady ? 'Starting...' : 'Waiting for opponent...') : hasOpponent ? 'Ready!' : 'Waiting...'}
          </Button>
          <Button onClick={handleBack} variant="secondary" size="lg" fullWidth>
            Leave Room
          </Button>
        </div>
      </div>
    );
  }

  // Join Room View
  if (menuView === 'join') {
    return (
      <div className="transparent-bg w-full max-w-md mx-auto p-lg rounded-sm border border-white/20">
        <header className="mb-md text-center">
          <h1 className="text-xl font-bold text-white">ENTER CODE</h1>
        </header>

        <div className="bg-black/40 border-2 border-white/30 rounded-sm p-md mb-md">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="XXXXXX"
            maxLength={6}
            className="w-full bg-transparent text-4xl font-bold text-center text-white tracking-[0.3em] font-mono placeholder:text-white/20 outline-none"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleJoinRoom}
            disabled={joinCode.length !== 6}
            variant="success"
            size="lg"
            fullWidth
          >
            Join Game
          </Button>
          <Button onClick={handleBack} variant="secondary" size="lg" fullWidth>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Main Menu View
  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center">
      <Button
        onClick={() => auth.signOut()}
        variant="secondary"
        size="md"
        icon={<LogOut className="w-4 h-4" />}
        className="absolute top-4 left-4 z-10"
      >
        Sign Out
      </Button>

      <div className="transparent-bg w-full max-w-md mx-auto p-lg rounded-sm border border-white/20">
        <header className="mb-lg text-center">
          <h1 className="text-3xl font-bold text-white">blob.you</h1>
        </header>

        <div className="flex flex-col gap-3">
          <Button onClick={handleGenerateCode} variant="primary" size="lg" fullWidth>
            Generate Match Code
          </Button>
          <Button onClick={() => setMenuView('join')} variant="primary" size="lg" fullWidth>
            Enter Match Code
          </Button>
          <Button onClick={handleFightNPC} variant="primary" size="lg" fullWidth>
            Offline Match
          </Button>
        </div>
      </div>
    </div>
  );
}
