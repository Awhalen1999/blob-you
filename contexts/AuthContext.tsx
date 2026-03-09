'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import posthog from 'posthog-js';

type AuthContextType = {
  user: FirebaseUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        const isDiscord = firebaseUser.uid.startsWith('discord:');
        const discordId = isDiscord ? firebaseUser.uid.split(':')[1] : undefined;
        const method = isDiscord
          ? 'discord'
          : firebaseUser.providerData[0]?.providerId ?? 'email';

        posthog.identify(firebaseUser.uid, {
          discord_id: discordId,
          display_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          login_method: method,
        });

        posthog.capture('user_signed_in', {
          method,
          has_discord: isDiscord,
        });
      } else {
        posthog.reset();
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
