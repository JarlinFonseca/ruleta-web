import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiRequest } from '@/lib/http/client';
import { saveMutationKey } from '@/lib/query/save-keys';
import { spinHistorySchema, spinSchema } from './spin-schemas';

export const HISTORY_PAGE_SIZE = 20;
export const RECENT_WINNERS = 5;
const SPIN_TIMEOUT_MS = 8000;
/** Mientras algún correo siga "Programado", el historial se refresca solo para mostrar Enviado/Falló. */
const EMAIL_POLL_MS = 5000;

export const spinKeys = {
  all: (raffleId: string) => ['raffles', raffleId, 'spins'] as const,
  page: (raffleId: string, init: number, limit: number) =>
    ['raffles', raffleId, 'spins', { init, limit }] as const,
};

/** HU-21: historial paginado con `$init`/`$limit`/`$total`, más reciente primero. */
export function spinsPageQueryOptions(raffleId: string, init: number, limit: number) {
  return queryOptions({
    queryKey: spinKeys.page(raffleId, init, limit),
    queryFn: async ({ signal }) => {
      const { data, paging } = await apiRequest(`/raffles/${raffleId}/spins`, {
        // El servidor ya ordena por creationDate descendente (orden por defecto del contrato).
        query: { $init: init, $limit: limit, $total: true },
        schema: spinHistorySchema,
        signal,
      });
      return { items: data, total: paging?.total ?? data.length, init: paging?.init ?? init };
    },
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.items.some((s) => s.emailStatus === 'SCHEDULED') ? EMAIL_POLL_MS : false,
  });
}

export function useSpinsPage(raffleId: string, page: number) {
  return useQuery(spinsPageQueryOptions(raffleId, page * HISTORY_PAGE_SIZE, HISTORY_PAGE_SIZE));
}

export function useRecentWinners(raffleId: string) {
  return useQuery(spinsPageQueryOptions(raffleId, 0, RECENT_WINNERS));
}

/** HU-17: el front no envía ni sugiere ganador. Nunca se reintenta (podría duplicar el giro). */
export function useSpinMutation(raffleId: string) {
  return useMutation({
    mutationKey: [...saveMutationKey(raffleId), 'spin'],
    mutationFn: async () => {
      const { data } = await apiRequest(`/raffles/${raffleId}/spins`, {
        method: 'POST',
        schema: spinSchema,
        timeoutMs: SPIN_TIMEOUT_MS,
      });
      return data;
    },
    retry: false,
  });
}

export function useInvalidateAfterSpin(raffleId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: spinKeys.all(raffleId) });
    void queryClient.invalidateQueries({ queryKey: ['raffles', raffleId, 'participants'] });
    void queryClient.invalidateQueries({ queryKey: ['raffles', raffleId], exact: true });
  };
}

/** HU-21: limpiar historial; la próxima ronda vuelve a ser 1. */
export function useClearHistory(raffleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...saveMutationKey(raffleId), 'spins-clear'],
    mutationFn: async () => {
      await apiRequest(`/raffles/${raffleId}/spins`, { method: 'DELETE' });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: spinKeys.all(raffleId) });
      void queryClient.invalidateQueries({ queryKey: ['raffles', raffleId], exact: true });
    },
  });
}

/** HU-26: reenviar (o enviar por primera vez) el correo al ganador de un giro → 202. */
export function useResendWinnerEmail(raffleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (spinId: string) => {
      await apiRequest(`/spins/${spinId}/email-deliveries`, { method: 'POST' });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: spinKeys.all(raffleId) });
    },
  });
}
