import { fairIndex, secureShuffle, secureUnitRandom } from './fair-index';

function logGamma(v: number): number {
  const c = [
    76.18009173, -86.50532033, 24.01409824, -1.231739572, 0.001208650974, -0.000005395239385,
  ];
  let y = v;
  const tmp = v + 5.5 - (v + 0.5) * Math.log(v + 5.5);
  let ser = 1.00000000019;
  for (const ci of c) ser += ci / ++y;
  return -tmp + Math.log((2.506628275 * ser) / v);
}

/** p-valor de chi-cuadrado (1 − gamma incompleta regularizada inferior, por serie). */
function chiSquareSurvival(x: number, k: number): number {
  const s = k / 2;
  const z = x / 2;
  let sum = 1 / s;
  let term = 1 / s;
  for (let n = 1; n < 1000; n++) {
    term *= z / (s + n);
    sum += term;
    if (term < sum * 1e-15) break;
  }
  return 1 - Math.exp(-z + s * Math.log(z) - logGamma(s)) * sum;
}

function fakeCrypto(values: number[]): Crypto {
  return {
    getRandomValues: <T extends ArrayBufferView | null>(buf: T): T => {
      (buf as unknown as Uint32Array)[0] = values.shift() ?? 0;
      return buf;
    },
  } as unknown as Crypto;
}

describe('fairIndex', () => {
  it('rechaza n inválidos', () => {
    expect(() => fairIndex(0)).toThrow(RangeError);
    expect(() => fairIndex(1.5)).toThrow(RangeError);
    expect(() => fairIndex(-3)).toThrow(RangeError);
  });

  it('devuelve 0 cuando n = 1', () => {
    expect(fairIndex(1)).toBe(0);
  });

  it('descarta los valores de la zona sesgada (muestreo por rechazo)', () => {
    // n = 3 → limit = 4294967295; el valor 4294967295 se rechaza y se toma el siguiente.
    const values = [4294967295, 7];
    expect(fairIndex(3, fakeCrypto(values))).toBe(7 % 3);
    expect(values).toHaveLength(0);
  });

  it('HU-17: 100000 selecciones con 10 participantes son uniformes (rango y chi-cuadrado)', () => {
    const n = 10;
    const draws = 100_000;
    const counts = new Array<number>(n).fill(0);
    for (let i = 0; i < draws; i++) {
      const idx = fairIndex(n);
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThanOrEqual(9500);
      expect(c).toBeLessThanOrEqual(10500);
    }
    const expected = draws / n;
    const chi2 = counts.reduce((acc, c) => acc + (c - expected) ** 2 / expected, 0);
    expect(chiSquareSurvival(chi2, n - 1)).toBeGreaterThan(0.01);
  });

  it('la función de supervivencia de chi-cuadrado es correcta en valores conocidos', () => {
    // Valor crítico con 9 g.l.: p = 0.01 en 21.666 y p = 0.5 en 8.343.
    expect(chiSquareSurvival(21.666, 9)).toBeCloseTo(0.01, 3);
    expect(chiSquareSurvival(8.343, 9)).toBeCloseTo(0.5, 2);
  });
});

describe('secureUnitRandom', () => {
  it('devuelve valores en [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const v = secureUnitRandom();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('secureShuffle', () => {
  it('conserva los elementos y no muta el original', () => {
    const original = ['Ana', 'Luis', 'Camila', 'Andrés', 'Valentina'];
    const copy = original.slice();
    const shuffled = secureShuffle(original);
    expect(original).toEqual(copy);
    expect(shuffled.slice().sort()).toEqual(copy.slice().sort());
  });
});
