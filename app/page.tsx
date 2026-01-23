'use client';

import { useState, useEffect } from 'react';
import { LogOut, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import AuthForm from '@/components/auth/AuthForm';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useGameStore } from '@/store/gameStore';
import { usePartyKitContext } from '@/contexts/PartyKitContext';
import DrawingCanvas from '@/components/game/DrawingCanvas';
import FightArena from '@/components/game/FightArena';
import Button from '@/components/ui/Button';
import { PartyStatus } from '@/components/ui/PartyStatus';
import { HowToPlay } from '@/components/ui/HowToPlay';

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

  // Show mobile warning on first load (after user is loaded)
  useEffect(() => {
    // Only run after loading is complete and user is authenticated
    if (loading) return;
    
    // Check if we've already shown the warning
    const hasShownWarning = sessionStorage.getItem('mobile-warning-shown');
    
    // Check if mobile device (screen width <= 768px)
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    
    if (isMobile && !hasShownWarning) {
      // Small delay to ensure Toaster is mounted
      const timer = setTimeout(() => {
        toast('Hey! Looks like you\'re on a smaller screen. This app works better on desktop, The arena and canvas are fixed size, so some content may be cut off, but everything works the same.', {
          duration: 10000,
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
          },
        });
        sessionStorage.setItem('mobile-warning-shown', 'true');
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const { phase, setPhase, setGameMode, setRoomCode, setIsHost, setOpponent, setOpponentStrokes, setBattleSeed, reset } = useGameStore();
  const [partyState, partyActions] = usePartyKitContext();

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Player';

  // Sync PartyKit state to game store
  useEffect(() => {
    if (partyState.roomState?.phase === 'fighting') {
      // Store opponent strokes and battle seed before transitioning to fighting
      const opponentStrokes = partyState.role === 'host'
        ? partyState.roomState.guestStrokes
        : partyState.roomState.hostStrokes;
      if (opponentStrokes) {
        setOpponentStrokes(opponentStrokes);
      }
      if (partyState.battleSeed !== null) {
        setBattleSeed(partyState.battleSeed);
      }
      setPhase('fighting');
    } else if (partyState.roomState?.phase === 'drawing' && partyState.roomState.hostId && partyState.roomState.guestId) {
      setPhase('drawing');
    }
  }, [partyState.roomState?.phase, partyState.roomState?.hostId, partyState.roomState?.guestId, partyState.role, partyState.roomState?.hostStrokes, partyState.roomState?.guestStrokes, partyState.battleSeed, setPhase, setOpponentStrokes, setBattleSeed]);

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

  // Handle opponent leaving - anyone leaving = both go to main menu
  useEffect(() => {
    if (!partyState.opponentLeft) return;

    // Clear flag first to prevent re-triggers
    partyActions.clearOpponentLeft();

    // Anyone leaving = disconnect and go to main menu
    partyActions.disconnect();
    reset();
    setTimeout(() => {
      setMenuView('main');
      setRoomCodeLocal('');
      setJoinCode('');
      setCopied(false);
    }, 0);
  }, [partyState.opponentLeft, partyActions, reset]);

  // Reset menu view when disconnected (handles when YOU leave)
  useEffect(() => {
    if (partyState.status === 'disconnected' && menuView === 'lobby') {
      setTimeout(() => {
        setMenuView('main');
        setRoomCodeLocal('');
        setJoinCode('');
        setCopied(false);
      }, 0);
    }
  }, [partyState.status, menuView]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthForm />;
  }

  // Drawing phase
  if (phase === 'drawing') {
    return (
      <>
        <DrawingCanvas />
        <PartyStatus />
        <HowToPlay />
      </>
    );
  }

  // Fighting phase
  if (phase === 'fighting') {
    return (
      <>
        <FightArena />
        <PartyStatus />
        <HowToPlay />
      </>
    );
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

  const handleToggleReady = () => {
    const myLobbyReady = partyState.role === 'host'
      ? partyState.roomState?.hostLobbyReady
      : partyState.roomState?.guestLobbyReady;
    
    if (myLobbyReady) {
      partyActions.sendLobbyUnready();
    } else {
      partyActions.sendLobbyReady();
    }
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
            <p className="text-xs text-white/50 mb-1">
              YOU {partyState.role && <span className="text-white/30">({partyState.role})</span>}
            </p>
            <p className="text-white font-bold">{displayName}</p>
            {myLobbyReady && (
              <p className="text-sm font-bold text-green-400 mt-0.5">READY</p>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-white/50 mb-1">
              OPPONENT {hasOpponent && partyState.role === 'guest' && <span className="text-white/30">(host)</span>}
            </p>
            {hasOpponent ? (
              <>
                <p className="text-white font-bold">{opponentName}</p>
                {opponentLobbyReady && (
                  <p className="text-sm font-bold text-green-400 mt-0.5">READY</p>
                )}
              </>
            ) : (
              <p className="text-white/30">...</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleToggleReady}
            disabled={!hasOpponent}
            variant="success"
            size="lg"
            fullWidth
          >
            {!hasOpponent ? 'Waiting...' : myLobbyReady ? (opponentLobbyReady ? 'Starting...' : 'Unready') : 'Ready!'}
          </Button>
          <Button onClick={handleBack} variant="secondary" size="lg" fullWidth icon={<LogOut className="w-4 h-4" />}>
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
        className="absolute top-4 left-4 z-10 max-[768px]:top-6"
      >
        Sign Out
      </Button>

      <HowToPlay />

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
