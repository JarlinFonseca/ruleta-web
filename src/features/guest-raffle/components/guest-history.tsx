import { useTranslation } from 'react-i18next';
import { useGuestListStore } from '@/lib/guest/guest-list-store';
import styles from './guest.module.css';

/** RF-05: ganadores de la sesión, solo en memoria. */
export function GuestHistory() {
  const { t } = useTranslation();
  const winners = useGuestListStore((s) => s.winners);

  return (
    <section className={styles.card} aria-labelledby="guest-history-title">
      <h2 id="guest-history-title" className={styles.eyebrowTitle}>
        {t('guest.history.title')}
      </h2>
      {winners.length === 0 ? (
        <p className={styles.muted}>{t('guest.history.empty')}</p>
      ) : (
        <ol className={styles.historyList}>
          {winners.map((w) => (
            <li key={w.round} className={styles.historyItem}>
              <span className={styles.roundBadge} aria-hidden="true">
                {w.round}
              </span>
              <span className="visually-hidden">
                {t('guest.history.round', { round: w.round })}
              </span>
              <span>{w.name}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
