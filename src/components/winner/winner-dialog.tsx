import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import styles from './winner-dialog.module.css';

export type WinnerDialogProps = {
  open: boolean;
  onClose: () => void;
  winnerName: string;
  round: number;
  poolSize: number;
  /** Con cuenta: foto o iniciales. En modo prueba no hay foto (null). */
  avatar: { photoUrl: string | null; initials: string } | null;
  /** Con cuenta el giro queda guardado en el historial. */
  saved: boolean;
  onSpinAgain: () => void;
  onRemove: () => void;
  /** El ganador ya no está en la ruleta (quitado a mano o automáticamente, RN-06). */
  removed: boolean;
  removing?: boolean;
  /** HU-25: estado del correo al ganador (null = el sorteo no envía correos o es modo prueba). */
  emailNote?: string | null;
};

/** Revelación del ganador (HU-19, pantallas 01, 03 y 05). */
export function WinnerDialog({
  open,
  onClose,
  winnerName,
  round,
  poolSize,
  avatar,
  saved,
  onSpinAgain,
  onRemove,
  removed,
  removing = false,
  emailNote = null,
}: WinnerDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          {avatar ? (
            <span className={styles.avatarRing}>
              <span className={styles.avatar}>
                {avatar.photoUrl ? (
                  <img src={avatar.photoUrl} alt={t('winner.photoAlt', { name: winnerName })} />
                ) : (
                  <span aria-hidden="true">{avatar.initials}</span>
                )}
              </span>
            </span>
          ) : null}
          <span className={styles.eyebrow}>{t('winner.eyebrow', { round })}</span>
          <Dialog.Title className={styles.name}>{winnerName}</Dialog.Title>
          <p className={styles.note}>
            {t('winner.pool', { count: poolSize })}
            {saved ? ` ${t('winner.saved')}` : ''}
          </p>
          {emailNote ? <p className={styles.email}>{emailNote}</p> : null}
          {removed ? <p className={styles.removed}>{t('winner.removedNote')}</p> : null}
          <div className={styles.actions}>
            <Button variant="primary" size="md" onClick={onSpinAgain}>
              {t('winner.spinAgain')}
            </Button>
            <Button variant="outline" size="md" onClick={onRemove} disabled={removed || removing}>
              {removing ? t('common.working') : t('winner.remove')}
            </Button>
          </div>
          <Dialog.Close asChild>
            <Button variant="ghost">{t('common.close')}</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
