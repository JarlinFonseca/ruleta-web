import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useRaffle, useUpdateRaffle } from '../api/raffle-queries';
import styles from './raffles.module.css';

/** RF-23: "Quitar al ganador después de cada giro". El correo al ganador llega en R2. */
export function RaffleOptionsCard({ raffleId, locked }: { raffleId: string; locked: boolean }) {
  const { t } = useTranslation();
  const id = useId();
  const { notify } = useErrorHandler();
  const { data: raffle } = useRaffle(raffleId);
  const update = useUpdateRaffle(raffleId);

  return (
    <section className={styles.optionsCard} aria-label={t('raffles.options.label')}>
      <label htmlFor={id} className={styles.optionRow}>
        <span className={styles.optionText}>{t('raffles.options.removeWinner')}</span>
        <input
          id={id}
          type="checkbox"
          checked={raffle?.removeWinnerAfterSpin ?? false}
          disabled={locked || !raffle}
          onChange={(e) =>
            update.mutate(
              { removeWinnerAfterSpin: e.target.checked },
              { onError: (err) => notify(err) },
            )
          }
        />
      </label>
      <div className={styles.optionRow}>
        <span className={styles.optionStack}>
          <span className={styles.optionTextMuted}>{t('raffles.options.winnerEmail')}</span>
          <span className={styles.optionHint}>{t('raffles.options.winnerEmailHint')}</span>
        </span>
        <span className={styles.soonBadge}>{t('raffles.options.soon')}</span>
      </div>
    </section>
  );
}
