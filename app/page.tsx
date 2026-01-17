'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import AuthForm from '@/components/auth/AuthForm';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useGameStore } from '@/store/gameStore';
import DrawingCanvas from '@/components/game/DrawingCanvas';
import FightArena from '@/components/game/FightArena';
import Button from '@/components/ui/Button';

type MenuView = 'main' | 'generate' | 'join';

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
  const [generatedCode, setGeneratedCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const { phase, setPhase, setGameMode, setRoomCode, setIsHost } = useGameStore();

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

  const displayName = user.displayName || user.email?.split('@')[0] || 'Player';

  const handleGenerateCode = () => {
    const code = generateRoomCode();
    setGeneratedCode(code);
    setRoomCode(code);
    setIsHost(true);
    setGameMode('multiplayer');
    setMenuView('generate');
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinRoom = () => {
    if (joinCode.length === 6) {
      setRoomCode(joinCode.toUpperCase());
      setIsHost(false);
      setGameMode('multiplayer');
      console.log('Joining room:', joinCode.toUpperCase());
      // TODO: Actually connect to room via Partykit
    }
  };

  const handleFightNPC = () => {
    setGameMode('npc');
    setPhase('drawing');
  };

  const handleBack = () => {
    setMenuView('main');
    setGeneratedCode('');
    setJoinCode('');
    setCopied(false);
  };

  // Generate Code View
  if (menuView === 'generate') {
    return (
      <div className="transparent-bg w-full max-w-md mx-auto p-lg rounded-sm border border-white/20">
        <header className="mb-md text-center">
          <h1 className="text-xl font-bold text-white">YOUR ROOM CODE</h1>
        </header>

        {/* Code display with inline copy button */}
        <div className="bg-black/40 border-2 border-white/30 rounded-sm p-md mb-md relative">
          <p className="text-4xl font-bold text-center text-white tracking-[0.3em] font-mono">
            {generatedCode}
          </p>
          <button
            onClick={handleCopyCode}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white px-2 py-1 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <p className="text-xs text-center opacity-70 mb-md">
          Share this code with your friend!
        </p>

        <div className="flex flex-col gap-3">
          <Button onClick={handleCopyCode} variant="success" size="lg" fullWidth>
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
          <Button onClick={handleBack} variant="secondary" size="lg" fullWidth>
            Back
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

        {/* Code input */}
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
      {/* Sign Out button - top left */}
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
