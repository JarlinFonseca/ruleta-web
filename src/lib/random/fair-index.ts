const UINT32_RANGE = 2 ** 32;

/**
 * Índice uniforme en [0, n) con aleatoriedad criptográfica y muestreo por rechazo (RN-01, HU-17).
 * Se descartan los valores que caen en el resto de 2^32 / n para evitar el sesgo del módulo.
 */
export function fairIndex(n: number, source: Crypto = globalThis.crypto): number {
  if (!Number.isInteger(n) || n < 1 || n > UINT32_RANGE) throw new RangeError('n');
  const limit = Math.floor(UINT32_RANGE / n) * n;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    source.getRandomValues(buf);
    x = buf[0] ?? 0;
  } while (x >= limit);
  return x % n;
}

/** Número en [0, 1) con aleatoriedad criptográfica. Solo para efectos visuales (desvío del giro). */
export function secureUnitRandom(source: Crypto = globalThis.crypto): number {
  const buf = new Uint32Array(1);
  source.getRandomValues(buf);
  return (buf[0] ?? 0) / UINT32_RANGE;
}

/** Barajado Fisher-Yates con fairIndex (HU-02). Devuelve una copia. */
export function secureShuffle<T>(items: readonly T[], source: Crypto = globalThis.crypto): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = fairIndex(i + 1, source);
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}
