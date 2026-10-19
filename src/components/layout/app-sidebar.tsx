import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { cn } from '@/utils/cn';
import { Brand } from './brand';
import styles from './layout.module.css';

type AppSidebarProps = {
  raffleId: string | null;
  email: string;
  photoUrl?: string | null;
  isAdmin?: boolean;
  onLogout: () => void;
  loggingOut: boolean;
};

const icons = {
  raffle: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  ),
  people: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c1-3.5 3.6-5.5 6.5-5.5s5.5 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.8c1.8.7 3 2.5 3.5 5.2" />
    </svg>
  ),
  admin: (
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
      <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  history: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M12 7v5l3 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
};

/** Navegación de la aplicación (pantallas 03 y 04). En móvil pasa a una barra superior. */
export function AppSidebar({
  raffleId,
  email,
  photoUrl = null,
  isAdmin = false,
  onLogout,
  loggingOut,
}: AppSidebarProps) {
  const { t } = useTranslation();
  const base = raffleId ? `/sorteos/${raffleId}` : '/sorteos';
  const links = [
    { to: base, label: t('nav.raffle'), icon: icons.raffle, end: true },
    { to: `${base}/participantes`, label: t('nav.participants'), icon: icons.people, end: false },
    { to: `${base}/historial`, label: t('nav.history'), icon: icons.history, end: false },
    // Solo ADMIN ve el enlace; la ruta y la API vuelven a validar el rol.
    ...(isAdmin ? [{ to: '/admin', label: t('nav.admin'), icon: icons.admin, end: false }] : []),
  ];

  return (
    <nav aria-label={t('nav.main')} className={styles.sidebar}>
      <Brand compact />
      <ul className={styles.sideLinks}>
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.end}
              className={({ isActive }) => cn(styles.sideLink, isActive && styles.sideLinkActive)}
            >
              {link.icon}
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className={styles.accountCard}>
        <NavLink
          to="/cuenta"
          className={({ isActive }) => cn(styles.accountLink, isActive && styles.sideLinkActive)}
        >
          <span className={styles.accountAvatar} aria-hidden="true">
            {photoUrl ? <img src={photoUrl} alt="" /> : email.slice(0, 2).toLocaleUpperCase()}
          </span>
          <span className={styles.accountText}>
            <span className={styles.accountTitle}>{t('nav.account')}</span>
            <span className={styles.accountEmail}>{email}</span>
            {isAdmin ? <span className={styles.adminBadge}>{t('nav.adminBadge')}</span> : null}
          </span>
        </NavLink>
        <button type="button" className={styles.logout} onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? t('common.working') : t('nav.signOut')}
        </button>
      </div>
    </nav>
  );
}
