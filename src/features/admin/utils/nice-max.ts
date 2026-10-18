/** Máximo "redondo" para el eje Y (1, 2, 5 × 10^n). */
export function niceMax(value: number): number {
  if (value <= 4) return 4;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return step * exp;
}
