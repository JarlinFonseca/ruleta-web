import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { renderWithProviders } from '@/testing/render';
import { HistoryView } from './history-view';

const BASE = `${window.location.origin}/api-ruleta/v1`;
const date = { date: '2026-10-18T10:00:00Z', utcOffset: '-05:00' };

type Item = {
  id: string;
  round: number;
  winnerName: string;
  winnerId: string | null;
  emailStatus: string;
};
let items: Item[] = [];
let resent: string[] = [];
let listCalls = 0;

const server = setupServer(
  http.get(`${BASE}/sessions/current`, () =>
    HttpResponse.json({ data: null, errors: [{ code: 'auth.unauthenticated' }] }, { status: 401 }),
  ),
  http.get(`${BASE}/raffles/9/spins`, () => {
    listCalls += 1;
    return HttpResponse.json(
      {
        data: items.map((s) => ({ ...s, poolSize: 4, creationDate: date })),
        paging: { init: 0, limit: 20, total: items.length, links: [] },
      },
      { status: 206 },
    );
  }),
  http.post(`${BASE}/spins/:id/email-deliveries`, ({ params }) => {
    const id = String(params.id);
    if (id === '3')
      return HttpResponse.json(
        { data: null, errors: [{ code: 'email.no_recipient', traceId: 'x' }] },
        { status: 409 },
      );
    resent.push(id);
    items = items.map((s) => (s.id === id ? { ...s, emailStatus: 'SCHEDULED' } : s));
    return new HttpResponse(null, { status: 202 });
  }),
);

beforeAll(() => server.listen());
beforeEach(() => {
  items = [
    { id: '1', round: 4, winnerName: 'Ana Pérez', winnerId: '11', emailStatus: 'FAILED' },
    { id: '2', round: 3, winnerName: 'Luis Gómez', winnerId: '12', emailStatus: 'SENT' },
    { id: '3', round: 2, winnerName: 'Marta Ruiz', winnerId: '13', emailStatus: 'NO_EMAIL' },
    { id: '4', round: 1, winnerName: 'Pedro Borrado', winnerId: null, emailStatus: 'DISABLED' },
  ];
  resent = [];
  listCalls = 0;
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const row = (name: string) => screen.getByRole('cell', { name }).closest('tr') as HTMLElement;

describe('HistoryView · correo al ganador', () => {
  it('muestra el estado del correo y solo ofrece enviar cuando tiene sentido', async () => {
    renderWithProviders(<HistoryView raffleId="9" raffleName="Rifa" />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });
    expect(screen.getByRole('columnheader', { name: 'Correo' })).toBeInTheDocument();

    expect(within(row('Ana Pérez')).getByText('Falló')).toBeInTheDocument();
    expect(
      within(row('Ana Pérez')).getByRole('button', { name: 'Enviar el correo a Ana Pérez' }),
    ).toHaveTextContent('Reintentar');
    expect(within(row('Luis Gómez')).getByText('Enviado')).toBeInTheDocument();
    expect(within(row('Luis Gómez')).queryByRole('button')).not.toBeInTheDocument();
    expect(within(row('Marta Ruiz')).getByRole('button')).toHaveTextContent('Enviar');
    // El ganador ya no existe: no hay a quién escribirle.
    expect(within(row('Pedro Borrado')).getByText('No enviado')).toBeInTheDocument();
    expect(within(row('Pedro Borrado')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('reintentar pone el correo en cola, avisa y refresca el estado', async () => {
    renderWithProviders(<HistoryView raffleId="9" raffleName="Rifa" />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });
    await userEvent.click(within(row('Ana Pérez')).getByRole('button'));
    await screen.findByText('Correo en cola de envío.');
    expect(resent).toEqual(['1']);
    await waitFor(() =>
      expect(within(row('Ana Pérez')).getByText('Programado')).toBeInTheDocument(),
    );
    expect(within(row('Ana Pérez')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('si el ganador no tiene correo muestra el motivo', async () => {
    renderWithProviders(<HistoryView raffleId="9" raffleName="Rifa" />);
    await screen.findByRole('cell', { name: 'Marta Ruiz' });
    await userEvent.click(within(row('Marta Ruiz')).getByRole('button'));
    await screen.findByText('Este participante no tiene correo.');
    expect(resent).toEqual([]);
  });

  it('mientras haya correos programados vuelve a consultar el historial', async () => {
    items[0] = { ...items[0]!, emailStatus: 'SCHEDULED' };
    renderWithProviders(<HistoryView raffleId="9" raffleName="Rifa" />);
    await screen.findByText('Programado');
    items[0] = { ...items[0]!, emailStatus: 'SENT' };
    await waitFor(() => expect(within(row('Ana Pérez')).getByText('Enviado')).toBeInTheDocument(), {
      timeout: 7000,
    });
    expect(listCalls).toBeGreaterThanOrEqual(2);
  }, 10_000);
});
