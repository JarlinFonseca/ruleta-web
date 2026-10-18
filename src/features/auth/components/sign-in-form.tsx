import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useFormApiErrors } from '@/hooks/use-form-api-errors';
import { ApiError } from '@/lib/http/api-error';
import { useSignIn } from '../api/auth-api';
import { signInSchema, type SignInValues } from '../schemas/auth-schemas';
import styles from './auth.module.css';

const FIELDS = ['email', 'password'] as const;

/** HU-07: iniciar sesión. */
export function SignInForm({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useTranslation();
  const { describe } = useErrorHandler();
  const signIn = useSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), mode: 'onTouched' });
  const applyFieldErrors = useFormApiErrors(setError, FIELDS);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn.mutateAsync(values);
      onSignedIn();
    } catch (error) {
      if (applyFieldErrors(error)) return;
      if (error instanceof ApiError && error.status === 401) {
        setFormError(t('errors.auth.invalid_credentials'));
        return;
      }
      const { message, supportCode } = describe(error);
      setFormError(
        supportCode ? `${message} ${t('errors.supportCode', { code: supportCode })}` : message,
      );
    }
  });

  const fieldError = (key: keyof SignInValues) =>
    errors[key]?.message ? t(`auth.validation.${errors[key]?.message ?? ''}`) : undefined;

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
        error={fieldError('email')}
        {...register('email')}
      />
      <TextField
        label={t('auth.fields.password')}
        type="password"
        autoComplete="current-password"
        placeholder={t('auth.fields.passwordPlaceholder')}
        labelAction={
          <Link to="/recuperar" className={styles.smallLink}>
            {t('auth.signIn.forgot')}
          </Link>
        }
        error={fieldError('password')}
        {...register('password')}
      />
      <Button type="submit" size="lg" block disabled={signIn.isPending} className={styles.submit}>
        {signIn.isPending ? t('common.working') : t('auth.signIn.submit')}
      </Button>
    </form>
  );
}
