import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import styles from './dialog.module.css';
import { TextField } from './text-field';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  pending?: boolean;
  /** Palabra que hay que escribir para habilitar la confirmación (HU-10: "ELIMINAR"). */
  requireText?: { word: string; label: string };
};

/** Confirmación accesible (alertdialog): foco atrapado, Escape cancela. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
  pending = false,
  requireText,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');
  const canConfirm = !pending && (!requireText || typed.trim() === requireText.word);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped('');
        onOpenChange(next);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.overlay} />
        <AlertDialog.Content className={styles.content}>
          <AlertDialog.Title className={styles.title}>{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className={styles.description}>{description}</div>
          </AlertDialog.Description>
          {requireText ? (
            <TextField
              label={requireText.label}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              tone="dark"
            />
          ) : null}
          <div className={styles.actions}>
            <AlertDialog.Cancel asChild>
              <Button variant="outline" size="md">
                {t('common.cancel')}
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant={destructive ? 'dangerSolid' : 'primary'}
              size="md"
              disabled={!canConfirm}
              aria-busy={pending || undefined}
              onClick={() => void onConfirm()}
            >
              {pending ? t('common.working') : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
