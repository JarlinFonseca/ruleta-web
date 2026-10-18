import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Raffle } from '../api/raffle-schemas';

type DeleteRaffleDialogProps = {
  raffle: Raffle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
};

/** HU-12: confirmación con el número de participantes e historial que se perderán. */
export function DeleteRaffleDialog({
  raffle,
  open,
  onOpenChange,
  pending,
  onConfirm,
}: DeleteRaffleDialogProps) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('raffles.delete.title', { name: raffle.name })}
      description={t('raffles.delete.description', {
        participants: raffle.participantCount ?? 0,
        spins: raffle.spinCount ?? 0,
      })}
      confirmLabel={t('raffles.delete.confirm')}
      destructive
      pending={pending}
      onConfirm={onConfirm}
    />
  );
}
