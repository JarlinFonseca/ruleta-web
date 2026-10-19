import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LanguageSwitch } from '@/components/layout/language-switch';
import { PhotoField } from '@/features/participants/components/photo-field';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useGuestListStore } from '@/lib/guest/guest-list-store';
import { apiRequest } from '@/lib/http/client';
import type { SessionUser } from '@/lib/session/session';
import { toast } from '@/lib/toast/toast-store';
import { useRemoveProfilePhoto, useUploadProfilePhoto } from '../api/profile-photo';
import styles from './account.module.css';

type AccountViewProps = {
  user: SessionUser;
  onSignOut: () => void;
  onDeleted: () => void;
};

/** Mi cuenta: foto de perfil, idioma guardado (HU-28), cerrar sesión (HU-08) y eliminar cuenta (HU-10). */
export function AccountView({ user, onSignOut, onDeleted }: AccountViewProps) {
  const { t } = useTranslation();
  const { notify } = useErrorHandler();
  const [confirm, setConfirm] = useState(false);
  const remove = useMutation({
    mutationFn: async () => {
      await apiRequest('/users/me', { method: 'DELETE' });
    },
  });
  const word = t('account.delete.word');
  const uploadPhoto = useUploadProfilePhoto();
  const removePhoto = useRemoveProfilePhoto();
  const photoBusy = uploadPhoto.isPending || removePhoto.isPending;

  return (
    <main id="contenido" className={styles.page}>
      <h1 className={styles.title}>{t('account.title')}</h1>

      <section className={styles.card} aria-labelledby="account-profile">
        <h2 id="account-profile" className={styles.cardTitle}>
          {t('account.profile.title')}
        </h2>
        <PhotoField
          label={t('account.photo.label')}
          hint={t('account.photo.hint')}
          optional={false}
          previewUrl={user.photoUrl}
          initials={user.email.slice(0, 2).toLocaleUpperCase()}
          disabled={photoBusy}
          onCropped={(blob) =>
            uploadPhoto.mutate(blob, {
              onSuccess: () => toast.success(t('account.photo.saved')),
              onError: (e) => notify(e, 'participants.photo.uploadFailed'),
            })
          }
          onRemove={() =>
            removePhoto.mutate(undefined, {
              onSuccess: () => toast.success(t('account.photo.removed')),
              onError: (e) => notify(e),
            })
          }
        />
        {photoBusy ? (
          <p className={styles.hint} role="status">
            {t('common.working')}
          </p>
        ) : null}
        <dl className={styles.list}>
          <div>
            <dt>{t('account.profile.email')}</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>{t('account.profile.language')}</dt>
            <dd>
              <LanguageSwitch />
              <span className={styles.hint}>{t('account.profile.languageHint')}</span>
            </dd>
          </div>
        </dl>
        <Button variant="outline" onClick={onSignOut} className={styles.fit}>
          {t('nav.signOut')}
        </Button>
      </section>

      <section className={`${styles.card} ${styles.danger}`} aria-labelledby="account-delete">
        <h2 id="account-delete" className={styles.cardTitle}>
          {t('account.delete.title')}
        </h2>
        <p className={styles.text}>{t('account.delete.text')}</p>
        <Button variant="dangerSolid" onClick={() => setConfirm(true)} className={styles.fit}>
          {t('account.delete.button')}
        </Button>
      </section>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t('account.delete.dialogTitle')}
        description={t('account.delete.dialogText', { word })}
        confirmLabel={t('account.delete.confirm')}
        destructive
        pending={remove.isPending}
        requireText={{ word, label: t('account.delete.typeLabel', { word }) }}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              useGuestListStore.getState().reset();
              setConfirm(false);
              onDeleted();
            },
            onError: (e) => notify(e),
          })
        }
      />
    </main>
  );
}
