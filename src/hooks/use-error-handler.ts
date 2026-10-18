import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { describeError, type ErrorDescription } from '@/lib/http/error-message';
import { toast } from '@/lib/toast/toast-store';

/** Traduce errores y los muestra en un toast con el código de soporte cuando aplica. */
export function useErrorHandler() {
  const { t, i18n } = useTranslation();

  const describe = useCallback(
    (error: unknown): ErrorDescription => describeError(error, t, (key) => i18n.exists(key)),
    [t, i18n],
  );

  const notify = useCallback(
    (error: unknown, fallbackKey?: string) => {
      const { message, supportCode } = describe(error);
      const text = fallbackKey && message === t('errors.generic') ? t(fallbackKey) : message;
      toast.error(text, supportCode);
    },
    [describe, t],
  );

  return { describe, notify };
}
