import { create } from 'zustand';
import { secureShuffle } from '@/lib/random/fair-index';

/** RN-07 aplicado al modo prueba (HU-01). */
export const GUEST_NAME_MAX_LENGTH = 60;
/** Igual que RN-08: así la migración a "Mi primer sorteo" (HU-05) nunca supera el máximo. */
export const GUEST_MAX_NAMES = 200;

export type GuestEntry = { id: string; name: string };
export type GuestWinner = { round: number; name: string };

export type AddResult =
  { ok: true; added: number } | { ok: false; reason: 'empty' | 'too_long' | 'limit' };

type GuestState = {
  entries: GuestEntry[];
  winners: GuestWinner[];
  add: (raw: string) => AddResult;
  remove: (id: string) => void;
  shuffle: () => void;
  clear: () => void;
  recordWinner: (name: string) => GuestWinner;
  reset: () => void;
};

let sequence = 0;
const newId = () => `g${++sequence}`;

/** "Ana, Luis, Camila" → ["Ana", "Luis", "Camila"]; ignora entradas vacías. */
export function parseNames(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => s.length > 0);
}

/**
 * Lista del modo prueba: solo en memoria (nunca localStorage). Sobrevive a la navegación interna
 * pero no a recargar (RF-03), y la lee el registro para migrarla (HU-05).
 */
export const useGuestListStore = create<GuestState>()((set, get) => ({
  entries: [],
  winners: [],
  add: (raw) => {
    const names = parseNames(raw);
    if (names.length === 0) return { ok: false, reason: 'empty' };
    if (names.some((n) => n.length > GUEST_NAME_MAX_LENGTH))
      return { ok: false, reason: 'too_long' };
    if (get().entries.length + names.length > GUEST_MAX_NAMES)
      return { ok: false, reason: 'limit' };
    set((s) => ({ entries: [...s.entries, ...names.map((name) => ({ id: newId(), name }))] }));
    return { ok: true, added: names.length };
  },
  remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
  shuffle: () => set((s) => ({ entries: secureShuffle(s.entries) })),
  clear: () => set({ entries: [] }),
  recordWinner: (name) => {
    const winner = { round: get().winners.length + 1, name };
    set((s) => ({ winners: [winner, ...s.winners] }));
    return winner;
  },
  reset: () => set({ entries: [], winners: [] }),
}));

/** HU-05: nombre = primera palabra; apellido = resto (vacío si no hay, marcado para completar). */
export function splitGuestName(name: string): { firstName: string; lastName: string } {
  const [firstName = '', ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}
