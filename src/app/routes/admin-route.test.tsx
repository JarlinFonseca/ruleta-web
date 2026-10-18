import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/testing/render';
import { AdminRoute } from './admin-route';

function mockSession(role: 'USER' | 'ADMIN') {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/sessions/current')) {
      return new Response(
        JSON.stringify({
          data: {
            user: { id: '1', email: 'ana@correo.com', language: 'es', lastRaffleId: null, role },
          },
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ data: null, errors: [{ code: 'auth.forbidden' }] }), {
      status: 403,
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  document.cookie = 'ruleta_session=1; path=/'; // la API la emite al iniciar sesión
  return fetchMock;
}

describe('AdminRoute (guard de rol)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = 'ruleta_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('a un USER le muestra "no encontrada" y no llama a /admin', async () => {
    const fetchMock = mockSession('USER');
    renderWithProviders(<AdminRoute />, { path: '/admin' });
    expect(await screen.findByText('Esta página no existe.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/admin/'))).toBe(false);
    expect(screen.queryByRole('heading', { name: 'Administración' })).not.toBeInTheDocument();
  });

  it('a un ADMIN le muestra el módulo con sus pestañas', async () => {
    mockSession('ADMIN');
    renderWithProviders(<AdminRoute />, { path: '/admin' });
    expect(await screen.findByRole('heading', { name: 'Administración' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Usuarios' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'true');
  });
});
