import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/use-media-query';
import { fairIndex, secureUnitRandom } from '@/lib/random/fair-index';
import { brakePlan, easeOutPower, finalRotation, normalizeDeg } from './wheel-geometry';

/** Duraciones del giro (HU-18): ~5 s en total; < 1 s con "reducir movimiento". */
export const SPIN_TIMING = {
  fullMs: 5000,
  accelerateMs: 600,
  brakeMs: 4400,
  reducedMs: 700,
  stopMs: 1400,
  /** Velocidad de crucero en grados por milisegundo (5 vueltas por segundo). */
  cruiseVelocity: 1.8,
} as const;

export type WheelController = {
  /** Ref de callback para el elemento que gira (conserva el ángulo si se vuelve a montar). */
  rotorRef: (el: HTMLSpanElement | null) => void;
  /** true desde el inicio del giro hasta que la ruleta se detiene (RN-04). */
  spinning: boolean;
  /** Giro con ganador conocido de antemano (modo prueba). */
  spinTo: (index: number, n: number) => Promise<void>;
  /** Arranca el giro libre mientras el servidor decide (con cuenta, §8.2). */
  start: () => void;
  /** Frena hasta el ganador que devolvió el servidor. */
  brakeTo: (index: number, n: number) => Promise<void>;
  /** Frena suave sin ganador (error o timeout). */
  stop: () => Promise<void>;
  /**
   * Escucha el ángulo en cada cuadro sin provocar renders de React (para el indicador bajo la flecha).
   * Llama de inmediato con el ángulo actual. Devuelve la función para dejar de escuchar.
   */
  observeAngle: (listener: (deg: number) => void) => () => void;
};

/**
 * Controla la rotación con requestAnimationFrame y escribe solo `transform` en el elemento que
 * gira: corre en el compositor y no provoca renders de React por cuadro (RNF-08).
 */
export function useWheelController(): WheelController {
  const reducedMotion = useReducedMotion();
  const rotor = useRef<HTMLSpanElement | null>(null);
  const angle = useRef(0);
  const velocity = useRef(0);
  const frame = useRef<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const listeners = useRef(new Set<(deg: number) => void>());

  const apply = useCallback((deg: number) => {
    angle.current = deg;
    const el = rotor.current;
    if (el) el.style.transform = `rotate(${deg}deg)`;
    listeners.current.forEach((listener) => listener(deg));
  }, []);

  const observeAngle = useCallback((listener: (deg: number) => void) => {
    listeners.current.add(listener);
    listener(angle.current);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const cancelFrame = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  useEffect(() => cancelFrame, [cancelFrame]);

  const rotorRef = useCallback((el: HTMLSpanElement | null) => {
    rotor.current = el;
    if (el) el.style.transform = `rotate(${angle.current}deg)`;
  }, []);

  const animateTo = useCallback(
    (target: number, durationMs: number, power: number) =>
      new Promise<void>((resolve) => {
        cancelFrame();
        const from = angle.current;
        const delta = target - from;
        let startedAt: number | null = null;
        const step = (now: number) => {
          startedAt ??= now;
          const u = Math.min(1, (now - startedAt) / durationMs);
          apply(from + delta * easeOutPower(u, power));
          velocity.current = u < 1 ? (delta * power * (1 - u) ** (power - 1)) / durationMs : 0;
          if (u < 1) {
            frame.current = requestAnimationFrame(step);
          } else {
            frame.current = null;
            apply(normalizeDeg(target));
            resolve();
          }
        };
        frame.current = requestAnimationFrame(step);
      }),
    [apply, cancelFrame],
  );

  const finish = useCallback(() => setSpinning(false), []);

  const spinTo = useCallback(
    async (index: number, n: number) => {
      setSpinning(true);
      const turns = reducedMotion ? 0 : 7 + fairIndex(2);
      const target = finalRotation({
        current: angle.current,
        index,
        n,
        turns,
        jitterUnit: secureUnitRandom(),
      });
      await animateTo(target, reducedMotion ? SPIN_TIMING.reducedMs : SPIN_TIMING.fullMs, 3);
      finish();
    },
    [animateTo, finish, reducedMotion],
  );

  const start = useCallback(() => {
    setSpinning(true);
    if (reducedMotion) return;
    cancelFrame();
    let startedAt: number | null = null;
    let last: number | null = null;
    const step = (now: number) => {
      startedAt ??= now;
      const dt = last === null ? 0 : now - last;
      last = now;
      const ramp = Math.min(1, (now - startedAt) / SPIN_TIMING.accelerateMs);
      velocity.current = SPIN_TIMING.cruiseVelocity * ramp * ramp;
      apply(angle.current + velocity.current * dt);
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [apply, cancelFrame, reducedMotion]);

  const brakeTo = useCallback(
    async (index: number, n: number) => {
      setSpinning(true);
      if (reducedMotion || velocity.current <= 0) {
        const turns = reducedMotion ? 0 : 7;
        const target = finalRotation({
          current: angle.current,
          index,
          n,
          turns,
          jitterUnit: secureUnitRandom(),
        });
        await animateTo(target, reducedMotion ? SPIN_TIMING.reducedMs : SPIN_TIMING.fullMs, 3);
      } else {
        const plan = brakePlan({
          current: angle.current,
          index,
          n,
          jitterUnit: secureUnitRandom(),
          velocity: velocity.current,
          durationMs: SPIN_TIMING.brakeMs,
          minTurns: 4,
        });
        await animateTo(plan.target, SPIN_TIMING.brakeMs, plan.power);
      }
      finish();
    },
    [animateTo, finish, reducedMotion],
  );

  const stop = useCallback(async () => {
    if (velocity.current > 0) {
      const distance = (velocity.current * SPIN_TIMING.stopMs) / 3;
      await animateTo(angle.current + distance, SPIN_TIMING.stopMs, 3);
    } else {
      cancelFrame();
    }
    finish();
  }, [animateTo, cancelFrame, finish]);

  return useMemo(
    () => ({ rotorRef, spinning, spinTo, start, brakeTo, stop, observeAngle }),
    [rotorRef, spinning, spinTo, start, brakeTo, stop, observeAngle],
  );
}
