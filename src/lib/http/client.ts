import type { z } from 'zod';
import { env } from '@/config/env';
import { currentLanguage } from '@/lib/i18n/i18n';
import { logger } from '@/lib/logger';
import { ApiError, CLIENT_ERROR_CODES, ContractError, parseRetryAfter } from './api-error';
import { CSRF_COOKIE, csrfHeader, readCookie } from './csrf';
import { envelopeSchema, type Paging } from './schemas';
import { emitSessionExpired } from './session-events';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type QueryValue = string | number | boolean | undefined;

export type RequestOptions<T> = {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, QueryValue>;
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Guard de sesión: ante `401 auth.unauthenticated` también intenta renovar (la cookie de acceso pudo vencer). */
  refreshOnUnauthenticated?: boolean;
  /** Login, registro y recuperación: no renueva ni emite "sesión expirada". */
  authFlow?: boolean;
};

export type ApiResult<T> = {
  data: T;
  paging: Paging | undefined;
  status: number;
  location: string | null;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const SESSION_CODES = new Set([
  'auth.unauthenticated',
  'auth.token_expired',
  'auth.session_revoked',
]);

type AttemptState = { refreshed: boolean; csrfRetried: boolean };

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = Object.entries(query ?? {})
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
    // Las claves llevan "$" ($init, $limit, $total) y se envían tal cual, como en el contrato.
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return `${env.apiBaseUrl}${path}${params.length > 0 ? `?${params.join('&')}` : ''}`;
}

function buildHeaders(method: HttpMethod, body: unknown): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': currentLanguage(),
  };
  if (body !== undefined && !(body instanceof FormData))
    headers['Content-Type'] = 'application/json';
  if (method !== 'GET') Object.assign(headers, csrfHeader());
  return headers;
}

class TimeoutSignal {
  readonly controller = new AbortController();
  timedOut = false;
  private readonly timer: ReturnType<typeof setTimeout>;
  private readonly detach: () => void;

  constructor(timeoutMs: number, external?: AbortSignal) {
    this.timer = setTimeout(() => {
      this.timedOut = true;
      this.controller.abort();
    }, timeoutMs);
    const onAbort = () => this.controller.abort();
    if (external?.aborted) this.controller.abort();
    external?.addEventListener('abort', onAbort);
    this.detach = () => external?.removeEventListener('abort', onAbort);
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.detach();
  }
}

async function send<T>(path: string, o: RequestOptions<T>): Promise<Response> {
  const method = o.method ?? 'GET';
  const timeout = new TimeoutSignal(o.timeoutMs ?? DEFAULT_TIMEOUT_MS, o.signal);
  const started = performance.now();
  try {
    const body =
      o.body === undefined
        ? undefined
        : o.body instanceof FormData
          ? o.body
          : JSON.stringify(o.body);
    const res = await fetch(buildUrl(path, o.query), {
      method,
      headers: buildHeaders(method, o.body),
      credentials: 'include',
      signal: timeout.controller.signal,
      ...(body === undefined ? {} : { body }),
    });
    logger.debug('http.request', {
      method,
      path,
      status: res.status,
      ms: Math.round(performance.now() - started),
    });
    return res;
  } catch (error) {
    if (o.signal?.aborted) throw error;
    if (timeout.timedOut) throw new ApiError(0, [{ code: CLIENT_ERROR_CODES.timeout }]);
    throw new ApiError(0, [{ code: CLIENT_ERROR_CODES.network }]);
  } finally {
    timeout.dispose();
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Solo GET: 1 reintento ante error de red o 502/503/504. Nunca se reintenta un POST de giro. */
async function sendWithRetry<T>(path: string, o: RequestOptions<T>): Promise<Response> {
  const method = o.method ?? 'GET';
  try {
    const res = await send(path, o);
    if (method !== 'GET' || !RETRYABLE_STATUS.has(res.status)) return res;
  } catch (error) {
    const retryable =
      method === 'GET' &&
      error instanceof ApiError &&
      error.code === CLIENT_ERROR_CODES.network &&
      !o.signal?.aborted;
    if (!retryable) throw error;
  }
  await wait(300);
  return send(path, o);
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

/** Una sola renovación compartida por todas las peticiones que reciben `auth.token_expired` a la vez. */
export function refreshSessionOnce(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const res = await send('/sessions/refresh', { method: 'POST', authFlow: true });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function primeCsrfCookie(): Promise<void> {
  try {
    await send('/status', { method: 'GET' });
  } catch {
    // Si falla, el reintento devolverá el error original.
  }
}

async function execute<T>(
  path: string,
  o: RequestOptions<T>,
  state: AttemptState,
): Promise<ApiResult<T>> {
  // El backend emite la cookie XSRF-TOKEN en cualquier respuesta: si aún no existe, se pide antes.
  if ((o.method ?? 'GET') !== 'GET' && readCookie(CSRF_COOKIE) === null) await primeCsrfCookie();
  const res = await sendWithRetry(path, o);
  const location = res.headers.get('Location');

  if (res.status === 204) {
    return { data: undefined as T, paging: undefined, status: 204, location };
  }

  const json = await readJson(res);
  // 2xx sin cuerpo (p. ej. un 202 de proxy): equivale a "sin contenido" si no se espera un esquema.
  if (res.ok && json === null && !o.schema) {
    return { data: undefined as T, paging: undefined, status: res.status, location };
  }
  const envelope = envelopeSchema.safeParse(json);

  if (!res.ok) {
    const error = new ApiError(
      res.status,
      envelope.success ? (envelope.data.errors ?? []) : [],
      parseRetryAfter(res.headers.get('Retry-After')),
    );

    if (res.status === 401 && !o.authFlow) {
      const canRefresh =
        error.hasCode('auth.token_expired') ||
        (o.refreshOnUnauthenticated === true && error.hasCode('auth.unauthenticated'));
      if (canRefresh && !state.refreshed) {
        if (await refreshSessionOnce()) return execute(path, o, { ...state, refreshed: true });
      }
      if (SESSION_CODES.has(error.code)) emitSessionExpired();
    }

    if (res.status === 403 && error.hasCode('auth.csrf_invalid') && !state.csrfRetried) {
      // La petición se rechazó antes de ejecutarse: es seguro repetirla una vez con la cookie nueva.
      await primeCsrfCookie();
      return execute(path, o, { ...state, csrfRetried: true });
    }

    if (res.status >= 500)
      logger.error('http.server_error', { path, status: res.status, traceId: error.traceId });
    throw error;
  }

  if (!envelope.success) {
    logger.error('contract.invalid', { path, contract: 'envelope' });
    throw new ContractError('envelope', envelope.error);
  }

  let data: unknown = envelope.data.data ?? null;
  if (o.schema) {
    const parsed = o.schema.safeParse(data);
    if (!parsed.success) {
      logger.error('contract.invalid', { path });
      throw new ContractError(path, parsed.error);
    }
    data = parsed.data;
  }

  return { data: data as T, paging: envelope.data.paging, status: res.status, location };
}

export function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<ApiResult<T>> {
  return execute(path, options, { refreshed: false, csrfRetried: false });
}

/** Atajo: devuelve solo `data`. */
export async function apiData<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
  const result = await apiRequest(path, options);
  return result.data;
}
