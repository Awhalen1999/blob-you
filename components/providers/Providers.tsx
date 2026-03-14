'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { PostHogProvider } from './PostHogProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { PartyKitProvider } from '@/contexts/PartyKitContext';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <PostHogProvider>
        <AuthProvider>
          <PartyKitProvider>
            {children}
          </PartyKitProvider>
        </AuthProvider>
      </PostHogProvider>
    </QueryClientProvider>
  );
}

