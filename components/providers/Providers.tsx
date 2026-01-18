'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { PartyKitProvider } from '@/contexts/PartyKitContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PartyKitProvider>
        {children}
      </PartyKitProvider>
    </AuthProvider>
  );
}

