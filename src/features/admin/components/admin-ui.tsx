import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { formatNumber } from '@/lib/i18n/format';
import { currentLanguage } from '@/lib/i18n/i18n';
import { cn } from '@/utils/cn';
import { ADMIN_PAGE_SIZE } from '../api/admin-schemas';
import styles from './admin.module.css';

/** Campo de búsqueda con etiqueta accesible (el debounce lo aplica quien consulta). */
export function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className={styles.searchBox}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8F897C"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        id={id}
        type="search"
        className={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Paginación de 20 en 20 con `$total`. */
export function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = currentLanguage(i18n);
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const from = total === 0 ? 0 : page * ADMIN_PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * ADMIN_PAGE_SIZE);
  return (
    <nav className={styles.pagination} aria-label={t('admin.pagination.label')}>
      <span role="status">
        {t('admin.pagination.range', {
          from: formatNumber(from, lang),
          to: formatNumber(to, lang),
          total: formatNumber(total, lang),
        })}
      </span>
      <div className={styles.pageButtons}>
        <Button variant="secondary" onClick={() => onPage(page - 1)} disabled={page === 0}>
          {t('admin.pagination.previous')}
        </Button>
        <span className={styles.pageInfo}>
          {t('admin.pagination.page', { page: page + 1, pages })}
        </span>
        <Button variant="secondary" onClick={() => onPage(page + 1)} disabled={page + 1 >= pages}>
          {t('admin.pagination.next')}
        </Button>
      </div>
    </nav>
  );
}

/** Encabezado de columna ordenable con `aria-sort`. */
export function SortHeader({
  label,
  active,
  asc,
  onSort,
  className,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onSort: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <th
      scope="col"
      aria-sort={active ? (asc ? 'ascending' : 'descending') : 'none'}
      className={className}
    >
      <button type="button" className={styles.sortButton} onClick={onSort}>
        {label}
        <span aria-hidden="true" className={cn(styles.sortIcon, active && styles.sortIconActive)}>
          {active ? (asc ? '▲' : '▼') : '↕'}
        </span>
        <span className="visually-hidden">{t('admin.sort.hint')}</span>
      </button>
    </th>
  );
}

/** Filas de carga con la forma de la tabla. */
export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  const { t } = useTranslation();
  return (
    <div className={styles.tableWrap} role="status" aria-busy="true">
      <span className="visually-hidden">{t('common.loading')}</span>
      <table className={styles.table} aria-hidden="true">
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }, (_, c) => (
                <td key={c}>
                  <span className={styles.skeleton} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Error de carga con código de soporte (traceId) y reintento. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  const { describe } = useErrorHandler();
  const { message, supportCode } = describe(error);
  return (
    <div className={styles.stateBox} role="alert">
      <p>
        {message}
        {supportCode ? ` ${t('errors.supportCode', { code: supportCode })}` : ''}
      </p>
      <Button variant="outline" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className={styles.stateBox}>{children}</p>;
}

/** Filtro activo como chip quitable. */
export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { t } = useTranslation();
  return (
    <span className={styles.chip}>
      {label}
      <button
        type="button"
        className={styles.chipRemove}
        onClick={onRemove}
        aria-label={t('admin.filters.remove', { label })}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </span>
  );
}

export function RoleBadge({ role }: { role: 'USER' | 'ADMIN' }) {
  const { t } = useTranslation();
  return (
    <span className={cn(styles.badge, role === 'ADMIN' && styles.badgeAdmin)}>
      {t(`admin.roles.${role}`)}
    </span>
  );
}
