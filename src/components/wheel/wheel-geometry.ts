/**
 * Geometría de la ruleta. Convención: los ángulos se miden en grados, en sentido horario desde
 * arriba (donde está la flecha). El segmento i ocupa [i·paso, (i+1)·paso). Girar la ruleta R grados
 * en sentido horario deja bajo la flecha el ángulo (−R) mod 360 del disco.
 */

export const SEGMENT_COLORS = [
  'var(--color-seg-1)',
  'var(--color-seg-2)',
  'var(--color-seg-3)',
  'var(--color-seg-4)',
  'var(--color-seg-5)',
] as const;

/** El segmento dorado lleva texto oscuro; el resto, marfil. */
export const SEGMENT_INKS = [
  'var(--color-ivory)',
  'var(--color-ivory)',
  'var(--color-ivory)',
  'var(--color-gold-ink)',
  'var(--color-ivory)',
] as const;

/** Desvío visual máximo: ±35 % del segmento (HU-18). Nunca cae sobre una línea divisoria. */
export const JITTER_FRACTION = 0.7;

export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function segmentStep(n: number): number {
  return 360 / n;
}

export function segmentMid(index: number, n: number): number {
  return (index + 0.5) * segmentStep(n);
}

/** Igual que el diseño: el último segmento no repite el color del primero. */
export function colorIndex(index: number, n: number): number {
  let c = index % SEGMENT_COLORS.length;
  if (n > 1 && index === n - 1 && c === 0) c = 2;
  return c;
}

/** Índice del segmento que queda bajo la flecha con la rotación dada. */
export function indexUnderPointer(rotation: number, n: number): number {
  const a = normalizeDeg(-rotation);
  return Math.min(n - 1, Math.floor(a / segmentStep(n)));
}

/** Distancia (en fracción del segmento) entre la flecha y la línea divisoria más cercana. */
export function distanceToDivider(rotation: number, n: number): number {
  const step = segmentStep(n);
  const inside = normalizeDeg(-rotation) % step;
  return Math.min(inside, step - inside) / step;
}

type FinalRotationInput = {
  current: number;
  index: number;
  n: number;
  /** Vueltas completas mínimas desde la posición actual. */
  turns: number;
  /** Número en [0, 1) para el desvío visual. */
  jitterUnit: number;
};

/**
 * HU-18: ángulo final = vueltas × 360 + (360 − ángulo medio del ganador) + desvío de ±35 % del
 * segmento, partiendo de la vuelta actual. Garantiza avanzar al menos `turns` vueltas.
 */
export function finalRotation({
  current,
  index,
  n,
  turns,
  jitterUnit,
}: FinalRotationInput): number {
  if (n < 1 || index < 0 || index >= n) throw new RangeError('index');
  const step = segmentStep(n);
  const jitter = (jitterUnit - 0.5) * step * JITTER_FRACTION;
  const base = current - normalizeDeg(current);
  let target = base + turns * 360 + normalizeDeg(360 - segmentMid(index, n)) + jitter;
  while (target - current < turns * 360) target += 360;
  return target;
}

type BrakeInput = Omit<FinalRotationInput, 'turns'> & {
  /** Velocidad actual en grados por milisegundo. */
  velocity: number;
  durationMs: number;
  minTurns: number;
};

export type BrakePlan = { target: number; power: number };

/** Curva de frenado: p(u) = 1 − (1 − u)^k. Su velocidad inicial es Δ·k/D. */
export function easeOutPower(u: number, power: number): number {
  const t = Math.min(1, Math.max(0, u));
  return 1 - (1 - t) ** power;
}

/**
 * Plan de frenado desde una ruleta que ya gira: elige cuántas vueltas dar para que la velocidad
 * inicial de la curva coincida con la actual (sin tirones) y termine en el ganador.
 */
export function brakePlan({
  current,
  index,
  n,
  jitterUnit,
  velocity,
  durationMs,
  minTurns,
}: BrakeInput): BrakePlan {
  const IDEAL_POWER = 3;
  const nearest = finalRotation({ current, index, n, turns: 0, jitterUnit });
  const idealDistance = (velocity * durationMs) / IDEAL_POWER;
  const extraTurns = Math.max(minTurns, Math.round((idealDistance - (nearest - current)) / 360));
  const target = nearest + extraTurns * 360;
  const distance = target - current;
  const power =
    velocity > 0 ? Math.min(5, Math.max(1.5, (velocity * durationMs) / distance)) : IDEAL_POWER;
  return { target, power };
}

/** Punto en el círculo (centro 0,0) para un ángulo horario desde arriba. */
export function polar(radius: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
}

/** Path SVG del sector circular del segmento i. */
export function segmentPath(index: number, n: number, radius: number): string {
  const step = segmentStep(n);
  const start = polar(radius, index * step);
  const end = polar(radius, (index + 1) * step);
  const largeArc = step > 180 ? 1 : 0;
  return `M0 0 L${start.x.toFixed(3)} ${start.y.toFixed(3)} A${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`;
}

export type LabelLayout = {
  fontSize: number;
  /** Radio donde empieza el texto (lado del centro). */
  innerRadius: number;
  /** Radio donde termina el texto (lado del borde). */
  outerRadius: number;
  maxChars: number;
};

/**
 * Tamaño y espacio del nombre para que no se superponga con los vecinos (HU-18, 200 participantes):
 * el alto de la letra nunca supera el arco disponible en el punto más cercano al centro.
 */
/**
 * Tamaño mínimo (en unidades del viewBox de radio 500) para dibujar nombres en el disco. Por debajo
 * el texto queda de menos de ~8 px en pantalla y deja de leerse: se ocultan y el nombre se muestra
 * grande en el indicador bajo la flecha.
 */
export const MIN_LABEL_FONT = 15;

/** Con más segmentos que esto los nombres se truncan: el indicador bajo la flecha ayuda a seguir el giro. */
export const POINTER_READOUT_FROM = 41;

export function shouldDrawLabels(n: number, radius: number, avatarSpace: number): boolean {
  return labelLayout(n, radius, avatarSpace).fontSize >= MIN_LABEL_FONT;
}

export function labelLayout(n: number, radius: number, avatarSpace: number): LabelLayout {
  const base = n <= 10 ? 30 : n <= 16 ? 26 : n <= 24 ? 22 : 19;
  const arcAt = (r: number) => (2 * Math.PI * r) / n;
  const fontSize = Math.max(7, Math.min(base, arcAt(radius * 0.62) * 0.75));
  const hubClearance = radius * 0.19;
  const innerRadius = Math.max(hubClearance, (fontSize / 0.75) * (n / (2 * Math.PI)));
  const outerRadius = radius * (avatarSpace > 0 ? 0.965 : 0.93) - avatarSpace;
  const charWidth = fontSize * 0.6;
  const maxChars = Math.max(0, Math.floor((outerRadius - innerRadius) / charWidth));
  return { fontSize, innerRadius, outerRadius, maxChars };
}

export function truncateLabel(label: string, maxChars: number): string {
  if (maxChars <= 0) return '';
  const chars = Array.from(label);
  if (chars.length <= maxChars) return label;
  if (maxChars === 1) return '…';
  return `${chars
    .slice(0, maxChars - 1)
    .join('')
    .trimEnd()}…`;
}
