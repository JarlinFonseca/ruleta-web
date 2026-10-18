import type { WheelController } from './use-wheel-controller';

export type WheelSegment = {
  id: string;
  label: string;
  initials: string;
  photoUrl: string | null;
};

/**
 * Una sola API para la ruleta SVG/CSS (MVP) y la WebGL (HU-30). La ruleta es de presentación: no sabe
 * si el ganador viene del servidor o del navegador.
 */
export type WheelProps = {
  segments: WheelSegment[];
  controller: WheelController;
  /** Con cuenta: foto o iniciales al borde (HU-22). En modo prueba, solo nombres. */
  showAvatars: boolean;
  disabled: boolean;
  onSpinRequest: () => void;
  emptyMessage: string;
  ariaLabel: string;
  /** Texto para la región aria-live ("Ganador: …"). */
  announcement: string;
};
