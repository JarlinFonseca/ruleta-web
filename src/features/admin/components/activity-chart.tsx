import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/i18n/format';
import { currentLanguage } from '@/lib/i18n/i18n';
import { intlLocale } from '@/lib/i18n/languages';
import type { ActivityPoint } from '../api/admin-schemas';
import { niceMax } from '../utils/nice-max';
import styles from './admin.module.css';

/** Series en orden fijo (paleta validada para la superficie oscura: slots 1–3). */
const ACTIVITY_SERIES = [
  { key: 'newUsers', color: 'var(--color-chart-1)' },
  { key: 'newRaffles', color: 'var(--color-chart-2)' },
  { key: 'spins', color: 'var(--color-chart-3)' },
] as const;

const W = 720;
const H = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };

function dayLabel(day: string, locale: string, withYear = false) {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Gráfica de líneas en SVG propio (sin librerías): un solo eje, tres series, leyenda, cruz con
 * tooltip al pasar el cursor y una tabla equivalente para lectores de pantalla.
 */
export function ActivityChart({ points }: { points: ActivityPoint[] }) {
  const { t, i18n } = useTranslation();
  const lang = currentLanguage(i18n);
  const locale = intlLocale(lang);
  const titleId = useId();
  const descId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const n = points.length;
  const max = niceMax(Math.max(0, ...points.flatMap((p) => ACTIVITY_SERIES.map((s) => p[s.key]))));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const xLabels = n > 0 ? [...new Set([0, Math.floor((n - 1) / 2), n - 1])] : [];
  const columnW = n > 1 ? innerW / (n - 1) : innerW;
  const hovered = hover !== null ? points[hover] : undefined;
  const total = (key: (typeof ACTIVITY_SERIES)[number]['key']) =>
    points.reduce((a, p) => a + p[key], 0);

  return (
    <figure className={styles.chartFigure}>
      <ul className={styles.legend}>
        {ACTIVITY_SERIES.map((s) => (
          <li key={s.key}>
            <span
              aria-hidden="true"
              className={styles.legendSwatch}
              style={{ background: s.color }}
            />
            {t(`admin.dashboard.series.${s.key}`)}
            <span className={styles.legendTotal}>{formatNumber(total(s.key), lang)}</span>
          </li>
        ))}
      </ul>
      <div className={styles.chartArea}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={styles.chartSvg}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          onMouseLeave={() => setHover(null)}
        >
          <title id={titleId}>{t('admin.dashboard.chartTitle', { count: n })}</title>
          <desc id={descId}>
            {t('admin.dashboard.chartDesc', {
              users: total('newUsers'),
              raffles: total('newRaffles'),
              spins: total('spins'),
            })}
          </desc>
          {ticks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(v)}
                y2={y(v)}
                className={styles.gridLine}
              />
              <text
                x={PAD.left - 8}
                y={y(v)}
                className={styles.axisText}
                textAnchor="end"
                dominantBaseline="central"
              >
                {formatNumber(v, lang)}
              </text>
            </g>
          ))}
          {xLabels.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              className={styles.axisText}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            >
              {dayLabel(points[i]?.day ?? '', locale)}
            </text>
          ))}
          {ACTIVITY_SERIES.map((s) => (
            <polyline
              key={s.key}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points
                .map((p, i) => `${x(i).toFixed(1)},${y(p[s.key]).toFixed(1)}`)
                .join(' ')}
            />
          ))}
          {hovered && hover !== null ? (
            <g aria-hidden="true">
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                className={styles.crosshair}
              />
              {ACTIVITY_SERIES.map((s) => (
                <circle
                  key={s.key}
                  cx={x(hover)}
                  cy={y(hovered[s.key])}
                  r={4.5}
                  fill={s.color}
                  className={styles.markerRing}
                />
              ))}
            </g>
          ) : null}
          {points.map((p, i) => (
            <rect
              key={p.day}
              x={x(i) - columnW / 2}
              y={PAD.top}
              width={columnW}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
        {hovered && hover !== null ? (
          <div
            className={styles.tooltip}
            style={{
              left: `${(x(hover) / W) * 100}%`,
              transform: `translateX(${hover > n / 2 ? '-105%' : '5%'})`,
            }}
            aria-hidden="true"
          >
            <strong>{dayLabel(hovered.day, locale, true)}</strong>
            {ACTIVITY_SERIES.map((s) => (
              <span key={s.key} className={styles.tooltipRow}>
                <span className={styles.legendSwatch} style={{ background: s.color }} />
                {t(`admin.dashboard.series.${s.key}`)}
                <span className={styles.tooltipValue}>{formatNumber(hovered[s.key], lang)}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <table className="visually-hidden">
        <caption>{t('admin.dashboard.tableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('admin.dashboard.day')}</th>
            {ACTIVITY_SERIES.map((s) => (
              <th key={s.key} scope="col">
                {t(`admin.dashboard.series.${s.key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <th scope="row">{dayLabel(p.day, locale, true)}</th>
              {ACTIVITY_SERIES.map((s) => (
                <td key={s.key}>{formatNumber(p[s.key], lang)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
