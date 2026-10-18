import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { AppProviders } from '@/app/providers/app-providers';
import { createAppRouter } from '@/app/router';
import { env } from '@/config/env';
import '@/styles/globals.css';

async function enableMocks(): Promise<void> {
  if (!env.enableMsw) return;
  const { startMockWorker } = await import('@/testing/msw/browser');
  await startMockWorker();
}

void enableMocks().then(() => {
  const root = document.getElementById('root');
  if (!root) throw new Error('#root');
  createRoot(root).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={createAppRouter()} />
      </AppProviders>
    </StrictMode>,
  );
});
