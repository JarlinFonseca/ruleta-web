import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PasswordRequirements } from '@/components/ui/password-requirements';
import { TextField } from '@/components/ui/text-field';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useFormApiErrors } from '@/hooks/use-form-api-errors';
import { useGuestListStore } from '@/lib/guest/guest-list-store';
import { ApiError } from '@/lib/http/api-error';
import { useSignUp, type SignUpResult } from '../api/auth-api';
import { signUpSchema, type SignUpValues } from '../schemas/auth-schemas';
import styles from './auth.module.css';

const FIELDS = ['email', 'password', 'confirm'] as const;

type SignUpFormProps = {
  onSignedUp: (result: SignUpResult) => void;
  onGoToSignIn: () => void;
};

/** HU-06 (registro) con migración del modo prueba (HU-05). */
export function SignUpForm({ onSignedUp, onGoToSignIn }: SignUpFormProps) {
  const { t } = useTranslation();
  const { describe } = useErrorHandler();
  const guestCount = useGuestListStore((s) => s.entries.length);
  const signUp = useSignUp(t('raffles.firstRaffleName'));
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const requirementsId = useId();
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '', confirm: '' },
  });
  const password = useWatch({ control, name: 'password' });
  const applyFieldErrors = useFormApiErrors(setError, FIELDS);

  const onSubmit = handleSubmit(async ({ email, password: pw }) => {
    setFormError(null);
    setDuplicate(false);
    try {
      const result = await signUp.mutateAsync({ email, password: pw });
      onSignedUp(result);
    } catch (error) {
      if (error instanceof ApiError && error.hasCode('user.email.duplicate')) {
        setDuplicate(true);
        return;
      }
      if (error instanceof ApiError && error.hasCode('password.weak')) {
        setError('password', { type: 'server', message: 'weak' });
        return;
      }
      if (applyFieldErrors(error)) return;
      const { message, supportCode } = describe(error);
      setFormError(
        supportCode ? `${message} ${t('errors.supportCode', { code: supportCode })}` : message,
      );
    }
  });

  const fieldError = (key: keyof SignUpValues) => {
    const message = errors[key]?.message;
    if (!message) return undefined;
    return errors[key]?.type === 'server' &&
      !['weak', 'required', 'email', 'mismatch'].includes(message)
      ? message
      : t(`auth.validation.${message}`);
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {duplicate ? (
        <p className={styles.formError} role="alert">
          {t('auth.signUp.duplicate')}{' '}
          <button type="button" className={styles.inlineLink} onClick={onGoToSignIn}>
            {t('auth.signUp.duplicateCta')}
          </button>
        </p>
      ) : null}
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
      <div className={styles.passwordGroup}>
        <TextField
          label={t('auth.fields.password')}
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
      <Button type="submit" size="lg" block disabled={signUp.isPending} className={styles.submit}>
        {signUp.isPending ? t('common.working') : t('auth.signUp.submit')}
      </Button>
      <p className={styles.note}>
        {guestCount > 0
          ? t('auth.signUp.migrationNote', { count: guestCount })
          : t('auth.signUp.firstRaffleNote')}
      </p>
    </form>
  );
}
