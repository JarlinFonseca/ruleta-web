import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import type { i18n as I18n } from 'i18next';
import { Toaster } from '@/components/ui/toaster';
import { i18n as defaultI18n } from '@/lib/i18n/i18n';
import { createQueryClient } from './query-client';
import { SessionEffects } from './session-effects';

type AppProvidersProps = { children: ReactNode; queryClient?: QueryClient; i18n?: I18n };

export function AppProviders({ children, queryClient, i18n = defaultI18n }: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <SessionEffects />
        {children}
        <Toaster />
      </I18nextProvider>
    </QueryClientProvider>
  );
}
