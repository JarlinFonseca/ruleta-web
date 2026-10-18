import { useTranslation } from 'react-i18next';
import { useChangeLanguage } from '@/hooks/use-change-language';
import { currentLanguage } from '@/lib/i18n/i18n';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/languages';
import { cn } from '@/utils/cn';
import styles from './layout.module.css';

/** Selector ES/EN visible en todas las pantallas (RF-60). */
export function LanguageSwitch({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const active = currentLanguage(i18n);
  const change = useChangeLanguage();

  return (
    <div
      role="group"
      aria-label={t('language.groupLabel')}
      className={cn(styles.langSwitch, className)}
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          aria-pressed={active === lang}
          title={t(`language.${lang}`)}
          className={styles.langButton}
          onClick={() => void change(lang)}
        >
          {t(`language.short.${lang}`)}
          <span className="visually-hidden">
            {t('language.inParens', { name: t(`language.${lang}`) })}
          </span>
        </button>
      ))}
    </div>
  );
}
