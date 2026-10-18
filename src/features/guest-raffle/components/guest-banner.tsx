import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import styles from './guest.module.css';

/** HU-03: aviso permanente de modo prueba con acceso a crear cuenta. */
export function GuestBanner() {
  const { t } = useTranslation();
  return (
    <div className={styles.bannerWrap}>
      <div className={styles.banner}>
        <span className={styles.bannerPill}>{t('guest.banner.pill')}</span>
        <span className={styles.bannerText}>{t('guest.banner.text')}</span>
        <Link to="/acceso?modo=registro" className={styles.bannerLink}>
          {t('guest.banner.cta')}
          <span aria-hidden="true">{' →'}</span>
        </Link>
      </div>
    </div>
  );
}
