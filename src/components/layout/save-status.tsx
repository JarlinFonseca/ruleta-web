import { useIsMutating, useMutationState } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { saveMutationKey } from '@/lib/query/save-keys';
import { cn } from '@/utils/cn';
import styles from './layout.module.css';

/**
 * Indicador guardando / guardado / error (RF-24). Observa todas las mutaciones del sorteo que usan
 * `saveMutationKey(raffleId)`, vengan de la feature que vengan.
 */
export function SaveStatus({ raffleId }: { raffleId: string }) {
  const { t } = useTranslation();
  const key = saveMutationKey(raffleId);
  const saving = useIsMutating({ mutationKey: key }) > 0;
  const last = useMutationState({
    filters: { mutationKey: key },
    select: (m) => ({ status: m.state.status, at: m.state.submittedAt }),
  })
    .filter((m) => m.status === 'success' || m.status === 'error')
    .sort((a, b) => b.at - a.at)[0];

  const state = saving ? 'saving' : last?.status === 'error' ? 'error' : 'saved';

  return (
    <span className={styles.saveStatus} role="status">
      <span aria-hidden="true" className={cn(styles.saveDot, styles[`saveDot_${state}`])} />
      {t(`save.${state}`)}
    </span>
  );
}
