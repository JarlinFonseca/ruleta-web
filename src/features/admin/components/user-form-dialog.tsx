import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import dialogStyles from '@/components/ui/dialog.module.css';
import fieldStyles from '@/components/ui/field.module.css';
import { PasswordRequirements } from '@/components/ui/password-requirements';
import { TextField } from '@/components/ui/text-field';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useFormApiErrors } from '@/hooks/use-form-api-errors';
import { ApiError } from '@/lib/http/api-error';
import { toast } from '@/lib/toast/toast-store';
import { isStrongPassword } from '@/utils/password';
import { useCreateUser, useUpdateUser, type UpdateUserInput } from '../api/admin-queries';
import type { AdminUser } from '../api/admin-schemas';
import styles from './admin.module.css';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'required')
  .max(254, 'email')
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'email');

const createSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'required').refine(isStrongPassword, 'weak'),
  language: z.enum(['es', 'en']),
});
const editSchema = z.object({
  email: emailSchema,
  password: z.string().refine((v) => v === '' || isStrongPassword(v), 'weak'),
  language: z.enum(['es', 'en']),
});
type FormValues = z.infer<typeof createSchema>;
const FIELDS = ['email', 'password', 'language'] as const;
const KNOWN = ['required', 'email', 'weak'];

type UserFormDialogProps = {
  /** null = crear cuenta. */
  user: AdminUser | null;
  onClose: () => void;
};

/**
 * Crear o editar una cuenta USER. El rol nunca se elige: el registro y el admin solo crean USER
 * (el rol ADMIN se asigna en la base de datos).
 */
export function UserFormDialog({ user, onClose }: UserFormDialogProps) {
  const { t } = useTranslation();
  const { describe } = useErrorHandler();
  const create = useCreateUser();
  const update = useUpdateUser();
  const requirementsId = useId();
  const languageId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = user !== null;
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      email: user?.email ?? '',
      password: '',
      language: user?.language === 'en' ? 'en' : 'es',
    },
  });
  const password = useWatch({ control, name: 'password' });
  const applyFieldErrors = useFormApiErrors(setError, FIELDS);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (!user) {
        await create.mutateAsync(values);
        toast.success(t('admin.users.created', { email: values.email }));
      } else {
        const patch: UpdateUserInput = {};
        if (values.email !== user.email) patch.email = values.email;
        if (values.language !== user.language) patch.language = values.language;
        if (values.password) patch.password = values.password;
        if (Object.keys(patch).length > 0) await update.mutateAsync({ id: user.id, patch });
        toast.success(t('admin.users.updated', { email: values.email }));
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.hasCode('user.email.duplicate')) {
        setError('email', { type: 'server', message: t('admin.users.duplicate') });
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

  const fieldError = (key: keyof FormValues) => {
    const message = errors[key]?.message;
    if (!message) return undefined;
    return KNOWN.includes(message) ? t(`auth.validation.${message}`) : message;
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={dialogStyles.overlay} />
        <Dialog.Content className={dialogStyles.content} aria-describedby={undefined}>
          <Dialog.Title className={dialogStyles.title}>
            {isEdit ? t('admin.users.editTitle') : t('admin.users.createTitle')}
          </Dialog.Title>
          <form className={styles.dialogForm} onSubmit={onSubmit} noValidate>
            {formError ? (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            ) : null}
            <TextField
              label={t('auth.fields.email')}
              type="email"
              autoComplete="off"
              tone="dark"
              error={fieldError('email')}
              {...register('email')}
            />
            <div className={styles.passwordGroup}>
              <TextField
                label={isEdit ? t('admin.users.newPassword') : t('auth.fields.password')}
                labelSuffix={isEdit ? t('common.optional') : undefined}
                type="password"
                autoComplete="new-password"
                tone="dark"
                error={fieldError('password')}
                aria-describedby={requirementsId}
                {...register('password')}
              />
              <PasswordRequirements password={password} id={requirementsId} />
              {isEdit && password ? (
                <p className={styles.warning} role="note">
                  {t('admin.users.passwordWarning')}
                </p>
              ) : null}
            </div>
            <div className={fieldStyles.field}>
              <label htmlFor={languageId} className={fieldStyles.label}>
                {t('admin.users.language')}
              </label>
              <select
                id={languageId}
                className={`${fieldStyles.input} ${fieldStyles.inputDark}`}
                {...register('language')}
              >
                <option value="es">{t('language.es')}</option>
                <option value="en">{t('language.en')}</option>
              </select>
            </div>
            {!isEdit ? <p className={styles.muted}>{t('admin.users.roleNote')}</p> : null}
            <div className={dialogStyles.actions}>
              <Dialog.Close asChild>
                <Button variant="outline" size="md">
                  {t('common.cancel')}
                </Button>
              </Dialog.Close>
              <Button type="submit" size="md" disabled={isSubmitting}>
                {isSubmitting
                  ? t('common.working')
                  : isEdit
                    ? t('common.save')
                    : t('admin.users.createSubmit')}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
