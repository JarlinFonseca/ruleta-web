import { http, HttpResponse, type JsonBodyType } from 'msw';
import { env } from '@/config/env';
import { db, nextId, persist, type MockUser } from './db';

/** Endpoints de administración del backend simulado (dev:mock). Exigen ROLE_ADMIN como la API. */
const base = env.apiBaseUrl;
const offset = '-05:00';
const date = (iso: string) => ({ date: iso, utcOffset: offset });
const trace = () => Math.random().toString(16).slice(2, 18).padEnd(16, '0');
const ok = (data: JsonBodyType, status = 200) => HttpResponse.json({ data }, { status });
const fail = (status: number, code: string, field?: string) =>
  HttpResponse.json(
    {
      errors: [{ code, description: code, traceId: trace(), ...(field ? { field } : {}) }],
      data: null,
    },
    { status },
  );

function admin(): MockUser | null {
  const user = db.users.find((u) => u.id === db.sessionUserId);
  return user?.role === 'ADMIN' ? user : null;
}

function guard(): Response | null {
  if (!db.sessionUserId) return fail(401, 'auth.unauthenticated');
  return admin() ? null : fail(403, 'auth.forbidden');
}

function page<T>(url: URL, items: T[]) {
  const init = Number(url.searchParams.get('$init') ?? 0);
  const limit = Math.min(100, Number(url.searchParams.get('$limit') ?? 20));
  const paging = {
    init,
    limit,
    total: items.length,
    links: [
      { self: { href: url.pathname } },
      { previous: { href: null } },
      { next: { href: null } },
    ],
  };
  return HttpResponse.json(
    { data: items.slice(init, init + limit) as JsonBodyType, paging },
    { status: 206 },
  );
}

const created = (u: MockUser) => u.createdAt ?? '2026-10-01T12:00:00Z';
const ownerSpins = (userId: string) => {
  const raffleIds = new Set(db.raffles.filter((r) => r.ownerId === userId).map((r) => r.id));
  return db.spins.filter((s) => raffleIds.has(s.raffleId));
};

function adminUserDto(u: MockUser) {
  const raffles = db.raffles.filter((r) => r.ownerId === u.id);
  const raffleIds = new Set(raffles.map((r) => r.id));
  const spins = ownerSpins(u.id);
  const activity = [...raffles.map((r) => r.updatedAt), ...spins.map((s) => s.createdAt)]
    .sort()
    .at(-1);
  return {
    id: u.id,
    email: u.email,
    language: u.language,
    role: u.role ?? 'USER',
    creationDate: date(created(u)),
    raffleCount: raffles.length,
    participantCount: db.participants.filter((p) => raffleIds.has(p.raffleId)).length,
    spinCount: spins.length,
    lastActivityDate: activity ? date(activity) : null,
  };
}

const ownerEmail = (id: string) => db.users.find((u) => u.id === id)?.email ?? '';
const contains = (q: string, ...values: string[]) =>
  !q || values.some((v) => v.toLowerCase().includes(q));
const weak = (pw: string) => pw.length < 8 || !/\p{L}/u.test(pw) || !/\d/.test(pw);

type Body = Record<string, unknown>;

export const adminHandlers = [
  http.get(`${base}/admin/summary`, () => {
    const denied = guard();
    if (denied) return denied;
    const since = Date.now() - 24 * 3600 * 1000;
    return ok({
      users: db.users.length,
      admins: db.users.filter((u) => u.role === 'ADMIN').length,
      raffles: db.raffles.length,
      participants: db.participants.length,
      spins: db.spins.length,
      spinsLast24h: db.spins.filter((s) => Date.parse(s.createdAt) >= since).length,
      pendingEmails: 0,
    });
  }),

  http.get(`${base}/admin/activity`, ({ request }) => {
    const denied = guard();
    if (denied) return denied;
    const days = Math.min(
      90,
      Math.max(1, Number(new URL(request.url).searchParams.get('days') ?? 30)),
    );
    const dayOf = (iso: string) => iso.slice(0, 10);
    const points = Array.from({ length: days }, (_, i) => {
      const day = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
      return {
        day,
        newUsers: db.users.filter((u) => dayOf(created(u)) === day).length,
        newRaffles: db.raffles.filter((r) => dayOf(r.createdAt) === day).length,
        spins: db.spins.filter((s) => dayOf(s.createdAt) === day).length,
      };
    });
    return ok(points);
  }),

  http.get(`${base}/admin/users`, ({ request }) => {
    const denied = guard();
    if (denied) return denied;
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const orderby = url.searchParams.get('$orderby') ?? 'creationDate';
    const asc = url.searchParams.get('asc') === 'true';
    const list = db.users
      .filter((u) => contains(q, u.email))
      .map(adminUserDto)
      .sort((a, b) => {
        const key = (x: ReturnType<typeof adminUserDto>) =>
          orderby === 'email'
            ? x.email
            : orderby === 'spinCount'
              ? String(x.spinCount).padStart(9, '0')
              : orderby === 'lastActivity'
                ? (x.lastActivityDate?.date ?? '')
                : x.creationDate.date;
        return (asc ? 1 : -1) * key(a).localeCompare(key(b));
      });
    return page(url, list);
  }),

  http.get(`${base}/admin/users/:id`, ({ params }) => {
    const denied = guard();
    if (denied) return denied;
    const user = db.users.find((u) => u.id === params.id);
    return user ? ok(adminUserDto(user)) : fail(404, 'user.not_found');
  }),

  http.post(`${base}/admin/users`, async ({ request }) => {
    const denied = guard();
    if (denied) return denied;
    const body = (await request.json()) as Body;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email) return fail(400, 'field.required', 'email');
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail(400, 'field.format', 'email');
    if (weak(password)) return fail(422, 'password.weak');
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
    persist();
    return ok(adminUserDto(user), 201);
  }),

  http.patch(`${base}/admin/users/:id`, async ({ params, request }) => {
    const denied = guard();
    if (denied) return denied;
    const user = db.users.find((u) => u.id === params.id);
    if (!user) return fail(404, 'user.not_found');
    if (user.role === 'ADMIN') return fail(422, 'admin.protected_account');
    const body = (await request.json()) as Body;
    if (typeof body.email === 'string') {
      const email = body.email.trim().toLowerCase();
      if (db.users.some((u) => u.email === email && u.id !== user.id))
        return fail(409, 'user.email.duplicate');
      user.email = email;
    }
    if (typeof body.password === 'string') {
      if (weak(body.password)) return fail(422, 'password.weak');
      user.password = body.password;
    }
    if (body.language === 'es' || body.language === 'en') user.language = body.language;
    persist();
    return ok(adminUserDto(user));
  }),

  http.delete(`${base}/admin/users/:id`, ({ params }) => {
    const denied = guard();
    if (denied) return denied;
    const user = db.users.find((u) => u.id === params.id);
    if (!user) return fail(404, 'user.not_found');
    if (user.role === 'ADMIN') return fail(422, 'admin.protected_account');
    const raffleIds = new Set(db.raffles.filter((r) => r.ownerId === user.id).map((r) => r.id));
    db.raffles = db.raffles.filter((r) => !raffleIds.has(r.id));
    db.participants = db.participants.filter((p) => !raffleIds.has(p.raffleId));
    db.spins = db.spins.filter((s) => !raffleIds.has(s.raffleId));
    db.users = db.users.filter((u) => u.id !== user.id);
    persist();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/admin/raffles`, ({ request }) => {
    const denied = guard();
    if (denied) return denied;
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const ownerId = url.searchParams.get('ownerId');
    const list = db.raffles
      .filter(
        (r) => (!ownerId || r.ownerId === ownerId) && contains(q, r.name, ownerEmail(r.ownerId)),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((r) => {
        const ps = db.participants.filter((p) => p.raffleId === r.id);
        return {
          id: r.id,
          name: r.name,
          ownerId: r.ownerId,
          ownerEmail: ownerEmail(r.ownerId),
          participantCount: ps.length,
          activeCount: ps.filter((p) => p.active).length,
          spinCount: db.spins.filter((s) => s.raffleId === r.id).length,
          creationDate: date(r.createdAt),
          updateDate: date(r.updatedAt),
        };
      });
    return page(url, list);
  }),

  http.get(`${base}/admin/spins`, ({ request }) => {
    const denied = guard();
    if (denied) return denied;
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const ownerId = url.searchParams.get('ownerId');
    const raffleId = url.searchParams.get('raffleId');
    const asc = url.searchParams.get('asc') === 'true';
    const list = db.spins
      .map((s) => {
        const raffle = db.raffles.find((r) => r.id === s.raffleId);
        return {
          id: s.id,
          round: s.round,
          winnerName: s.winnerName,
          poolSize: s.poolSize,
          emailStatus: 'DISABLED',
          creationDate: date(s.createdAt),
          raffleId: s.raffleId,
          raffleName: raffle?.name ?? '',
          ownerId: raffle?.ownerId ?? '',
          ownerEmail: raffle ? ownerEmail(raffle.ownerId) : '',
        };
      })
      .filter(
        (s) =>
          (!ownerId || s.ownerId === ownerId) &&
          (!raffleId || s.raffleId === raffleId) &&
          contains(q, s.winnerName, s.raffleName, s.ownerEmail),
      )
      .sort((a, b) => (asc ? 1 : -1) * a.creationDate.date.localeCompare(b.creationDate.date));
    return page(url, list);
  }),
];
