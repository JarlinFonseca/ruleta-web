import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { ApiError } from '@/lib/http/api-error';
import { useRequestPasswordReset } from '../api/auth-api';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas/auth-schemas';
import styles from './auth.module.css';

/** HU-09: pedir el enlace. Siempre el mismo mensaje, exista o no el correo. */
export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const { describe } = useErrorHandler();
  const request = useRequestPasswordReset();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await request.mutateAsync(email);
      setSent(true);
    } catch (error) {
      // Para no revelar si el correo existe, solo se muestran errores de límite o de red.
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429
      ) {
        setSent(true);
        return;
      }
      setFormError(describe(error).message);
    }
  });

  if (sent) {
    return (
      <p className={styles.success} role="status">
        {t('auth.forgot.sent')}
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError ? (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      ) : null}
      <TextField
        label={t('auth.fields.email')}
        type="email"
        autoComplete="email"
        placeholder={t('auth.fields.emailPlaceholder')}
        error={errors.email?.message ? t(`auth.validation.${errors.email.message}`) : undefined}
        {...register('email')}
      />
      <Button type="submit" size="lg" block disabled={request.isPending} className={styles.submit}>
        {request.isPending ? t('common.working') : t('auth.forgot.submit')}
      </Button>
    </form>
  );
}
