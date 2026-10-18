import type { TFunction } from 'i18next';
import { logger } from '@/lib/logger';
import { ApiError, ContractError, supportCode } from './api-error';

export type ErrorDescription = { message: string; supportCode: string | null };

const DEFAULT_LOCK_MINUTES = 15;

/**
 * Texto para el usuario a partir de un error. Nunca se muestra `description` de la API:
 * se traduce `errors.<code>` (§7.1 de la arquitectura del front).
 */
export function describeError(
  error: unknown,
  t: TFunction,
  exists: (key: string) => boolean,
): ErrorDescription {
  if (error instanceof ApiError) {
    if (error.status === 429 || error.code === 'rate_limit.exceeded') {
      const minutes =
        error.retryAfterSeconds !== null
          ? Math.max(1, Math.ceil(error.retryAfterSeconds / 60))
          : DEFAULT_LOCK_MINUTES;
      return { message: t('errors.rate_limit.exceeded', { count: minutes }), supportCode: null };
    }
    const key = `errors.${error.code}`;
    if (error.status > 0 && error.status < 500 && exists(key)) {
      return { message: t(key), supportCode: null };
    }
    if (error.status === 0 && exists(key)) {
      return { message: t(key), supportCode: null };
    }
    if (error.status < 500)
      logger.warn('errors.unknown_code', { code: error.code, status: error.status });
    return { message: t('errors.generic'), supportCode: supportCode(error) };
  }
  if (error instanceof ContractError) {
    return { message: t('errors.generic'), supportCode: null };
  }
  logger.error('errors.unexpected', {
    message: error instanceof Error ? error.message : 'unknown',
  });
  return { message: t('errors.generic'), supportCode: null };
}

/** Mensaje traducido para un error de campo de la API (`400` con `field`). */
export function fieldErrorMessage(
  code: string,
  t: TFunction,
  exists: (key: string) => boolean,
): string {
  const key = `errors.${code}`;
  return exists(key) ? t(key) : t('errors.field.invalid');
}
