import * as Dialog from '@radix-ui/react-dialog';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import dialogStyles from '@/components/ui/dialog.module.css';
import { TextField } from '@/components/ui/text-field';
import { RAFFLE_NAME_MAX, raffleNameSchema } from '../api/raffle-schemas';
import styles from './raffles.module.css';

type RaffleNameDialogProps = {
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'rename';
  initialName?: string;
  pending: boolean;
  onSubmit: (name: string) => void;
};

/**
 * HU-11 (crear) y HU-12 (renombrar). Se monta solo mientras está abierto, así el estado empieza limpio.
 */
export function RaffleNameDialog({
  onOpenChange,
  mode,
  initialName = '',
  pending,
  onSubmit,
}: RaffleNameDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = raffleNameSchema.safeParse(name);
    if (!parsed.success) {
      const code = parsed.error.issues[0]?.message ?? 'required';
      setError(
        code === 'tooLong'
          ? t('raffles.name.tooLong', { count: RAFFLE_NAME_MAX })
          : t('raffles.name.required'),
      );
      return;
    }
    onSubmit(parsed.data);
  };

  return (
    <Dialog.Root open onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={dialogStyles.overlay} />
        <Dialog.Content className={dialogStyles.content} aria-describedby={undefined}>
          <Dialog.Title className={dialogStyles.title}>
            {mode === 'create' ? t('raffles.create.title') : t('raffles.rename.title')}
          </Dialog.Title>
          <form onSubmit={submit} noValidate className={styles.dialogForm}>
            <TextField
              label={t('raffles.name.label')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t('raffles.name.placeholder')}
              autoComplete="off"
              tone="dark"
              error={error ?? undefined}
            />
            <div className={dialogStyles.actions}>
              <Dialog.Close asChild>
                <Button variant="outline" size="md">
                  {t('common.cancel')}
                </Button>
              </Dialog.Close>
              <Button type="submit" size="md" disabled={pending}>
                {pending
                  ? t('common.working')
                  : mode === 'create'
                    ? t('raffles.create.submit')
                    : t('common.save')}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
