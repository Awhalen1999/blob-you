'use client';

import { PostHogProvider } from './PostHogProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { PartyKitProvider } from '@/contexts/PartyKitContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <AuthProvider>
        <PartyKitProvider>
          {children}
        </PartyKitProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}

