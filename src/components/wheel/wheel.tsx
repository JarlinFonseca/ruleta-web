import type { WheelProps } from './wheel-types';
import { WheelSvg } from './wheel-svg';

/**
 * Punto de entrada de la ruleta. En el MVP siempre dibuja la versión SVG/CSS.
 *
 * Punto de extensión de HU-30 (RF-70): cuando exista `wheel-webgl.tsx`, se cargará con `lazy()` solo si
 * `env.enableWheel3d`, hay WebGL2, el ancho es ≥ 768 px, no hay "reducir movimiento" y hay ≤ 60
 * segmentos; mientras carga y ante cualquier fallo se muestra esta misma versión SVG/CSS. Ambas
 * comparten `WheelProps` y `useWheelController`, así que el ganador y el ángulo final son idénticos.
 */
export function Wheel(props: WheelProps) {
  return <WheelSvg {...props} />;
}
