import { z } from 'zod';
import { ApiError, ContractError, supportCode } from './api-error';
import { apiRequest, buildUrl } from './client';
import { onSessionExpired } from './session-events';

type Call = { url: string; init: RequestInit };

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function mockFetch(
  handler: (url: string, init: RequestInit, calls: Call[]) => Response | Promise<Response>,
) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init, calls);
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

const header = (c: Call, name: string) => new Headers(c.init.headers).get(name);

describe('cliente HTTP', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=abc123; path=/';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('arma la URL con $init/$limit sin codificar el "$"', () => {
    expect(buildUrl('/raffles', { $init: 0, $limit: 20, q: 'a b', x: undefined })).toBe(
      '/api-ruleta/v1/raffles?$init=0&$limit=20&q=a%20b',
    );
  });

  it('envía cookies, Accept-Language y la cabecera CSRF solo en mutaciones', async () => {
    const calls = mockFetch(() => json(200, { data: { ok: true } }));
    await apiRequest('/raffles/1');
    await apiRequest('/raffles/1', { method: 'PATCH', body: { name: 'x' } });
    const [get, patch] = calls;
    expect(get?.init.credentials).toBe('include');
    expect(header(get as Call, 'Accept-Language')).toMatch(/^(es|en)$/);
    expect(header(get as Call, 'X-XSRF-TOKEN')).toBeNull();
    expect(header(patch as Call, 'X-XSRF-TOKEN')).toBe('abc123');
    expect(header(patch as Call, 'Content-Type')).toBe('application/json');
  });

  it('pide GET /status antes de la primera mutación si aún no hay cookie CSRF', async () => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    const calls = mockFetch((url) => {
      if (url.endsWith('/status')) document.cookie = 'XSRF-TOKEN=nuevo; path=/';
      return json(201, { data: { id: '9' } });
    });
    await apiRequest('/raffles', { method: 'POST', body: { name: 'x' } });
    expect(calls.map((c) => c.url)).toEqual(['/api-ruleta/v1/status', '/api-ruleta/v1/raffles']);
    expect(header(calls[1] as Call, 'X-XSRF-TOKEN')).toBe('nuevo');
  });

  it('devuelve data y paging validados con Zod', async () => {
    mockFetch(() =>
      json(206, {
        data: [{ id: '1' }],
        paging: { init: 0, limit: 20, total: 1, links: [{ next: { href: null } }] },
      }),
    );
    const result = await apiRequest('/raffles', { schema: z.array(z.object({ id: z.string() })) });
    expect(result.data).toEqual([{ id: '1' }]);
    expect(result.paging?.total).toBe(1);
    expect(result.status).toBe(206);
  });

  it('204 sin cuerpo', async () => {
    mockFetch(() => new Response(null, { status: 204 }));
    const result = await apiRequest('/raffles/1', { method: 'DELETE' });
    expect(result.status).toBe(204);
    expect(result.data).toBeUndefined();
  });

  it('lanza ContractError si la respuesta no cumple el esquema', async () => {
    mockFetch(() => json(200, { data: { id: 5 } }));
    await expect(
      apiRequest('/raffles/1', { schema: z.object({ id: z.string() }) }),
    ).rejects.toBeInstanceOf(ContractError);
  });

  it('lanza ApiError con el código, los campos y el código de soporte', async () => {
    mockFetch(() =>
      json(400, {
        data: null,
        errors: [
          {
            code: 'field.required',
            description: 'x',
            field: 'lastName',
            traceId: '4bf92f3577b34da6',
          },
          { code: 'field.format', description: 'y', field: 'email', traceId: '4bf92f3577b34da6' },
        ],
      }),
    );
    const error = await apiRequest('/x', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe('field.required');
    expect(apiError.fieldErrors.map((f) => f.field)).toEqual(['lastName', 'email']);
    expect(supportCode(apiError)).toBe('4bf92f35');
  });

  it('lee Retry-After en 429', async () => {
    mockFetch(() =>
      json(
        429,
        { data: null, errors: [{ code: 'rate_limit.exceeded', description: '' }] },
        { 'Retry-After': '900' },
      ),
    );
    const error = (await apiRequest('/sessions', { method: 'POST', authFlow: true }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error.retryAfterSeconds).toBe(900);
  });

  it('reintenta un GET una vez ante 503, pero nunca un POST', async () => {
    let n = 0;
    mockFetch(() =>
      ++n === 1
        ? json(503, { data: null, errors: [{ code: 'service.unavailable' }] })
        : json(200, { data: 1 }),
    );
    await expect(apiRequest('/raffles')).resolves.toMatchObject({ data: 1 });
    expect(n).toBe(2);

    n = 0;
    mockFetch(() =>
      ++n === 1
        ? json(503, { data: null, errors: [{ code: 'service.unavailable' }] })
        : json(201, { data: 1 }),
    );
    await expect(apiRequest('/raffles/1/spins', { method: 'POST' })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(n).toBe(1);
  });

  it('ante auth.token_expired renueva una sola vez para varias peticiones en paralelo y las repite', async () => {
    let refreshed = false;
    const calls = mockFetch(async (url) => {
      if (url.endsWith('/sessions/refresh')) {
        await new Promise((r) => setTimeout(r, 10));
        refreshed = true;
        return json(200, { data: { user: {} } });
      }
      if (!refreshed) return json(401, { data: null, errors: [{ code: 'auth.token_expired' }] });
      return json(200, { data: url });
    });
    const results = await Promise.all([
      apiRequest('/raffles'),
      apiRequest('/raffles/1'),
      apiRequest('/raffles/2'),
    ]);
    expect(results.map((r) => r.data)).toEqual([
      '/api-ruleta/v1/raffles',
      '/api-ruleta/v1/raffles/1',
      '/api-ruleta/v1/raffles/2',
    ]);
    expect(calls.filter((c) => c.url.endsWith('/sessions/refresh'))).toHaveLength(1);
  });

  it('si la renovación falla emite "sesión expirada"', async () => {
    const listener = vi.fn();
    const off = onSessionExpired(listener);
    mockFetch((url) =>
      url.endsWith('/sessions/refresh')
        ? json(401, { data: null, errors: [{ code: 'auth.session_revoked' }] })
        : json(401, { data: null, errors: [{ code: 'auth.token_expired' }] }),
    );
    await expect(apiRequest('/raffles')).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalled();
    off();
  });

  it('auth.invalid_credentials en el login no renueva ni cierra sesión', async () => {
    const listener = vi.fn();
    const off = onSessionExpired(listener);
    const calls = mockFetch(() =>
      json(401, { data: null, errors: [{ code: 'auth.invalid_credentials' }] }),
    );
    await expect(
      apiRequest('/sessions', { method: 'POST', authFlow: true }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(1);
    expect(listener).not.toHaveBeenCalled();
    off();
  });

  it('error de red → network.unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const error = (await apiRequest('/raffles', { method: 'POST' }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error.code).toBe('network.unavailable');
  });
});
