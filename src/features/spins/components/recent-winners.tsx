import { useTranslation } from 'react-i18next';
import { formatTime } from '@/lib/i18n/format';
import { currentLanguage } from '@/lib/i18n/i18n';
import { useRecentWinners } from '../api/spin-queries';
import styles from './spins.module.css';

/** HU-21: últimos 5 ganadores en el panel. */
export function RecentWinners({ raffleId }: { raffleId: string }) {
  const { t, i18n } = useTranslation();
  const lang = currentLanguage(i18n);
  const { data } = useRecentWinners(raffleId);
  const items = data?.items ?? [];

  return (
    <section className={styles.recent} aria-labelledby="recent-winners-title">
      <h2 id="recent-winners-title" className={styles.eyebrowTitle}>
        {t('spins.recent.title')}
      </h2>
      {items.length === 0 ? (
        <p className={styles.muted}>{t('spins.recent.empty')}</p>
      ) : (
        <ol className={styles.recentList}>
          {items.map((s) => (
            <li key={s.id} className={styles.recentItem}>
              <span className={styles.recentName}>
                <span className={styles.round}>{s.round}</span>
                {s.winnerName}
              </span>
              <time className={styles.when} dateTime={s.creationDate.date}>
                {formatTime(s.creationDate, lang)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
