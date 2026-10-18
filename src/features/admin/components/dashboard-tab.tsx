import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime, formatNumber } from '@/lib/i18n/format';
import { currentLanguage } from '@/lib/i18n/i18n';
import { useAdminActivity, useAdminSpins, useAdminSummary } from '../api/admin-queries';
import { ACTIVITY_RANGES, type ActivityRange, type AdminSummary } from '../api/admin-schemas';
import { ActivityChart } from './activity-chart';
import { EmptyState, ErrorState, TableSkeleton } from './admin-ui';
import styles from './admin.module.css';

const KPIS: (keyof AdminSummary)[] = [
  'users',
  'admins',
  'raffles',
  'participants',
  'spins',
  'spinsLast24h',
  'pendingEmails',
];

export function DashboardTab() {
  const { t, i18n } = useTranslation();
  const lang = currentLanguage(i18n);
  const [days, setDays] = useState<ActivityRange>(30);
  const summary = useAdminSummary();
  const activity = useAdminActivity(days);
  const recent = useAdminSpins({
    q: '',
    page: 0,
    ownerId: null,
    raffleId: null,
    asc: false,
    limit: 5,
  });

  return (
    <div className={styles.tabBody}>
      <section aria-labelledby="kpi-title">
        <h2 id="kpi-title" className="visually-hidden">
          {t('admin.dashboard.kpiTitle')}
        </h2>
        {summary.error ? (
          <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        ) : (
          <dl className={styles.kpis}>
            {KPIS.map((key) => (
              <div key={key} className={styles.kpi}>
                <dt>{t(`admin.dashboard.kpi.${key}`)}</dt>
                <dd>
                  {summary.data ? (
                    formatNumber(summary.data[key], lang)
                  ) : (
                    <span className={styles.skeleton} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className={styles.card} aria-labelledby="activity-title">
        <div className={styles.cardHeader}>
          <h2 id="activity-title" className={styles.cardTitle}>
            {t('admin.dashboard.activityTitle')}
          </h2>
          <div
            role="group"
            aria-label={t('admin.dashboard.rangeLabel')}
            className={styles.segmented}
          >
            {ACTIVITY_RANGES.map((r) => (
              <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)}>
                {t('admin.dashboard.rangeDays', { count: r })}
              </button>
            ))}
          </div>
        </div>
        {activity.error ? (
          <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />
        ) : activity.data ? (
          <ActivityChart points={activity.data} />
        ) : (
          <div className={styles.chartPlaceholder} role="status" aria-busy="true">
            <span className="visually-hidden">{t('common.loading')}</span>
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="recent-spins-title">
        <h2 id="recent-spins-title" className={styles.cardTitle}>
          {t('admin.dashboard.recentTitle')}
        </h2>
        {recent.error ? (
          <ErrorState error={recent.error} onRetry={() => void recent.refetch()} />
        ) : !recent.data ? (
          <TableSkeleton columns={3} rows={5} />
        ) : recent.data.items.length === 0 ? (
          <EmptyState>{t('admin.spins.empty')}</EmptyState>
        ) : (
          <ol className={styles.recentList}>
            {recent.data.items.map((s) => (
              <li key={s.id} className={styles.recentItem}>
                <span className={styles.recentMain}>
                  <strong>{s.winnerName}</strong>
                  <span className={styles.muted}>
                    {t('admin.dashboard.recentMeta', {
                      raffle: s.raffleName,
                      owner: s.ownerEmail,
                      round: s.round,
                    })}
                  </span>
                </span>
                <time dateTime={s.creationDate.date} className={styles.muted}>
                  {formatDateTime(s.creationDate, lang)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
