import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDateTime, formatNumber } from '@/lib/i18n/format';
import { currentLanguage } from '@/lib/i18n/i18n';
import { useAdminSpins } from '../api/admin-queries';
import {
  EmptyState,
  ErrorState,
  FilterChip,
  Pagination,
  SearchField,
  SortHeader,
  TableSkeleton,
} from './admin-ui';
import styles from './admin.module.css';
import type { OwnerFilter } from './raffles-tab';

export type SpinFilters = { owner: OwnerFilter; raffle: { id: string; label: string } | null };

type SpinsTabProps = {
  filters: SpinFilters;
  onFiltersChange: (filters: SpinFilters) => void;
};

/** Jugadas y ganadores de toda la plataforma. */
export function SpinsTab({ filters, onFiltersChange }: SpinsTabProps) {
  const { t, i18n } = useTranslation();
  const lang = currentLanguage(i18n);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(0);
  const [asc, setAsc] = useState(false);
  const spins = useAdminSpins({
    q,
    page,
    ownerId: filters.owner?.id ?? null,
    raffleId: filters.raffle?.id ?? null,
    asc,
  });

  const emailStatus = (status: string | null | undefined) => {
    const key = `admin.emailStatus.${status ?? 'NONE'}`;
    return i18n.exists(key) ? t(key) : (status ?? t('admin.emailStatus.NONE'));
  };

  return (
    <div className={styles.tabBody}>
      <div className={styles.toolbar}>
        <SearchField
          label={t('admin.spins.searchLabel')}
          placeholder={t('admin.spins.searchPlaceholder')}
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
        />
      </div>
      {filters.owner || filters.raffle ? (
        <div className={styles.chips} role="group" aria-label={t('admin.filters.label')}>
          {filters.owner ? (
            <FilterChip
              label={t('admin.filters.owner', { email: filters.owner.label })}
              onRemove={() => {
                setPage(0);
                onFiltersChange({ ...filters, owner: null });
              }}
            />
          ) : null}
          {filters.raffle ? (
            <FilterChip
              label={t('admin.filters.raffle', { name: filters.raffle.label })}
              onRemove={() => {
                setPage(0);
                onFiltersChange({ ...filters, raffle: null });
              }}
            />
          ) : null}
        </div>
      ) : null}

      {spins.error ? (
        <ErrorState error={spins.error} onRetry={() => void spins.refetch()} />
      ) : !spins.data ? (
        <TableSkeleton columns={7} />
      ) : spins.data.items.length === 0 ? (
        <EmptyState>{t('admin.spins.empty')}</EmptyState>
      ) : (
        <>
          <div className={styles.tableWrap} aria-busy={spins.isPlaceholderData || undefined}>
            <table className={styles.table}>
              <caption className="visually-hidden">{t('admin.spins.caption')}</caption>
              <thead>
                <tr>
                  <SortHeader
                    label={t('admin.spins.columns.date')}
                    active
                    asc={asc}
                    onSort={() => {
                      setPage(0);
                      setAsc((v) => !v);
                    }}
                  />
                  <th scope="col">{t('admin.spins.columns.raffle')}</th>
                  <th scope="col">{t('admin.spins.columns.owner')}</th>
                  <th scope="col" className={styles.num}>
                    {t('admin.spins.columns.round')}
                  </th>
                  <th scope="col">{t('admin.spins.columns.winner')}</th>
                  <th scope="col" className={styles.num}>
                    {t('admin.spins.columns.pool')}
                  </th>
                  <th scope="col">{t('admin.spins.columns.email')}</th>
                </tr>
              </thead>
              <tbody>
                {spins.data.items.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <time dateTime={s.creationDate.date}>
                        {formatDateTime(s.creationDate, lang)}
                      </time>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => {
                          setPage(0);
                          onFiltersChange({
                            ...filters,
                            raffle: { id: s.raffleId, label: s.raffleName },
                          });
                        }}
                        title={t('admin.spins.filterByRaffle', { name: s.raffleName })}
                      >
                        {s.raffleName}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => {
                          setPage(0);
                          onFiltersChange({
                            ...filters,
                            owner: { id: s.ownerId, label: s.ownerEmail },
                          });
                        }}
                        title={t('admin.raffles.filterByOwner', { email: s.ownerEmail })}
                      >
                        {s.ownerEmail}
                      </button>
                    </td>
                    <td className={styles.num}>{formatNumber(s.round, lang)}</td>
                    <td className={styles.strong}>{s.winnerName}</td>
                    <td className={styles.num}>{formatNumber(s.poolSize, lang)}</td>
                    <td>{emailStatus(s.emailStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={spins.data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
