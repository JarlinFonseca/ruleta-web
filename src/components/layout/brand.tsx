import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import styles from './layout.module.css';

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      fill="none"
      stroke="#D4B06A"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="17" cy="17" r="15.5" />
      <circle cx="17" cy="17" r="4" />
      <path d="M17 1.5V13M17 21v11.5M1.5 17H13M21 17h11.5M6 6l8.2 8.2M19.8 19.8L28 28M28 6l-8.2 8.2M14.2 19.8L6 28" />
    </svg>
  );
}

export function Brand({ to = '/', compact = false }: { to?: string; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link to={to} className={styles.brand} aria-label={t('brand.homeLabel')}>
      <BrandMark size={compact ? 30 : 34} />
      <span className={compact ? styles.brandTextCompact : styles.brandText}>
        {t('brand.name')}
      </span>
    </Link>
  );
}
