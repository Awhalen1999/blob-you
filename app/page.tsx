'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useGameStore } from '@/store/gameStore';
import AuthForm from '@/components/auth/AuthForm';

export default function Home() {
  const user = useGameStore((state) => state.user);
  const setUser = useGameStore((state) => state.setUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Player',
          avatar: firebaseUser.photoURL || '',
        });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser]);

  if (user) {
    return (
      <div className="w-full max-w-lg mx-auto px-6">
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <h1 className="text-5xl font-bold mb-2">blob.you</h1>
          <p className="text-gray-600 mb-12">Welcome, {user.username}!</p>
          
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

  return <AuthForm />;
}