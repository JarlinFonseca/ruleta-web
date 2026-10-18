import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useSession } from '@/lib/session/session';
import { Brand } from './brand';
import { LanguageSwitch } from './language-switch';
import styles from './layout.module.css';

/** Cabecera pública (pantalla 01). */
export function SiteHeader() {
  const { t } = useTranslation();
  const { data: user } = useSession();

  return (
    <header className={styles.siteHeader}>
      <a href="#contenido" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <Brand />
      <nav aria-label={t('nav.public')} className={styles.siteNav}>
        <LanguageSwitch />
        {user ? (
          <Link to="/sorteos" className={styles.pillPrimary}>
            {t('nav.myRaffles')}
          </Link>
        ) : (
          <>
            <Link to="/acceso" className={styles.pillLink}>
              {t('nav.signIn')}
            </Link>
            <Link to="/acceso?modo=registro" className={styles.pillPrimary}>
              {t('nav.signUp')}
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
