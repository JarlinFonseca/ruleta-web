/**
 * Base en memoria del backend simulado (solo `npm run dev:mock`). Se guarda en sessionStorage para
 * que sobreviva a recargar la pestaña; nunca se usa en producción.
 */
export type MockUser = {
  id: string;
  email: string;
  password: string;
  language: 'es' | 'en';
  lastRaffleId: string | null;
  role?: 'USER' | 'ADMIN';
  createdAt?: string;
};
export type MockRaffle = {
  id: string;
  ownerId: string;
  name: string;
  removeWinnerAfterSpin: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type MockParticipant = {
  id: string;
  raffleId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  photoUrl: string | null;
  active: boolean;
  sortOrder: number;
  version: number;
};
export type MockSpin = {
  id: string;
  raffleId: string;
  round: number;
  winnerId: string;
  winnerName: string;
  poolSize: number;
  createdAt: string;
};

type Db = {
  seq: number;
  sessionUserId: string | null;
  users: MockUser[];
  raffles: MockRaffle[];
  participants: MockParticipant[];
  spins: MockSpin[];
};

const KEY = 'ruleta.mock-db';

function load(): Db {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    // Sin almacenamiento: base nueva.
  }
  return { seq: 1000, sessionUserId: null, users: [], raffles: [], participants: [], spins: [] };
}

export const db: Db = load();

/** Administrador de ejemplo para probar /admin en dev:mock (el rol ADMIN solo se asigna en la base). */
export const MOCK_ADMIN = { email: 'admin@ruleta.dev', password: 'Admin1234' };
if (!db.users.some((u) => u.role === 'ADMIN')) {
  db.users.push({
    id: '900',
    email: MOCK_ADMIN.email,
    password: MOCK_ADMIN.password,
    language: 'es',
    lastRaffleId: null,
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
  });
}

export function persist(): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Ignorado en el mock.
  }
}

export function nextId(): string {
  db.seq += 1;
  return String(db.seq);
}
