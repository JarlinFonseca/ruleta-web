import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { renderWithProviders } from '@/testing/render';
import { UsersTab } from './users-tab';

const BASE = `${window.location.origin}/api-ruleta/v1`;
const date = (iso: string) => ({ date: iso, utcOffset: '-05:00' });

type User = {
  id: string;
  email: string;
  language: string;
  role: 'USER' | 'ADMIN';
  creationDate: { date: string; utcOffset: string };
  raffleCount: number;
  participantCount: number;
  spinCount: number;
  lastActivityDate: { date: string; utcOffset: string } | null;
};

let users: User[] = [];
let lastCreateBody: unknown = null;

const server = setupServer(
  http.get(`${BASE}/sessions/current`, () =>
    HttpResponse.json({ data: null, errors: [{ code: 'auth.unauthenticated' }] }, { status: 401 }),
  ),
  http.post(`${BASE}/sessions/refresh`, () =>
    HttpResponse.json({ data: null, errors: [{ code: 'auth.session_revoked' }] }, { status: 401 }),
  ),
  http.get(`${BASE}/admin/users`, () =>
    HttpResponse.json(
      { data: users, paging: { init: 0, limit: 20, total: users.length, links: [] } },
      { status: 206 },
    ),
  ),
  http.post(`${BASE}/admin/users`, async ({ request }) => {
    const body = (await request.json()) as { email: string; language: string };
    lastCreateBody = body;
    if (users.some((u) => u.email === body.email)) {
      return HttpResponse.json(
        {
          data: null,
          errors: [{ code: 'user.email.duplicate', description: 'x', traceId: 'abc' }],
        },
        { status: 409 },
      );
    }
    const created: User = {
      id: String(users.length + 10),
      email: body.email,
      language: body.language,
      role: 'USER',
      creationDate: date('2026-10-17T10:00:00Z'),
      raffleCount: 0,
      participantCount: 0,
      spinCount: 0,
      lastActivityDate: null,
    };
    users = [created, ...users];
    return HttpResponse.json({ data: created }, { status: 201 });
  }),
);

beforeAll(() => server.listen());
afterAll(() => server.close());
beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=test-token; path=/';
  lastCreateBody = null;
  users = [
    {
      id: '1',
      email: 'ana@correo.com',
      language: 'es',
      role: 'USER',
      creationDate: date('2026-10-01T12:00:00Z'),
      raffleCount: 2,
      participantCount: 14,
      spinCount: 9,
      lastActivityDate: date('2026-10-16T18:00:00Z'),
    },
    {
      id: '2',
      email: 'jefe@ruleta.dev',
      language: 'es',
      role: 'ADMIN',
      creationDate: date('2026-09-01T12:00:00Z'),
      raffleCount: 0,
      participantCount: 0,
      spinCount: 0,
      lastActivityDate: null,
    },
  ];
});
afterEach(() => server.resetHandlers());

function rowFor(email: string) {
  const cell = screen.getByText(email);
  const row = cell.closest('tr');
  if (!row) throw new Error('fila');
  return row;
}

describe('UsersTab (administración)', () => {
  it('lista usuarios; las filas ADMIN no tienen editar ni eliminar', async () => {
    renderWithProviders(<UsersTab onShowSpins={vi.fn()} />);
    expect(await screen.findByText('ana@correo.com')).toBeInTheDocument();

    const userRow = rowFor('ana@correo.com');
    expect(
      within(userRow).getByRole('button', { name: 'Editar ana@correo.com' }),
    ).toBeInTheDocument();
    expect(
      within(userRow).getByRole('button', { name: 'Eliminar ana@correo.com' }),
    ).toBeInTheDocument();

    const adminRow = rowFor('jefe@ruleta.dev');
    expect(
      within(adminRow).queryByRole('button', { name: /Editar|Eliminar/ }),
    ).not.toBeInTheDocument();
    expect(within(adminRow).getByText('Cuenta protegida')).toBeInTheDocument();
    expect(within(adminRow).getByText('Administrador')).toBeInTheDocument();
  });

  it('crea una cuenta USER y la muestra en la tabla', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersTab onShowSpins={vi.fn()} />);
    await screen.findByText('ana@correo.com');

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Correo electrónico'), 'nuevo@correo.com');
    await user.type(within(dialog).getByLabelText('Contraseña'), 'clave1234');
    await user.selectOptions(within(dialog).getByLabelText('Idioma'), 'en');
    await user.click(within(dialog).getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(lastCreateBody).toEqual({
      email: 'nuevo@correo.com',
      password: 'clave1234',
      language: 'en',
    });
    expect(await screen.findByText('nuevo@correo.com')).toBeInTheDocument();
  });

  it('409 user.email.duplicate → error bajo el correo y el diálogo sigue abierto', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersTab onShowSpins={vi.fn()} />);
    await screen.findByText('ana@correo.com');

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Correo electrónico'), 'ana@correo.com');
    await user.type(within(dialog).getByLabelText('Contraseña'), 'clave1234');
    await user.click(within(dialog).getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await within(dialog).findByText('Ya existe una cuenta con ese correo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('"Ver jugadas" lleva a las jugadas filtradas por ese usuario', async () => {
    const onShowSpins = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<UsersTab onShowSpins={onShowSpins} />);
    await screen.findByText('ana@correo.com');
    await user.click(screen.getByRole('button', { name: 'Ver jugadas de ana@correo.com' }));
    expect(onShowSpins).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });
});
