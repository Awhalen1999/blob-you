'use client';

import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import AuthForm from '@/components/auth/AuthForm';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthForm />;
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'Player';

  return (
    <div className="transparent-bg w-full max-w-md mx-auto p-lg rounded-sm border border-white/20">
      <header className="mb-md text-center">
        <h1 className="text-3xl font-bold text-white">blob.you</h1>
        <p className="text-sm opacity-80">Welcome, {displayName}!</p>
      </header>

      <div className="flex flex-col gap-sm mb-lg">
        <button className="w-full p-sm bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">
          Generate Match Code
        </button>
        <button className="w-full p-sm bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">
          Enter Match Code
        </button>
        <button className="w-full p-sm bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">
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
