import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/http/api-error';

/** El cliente HTTP ya reintenta los GET ante fallos de red; aquí solo se reintenta una vez ante 5xx. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) =>
          count < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
  });
}
