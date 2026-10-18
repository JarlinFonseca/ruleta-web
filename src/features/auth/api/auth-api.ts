import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/http/client';
import { createdSchema } from '@/lib/http/schemas';
import { currentLanguage } from '@/lib/i18n/i18n';
import { useGuestListStore } from '@/lib/guest/guest-list-store';
import { logger } from '@/lib/logger';
import { fetchCurrentSession, SESSION_QUERY_KEY, type SessionUser } from '@/lib/session/session';

type Credentials = { email: string; password: string };

async function postSession(credentials: Credentials): Promise<void> {
  await apiRequest('/sessions', { method: 'POST', body: credentials, authFlow: true });
}

async function sessionOrThrow(): Promise<SessionUser> {
  const user = await fetchCurrentSession();
  if (!user) throw new Error('session.missing');
  return user;
}

/** HU-07: `POST /sessions` crea las cookies; luego se lee el usuario con `GET /sessions/current`. */
export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: Credentials) => {
      await postSession(credentials);
      return sessionOrThrow();
    },
    onSuccess: (user) => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_QUERY_KEY[0] });
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

export type SignUpResult = { user: SessionUser; raffleId: string | null; migrationFailed: boolean };

/**
 * HU-06 + HU-05 + HU-28:
 * 1. `POST /users` con el idioma activo (el perfil queda en EN si el visitante usaba EN).
 * 2. Si el registro no dejó la sesión abierta, `POST /sessions` con las mismas credenciales.
 * 3. `POST /raffles` "Mi primer sorteo" con los nombres del modo prueba (vacío si no hay).
 */
export function useSignUp(firstRaffleName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: Credentials): Promise<SignUpResult> => {
      await apiRequest('/users', {
        method: 'POST',
        body: { ...credentials, language: currentLanguage() },
        authFlow: true,
      });
      let user = await fetchCurrentSession();
      if (!user) {
        await postSession(credentials);
        user = await sessionOrThrow();
      }

      // Contrato de ruleta-api: nombres libres; el servidor separa nombre (primera palabra) y apellido.
      const participants = useGuestListStore.getState().entries.map((e) => e.name);
      try {
        const { data } = await apiRequest('/raffles', {
          method: 'POST',
          body: { name: firstRaffleName, participants },
          schema: createdSchema,
        });
        useGuestListStore.getState().reset();
        return { user, raffleId: data.id, migrationFailed: false };
      } catch {
        logger.warn('signup.migration_failed', { count: participants.length });
        return { user, raffleId: null, migrationFailed: participants.length > 0 };
      }
    },
    onSuccess: ({ user }) => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_QUERY_KEY[0] });
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

/** HU-09: mismo mensaje exista o no el correo. */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      await apiRequest('/password-resets', {
        method: 'POST',
        body: { email },
        authFlow: true,
      });
    },
  });
}

/** HU-09: restablece y deja la sesión iniciada. */
export function useResetPassword(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      await apiRequest(`/password-resets/${encodeURIComponent(token)}`, {
        method: 'PUT',
        body: { password },
        authFlow: true,
      });
      return fetchCurrentSession();
    },
    onSuccess: (user) => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_QUERY_KEY[0] });
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}
