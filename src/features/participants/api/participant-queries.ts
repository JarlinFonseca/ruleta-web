import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/http/client';
import { createdSchema } from '@/lib/http/schemas';
import { saveMutationKey } from '@/lib/query/save-keys';
import { MAX_PARTICIPANTS, participantListSchema, type Participant } from './participant-schemas';

export const participantKeys = {
  list: (raffleId: string) => ['raffles', raffleId, 'participants'] as const,
};

/** Todos los participantes del sorteo (máximo 200, una sola página) en el orden de la ruleta. */
export function participantsQueryOptions(raffleId: string) {
  return queryOptions({
    queryKey: participantKeys.list(raffleId),
    queryFn: async ({ signal }) => {
      const { data } = await apiRequest(`/raffles/${raffleId}/participants`, {
        query: { $init: 0, $limit: MAX_PARTICIPANTS, $total: true },
        schema: participantListSchema,
        signal,
      });
      return data.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    },
  });
}

export function useParticipants(raffleId: string) {
  return useQuery(participantsQueryOptions(raffleId));
}

function useInvalidate(raffleId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: participantKeys.list(raffleId) });
    // Los contadores del sorteo (participantCount, activeCount) también cambian.
    void queryClient.invalidateQueries({ queryKey: ['raffles', raffleId], exact: true });
  };
}

export type ParticipantInput = { firstName: string; lastName: string; email?: string };

export function useCreateParticipant(raffleId: string) {
  const invalidate = useInvalidate(raffleId);
  return useMutation({
    mutationKey: [...saveMutationKey(raffleId), 'participant-create'],
    mutationFn: async (input: ParticipantInput) => {
      const { data } = await apiRequest(`/raffles/${raffleId}/participants`, {
        method: 'POST',
        body: input,
        schema: createdSchema,
      });
      return data.id;
    },
    onSettled: invalidate,
  });
}

export type ParticipantPatch = Partial<ParticipantInput> & { active?: boolean };

function withVersion(p: Participant | undefined, patch: ParticipantPatch) {
  return p?.version !== undefined ? { ...patch, version: p.version } : patch;
}

export function useUpdateParticipant(raffleId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate(raffleId);
  return useMutation({
    mutationKey: [...saveMutationKey(raffleId), 'participant-update'],
    mutationFn: async ({ id, patch }: { id: string; patch: ParticipantPatch }) => {
      const current = queryClient
        .getQueryData<Participant[]>(participantKeys.list(raffleId))
        ?.find((p) => p.id === id);
      await apiRequest(`/participants/${id}`, {
        method: 'PATCH',
        body: withVersion(current, patch),
      });
    },
    onSettled: invalidate,
  });
}

/** HU-16: activar o desactivar con actualización optimista y reversión si falla. */
export function useSetParticipantActive(raffleId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate(raffleId);
  const key = participantKeys.list(raffleId);
  return useMutation({
    mutationKey: [...saveMutationKey(raffleId), 'participant-active'],
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const current = queryClient.getQueryData<Participant[]>(key)?.find((p) => p.id === id);
      await apiRequest(`/participants/${id}`, {
        method: 'PATCH',
        body: withVersion(current, { active }),
      });
    },
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Participant[]>(key);
      queryClient.setQueryData<Participant[]>(key, (list) =>
        list?.map((p) => (p.id === id ? { ...p, active } : p)),
      );
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: invalidate,
  });
}

export function useDeleteParticipant(raffleId: string) {
  const invalidate = useInvalidate(raffleId);
  return useMutation({
    mutationKey: [...saveMutationKey(raffleId), 'participant-delete'],
    mutationFn: async (id: string) => {
      await apiRequest(`/participants/${id}`, { method: 'DELETE' });
    },
    onSettled: invalidate,
  });
}

/** HU-15: `PUT /participants/{id}/photo` multipart con el campo "file". */
export function useUploadPhoto(raffleId: string) {
  const invalidate = useInvalidate(raffleId);
  return useMutation({
    mutationKey: [...saveMutationKey(raffleId), 'participant-photo'],
    mutationFn: async ({ id, blob }: { id: string; blob: Blob }) => {
      const form = new FormData();
      form.append('file', blob, 'photo.jpg');
      await apiRequest(`/participants/${id}/photo`, {
        method: 'PUT',
        body: form,
        timeoutMs: 30_000,
      });
    },
    onSettled: invalidate,
  });
}

export function useDeletePhoto(raffleId: string) {
  const invalidate = useInvalidate(raffleId);
  return useMutation({
    mutationKey: [...saveMutationKey(raffleId), 'participant-photo-delete'],
    mutationFn: async (id: string) => {
      await apiRequest(`/participants/${id}/photo`, { method: 'DELETE' });
    },
    onSettled: invalidate,
  });
}
