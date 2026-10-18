import { intlLocale, type Lang } from './languages';

export type ApiDate = { date: string; utcOffset: string };

/** Fecha y hora con el formato del idioma activo (RF-64). Ej.: "Oct 13, 2026, 6:42 PM". */
export function formatDateTime(value: ApiDate | string, lang: Lang): string {
  const iso = typeof value === 'string' ? value : value.date;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/** Solo la hora (resumen de últimos ganadores). */
export function formatTime(value: ApiDate | string, lang: Lang): string {
  const iso = typeof value === 'string' ? value : value.date;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(lang), { timeStyle: 'short' }).format(date);
}

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(intlLocale(lang)).format(value);
}
