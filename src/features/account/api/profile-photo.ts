import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/http/client';
import { SESSION_QUERY_KEY, sessionUserSchema, type SessionUser } from '@/lib/session/session';

/** Foto de perfil: `PUT /users/me/photo` (multipart) devuelve el usuario con su nueva `photoUrl`. */
export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blob: Blob) => {
      const form = new FormData();
      form.append('file', blob, 'photo.jpg');
      const { data } = await apiRequest('/users/me/photo', {
        method: 'PUT',
        body: form,
        schema: sessionUserSchema,
        timeoutMs: 30_000,
      });
      return data;
    },
    onSuccess: (user) => queryClient.setQueryData<SessionUser | null>(SESSION_QUERY_KEY, user),
  });
}

/** `DELETE /users/me/photo` → 204: la cuenta vuelve a mostrar sus iniciales. */
export function useRemoveProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiRequest('/users/me/photo', { method: 'DELETE' });
    },
    onSuccess: () =>
      queryClient.setQueryData<SessionUser | null>(SESSION_QUERY_KEY, (user) =>
        user ? { ...user, photoUrl: null } : user,
      ),
  });
}
