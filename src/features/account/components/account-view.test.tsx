import { renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SESSION_QUERY_KEY, type SessionUser } from '@/lib/session/session';
import { renderWithProviders } from '@/testing/render';
import { useUploadProfilePhoto } from '../api/profile-photo';
import { AccountView } from './account-view';

const BASE = `${window.location.origin}/api-ruleta/v1`;
const USER: SessionUser = {
  id: '7',
  email: 'ana@correo.com',
  language: 'es',
  lastRaffleId: null,
  role: 'USER',
  photoUrl: null,
};

let deleted = 0;
let uploadedType: string | null = null;
let failDelete = false;

const server = setupServer(
  http.delete(`${BASE}/users/me/photo`, () => {
    if (failDelete)
      return HttpResponse.json(
        { data: null, errors: [{ code: 'internal.error', traceId: 'abc' }] },
        { status: 500 },
      );
    deleted += 1;
    return new HttpResponse(null, { status: 204 });
  }),
  http.put(`${BASE}/users/me/photo`, async ({ request }) => {
    const file = (await request.formData()).get('file');
    // jsdom y Node tienen clases Blob distintas: se valida por forma, no con instanceof.
    uploadedType = file && typeof file === 'object' && 'type' in file ? file.type : null;
    return HttpResponse.json({ data: { ...USER, photoUrl: '/media/photos/7/nueva.jpg' } });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  deleted = 0;
  uploadedType = null;
  failDelete = false;
});
afterAll(() => server.close());

function renderAccount(user: SessionUser) {
  return renderWithProviders(
    <AccountView user={user} onSignOut={() => {}} onDeleted={() => {}} />,
    { seed: (client) => client.setQueryData(SESSION_QUERY_KEY, user) },
  );
}

describe('AccountView · foto de perfil', () => {
  it('sin foto muestra las iniciales y el botón para elegirla', () => {
    renderAccount(USER);
    expect(screen.getByText('Foto de perfil')).toBeInTheDocument();
    expect(screen.getByText('AN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elegir foto' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
  });

  it('con foto la muestra y "Quitar" la borra y actualiza la sesión', async () => {
    const { queryClient, container } = renderAccount({
      ...USER,
      photoUrl: '/media/photos/7/a.jpg',
    });
    expect(container.querySelector('img')).toHaveAttribute('src', '/media/photos/7/a.jpg');
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    await screen.findByText('Quitamos tu foto de perfil.');
    expect(deleted).toBe(1);
    expect(queryClient.getQueryData<SessionUser>(SESSION_QUERY_KEY)?.photoUrl).toBeNull();
  });

  it('si quitar falla avisa y conserva la foto', async () => {
    failDelete = true;
    const { queryClient } = renderAccount({ ...USER, photoUrl: '/media/photos/7/a.jpg' });
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    await screen.findByText(/Algo salió mal/);
    expect(queryClient.getQueryData<SessionUser>(SESSION_QUERY_KEY)?.photoUrl).toBe(
      '/media/photos/7/a.jpg',
    );
  });

  it('rechaza archivos que no son imagen sin llamar a la API', async () => {
    const { container } = renderAccount(USER);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['hola'], 'nota.txt', { type: 'text/plain' }), {
      applyAccept: false,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('JPG, PNG o WebP');
    expect(uploadedType).toBeNull();
  });
});

describe('useUploadProfilePhoto', () => {
  it('sube el recorte como multipart y guarda la nueva foto en la sesión', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    queryClient.setQueryData(SESSION_QUERY_KEY, USER);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUploadProfilePhoto(), { wrapper });
    result.current.mutate(new Blob(['jpeg'], { type: 'image/jpeg' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(uploadedType).toBe('image/jpeg');
    expect(queryClient.getQueryData<SessionUser>(SESSION_QUERY_KEY)?.photoUrl).toBe(
      '/media/photos/7/nueva.jpg',
    );
  });
});
