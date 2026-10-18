import { useCallback, useState } from 'react';
import type { WheelController } from '@/components/wheel/use-wheel-controller';
import { useGuestListStore, type GuestEntry } from '@/lib/guest/guest-list-store';
import { logger } from '@/lib/logger';
import { fairIndex } from '@/lib/random/fair-index';

export type GuestWinnerReveal = { entry: GuestEntry; round: number; poolSize: number };

/**
 * Giro del modo prueba (HU-04, HU-17): el ganador se elige en el navegador con fairIndex ANTES de
 * animar (RN-02) y nunca se llama al backend.
 */
export function useGuestSpin(controller: WheelController) {
  const recordWinner = useGuestListStore((s) => s.recordWinner);
  const [reveal, setReveal] = useState<GuestWinnerReveal | null>(null);

  const spin = useCallback(async () => {
    const entries = useGuestListStore.getState().entries;
    if (entries.length < 2 || controller.spinning) return;
    setReveal(null);
    const index = fairIndex(entries.length);
    const entry = entries[index];
    if (!entry) return;
    logger.debug('spin.started', { mode: 'guest', poolSize: entries.length });
    await controller.spinTo(index, entries.length);
    const { round } = recordWinner(entry.name);
    logger.debug('spin.completed', { mode: 'guest', round });
    setReveal({ entry, round, poolSize: entries.length });
  }, [controller, recordWinner]);

  const close = useCallback(() => setReveal(null), []);

  return { spin, reveal, close };
}
