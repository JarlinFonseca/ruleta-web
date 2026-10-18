import { useTranslation } from 'react-i18next';
import { useToastStore } from '@/lib/toast/toast-store';
import { cn } from '@/utils/cn';
import styles from './toaster.module.css';

/** Avisos globales. Los errores usan role="alert"; el resto, una región polite. */
export function Toaster() {
  const { t } = useTranslation();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className={styles.viewport} aria-live="polite" aria-relevant="additions">
      {toasts.map((item) => (
        <div key={item.id} className={cn(styles.toast, styles[item.kind])}>
          <p className={styles.message}>
            {item.message}
            {item.supportCode ? (
              <span className={styles.code}>
                {' '}
                {t('errors.supportCode', { code: item.supportCode })}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            className={styles.close}
            onClick={() => dismiss(item.id)}
            aria-label={t('common.dismiss')}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
