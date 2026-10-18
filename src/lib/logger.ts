import { env } from '@/config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';
type Data = Record<string, unknown>;

function send(level: Level, event: string, data?: Data): void {
  if (!env.errorReportingUrl || (level !== 'warn' && level !== 'error')) return;
  try {
    const body = JSON.stringify({ level, event, data, at: new Date().toISOString() });
    navigator.sendBeacon(env.errorReportingUrl, body);
  } catch {
    // El reporte de errores nunca debe romper la aplicación.
  }
}

function log(level: Level, event: string, data?: Data): void {
  if (level === 'debug' && !env.isDev) return;
  if (import.meta.env.MODE === 'test' && level !== 'error') return;
  const line = { event, ...data };
  // Nunca se registran contraseñas, cookies, correos completos ni nombres de participantes.
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
  send(level, event, data);
}

export const logger = {
  debug: (event: string, data?: Data) => log('debug', event, data),
  info: (event: string, data?: Data) => log('info', event, data),
  warn: (event: string, data?: Data) => log('warn', event, data),
  error: (event: string, data?: Data) => log('error', event, data),
};
