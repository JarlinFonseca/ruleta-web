import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { env } from '@/config/env';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useFormApiErrors } from '@/hooks/use-form-api-errors';
import { toast } from '@/lib/toast/toast-store';
import { initials } from '@/utils/text';
import {
  useCreateParticipant,
  useDeletePhoto,
  useUpdateParticipant,
  useUploadPhoto,
  type ParticipantPatch,
} from '../api/participant-queries';
import {
  needsLastName,
  participantFormSchema,
  type Participant,
  type ParticipantFormValues,
} from '../api/participant-schemas';
import { PhotoField } from './photo-field';
import styles from './participants.module.css';

const FIELDS = ['firstName', 'lastName', 'email'] as const;

type ParticipantEditorProps = {
  raffleId: string;
  /** null = alta. */
  participant: Participant | null;
  onClose: () => void;
  /** Alta guardada pero la foto falló: el editor pasa a editar ese participante. */
  onEditCreated: (id: string) => void;
};

/** Panel lateral de la pantalla 04: alta y edición con foto (HU-13, HU-14, HU-15). */
export function ParticipantEditor({
  raffleId,
  participant,
  onClose,
  onEditCreated,
}: ParticipantEditorProps) {
  const { t } = useTranslation();
  const { notify } = useErrorHandler();
  const create = useCreateParticipant(raffleId);
  const update = useUpdateParticipant(raffleId);
  const upload = useUploadPhoto(raffleId);
  const deletePhoto = useDeletePhoto(raffleId);
  const isEdit = participant !== null;

  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const defaults: ParticipantFormValues = {
    firstName: participant?.firstName ?? '',
    lastName: participant?.lastName ?? '',
    email: participant?.email ?? '',
  };
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantFormSchema),
    mode: 'onTouched',
    defaultValues: defaults,
  });
  const applyFieldErrors = useFormApiErrors(setError, FIELDS);
  const [firstName, lastName] = useWatch({ control, name: ['firstName', 'lastName'] });
  useEffect(() => {
    setFocus('firstName');
  }, [setFocus]);

  useEffect(
    () => () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    },
    [pendingPreview],
  );

  const previewUrl = pendingPreview ?? (removePhoto ? null : (participant?.photoUrl ?? null));

  const savePhoto = async (id: string): Promise<boolean> => {
    try {
      if (pendingBlob) await upload.mutateAsync({ id, blob: pendingBlob });
      else if (removePhoto && participant?.photoUrl) await deletePhoto.mutateAsync(id);
      return true;
    } catch (error) {
      setPhotoError(true);
      notify(error, 'participants.photo.uploadFailed');
      return false;
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setPhotoError(false);
    const body = {
      firstName: values.firstName,
      lastName: values.lastName,
      ...(env.enableParticipantEmail ? { email: values.email } : {}),
    };
    try {
      if (!participant) {
        const id = await create.mutateAsync(body);
        if (!(await savePhoto(id))) {
          onEditCreated(id);
          return;
        }
        toast.success(
          t('participants.editor.added', { name: `${values.firstName} ${values.lastName}` }),
        );
        // Alta rápida (HU-13): el formulario queda listo para otro participante.
        reset({ firstName: '', lastName: '', email: '' });
        setPendingBlob(null);
        setPendingPreview(null);
        setTimeout(() => setFocus('firstName'), 0);
        return;
      }
      const patch: ParticipantPatch = {};
      if (body.firstName !== participant.firstName) patch.firstName = body.firstName;
      if (body.lastName !== participant.lastName) patch.lastName = body.lastName;
      if ('email' in body && body.email !== (participant.email ?? '')) patch.email = body.email;
      if (Object.keys(patch).length > 0) await update.mutateAsync({ id: participant.id, patch });
      if (!(await savePhoto(participant.id))) return;
      toast.success(t('save.saved'));
      onClose();
    } catch (error) {
      if (!applyFieldErrors(error)) notify(error);
    }
  });

  const fieldError = (key: keyof ParticipantFormValues) => {
    const message = errors[key]?.message;
    if (!message) return undefined;
    return errors[key]?.type === 'server'
      ? message
      : t(`participants.validation.${message}`, { count: 60 });
  };

  return (
    <aside className={styles.editor} aria-labelledby="participant-editor-title">
      <div className={styles.editorHeader}>
        <h2 id="participant-editor-title" className={styles.editorTitle}>
          {isEdit ? t('participants.editor.editTitle') : t('participants.editor.addTitle')}
        </h2>
        <IconButton
          label={t('participants.editor.close')}
          onClick={onClose}
          className={styles.closeButton}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </IconButton>
      </div>

      {participant && needsLastName(participant) ? (
        <p className={styles.warning} role="note">
          {t('participants.needsLastName')}
        </p>
      ) : null}

      <form className={styles.editorForm} onSubmit={onSubmit} noValidate>
        <PhotoField
          previewUrl={previewUrl}
          initials={initials(firstName, lastName) || '?'}
          disabled={isSubmitting}
          onCropped={(blob) => {
            setPendingBlob(blob);
            setPendingPreview(URL.createObjectURL(blob));
            setRemovePhoto(false);
            setPhotoError(false);
          }}
          onRemove={() => {
            setPendingBlob(null);
            setPendingPreview(null);
            setRemovePhoto(true);
          }}
        />
        {photoError ? (
          <p className={styles.errorText} role="alert">
            {t('participants.photo.uploadFailed')}
          </p>
        ) : null}
        <TextField
          label={t('participants.fields.firstName')}
          autoComplete="off"
          tone="dark"
          error={fieldError('firstName')}
          {...register('firstName')}
        />
        <TextField
          label={t('participants.fields.lastName')}
          autoComplete="off"
          tone="dark"
          error={fieldError('lastName')}
          {...register('lastName')}
        />
        {env.enableParticipantEmail ? (
          <TextField
            label={t('participants.fields.email')}
            labelSuffix={t('common.optional')}
            type="email"
            tone="dark"
            placeholder={t('participants.fields.emailPlaceholder')}
            hint={t('participants.fields.emailHint')}
            error={fieldError('email')}
            {...register('email')}
          />
        ) : null}
        <p className={styles.hint}>{t('participants.editor.enterHint')}</p>
        <div className={styles.editorActions}>
          <Button type="submit" size="md" disabled={isSubmitting} className={styles.grow}>
            {isSubmitting
              ? t('common.working')
              : isEdit
                ? t('participants.editor.save')
                : t('participants.editor.add')}
          </Button>
          <Button variant="outline" size="md" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </aside>
  );
}
