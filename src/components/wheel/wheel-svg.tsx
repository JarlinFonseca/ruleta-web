import { memo, useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { WheelProps, WheelSegment } from './wheel-types';
import {
  colorIndex,
  indexUnderPointer,
  labelLayout,
  POINTER_READOUT_FROM,
  SEGMENT_COLORS,
  SEGMENT_INKS,
  segmentMid,
  segmentPath,
  segmentStep,
  shouldDrawLabels,
  truncateLabel,
} from './wheel-geometry';
import styles from './wheel.module.css';

const RADIUS = 500;
const AVATAR_RADIUS = 36;
const AVATAR_GAP = 15;
/** HU-22: con más de 40 activos se ocultan las fotos. */
export const MAX_SEGMENTS_WITH_AVATARS = 40;
const BULBS = Array.from({ length: 24 }, (_, i) => i * 15);

type DiscProps = { segments: WheelSegment[]; showAvatars: boolean; clipId: string };

/** Disco con los segmentos. Memoizado: no se vuelve a dibujar durante el giro. */
const WheelDisc = memo(function WheelDisc({ segments, showAvatars, clipId }: DiscProps) {
  const n = segments.length;
  const step = segmentStep(n);
  const avatars = showAvatars && n <= MAX_SEGMENTS_WITH_AVATARS;
  const avatarSpace = avatars ? AVATAR_RADIUS * 2 + AVATAR_GAP : 0;
  const layout = labelLayout(n, RADIUS, avatarSpace);
  const drawLabels = shouldDrawLabels(n, RADIUS, avatarSpace);
  const avatarCx = RADIUS * 0.965 - AVATAR_RADIUS;

  return (
    <svg
      className={styles.svg}
      viewBox={`${-RADIUS} ${-RADIUS} ${RADIUS * 2} ${RADIUS * 2}`}
      aria-hidden="true"
      focusable="false"
    >
      {avatars ? (
        <defs>
          <clipPath id={clipId}>
            <circle cx={avatarCx} cy={0} r={AVATAR_RADIUS - 2} />
          </clipPath>
        </defs>
      ) : null}
      {segments.map((s, i) => (
        <path
          key={s.id}
          d={segmentPath(i, n, RADIUS)}
          style={{ fill: SEGMENT_COLORS[colorIndex(i, n)] }}
        />
      ))}
      {segments.map((s, i) => (
        <line
          key={`d-${s.id}`}
          className={styles.divider}
          x1={0}
          y1={0}
          x2={0}
          y2={-RADIUS}
          transform={`rotate(${i * step})`}
        />
      ))}
      {segments.map((s, i) => {
        const ci = colorIndex(i, n);
        const label = drawLabels ? truncateLabel(s.label, layout.maxChars) : '';
        return (
          <g key={`l-${s.id}`} transform={`rotate(${segmentMid(i, n) - 90})`}>
            {label ? (
              <text
                className={cn(styles.label, ci === 3 && styles.labelOnGold)}
                x={layout.outerRadius}
                y={0}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={layout.fontSize}
                style={{ fill: SEGMENT_INKS[ci] }}
              >
                {label}
              </text>
            ) : null}
            {avatars ? (
              <g transform={`rotate(90 ${avatarCx} 0)`}>
                {s.photoUrl ? (
                  <>
                    <circle className={styles.avatarRing} cx={avatarCx} cy={0} r={AVATAR_RADIUS} />
                    <image
                      href={s.photoUrl}
                      x={avatarCx - AVATAR_RADIUS}
                      y={-AVATAR_RADIUS}
                      width={AVATAR_RADIUS * 2}
                      height={AVATAR_RADIUS * 2}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#${clipId})`}
                    />
                    <circle
                      cx={avatarCx}
                      cy={0}
                      r={AVATAR_RADIUS - 1}
                      fill="none"
                      stroke="#EBD39C"
                      strokeWidth={4}
                    />
                  </>
                ) : (
                  <>
                    <circle
                      className={styles.avatarInitialsBg}
                      cx={avatarCx}
                      cy={0}
                      r={AVATAR_RADIUS}
                    />
                    <text
                      className={styles.avatarInitials}
                      x={avatarCx}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {s.initials}
                    </text>
                  </>
                )}
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
});

type ReadoutProps = {
  segments: WheelSegment[];
  observeAngle: WheelProps['controller']['observeAngle'];
};

/**
 * Nombre del segmento que pasa bajo la flecha, legible aunque haya 200 participantes. Escribe el texto
 * directo en el DOM y solo cuando cambia de segmento: no provoca renders de React durante el giro.
 * Es decorativo (aria-hidden): el ganador se anuncia en la región aria-live.
 */
function PointerReadout({ segments, observeAngle }: ReadoutProps) {
  const textRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let current = -1;
    return observeAngle((deg) => {
      const index = indexUnderPointer(deg, segments.length);
      if (index === current || !textRef.current) return;
      current = index;
      textRef.current.textContent = segments[index]?.label ?? '';
    });
  }, [observeAngle, segments]);
  return (
    <span aria-hidden="true" className={styles.readout} data-testid="wheel-readout">
      <span ref={textRef} className={styles.readoutText} />
    </span>
  );
}

export function WheelSvg({
  segments,
  controller,
  showAvatars,
  disabled,
  onSpinRequest,
  emptyMessage,
  ariaLabel,
  announcement,
}: WheelProps) {
  const { t } = useTranslation();
  const clipId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const hasWheel = segments.length >= 2;
  const { rotorRef, spinning, observeAngle } = controller;
  const showReadout = segments.length >= POINTER_READOUT_FROM;

  return (
    <>
      <div className={styles.stage}>
        <span aria-hidden="true" className={styles.glow} />
        <span aria-hidden="true" className={styles.floorShadow} />
        <span aria-hidden="true" className={styles.edge} />
        <button
          type="button"
          className={styles.hit}
          onClick={onSpinRequest}
          disabled={disabled || spinning}
          aria-label={ariaLabel}
          data-testid="wheel-button"
        >
          <span className={styles.rim}>
            <span className={styles.rimInner}>
              <span className={styles.disc}>
                <span ref={rotorRef} className={styles.rotor}>
                  {hasWheel ? (
                    <WheelDisc
                      segments={segments}
                      showAvatars={showAvatars}
                      clipId={`wheel-clip-${clipId}`}
                    />
                  ) : null}
                </span>
                {hasWheel ? null : <span className={styles.empty}>{emptyMessage}</span>}
              </span>
            </span>
          </span>
          {BULBS.map((deg) => (
            <span
              key={deg}
              aria-hidden="true"
              className={styles.bulbTrack}
              style={{ transform: `rotate(${deg}deg)` }}
            >
              <span className={styles.bulb} />
            </span>
          ))}
          <span aria-hidden="true" className={styles.gloss} />
          <span aria-hidden="true" className={styles.hub}>
            <span className={styles.hubFace}>
              {spinning ? t('wheel.hubSpinning') : t('wheel.hub')}
            </span>
          </span>
        </button>
        <span aria-hidden="true" className={styles.pointer}>
          <svg viewBox="0 0 52 70">
            <defs>
              <linearGradient id={`pin-${clipId}`} x1="0" x2="1">
                <stop offset="0" stopColor="#9C7A3C" />
                <stop offset="0.45" stopColor="#F5E2B0" />
                <stop offset="1" stopColor="#7A5B1E" />
              </linearGradient>
            </defs>
            <path
              d="M26 68 L6 22 A22 22 0 1 1 46 22 Z"
              fill={`url(#pin-${clipId})`}
              stroke="#5C4416"
              strokeWidth="1.5"
            />
            <circle cx="26" cy="22" r="8" fill="#0E0F13" stroke="#EBD39C" strokeWidth="1.5" />
          </svg>
        </span>
        {showReadout ? <PointerReadout segments={segments} observeAngle={observeAngle} /> : null}
      </div>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </>
  );
}
