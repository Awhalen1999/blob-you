'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import AuthForm from '@/components/auth/AuthForm';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useGameStore } from '@/store/gameStore';
import DrawingCanvas from '@/components/game/DrawingCanvas';

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

        <div className="flex flex-col gap-sm">
          <button
            onClick={handleCopyCode}
            className="w-full p-sm bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
          <button
            onClick={handleBack}
            className="w-full p-sm bg-transparent text-white/70 border border-white/30 rounded-md text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
          >
            Back
          </button>
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

        <div className="flex flex-col gap-sm">
          <button
            onClick={handleJoinRoom}
            disabled={joinCode.length !== 6}
            className="w-full p-sm bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:hover:bg-gray-800"
          >
            Join Game
          </button>
          <button
            onClick={handleBack}
            className="w-full p-sm bg-transparent text-white/70 border border-white/30 rounded-md text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Main Menu View
  return (
    <div className="transparent-bg w-full max-w-md mx-auto p-lg rounded-sm border border-white/20">
      <header className="mb-md text-center">
        <h1 className="text-3xl font-bold text-white">blob.you</h1>
        <p className="text-sm opacity-80">Welcome, {displayName}!</p>
      </header>

      <div className="flex flex-col gap-sm mb-lg">
        <button
          onClick={handleGenerateCode}
          className="w-full p-sm bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Generate Match Code
        </button>
        <button
          onClick={() => setMenuView('join')}
          className="w-full p-sm bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Enter Match Code
        </button>
        <button
          onClick={handleFightNPC}
          className="w-full p-sm bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Fight NPC
        </button>
      </div>

      <button
        onClick={() => auth.signOut()}
        className="w-full p-sm bg-transparent text-white/70 border border-white/30 rounded-md text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
