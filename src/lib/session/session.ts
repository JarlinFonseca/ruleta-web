import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError } from '@/lib/http/api-error';
import { apiRequest } from '@/lib/http/client';
import { readCookie } from '@/lib/http/csrf';
import { idSchema } from '@/lib/http/schemas';
import { isLang, type Lang } from '@/lib/i18n/languages';

const languageSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.enum(['es', 'en']))
  .catch('es');

export const sessionUserSchema = z.object({
  id: idSchema,
  email: z.string(),
  language: languageSchema,
  lastRaffleId: idSchema.nullable().default(null),
  /** Rol ADMIN: se asigna solo en la base de datos (base para funciones de administración futuras). */
  role: z.enum(['USER', 'ADMIN']).catch('USER').default('USER'),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/**
 * `GET /sessions/current` devuelve el usuario y su idioma (arquitectura del backend §7).
 * Se acepta `{ user: {...} }` o el usuario plano, porque el contrato no fija la forma exacta.
 */
const sessionDataSchema = z.preprocess(
  (d) => (typeof d === 'object' && d !== null && 'user' in d ? (d as { user: unknown }).user : d),
  sessionUserSchema,
);

export const SESSION_QUERY_KEY = ['session'] as const;

/**
 * Cookie indicadora que emite la API al iniciar o renovar sesión (no es secreta: los tokens siguen HttpOnly).
 * Sin ella el visitante no tiene sesión y no se consulta la API (evita dos 401 por visita).
 */
export const SESSION_HINT_COOKIE = 'ruleta_session';

/** null = visitante (sin sesión). */
export async function fetchCurrentSession(signal?: AbortSignal): Promise<SessionUser | null> {
  if (readCookie(SESSION_HINT_COOKIE) === null) return null;
  try {
    const { data } = await apiRequest('/sessions/current', {
      schema: sessionDataSchema,
      refreshOnUnauthenticated: true,
      ...(signal ? { signal } : {}),
    });
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export const sessionQueryOptions = queryOptions({
  queryKey: SESSION_QUERY_KEY,
  queryFn: ({ signal }) => fetchCurrentSession(signal),
  staleTime: 5 * 60_000,
  retry: false,
  refetchOnWindowFocus: false,
});

export function useSession() {
  return useQuery(sessionQueryOptions);
}

/** HU-28: guarda el idioma en el perfil. */
export async function updateMyLanguage(language: Lang): Promise<void> {
  await apiRequest('/users/me', { method: 'PATCH', body: { language } });
}

/** HU-07: recuerda el último sorteo usado (`PATCH /users/me { lastRaffleId }`). Silencioso si falla. */
export async function updateLastRaffle(
  queryClient: QueryClient,
  lastRaffleId: string,
): Promise<void> {
  const user = queryClient.getQueryData<SessionUser | null>(SESSION_QUERY_KEY);
  if (!user || user.lastRaffleId === lastRaffleId) return;
  const next: SessionUser = { ...user, lastRaffleId };
  queryClient.setQueryData<SessionUser | null>(SESSION_QUERY_KEY, next);
  try {
    await apiRequest('/users/me', { method: 'PATCH', body: { lastRaffleId } });
  } catch {
    // No es crítico: solo afecta a qué sorteo se abre en el próximo inicio de sesión.
  }
}

export function setSessionLanguage(queryClient: QueryClient, language: Lang): void {
  queryClient.setQueryData<SessionUser | null>(SESSION_QUERY_KEY, (prev) =>
    prev ? { ...prev, language } : prev,
  );
}

export function sessionLanguage(user: SessionUser | null | undefined): Lang | null {
  return user && isLang(user.language) ? user.language : null;
}

/** HU-08: invalida el refresh token en el servidor. Aunque falle, la sesión local se limpia. */
export async function signOut(): Promise<void> {
  try {
    await apiRequest('/sessions/current', { method: 'DELETE', authFlow: true });
  } catch {
    // Si la sesión ya no era válida, el resultado para el usuario es el mismo.
  }
}

/** Cierra la sesión en el front: limpia todos los datos del usuario de la caché. */
export function clearSessionData(queryClient: QueryClient): void {
  queryClient.setQueryData(SESSION_QUERY_KEY, null);
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_QUERY_KEY[0] });
}
