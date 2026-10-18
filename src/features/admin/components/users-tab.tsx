import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { formatDateTime, formatNumber } from '@/lib/i18n/format';
import { currentLanguage } from '@/lib/i18n/i18n';
import { toast } from '@/lib/toast/toast-store';
import { useAdminUsers, useDeleteUser } from '../api/admin-queries';
import type { AdminUser, UserSortField } from '../api/admin-schemas';
import {
  EmptyState,
  ErrorState,
  Pagination,
  RoleBadge,
  SearchField,
  SortHeader,
  TableSkeleton,
} from './admin-ui';
import styles from './admin.module.css';
import { UserFormDialog } from './user-form-dialog';

type UsersTabProps = {
  /** "Ver jugadas" de un usuario → pestaña Jugadas filtrada. */
  onShowSpins: (user: AdminUser) => void;
};

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'delete'; user: AdminUser }
  | null;

/** Usuarios: histórico con métricas y CRUD de cuentas USER. */
export function UsersTab({ onShowSpins }: UsersTabProps) {
  const { t, i18n } = useTranslation();
  const lang = currentLanguage(i18n);
  const { notify } = useErrorHandler();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ field: UserSortField; asc: boolean }>({
    field: 'creationDate',
    asc: false,
  });
  const [dialog, setDialog] = useState<Dialog>(null);
  const users = useAdminUsers({ q, page, orderby: sort.field, asc: sort.asc });
  const remove = useDeleteUser();

  const sortBy = (field: UserSortField) => {
    setPage(0);
    setSort((s) =>
      s.field === field ? { field, asc: !s.asc } : { field, asc: field === 'email' },
    );
  };
  const header = (field: UserSortField, label: string, className?: string) => (
    <SortHeader
      label={label}
      active={sort.field === field}
      asc={sort.asc}
      onSort={() => sortBy(field)}
      {...(className ? { className } : {})}
    />
  );

  return (
    <div className={styles.tabBody}>
      <div className={styles.toolbar}>
        <SearchField
          label={t('admin.users.searchLabel')}
          placeholder={t('admin.users.searchPlaceholder')}
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
        />
        <Button size="md" onClick={() => setDialog({ kind: 'create' })}>
          {t('admin.users.create')}
        </Button>
      </div>

      {users.error ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : !users.data ? (
        <TableSkeleton columns={9} />
      ) : users.data.items.length === 0 ? (
        <EmptyState>{q ? t('admin.users.noResults') : t('admin.users.empty')}</EmptyState>
      ) : (
        <>
          <div className={styles.tableWrap} aria-busy={users.isPlaceholderData || undefined}>
            <table className={styles.table}>
              <caption className="visually-hidden">{t('admin.users.caption')}</caption>
              <thead>
                <tr>
                  {header('email', t('admin.users.columns.email'))}
                  <th scope="col">{t('admin.users.columns.language')}</th>
                  <th scope="col">{t('admin.users.columns.role')}</th>
                  {header('creationDate', t('admin.users.columns.created'))}
                  <th scope="col" className={styles.num}>
                    {t('admin.users.columns.raffles')}
                  </th>
                  <th scope="col" className={styles.num}>
                    {t('admin.users.columns.participants')}
                  </th>
                  {header('spinCount', t('admin.users.columns.spins'), styles.num)}
                  {header('lastActivity', t('admin.users.columns.lastActivity'))}
                  <th scope="col" className={styles.alignEnd}>
                    {t('admin.users.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((u) => {
                  const isAdmin = u.role === 'ADMIN';
                  return (
                    // La fila es un atajo de ratón; con teclado se usa el botón "Ver jugadas".
                    <tr
                      key={u.id}
                      className={styles.clickableRow}
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('button, a')) onShowSpins(u);
                      }}
                    >
                      <td className={styles.strong}>{u.email}</td>
                      <td>{u.language.toUpperCase()}</td>
                      <td>
                        <RoleBadge role={u.role} />
                      </td>
                      <td>
                        <time dateTime={u.creationDate.date}>
                          {formatDateTime(u.creationDate, lang)}
                        </time>
                      </td>
                      <td className={styles.num}>{formatNumber(u.raffleCount, lang)}</td>
                      <td className={styles.num}>{formatNumber(u.participantCount, lang)}</td>
                      <td className={styles.num}>{formatNumber(u.spinCount, lang)}</td>
                      <td>
                        {u.lastActivityDate ? (
                          <time dateTime={u.lastActivityDate.date}>
                            {formatDateTime(u.lastActivityDate, lang)}
                          </time>
                        ) : (
                          <span className={styles.muted}>{t('admin.users.never')}</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.rowActions}>
                          <Button
                            variant="ghost"
                            onClick={() => onShowSpins(u)}
                            aria-label={t('admin.showSpinsFor', { name: u.email })}
                          >
                            {t('admin.showSpins')}
                          </Button>
                          {isAdmin ? (
                            <span
                              className={styles.protected}
                              title={t('admin.users.protectedHint')}
                            >
                              {t('admin.users.protected')}
                              <span className="visually-hidden">
                                {t('admin.users.protectedHint')}
                              </span>
                            </span>
                          ) : (
                            <>
                              <IconButton
                                label={t('admin.users.edit', { email: u.email })}
                                onClick={() => setDialog({ kind: 'edit', user: u })}
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M4 20h4L19 9l-4-4L4 16z" />
                                  <path d="M13.5 6.5l4 4" />
                                </svg>
                              </IconButton>
                              <IconButton
                                label={t('admin.users.delete', { email: u.email })}
                                tone="danger"
                                onClick={() => setDialog({ kind: 'delete', user: u })}
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  aria-hidden="true"
                                >
                                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                                </svg>
                              </IconButton>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={users.data.total} onPage={setPage} />
        </>
      )}

      {dialog?.kind === 'create' ? (
        <UserFormDialog user={null} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === 'edit' ? (
        <UserFormDialog user={dialog.user} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          title={t('admin.users.deleteTitle', { email: dialog.user.email })}
          description={t('admin.users.deleteText', {
            raffles: dialog.user.raffleCount,
            participants: dialog.user.participantCount,
            spins: dialog.user.spinCount,
          })}
          confirmLabel={t('admin.users.deleteConfirm')}
          destructive
          pending={remove.isPending}
          requireText={{
            word: dialog.user.email,
            label: t('admin.users.deleteType', { email: dialog.user.email }),
          }}
          onConfirm={() =>
            remove.mutate(dialog.user.id, {
              onSuccess: () => {
                toast.success(t('admin.users.deleted', { email: dialog.user.email }));
                setDialog(null);
              },
              onError: (e) => notify(e),
            })
          }
        />
      ) : null}
    </div>
  );
}
