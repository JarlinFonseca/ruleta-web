import { useTranslation } from 'react-i18next';
import { colorIndex, SEGMENT_COLORS } from '@/components/wheel/wheel-geometry';
import { useGuestListStore } from '@/lib/guest/guest-list-store';
import styles from './guest.module.css';

/** HU-02: lista de nombres con la "x" para quitar. Bloqueada durante el giro (RN-04). */
export function GuestNameChips({ locked }: { locked: boolean }) {
  const { t } = useTranslation();
  const entries = useGuestListStore((s) => s.entries);
  const remove = useGuestListStore((s) => s.remove);
  const n = entries.length;

  if (n === 0) return null;

  return (
    <ul className={styles.chips} aria-label={t('guest.list.label')}>
      {entries.map((entry, i) => (
        <li key={entry.id} className={styles.chip}>
          <span
            aria-hidden="true"
            className={styles.chipDot}
            style={{ background: SEGMENT_COLORS[colorIndex(i, n)] }}
          />
          <span className={styles.chipName}>{entry.name}</span>
          <button
            type="button"
            className={styles.chipRemove}
            onClick={() => remove(entry.id)}
            disabled={locked}
            aria-label={t('guest.list.remove', { name: entry.name })}
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
        </li>
      ))}
    </ul>
  );
}
