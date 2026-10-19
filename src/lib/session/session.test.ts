import { fetchCurrentSession, SESSION_HINT_COOKIE } from './session';

describe('fetchCurrentSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = `${SESSION_HINT_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });

  it('sin la cookie indicadora es visitante y no llama a la API (sin 401 en consola)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCurrentSession()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con la cookie indicadora consulta /sessions/current', async () => {
    document.cookie = `${SESSION_HINT_COOKIE}=1; path=/`;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            data: {
              user: {
                id: '7',
                email: 'ana@correo.com',
                language: 'en',
                lastRaffleId: null,
                role: 'USER',
              },
            },
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCurrentSession()).resolves.toMatchObject({ id: '7', role: 'USER' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/sessions/current');
  });
});
