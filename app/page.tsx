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
    <div className="w-full max-w-lg mx-auto px-6">
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <h1 className="text-5xl font-bold mb-2">blob.you</h1>
        <p className="text-gray-600 mb-12">Welcome, {displayName}!</p>
        
        <div className="space-y-3 mb-8">
          <button className="btn-menu w-full">Generate Match Code</button>
          <button className="btn-menu w-full">Enter Match Code</button>
          <button className="btn-menu w-full">Fight NPC</button>
        </div>

        <button onClick={() => auth.signOut()} className="btn-secondary w-full">
          Sign Out
        </button>
      </div>
    </div>
  );
}
