import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/http/client';
import { createdSchema } from '@/lib/http/schemas';
import { saveMutationKey } from '@/lib/query/save-keys';
import { MAX_RAFFLES, raffleListSchema, raffleSchema, type Raffle } from './raffle-schemas';

export const raffleKeys = {
  all: ['raffles'] as const,
  detail: (id: string) => ['raffles', id] as const,
};

/** HU-11: hasta 50 sorteos por usuario (RN-08), así que una sola página basta. Orden: más reciente primero. */
export const rafflesQueryOptions = queryOptions({
  queryKey: raffleKeys.all,
  queryFn: async ({ signal }) => {
    const { data } = await apiRequest('/raffles', {
      query: { $init: 0, $limit: MAX_RAFFLES, $total: true, $orderby: 'updateDate', asc: false },
      schema: raffleListSchema,
      signal,
    });
    return data;
  },
});

export function raffleQueryOptions(raffleId: string) {
  return queryOptions({
    queryKey: raffleKeys.detail(raffleId),
    queryFn: async ({ signal }) => {
      const { data } = await apiRequest(`/raffles/${raffleId}`, { schema: raffleSchema, signal });
      return data;
    },
  });
}

export function useRaffles() {
  return useQuery(rafflesQueryOptions);
}

export function useRaffle(raffleId: string) {
  return useQuery(raffleQueryOptions(raffleId));
}

export function useCreateRaffle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiRequest('/raffles', {
        method: 'POST',
        body: { name },
        schema: createdSchema,
      });
      return data.id;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: raffleKeys.all }),
  });
}

export type RafflePatch = Partial<Pick<Raffle, 'name' | 'removeWinnerAfterSpin'>>;

/** HU-12, HU-16 (opción), RF-24: cada cambio se guarda al instante. */
export function useUpdateRaffle(raffleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...saveMutationKey(raffleId), 'raffle'],
    mutationFn: async (patch: RafflePatch) => {
      const current = queryClient.getQueryData<Raffle>(raffleKeys.detail(raffleId));
      const body = current?.version !== undefined ? { ...patch, version: current.version } : patch;
      const { data } = await apiRequest(`/raffles/${raffleId}`, { method: 'PATCH', body });
      const parsed = raffleSchema.safeParse(data);
      return parsed.success ? parsed.data : null;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: raffleKeys.detail(raffleId), exact: true });
      const previous = queryClient.getQueryData<Raffle>(raffleKeys.detail(raffleId));
      if (previous)
        queryClient.setQueryData<Raffle>(raffleKeys.detail(raffleId), { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous)
        queryClient.setQueryData(raffleKeys.detail(raffleId), context.previous);
    },
    onSuccess: (raffle) => {
      if (raffle) queryClient.setQueryData(raffleKeys.detail(raffleId), raffle);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: raffleKeys.detail(raffleId), exact: true });
      void queryClient.invalidateQueries({ queryKey: raffleKeys.all, exact: true });
    },
  });
}

export function useDeleteRaffle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (raffleId: string) => {
      await apiRequest(`/raffles/${raffleId}`, { method: 'DELETE' });
      return raffleId;
    },
    onSuccess: (raffleId) => {
      queryClient.setQueryData<Raffle[]>(raffleKeys.all, (prev) =>
        prev?.filter((r) => r.id !== raffleId),
      );
      queryClient.removeQueries({ queryKey: raffleKeys.detail(raffleId) });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: raffleKeys.all, exact: true }),
  });
}
