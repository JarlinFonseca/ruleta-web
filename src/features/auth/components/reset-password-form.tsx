import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { PasswordRequirements } from '@/components/ui/password-requirements';
import { TextField } from '@/components/ui/text-field';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { ApiError } from '@/lib/http/api-error';
import { useResetPassword } from '../api/auth-api';
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas/auth-schemas';
import styles from './auth.module.css';

/** HU-09: nueva contraseña desde el enlace del correo. */
export function ResetPasswordForm({ token, onDone }: { token: string; onDone: () => void }) {
  const { t } = useTranslation();
  const { describe } = useErrorHandler();
  const reset = useResetPassword(token);
  const [invalidLink, setInvalidLink] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const requirementsId = useId();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { password: '', confirm: '' },
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(async ({ password: pw }) => {
    setFormError(null);
    try {
      await reset.mutateAsync(pw);
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.hasCode('password_reset.invalid_token')) {
        setInvalidLink(true);
        return;
      }
      if (error instanceof ApiError && error.hasCode('password.weak')) {
        setError('password', { type: 'server', message: 'weak' });
        return;
      }
      setFormError(describe(error).message);
    }
  });

  if (invalidLink) {
    return (
      <div className={styles.form}>
        <p className={styles.formError} role="alert">
          {t('errors.password_reset.invalid_token')}
        </p>
        <Link to="/recuperar" className={styles.secondaryLink}>
          {t('auth.reset.requestAnother')}
        </Link>
      </div>
    );
  }

  const fieldError = (key: keyof ResetPasswordValues) =>
    errors[key]?.message ? t(`auth.validation.${errors[key]?.message ?? ''}`) : undefined;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError ? (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      ) : null}
      <div className={styles.passwordGroup}>
        <TextField
          label={t('auth.fields.newPassword')}
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.fields.passwordPlaceholder')}
          error={fieldError('password')}
          aria-describedby={requirementsId}
          {...register('password')}
        />
        <PasswordRequirements password={password} id={requirementsId} />
      </div>
      <TextField
        label={t('auth.fields.confirm')}
        type="password"
        autoComplete="new-password"
        placeholder={t('auth.fields.confirmPlaceholder')}
        error={fieldError('confirm')}
        {...register('confirm')}
      />
      <Button type="submit" size="lg" block disabled={reset.isPending} className={styles.submit}>
        {reset.isPending ? t('common.working') : t('auth.reset.submit')}
      </Button>
    </form>
  );
}
