import { useCallback, useRef, useState } from 'react';
import type { WheelController } from '@/components/wheel/use-wheel-controller';
import type { WheelSegment } from '@/components/wheel/wheel-types';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { logger } from '@/lib/logger';
import { useInvalidateAfterSpin, useSpinMutation } from '../api/spin-queries';
import type { Spin } from '../api/spin-schemas';

/**
 * Giro con cuenta (§8.2 de la arquitectura): la ruleta arranca de inmediato, el servidor decide al
 * ganador con `POST /raffles/{id}/spins` y la ruleta frena hasta `winner.id`.
 * Mientras gira, los segmentos dibujados quedan congelados aunque la lista se refresque.
 */
export function useServerSpin(
  raffleId: string,
  segments: WheelSegment[],
  controller: WheelController,
) {
  const mutation = useSpinMutation(raffleId);
  const invalidate = useInvalidateAfterSpin(raffleId);
  const { notify } = useErrorHandler();
  const [reveal, setReveal] = useState<Spin | null>(null);
  const [frozen, setFrozen] = useState<WheelSegment[] | null>(null);
  const busy = useRef(false);

  const spin = useCallback(async () => {
    if (busy.current || controller.spinning || segments.length < 2) return;
    busy.current = true;
    const drawn = segments;
    setFrozen(drawn);
    setReveal(null);
    controller.start();
    logger.debug('spin.started', { mode: 'server', poolSize: drawn.length });
    try {
      const result = await mutation.mutateAsync();
      const index = drawn.findIndex((s) => s.id === result.winner.id);
      if (index >= 0) {
        await controller.brakeTo(index, drawn.length);
      } else {
        // Otra pestaña cambió la lista: se muestra el ganador sin animación larga.
        logger.warn('spin.winner_not_drawn', { round: result.round });
        await controller.stop();
      }
      logger.debug('spin.completed', { mode: 'server', round: result.round });
      setReveal(result);
    } catch (error) {
      await controller.stop();
      notify(error);
    } finally {
      busy.current = false;
      setFrozen(null);
      invalidate();
    }
  }, [controller, segments, mutation, notify, invalidate]);

  const close = useCallback(() => setReveal(null), []);

  return {
    spin,
    reveal,
    close,
    displayedSegments: frozen ?? segments,
    pending: mutation.isPending,
  };
}
