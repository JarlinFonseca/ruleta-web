import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { SaveStatus } from '@/components/layout/save-status';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { toast } from '@/lib/toast/toast-store';
import {
  useCreateRaffle,
  useDeleteRaffle,
  useRaffle,
  useRaffles,
  useUpdateRaffle,
} from '../api/raffle-queries';
import { MAX_RAFFLES } from '../api/raffle-schemas';
import { DeleteRaffleDialog } from './delete-raffle-dialog';
import { RaffleNameDialog } from './raffle-name-dialog';
import { RaffleSwitcher } from './raffle-switcher';
import styles from './raffle-header.module.css';

type RaffleHeaderProps = {
  raffleId: string;
  /** null = no quedan sorteos (la ruta crea uno vacío). */
  onNavigate: (raffleId: string | null) => void;
  /** Bloqueo durante el giro (RN-04). */
  locked: boolean;
  actions?: ReactNode;
};

/** Cabecera de la pantalla 03: selector, indicador de guardado y acciones del sorteo. */
export function RaffleHeader({ raffleId, onNavigate, locked, actions }: RaffleHeaderProps) {
  const { t } = useTranslation();
  const { notify } = useErrorHandler();
  const { data: raffles = [] } = useRaffles();
  const { data: raffle } = useRaffle(raffleId);
  const create = useCreateRaffle();
  const update = useUpdateRaffle(raffleId);
  const remove = useDeleteRaffle();
  const [dialog, setDialog] = useState<'create' | 'rename' | 'delete' | null>(null);
  const atLimit = raffles.length >= MAX_RAFFLES;

  const name = raffle?.name ?? raffles.find((r) => r.id === raffleId)?.name ?? '';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <RaffleSwitcher
          raffles={raffles}
          currentId={raffleId}
          currentName={name}
          disabled={locked}
          onSelect={(id) => onNavigate(id)}
          onRename={() => setDialog('rename')}
          onDelete={() => setDialog('delete')}
        />
        <SaveStatus raffleId={raffleId} />
      </div>
      <div className={styles.right}>
        {actions}
        <Button
          variant="secondary"
          onClick={() => setDialog('create')}
          disabled={locked || atLimit}
          title={atLimit ? t('raffles.create.limit', { count: MAX_RAFFLES }) : undefined}
        >
          {t('raffles.create.button')}
        </Button>
      </div>

      {dialog === 'create' ? (
        <RaffleNameDialog
          mode="create"
          pending={create.isPending}
          onOpenChange={(open) => !open && setDialog(null)}
          onSubmit={(newName) =>
            create.mutate(newName, {
              onSuccess: (id) => {
                setDialog(null);
                onNavigate(id);
              },
              onError: (error) => notify(error),
            })
          }
        />
      ) : null}

      {dialog === 'rename' ? (
        <RaffleNameDialog
          mode="rename"
          initialName={name}
          pending={update.isPending}
          onOpenChange={(open) => !open && setDialog(null)}
          onSubmit={(newName) =>
            update.mutate(
              { name: newName },
              {
                onSuccess: () => {
                  setDialog(null);
                  toast.success(t('save.saved'));
                },
                onError: (error) => notify(error),
              },
            )
          }
        />
      ) : null}

      {raffle ? (
        <DeleteRaffleDialog
          raffle={raffle}
          open={dialog === 'delete'}
          onOpenChange={(open) => !open && setDialog(null)}
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(raffleId, {
              onSuccess: () => {
                setDialog(null);
                toast.success(t('raffles.delete.done'));
                const next = raffles.find((r) => r.id !== raffleId);
                onNavigate(next?.id ?? null);
              },
              onError: (error) => notify(error),
            })
          }
        />
      ) : null}
    </header>
  );
}
