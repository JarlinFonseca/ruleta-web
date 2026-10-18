import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/layout/brand';
import { LanguageSwitch } from '@/components/layout/language-switch';
import styles from './auth.module.css';

const CHECK = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#D4B06A"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12l4 4L19 6" />
  </svg>
);

/** Pantalla 02: panel de marca a la izquierda y formulario a la derecha. */
export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className={styles.shell}>
      <a href="#contenido" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <section className={styles.hero} aria-labelledby="auth-hero-title">
        <div className={styles.heroTop}>
          <Brand />
          <LanguageSwitch />
        </div>
        <div aria-hidden="true" className={styles.heroWheel}>
          <div className={styles.heroWheelDisc} />
        </div>
        <div className={styles.heroCopy}>
          <h1 id="auth-hero-title" className={styles.heroTitle}>
            {t('auth.hero.titleStart')}
            <br />
            <em className={styles.accent}>{t('auth.hero.titleAccent')}</em>
          </h1>
          <ul className={styles.benefits}>
            <li>
              {CHECK}
              {t('auth.hero.benefit1')}
            </li>
            <li>
              {CHECK}
              {t('auth.hero.benefit2')}
            </li>
            <li>
              {CHECK}
              {t('auth.hero.benefit3')}
            </li>
          </ul>
        </div>
        <span className={styles.heroFoot}>{t('auth.hero.fairness')}</span>
      </section>
      <main id="contenido" className={styles.panel}>
        <div className={styles.panelInner}>{children}</div>
      </main>
    </div>
  );
}
