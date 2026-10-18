import { useTranslation } from 'react-i18next';
import { passwordChecks } from '@/utils/password';
import styles from './password-requirements.module.css';

/** HU-06: requisitos de RN-09 en tiempo real. */
export function PasswordRequirements({ password, id }: { password: string; id: string }) {
  const { t } = useTranslation();
  const checks = passwordChecks(password);
  const items = [
    { key: 'length', ok: checks.length, label: t('auth.requirements.length') },
    { key: 'letter', ok: checks.letter, label: t('auth.requirements.letter') },
    { key: 'number', ok: checks.number, label: t('auth.requirements.number') },
  ];

  return (
    <ul id={id} className={styles.requirements} aria-label={t('auth.requirements.title')}>
      {items.map((item) => (
        <li key={item.key} className={item.ok ? styles.reqOk : styles.reqPending}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {item.ok ? <path d="M5 12l4 4L19 6" /> : <circle cx="12" cy="12" r="4" />}
          </svg>
          {item.label}
          <span className="visually-hidden">
            {item.ok ? t('auth.requirements.met') : t('auth.requirements.pending')}
          </span>
        </li>
      ))}
    </ul>
  );
}
