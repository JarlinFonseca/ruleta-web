import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGuestListStore } from '@/lib/guest/guest-list-store';
import { renderWithProviders } from '@/testing/render';
import { GuestRaffleView } from './guest-raffle-view';

function setup() {
  // Visitante: GET /sessions/current → 401. El modo prueba no hace ninguna otra llamada.
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ data: null, errors: [{ code: 'auth.unauthenticated' }] }), {
        status: 401,
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  renderWithProviders(<GuestRaffleView />);
  return { user, fetchMock };
}

describe('Modo prueba (HU-01 a HU-04)', () => {
  beforeEach(() => useGuestListStore.getState().reset());
  afterEach(() => vi.unstubAllGlobals());

  it('muestra el aviso de modo prueba con el enlace para crear cuenta (HU-03)', () => {
    setup();
    expect(screen.getByText(/no se guardan/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /crear cuenta gratis/i })).toHaveAttribute(
      'href',
      '/acceso?modo=registro',
    );
  });

  it('agrega varios nombres con Enter, limpia el campo y conserva el foco', async () => {
    const { user } = setup();
    const input = screen.getByLabelText('Nombre del participante');
    await user.type(input, 'Ana, Luis, Camila{Enter}');
    const list = screen.getByRole('list', { name: 'Nombres en la ruleta' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Ana', 'Luis', 'Camila']);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.getByText('3 nombres')).toBeInTheDocument();
  });

  it('muestra "Máximo 60 caracteres" y no agrega', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Nombre del participante'), `${'x'.repeat(61)}{Enter}`);
    expect(screen.getByRole('alert')).toHaveTextContent('Máximo 60 caracteres');
    expect(useGuestListStore.getState().entries).toHaveLength(0);
  });

  it('con menos de 2 nombres los botones de girar están deshabilitados', async () => {
    const { user } = setup();
    expect(screen.getByRole('button', { name: 'Girar la ruleta' })).toBeDisabled();
    expect(screen.getByTestId('wheel-button')).toBeDisabled();
    await user.type(screen.getByLabelText('Nombre del participante'), 'Ana{Enter}');
    expect(screen.getByRole('button', { name: 'Girar la ruleta' })).toBeDisabled();
    await user.type(screen.getByLabelText('Nombre del participante'), 'Luis{Enter}');
    expect(screen.getByRole('button', { name: 'Girar la ruleta' })).toBeEnabled();
    expect(screen.getByTestId('wheel-button')).toHaveAccessibleName(
      'Girar la ruleta con 2 participantes',
    );
  });

  it('quita un nombre con su "x"', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Nombre del participante'), 'Ana, Luis{Enter}');
    await user.click(screen.getByRole('button', { name: 'Quitar a Luis' }));
    expect(screen.queryByText('Luis')).not.toBeInTheDocument();
  });

  it('vacía la lista solo después de confirmar', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Nombre del participante'), 'Ana, Luis{Enter}');
    await user.click(screen.getByRole('button', { name: 'Vaciar lista' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Vaciar lista' }));
    expect(useGuestListStore.getState().entries).toHaveLength(0);
    expect(screen.getAllByText('Agrega al menos 2 nombres para girar').length).toBeGreaterThan(0);
  });

  it('el giro se calcula en el navegador y no llama al backend (HU-04)', async () => {
    const { user, fetchMock } = setup();
    await user.type(screen.getByLabelText('Nombre del participante'), 'Ana, Luis{Enter}');
    const callsBefore = fetchMock.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Girar la ruleta' }));
    const dialog = await screen.findByRole('dialog', {}, { timeout: 8000 });
    expect(within(dialog).getByText(/Ganador · Giro 1/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    expect(useGuestListStore.getState().winners).toHaveLength(1);
    expect(screen.getByText(/^Ganador: (Ana|Luis)$/)).toBeInTheDocument();
  }, 10_000);
});
