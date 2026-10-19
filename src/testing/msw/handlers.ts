import { http, HttpResponse, type JsonBodyType } from 'msw';
import { env } from '@/config/env';
import { fairIndex } from '@/lib/random/fair-index';
import { adminHandlers } from './admin-handlers';
import {
  db,
  nextId,
  persist,
  type EmailStatus,
  type MockParticipant,
  type MockRaffle,
  type MockSpin,
  type MockUser,
} from './db';

const base = env.apiBaseUrl;
const offset = '-05:00';
const trace = () => Math.random().toString(16).slice(2, 18).padEnd(16, '0');

const ok = (data: JsonBodyType, status = 200, headers?: Record<string, string>) =>
  HttpResponse.json({ data }, { status, ...(headers ? { headers } : {}) });
const fail = (status: number, code: string, field?: string) =>
  HttpResponse.json(
    {
      errors: [{ code, description: code, traceId: trace(), ...(field ? { field } : {}) }],
      data: null,
    },
    { status },
  );
const noContent = () => new HttpResponse(null, { status: 204 });

function ensureCsrfCookie(): void {
  if (!document.cookie.includes('XSRF-TOKEN='))
    document.cookie = 'XSRF-TOKEN=mock-csrf-token; path=/';
}

function csrfOk(request: Request): boolean {
  return request.headers.get('X-XSRF-TOKEN') === 'mock-csrf-token';
}

function currentUser(): MockUser | null {
  return db.users.find((u) => u.id === db.sessionUserId) ?? null;
}

const userDto = (u: MockUser) => ({
  id: u.id,
  email: u.email,
  language: u.language,
  lastRaffleId: u.lastRaffleId,
  role: u.role ?? 'USER',
  photoUrl: u.photoUrl ?? null,
});

/** Simula la cola de correo: un correo programado se da por enviado a los 3 s (FAILED si el dominio es "falla"). */
const MOCK_SEND_MS = 3000;
function settleEmail(s: MockSpin): EmailStatus {
  if (
    s.emailStatus === 'SCHEDULED' &&
    s.scheduledAt &&
    Date.now() - s.scheduledAt >= MOCK_SEND_MS
  ) {
    const winner = db.participants.find((p) => p.id === s.winnerId);
    s.emailStatus = winner?.email?.endsWith('@falla.test') ? 'FAILED' : 'SENT';
    persist();
  }
  return s.emailStatus ?? 'DISABLED';
}

const maskEmail = (email: string) => {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
};

async function fileToDataUrl(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return `data:${file.type || 'image/jpeg'};base64,${btoa(binary)}`;
}
const date = (iso: string) => ({ date: iso, utcOffset: offset });

function raffleDto(r: MockRaffle) {
  const ps = db.participants.filter((p) => p.raffleId === r.id);
  return {
    id: r.id,
    name: r.name,
    removeWinnerAfterSpin: r.removeWinnerAfterSpin,
    sendWinnerEmail: r.sendWinnerEmail ?? false,
    emailLanguage: r.emailLanguage ?? 'es',
    participantCount: ps.length,
    activeCount: ps.filter((p) => p.active).length,
    spinCount: db.spins.filter((s) => s.raffleId === r.id).length,
    version: r.version,
    creationDate: date(r.createdAt),
    updateDate: date(r.updatedAt),
  };
}

function participantDto(p: MockParticipant) {
  return {
    ...p,
    initials: (p.firstName.charAt(0) + (p.lastName.charAt(0) || '')).toUpperCase(),
    needsLastName: p.lastName === '',
  };
}

function ownRaffle(id: string | readonly string[] | undefined): MockRaffle | null {
  const user = currentUser();
  return db.raffles.find((r) => r.id === id && r.ownerId === user?.id) ?? null;
}

function ownParticipant(id: string | readonly string[] | undefined): MockParticipant | null {
  const p = db.participants.find((x) => x.id === id);
  return p && ownRaffle(p.raffleId) ? p : null;
}

function paging(url: URL, total: number) {
  const init = Number(url.searchParams.get('$init') ?? 0);
  const limit = Number(url.searchParams.get('$limit') ?? 20);
  return {
    init,
    limit,
    total,
    links: [
      { self: { href: url.pathname } },
      { previous: { href: null } },
      { next: { href: null } },
    ],
  };
}

function page<T>(url: URL, items: T[]) {
  const p = paging(url, items.length);
  return HttpResponse.json(
    { data: items.slice(p.init, p.init + p.limit) as JsonBodyType, paging: p },
    { status: 206 },
  );
}

const touch = (r: MockRaffle) => {
  r.updatedAt = new Date().toISOString();
  r.version += 1;
};

type Body = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Igual que la API real: cookie indicadora legible (sin secretos) mientras hay sesión. */
function setSessionHint(active: boolean): void {
  document.cookie = active
    ? 'ruleta_session=1; path=/; SameSite=Lax'
    : 'ruleta_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export const handlers = [
  http.all(`${base}/*`, ({ request }) => {
    ensureCsrfCookie();
    if (request.method !== 'GET' && !csrfOk(request)) return fail(403, 'auth.csrf_invalid');
    return undefined;
  }),

  http.get(`${base}/status`, () => ok({ status: 'UP', details: [] })),

  http.post(`${base}/users`, async ({ request }) => {
    const body = (await request.json()) as Body;
    const email = str(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email) return fail(400, 'field.required', 'email');
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail(400, 'field.format', 'email');
    if (password.length < 8 || !/\p{L}/u.test(password) || !/\d/.test(password))
      return fail(422, 'password.weak');
    if (db.users.some((u) => u.email === email)) return fail(409, 'user.email.duplicate');
    const user: MockUser = {
      id: nextId(),
      email,
      password,
      language: body.language === 'en' ? 'en' : 'es',
      lastRaffleId: null,
      role: 'USER',
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    db.sessionUserId = user.id;
    setSessionHint(true);
    persist();
    return ok({ user: userDto(user) }, 201);
  }),

  http.patch(`${base}/users/me`, async ({ request }) => {
    const user = currentUser();
    if (!user) return fail(401, 'auth.unauthenticated');
    const body = (await request.json()) as Body;
    if (body.language === 'es' || body.language === 'en') user.language = body.language;
    if (typeof body.lastRaffleId === 'string') user.lastRaffleId = body.lastRaffleId;
    persist();
    return ok(userDto(user));
  }),

  http.delete(`${base}/users/me`, () => {
    const user = currentUser();
    if (!user) return fail(401, 'auth.unauthenticated');
    const raffleIds = new Set(db.raffles.filter((r) => r.ownerId === user.id).map((r) => r.id));
    db.raffles = db.raffles.filter((r) => !raffleIds.has(r.id));
    db.participants = db.participants.filter((p) => !raffleIds.has(p.raffleId));
    db.spins = db.spins.filter((s) => !raffleIds.has(s.raffleId));
    db.users = db.users.filter((u) => u.id !== user.id);
    db.sessionUserId = null;
    setSessionHint(false);
    persist();
    return noContent();
  }),

  http.post(`${base}/sessions`, async ({ request }) => {
    const body = (await request.json()) as Body;
    const user = db.users.find(
      (u) => u.email === str(body.email).toLowerCase() && u.password === body.password,
    );
    if (!user) return fail(401, 'auth.invalid_credentials');
    db.sessionUserId = user.id;
    setSessionHint(true);
    persist();
    return ok({ user: userDto(user) }, 201);
  }),

  http.get(`${base}/sessions/current`, () => {
    const user = currentUser();
    return user ? ok({ user: userDto(user) }) : fail(401, 'auth.unauthenticated');
  }),

  http.post(`${base}/sessions/refresh`, () => {
    const user = currentUser();
    return user ? ok({ user: userDto(user) }) : fail(401, 'auth.session_revoked');
  }),

  http.delete(`${base}/sessions/current`, () => {
    db.sessionUserId = null;
    setSessionHint(false);
    persist();
    return noContent();
  }),

  http.post(`${base}/password-resets`, () => new HttpResponse(null, { status: 202 })),

  http.put(`${base}/password-resets/:token`, async ({ params, request }) => {
    if (params.token === 'vencido') return fail(400, 'password_reset.invalid_token');
    const body = (await request.json()) as Body;
    const user = db.users[0];
    if (!user) return fail(400, 'password_reset.invalid_token');
    user.password = String(body.password ?? '');
    db.sessionUserId = user.id;
    setSessionHint(true);
    persist();
    return ok({ user: userDto(user) });
  }),

  http.get(`${base}/raffles`, ({ request }) => {
    const user = currentUser();
    if (!user) return fail(401, 'auth.unauthenticated');
    const list = db.raffles
      .filter((r) => r.ownerId === user.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(raffleDto);
    return page(new URL(request.url), list);
  }),

  http.post(`${base}/raffles`, async ({ request }) => {
    const user = currentUser();
    if (!user) return fail(401, 'auth.unauthenticated');
    const body = (await request.json()) as Body;
    const name = str(body.name);
    if (!name) return fail(400, 'field.required', 'name');
    if (db.raffles.filter((r) => r.ownerId === user.id).length >= 50)
      return fail(422, 'raffle.limit_reached');
    const now = new Date().toISOString();
    const raffle: MockRaffle = {
      id: nextId(),
      ownerId: user.id,
      name,
      removeWinnerAfterSpin: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    db.raffles.push(raffle);
    const names = Array.isArray(body.participants)
      ? body.participants.filter((n): n is string => typeof n === 'string')
      : [];
    names.slice(0, 200).forEach((full, i) => {
      const [first = '', ...rest] = full.trim().split(/\s+/);
      db.participants.push({
        id: nextId(),
        raffleId: raffle.id,
        firstName: first,
        lastName: rest.join(' '),
        email: null,
        photoUrl: null,
        active: true,
        sortOrder: i,
        version: 0,
      });
    });
    persist();
    return ok(raffleDto(raffle), 201, { Location: `${base}/raffles/${raffle.id}` });
  }),

  http.get(`${base}/raffles/:id`, ({ params }) => {
    const raffle = ownRaffle(params.id);
    return raffle ? ok(raffleDto(raffle)) : fail(404, 'raffle.not_found');
  }),

  http.patch(`${base}/raffles/:id`, async ({ params, request }) => {
    const raffle = ownRaffle(params.id);
    if (!raffle) return fail(404, 'raffle.not_found');
    const body = (await request.json()) as Body;
    if (typeof body.name === 'string') {
      if (!body.name.trim()) return fail(400, 'field.required', 'name');
      raffle.name = body.name.trim();
    }
    if (typeof body.removeWinnerAfterSpin === 'boolean')
      raffle.removeWinnerAfterSpin = body.removeWinnerAfterSpin;
    if (typeof body.sendWinnerEmail === 'boolean') raffle.sendWinnerEmail = body.sendWinnerEmail;
    if (body.emailLanguage === 'es' || body.emailLanguage === 'en')
      raffle.emailLanguage = body.emailLanguage;
    touch(raffle);
    persist();
    return ok(raffleDto(raffle));
  }),

  http.delete(`${base}/raffles/:id`, ({ params }) => {
    const raffle = ownRaffle(params.id);
    if (!raffle) return fail(404, 'raffle.not_found');
    db.raffles = db.raffles.filter((r) => r.id !== raffle.id);
    db.participants = db.participants.filter((p) => p.raffleId !== raffle.id);
    db.spins = db.spins.filter((s) => s.raffleId !== raffle.id);
    persist();
    return noContent();
  }),

  http.get(`${base}/raffles/:id/participants`, ({ params, request }) => {
    const raffle = ownRaffle(params.id);
    if (!raffle) return fail(404, 'raffle.not_found');
    const list = db.participants
      .filter((p) => p.raffleId === raffle.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(participantDto);
    return page(new URL(request.url), list);
  }),

  http.post(`${base}/raffles/:id/participants`, async ({ params, request }) => {
    const raffle = ownRaffle(params.id);
    if (!raffle) return fail(404, 'raffle.not_found');
    const body = (await request.json()) as Body;
    const firstName = str(body.firstName);
    const lastName = str(body.lastName);
    if (!firstName) return fail(400, 'field.required', 'firstName');
    if (!lastName) return fail(400, 'field.required', 'lastName');
    const siblings = db.participants.filter((p) => p.raffleId === raffle.id);
    if (siblings.length >= 200) return fail(422, 'participant.limit_reached');
    const p: MockParticipant = {
      id: nextId(),
      raffleId: raffle.id,
      firstName,
      lastName,
      email: str(body.email) || null,
      photoUrl: null,
      active: true,
      sortOrder: siblings.reduce((m, x) => Math.max(m, x.sortOrder), -1) + 1,
      version: 0,
    };
    db.participants.push(p);
    touch(raffle);
    persist();
    return ok(participantDto(p), 201, { Location: `${base}/participants/${p.id}` });
  }),

  http.patch(`${base}/participants/:id`, async ({ params, request }) => {
    const p = ownParticipant(params.id);
    if (!p) return fail(404, 'participant.not_found');
    const body = (await request.json()) as Body;
    if (typeof body.firstName === 'string') {
      if (!body.firstName.trim()) return fail(400, 'field.required', 'firstName');
      p.firstName = body.firstName.trim();
    }
    if (typeof body.lastName === 'string') {
      if (!body.lastName.trim()) return fail(400, 'field.required', 'lastName');
      p.lastName = body.lastName.trim();
    }
    if (typeof body.email === 'string') p.email = body.email.trim() || null;
    if (typeof body.active === 'boolean') p.active = body.active;
    p.version += 1;
    persist();
    return ok(participantDto(p));
  }),

  http.delete(`${base}/participants/:id`, ({ params }) => {
    const p = ownParticipant(params.id);
    if (!p) return fail(404, 'participant.not_found');
    db.participants = db.participants.filter((x) => x.id !== p.id);
    persist();
    return noContent();
  }),

  http.put(`${base}/participants/:id/photo`, async ({ params, request }) => {
    const p = ownParticipant(params.id);
    if (!p) return fail(404, 'participant.not_found');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) return fail(400, 'field.required', 'file');
    if (file.size > 2 * 1024 * 1024) return fail(413, 'file.too_large');
    p.photoUrl = await fileToDataUrl(file);
    persist();
    return ok(participantDto(p));
  }),

  http.put(`${base}/users/me/photo`, async ({ request }) => {
    const user = currentUser();
    if (!user) return fail(401, 'auth.unauthenticated');
    const file = (await request.formData()).get('file');
    if (!(file instanceof Blob)) return fail(400, 'field.required', 'file');
    if (file.size > 2 * 1024 * 1024) return fail(413, 'file.too_large');
    user.photoUrl = await fileToDataUrl(file);
    persist();
    return ok(userDto(user));
  }),

  http.delete(`${base}/users/me/photo`, () => {
    const user = currentUser();
    if (!user) return fail(401, 'auth.unauthenticated');
    user.photoUrl = null;
    persist();
    return noContent();
  }),

  http.delete(`${base}/participants/:id/photo`, ({ params }) => {
    const p = ownParticipant(params.id);
    if (!p) return fail(404, 'participant.not_found');
    p.photoUrl = null;
    persist();
    return noContent();
  }),

  http.post(`${base}/raffles/:id/spins`, async ({ params }) => {
    const raffle = ownRaffle(params.id);
    if (!raffle) return fail(404, 'raffle.not_found');
    const pool = db.participants
      .filter((p) => p.raffleId === raffle.id && p.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (pool.length < 2) return fail(422, 'spin.not_enough_participants');
    await new Promise((r) => setTimeout(r, 250));
    const winner = pool[fairIndex(pool.length)] as MockParticipant;
    const round =
      db.spins.filter((s) => s.raffleId === raffle.id).reduce((m, s) => Math.max(m, s.round), 0) +
      1;
    const createdAt = new Date().toISOString();
    const emailStatus: EmailStatus = !raffle.sendWinnerEmail
      ? 'DISABLED'
      : winner.email
        ? 'SCHEDULED'
        : 'NO_EMAIL';
    const spin: MockSpin = {
      id: nextId(),
      raffleId: raffle.id,
      round,
      winnerId: winner.id,
      winnerName: `${winner.firstName} ${winner.lastName}`.trim(),
      poolSize: pool.length,
      emailStatus,
      ...(emailStatus === 'SCHEDULED' ? { scheduledAt: Date.now() } : {}),
      createdAt,
    };
    db.spins.push(spin);
    if (raffle.removeWinnerAfterSpin) winner.active = false;
    persist();
    return ok(
      {
        id: spin.id,
        round,
        winner: participantDto(winner),
        poolSize: pool.length,
        emailStatus,
        maskedEmail: emailStatus === 'SCHEDULED' && winner.email ? maskEmail(winner.email) : null,
        winnerRemoved: raffle.removeWinnerAfterSpin,
        creationDate: date(createdAt),
      },
      201,
    );
  }),

  http.get(`${base}/raffles/:id/spins`, ({ params, request }) => {
    const raffle = ownRaffle(params.id);
    if (!raffle) return fail(404, 'raffle.not_found');
    const list = db.spins
      .filter((s) => s.raffleId === raffle.id)
      .sort((a, b) => b.round - a.round)
      .map((s) => ({
        id: s.id,
        round: s.round,
        winnerName: s.winnerName,
        winnerId: s.winnerId,
        poolSize: s.poolSize,
        emailStatus: settleEmail(s),
        creationDate: date(s.createdAt),
      }));
    return page(new URL(request.url), list);
  }),

  http.post(`${base}/spins/:id/email-deliveries`, ({ params }) => {
    const spin = db.spins.find((s) => s.id === params.id && ownRaffle(s.raffleId));
    if (!spin) return fail(404, 'spin.not_found');
    const status = settleEmail(spin);
    if (status === 'SENT' || status === 'SCHEDULED') return fail(409, 'email.already_sent');
    const winner = db.participants.find((p) => p.id === spin.winnerId);
    if (!winner?.email) return fail(409, 'email.no_recipient');
    spin.emailStatus = 'SCHEDULED';
    spin.scheduledAt = Date.now();
    persist();
    return new HttpResponse(null, { status: 202 });
  }),

  http.delete(`${base}/raffles/:id/spins`, ({ params }) => {
    const raffle = ownRaffle(params.id);
    if (!raffle) return fail(404, 'raffle.not_found');
    db.spins = db.spins.filter((s) => s.raffleId !== raffle.id);
    persist();
    return noContent();
  }),
  ...adminHandlers,
];
