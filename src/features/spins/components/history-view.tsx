import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { formatDateTime, formatNumber } from '@/lib/i18n/format';
import { currentLanguage } from '@/lib/i18n/i18n';
import { toast } from '@/lib/toast/toast-store';
import { HISTORY_PAGE_SIZE, useClearHistory, useSpinsPage } from '../api/spin-queries';
import styles from './spins.module.css';

type HistoryViewProps = { raffleId: string; raffleName: string; headerActions?: ReactNode };

/** HU-21: historial completo, paginado de 20 en 20, y limpiar historial. */
export function HistoryView({ raffleId, raffleName, headerActions }: HistoryViewProps) {
  const { t, i18n } = useTranslation();
  const lang = currentLanguage(i18n);
  const { notify } = useErrorHandler();
  const [page, setPage] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const { data, isPending, error, refetch, isPlaceholderData } = useSpinsPage(raffleId, page);
  const clear = useClearHistory(raffleId);

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const from = total === 0 ? 0 : page * HISTORY_PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * HISTORY_PAGE_SIZE);

  return (
    <main id="contenido" className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <span className={styles.raffleName}>{raffleName}</span>
          <h1 className={styles.pageTitle}>{t('spins.history.title')}</h1>
        </div>
        <div className={styles.headerActions}>
          {headerActions}
          <Button variant="outline" onClick={() => setConfirmClear(true)} disabled={total === 0}>
            {t('spins.history.clear')}
          </Button>
        </div>
      </div>

      {error ? (
        <div className={styles.stateBox} role="alert">
          <p>{t('errors.loadFailed')}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : isPending ? (
        <p className={styles.muted}>{t('common.loading')}</p>
      ) : total === 0 ? (
        <p className={styles.stateBox}>{t('spins.history.empty')}</p>
      ) : (
        <>
          <div className={styles.tableWrap} aria-busy={isPlaceholderData || undefined}>
            <table className={styles.table}>
              <caption className="visually-hidden">{t('spins.history.caption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('spins.history.round')}</th>
                  <th scope="col">{t('spins.history.winner')}</th>
                  <th scope="col">{t('spins.history.date')}</th>
                  <th scope="col" className={styles.alignEnd}>
                    {t('spins.history.pool')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id}>
                    <td className={styles.roundCell}>{formatNumber(s.round, lang)}</td>
                    <td>{s.winnerName}</td>
                    <td>
                      <time dateTime={s.creationDate.date}>
                        {formatDateTime(s.creationDate, lang)}
                      </time>
                    </td>
                    <td className={styles.alignEnd}>{formatNumber(s.poolSize, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className={styles.pagination} aria-label={t('spins.history.pagination')}>
            <span role="status">
              {t('spins.history.range', {
                from: formatNumber(from, lang),
                to: formatNumber(to, lang),
                total: formatNumber(total, lang),
              })}
            </span>
            <div className={styles.pageButtons}>
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                {t('spins.history.previous')}
              </Button>
              <span className={styles.pageInfo}>
                {t('spins.history.page', { page: page + 1, pages })}
              </span>
              <Button
                variant="secondary"
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= pages}
              >
                {t('spins.history.next')}
              </Button>
            </div>
          </nav>
        </>
      )}

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={t('spins.clearDialog.title')}
        description={t('spins.clearDialog.description', { count: total })}
        confirmLabel={t('spins.clearDialog.confirm')}
        destructive
        pending={clear.isPending}
        onConfirm={() =>
          clear.mutate(undefined, {
            onSuccess: () => {
              setConfirmClear(false);
              setPage(0);
              toast.success(t('spins.clearDialog.done'));
            },
            onError: (e) => notify(e),
          })
        }
      />
    </main>
  );
}
