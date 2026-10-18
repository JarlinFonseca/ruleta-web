import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './page-state.module.css';

/** Estado de página completa: cargando, error o "no encontrado". */
export function PageState({
  title,
  children,
  busy = false,
}: {
  title?: string;
  children?: ReactNode;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.wrap} role={busy ? 'status' : undefined} aria-busy={busy || undefined}>
      {busy ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <p className={styles.title}>{title ?? t('common.loading')}</p>
      {children}
    </div>
  );
}
