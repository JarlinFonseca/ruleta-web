import {
  shouldDrawLabels,
  POINTER_READOUT_FROM,
  brakePlan,
  colorIndex,
  distanceToDivider,
  easeOutPower,
  finalRotation,
  indexUnderPointer,
  labelLayout,
  normalizeDeg,
  segmentPath,
  truncateLabel,
} from './wheel-geometry';

/** Generador determinista para recorrer muchos casos. */
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

describe('finalRotation (HU-18)', () => {
  it('con 10 segmentos y sin desvío deja el centro del ganador bajo la flecha', () => {
    const r = finalRotation({ current: 0, index: 3, n: 10, turns: 7, jitterUnit: 0.5 });
    // 7 vueltas + (360 − 126) = 2754
    expect(r).toBe(2754);
    expect(indexUnderPointer(r, 10)).toBe(3);
    expect(distanceToDivider(r, 10)).toBeCloseTo(0.5);
  });

  it('siempre cae en el ganador, nunca sobre una línea y da al menos las vueltas pedidas', () => {
    const rnd = lcg(42);
    for (let i = 0; i < 5000; i++) {
      const n = 2 + Math.floor(rnd() * 199);
      const index = Math.floor(rnd() * n);
      const current = (rnd() - 0.3) * 20000;
      const turns = 7 + Math.floor(rnd() * 2);
      const r = finalRotation({ current, index, n, turns, jitterUnit: rnd() });
      expect(indexUnderPointer(r, n)).toBe(index);
      // ±35 % del segmento → al menos 15 % de distancia a cada línea divisoria.
      expect(distanceToDivider(r, n)).toBeGreaterThanOrEqual(0.15 - 1e-9);
      const spun = (r - current) / 360;
      expect(spun).toBeGreaterThanOrEqual(turns);
      expect(spun).toBeLessThan(turns + 1.4);
    }
  });

  it('entre 7 y 9 vueltas cuando se piden 7 u 8', () => {
    for (const turns of [7, 8]) {
      for (const jitterUnit of [0, 0.5, 0.999]) {
        const r = finalRotation({ current: 123, index: 0, n: 2, turns, jitterUnit });
        const spun = (r - 123) / 360;
        expect(spun).toBeGreaterThanOrEqual(7);
        expect(spun).toBeLessThan(9.2);
      }
    }
  });

  it('rechaza índices fuera de rango', () => {
    expect(() => finalRotation({ current: 0, index: 5, n: 5, turns: 1, jitterUnit: 0 })).toThrow();
  });
});

describe('brakePlan', () => {
  it('termina en el ganador y adapta la curva a la velocidad', () => {
    const rnd = lcg(7);
    for (let i = 0; i < 2000; i++) {
      const n = 2 + Math.floor(rnd() * 199);
      const index = Math.floor(rnd() * n);
      const current = rnd() * 5000;
      const velocity = 1.8;
      const plan = brakePlan({
        current,
        index,
        n,
        jitterUnit: rnd(),
        velocity,
        durationMs: 4200,
        minTurns: 4,
      });
      expect(indexUnderPointer(plan.target, n)).toBe(index);
      expect(plan.target - current).toBeGreaterThanOrEqual(4 * 360);
      expect(plan.power).toBeGreaterThanOrEqual(1.5);
      expect(plan.power).toBeLessThanOrEqual(5);
    }
  });

  it('sin velocidad usa una curva cúbica', () => {
    const plan = brakePlan({
      current: 0,
      index: 1,
      n: 4,
      jitterUnit: 0.5,
      velocity: 0,
      durationMs: 800,
      minTurns: 0,
    });
    expect(plan.power).toBe(3);
    expect(indexUnderPointer(plan.target, 4)).toBe(1);
  });
});

describe('utilidades', () => {
  it('normalizeDeg', () => {
    expect(normalizeDeg(-90)).toBe(270);
    expect(normalizeDeg(720)).toBe(0);
  });

  it('easeOutPower va de 0 a 1', () => {
    expect(easeOutPower(0, 3)).toBe(0);
    expect(easeOutPower(1, 3)).toBe(1);
    expect(easeOutPower(0.5, 3)).toBeCloseTo(0.875);
  });

  it('el último color no repite el primero', () => {
    expect(colorIndex(5, 6)).toBe(2);
    expect(colorIndex(4, 6)).toBe(4);
  });

  it('segmentPath genera un sector', () => {
    expect(segmentPath(0, 4, 100)).toMatch(/^M0 0 L0\.000 -100\.000 A100 100 0 0 1 100\.000/);
  });

  it('con 200 participantes los nombres no se superponen', () => {
    const layout = labelLayout(200, 500, 0);
    const arcAtInner = (2 * Math.PI * layout.innerRadius) / 200;
    expect(layout.fontSize).toBeLessThanOrEqual(arcAtInner + 1e-9);
    expect(layout.maxChars).toBeGreaterThan(3);
  });

  it('truncateLabel agrega "…"', () => {
    expect(truncateLabel('Valentina Díaz', 6)).toBe('Valen…');
    expect(truncateLabel('Ana', 6)).toBe('Ana');
    expect(truncateLabel('Ana', 0)).toBe('');
  });
});

describe('nombres en el disco con muchos participantes', () => {
  it('dibuja los nombres mientras se leen y los oculta cuando serían diminutos', () => {
    expect(shouldDrawLabels(10, 500, 0)).toBe(true);
    expect(shouldDrawLabels(60, 500, 0)).toBe(true);
    expect(shouldDrawLabels(200, 500, 0)).toBe(false);
  });

  it('el indicador bajo la flecha aparece desde 41 participantes (cuando ya no hay fotos)', () => {
    expect(POINTER_READOUT_FROM).toBe(41);
  });
});
