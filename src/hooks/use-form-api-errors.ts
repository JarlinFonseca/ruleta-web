import { useCallback } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/lib/http/api-error';
import { fieldErrorMessage } from '@/lib/http/error-message';

/**
 * Lleva los errores de campo de la API (`400` con `field`) a los campos del formulario.
 * Devuelve true si al menos uno se pudo ubicar en un campo conocido.
 */
export function useFormApiErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  const { t, i18n } = useTranslation();
  return useCallback(
    (error: unknown): boolean => {
      if (!(error instanceof ApiError)) return false;
      let handled = false;
      for (const item of error.fieldErrors) {
        const field = fields.find((f) => f === item.field);
        if (field) {
          setError(field, {
            type: 'server',
            message: fieldErrorMessage(item.code, t, (k) => i18n.exists(k)),
          });
          handled = true;
        }
      }
      return handled;
    },
    [setError, fields, t, i18n],
  );
}
