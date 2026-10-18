import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Backend simulado en el navegador (`npm run dev:mock`). Nunca se incluye si VITE_ENABLE_MSW=false. */
export async function startMockWorker(): Promise<void> {
  const worker = setupWorker(...handlers);
  await worker.start({ quiet: true });
}
