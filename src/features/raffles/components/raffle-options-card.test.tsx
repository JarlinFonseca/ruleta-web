import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { renderWithProviders } from '@/testing/render';
import { RaffleOptionsCard } from './raffle-options-card';

const BASE = `${window.location.origin}/api-ruleta/v1`;
const date = { date: '2026-10-18T10:00:00Z', utcOffset: '-05:00' };

let raffle: Record<string, unknown>;
let patches: Record<string, unknown>[] = [];
let rejectNext = false;

const server = setupServer(
  http.get(`${BASE}/sessions/current`, () =>
    HttpResponse.json({ data: null, errors: [{ code: 'auth.unauthenticated' }] }, { status: 401 }),
  ),
  http.get(`${BASE}/raffles/9`, () => HttpResponse.json({ data: raffle })),
  http.get(`${BASE}/raffles`, () => HttpResponse.json({ data: [raffle] }, { status: 206 })),
  http.patch(`${BASE}/raffles/9`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    patches.push(body);
    await new Promise((r) => setTimeout(r, 150)); // latencia real: da tiempo a un segundo cambio
    // Como la API: bloqueo optimista por versión.
    const stale = body.version !== undefined && body.version !== raffle.version;
    if (rejectNext || stale) {
      rejectNext = false;
      return HttpResponse.json(
        { data: null, errors: [{ code: 'raffle.concurrent_modification', traceId: 'x' }] },
        { status: 409 },
      );
    }
    const changes = { ...body };
    delete changes.version;
    raffle = { ...raffle, ...changes, version: (raffle.version as number) + 1 };
    return HttpResponse.json({ data: raffle });
  }),
);

beforeAll(() => server.listen());
beforeEach(() => {
  raffle = {
    id: '9',
    name: 'Rifa',
    removeWinnerAfterSpin: false,
    sendWinnerEmail: false,
    emailLanguage: 'es',
    version: 3,
    creationDate: date,
    updateDate: date,
  };
  patches = [];
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('RaffleOptionsCard · correo al ganador', () => {
  it('ya no dice "próxima versión": es un interruptor real con su pista', async () => {
    renderWithProviders(<RaffleOptionsCard raffleId="9" locked={false} />);
    const toggle = await screen.findByRole('checkbox', { name: 'Enviar correo al ganador' });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription('Solo llega a los participantes que tengan correo.');
    expect(screen.queryByText(/próxima versión/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Idioma del correo')).not.toBeInTheDocument();
  });

  it('activarlo guarda sendWinnerEmail con la versión y muestra el idioma del correo', async () => {
    renderWithProviders(<RaffleOptionsCard raffleId="9" locked={false} />);
    const toggle = await screen.findByRole('checkbox', { name: 'Enviar correo al ganador' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await userEvent.click(toggle);
    await waitFor(() => expect(patches).toEqual([{ sendWinnerEmail: true, version: 3 }]));
    const language = await screen.findByLabelText('Idioma del correo');
    expect(language).toHaveValue('es');

    await userEvent.selectOptions(language, 'en');
    await waitFor(() => expect(patches.at(-1)).toEqual({ emailLanguage: 'en', version: 4 }));
    await waitFor(() => expect(screen.getByLabelText('Idioma del correo')).toHaveValue('en'));
  });

  it('dos cambios seguidos sin esperar se guardan en orden, cada uno con la versión nueva', async () => {
    renderWithProviders(<RaffleOptionsCard raffleId="9" locked={false} />);
    const toggle = await screen.findByRole('checkbox', { name: 'Enviar correo al ganador' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await userEvent.click(toggle);
    // El selector aparece de inmediato (optimista): se cambia antes de que responda el primer PATCH.
    await userEvent.selectOptions(screen.getByLabelText('Idioma del correo'), 'en');
    await waitFor(() =>
      expect(patches).toEqual([
        { sendWinnerEmail: true, version: 3 },
        { emailLanguage: 'en', version: 4 },
      ]),
    );
    await waitFor(() =>
      expect(raffle).toMatchObject({ sendWinnerEmail: true, emailLanguage: 'en' }),
    );
    expect(screen.queryByText(/Otra pestaña guardó cambios/)).not.toBeInTheDocument();
  });

  it('si el servidor rechaza el cambio, vuelve al estado anterior y avisa', async () => {
    rejectNext = true;
    renderWithProviders(<RaffleOptionsCard raffleId="9" locked={false} />);
    const toggle = await screen.findByRole('checkbox', { name: 'Enviar correo al ganador' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await userEvent.click(toggle);
    await screen.findByText('Otra pestaña guardó cambios. Recarga para continuar.');
    await waitFor(() => expect(toggle).not.toBeChecked());
  });

  it('mientras gira la ruleta no se puede cambiar', async () => {
    renderWithProviders(<RaffleOptionsCard raffleId="9" locked />);
    const toggle = await screen.findByRole('checkbox', { name: 'Enviar correo al ganador' });
    expect(toggle).toBeDisabled();
  });
});
