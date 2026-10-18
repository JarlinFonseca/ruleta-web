import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDateTime, formatNumber } from '@/lib/i18n/format';
import { currentLanguage } from '@/lib/i18n/i18n';
import { useAdminRaffles } from '../api/admin-queries';
import type { AdminRaffle } from '../api/admin-schemas';
import {
  EmptyState,
  ErrorState,
  FilterChip,
  Pagination,
  SearchField,
  TableSkeleton,
} from './admin-ui';
import styles from './admin.module.css';

export type OwnerFilter = { id: string; label: string } | null;

type RafflesTabProps = {
  owner: OwnerFilter;
  onOwnerChange: (owner: OwnerFilter) => void;
  onShowSpins: (raffle: AdminRaffle) => void;
};

/** Sorteos de todos los usuarios, con búsqueda y filtro por dueño. */
export function RafflesTab({ owner, onOwnerChange, onShowSpins }: RafflesTabProps) {
  const { t, i18n } = useTranslation();
  const lang = currentLanguage(i18n);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(0);
  const raffles = useAdminRaffles({ q, page, ownerId: owner?.id ?? null });

  return (
    <div className={styles.tabBody}>
      <div className={styles.toolbar}>
        <SearchField
          label={t('admin.raffles.searchLabel')}
          placeholder={t('admin.raffles.searchPlaceholder')}
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
        />
      </div>
      {owner ? (
        <div className={styles.chips} aria-label={t('admin.filters.label')} role="group">
          <FilterChip
            label={t('admin.filters.owner', { email: owner.label })}
            onRemove={() => {
              setPage(0);
              onOwnerChange(null);
            }}
          />
        </div>
      ) : null}

      {raffles.error ? (
        <ErrorState error={raffles.error} onRetry={() => void raffles.refetch()} />
      ) : !raffles.data ? (
        <TableSkeleton columns={8} />
      ) : raffles.data.items.length === 0 ? (
        <EmptyState>{t('admin.raffles.empty')}</EmptyState>
      ) : (
        <>
          <div className={styles.tableWrap} aria-busy={raffles.isPlaceholderData || undefined}>
            <table className={styles.table}>
              <caption className="visually-hidden">{t('admin.raffles.caption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('admin.raffles.columns.name')}</th>
                  <th scope="col">{t('admin.raffles.columns.owner')}</th>
                  <th scope="col" className={styles.num}>
                    {t('admin.raffles.columns.participants')}
                  </th>
                  <th scope="col" className={styles.num}>
                    {t('admin.raffles.columns.active')}
                  </th>
                  <th scope="col" className={styles.num}>
                    {t('admin.raffles.columns.spins')}
                  </th>
                  <th scope="col">{t('admin.raffles.columns.created')}</th>
                  <th scope="col">{t('admin.raffles.columns.updated')}</th>
                  <th scope="col" className={styles.alignEnd}>
                    {t('admin.users.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {raffles.data.items.map((r) => (
                  <tr key={r.id}>
                    <td className={styles.strong}>{r.name}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => {
                          setPage(0);
                          onOwnerChange({ id: r.ownerId, label: r.ownerEmail });
                        }}
                        title={t('admin.raffles.filterByOwner', { email: r.ownerEmail })}
                      >
                        {r.ownerEmail}
                      </button>
                    </td>
                    <td className={styles.num}>{formatNumber(r.participantCount, lang)}</td>
                    <td className={styles.num}>{formatNumber(r.activeCount, lang)}</td>
                    <td className={styles.num}>{formatNumber(r.spinCount, lang)}</td>
                    <td>
                      <time dateTime={r.creationDate.date}>
                        {formatDateTime(r.creationDate, lang)}
                      </time>
                    </td>
                    <td>
                      <time dateTime={r.updateDate.date}>{formatDateTime(r.updateDate, lang)}</time>
                    </td>
                    <td className={styles.alignEnd}>
                      <Button
                        variant="ghost"
                        onClick={() => onShowSpins(r)}
                        aria-label={t('admin.showSpinsFor', { name: r.name })}
                      >
                        {t('admin.showSpins')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={raffles.data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
