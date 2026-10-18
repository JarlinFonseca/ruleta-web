import { useTranslation } from 'react-i18next';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { fullName } from '@/utils/text';
import { useSetParticipantActive } from '../api/participant-queries';
import type { Participant } from '../api/participant-schemas';
import { ParticipantAvatar } from './participant-avatar';
import styles from './participants.module.css';

type ActiveToggleListProps = {
  raffleId: string;
  participants: Participant[];
  locked: boolean;
};

/** Pantalla 03, tarjeta "En la ruleta" (HU-16). */
export function ActiveToggleList({ raffleId, participants, locked }: ActiveToggleListProps) {
  const { t } = useTranslation();
  const { notify } = useErrorHandler();
  const setActive = useSetParticipantActive(raffleId);
  const activeCount = participants.filter((p) => p.active).length;

  return (
    <section className={styles.card} aria-labelledby="active-list-title">
      <div className={styles.cardHeader}>
        <h2 id="active-list-title" className={styles.cardTitle}>
          {t('participants.active.title')}
        </h2>
        <span className={styles.count}>
          {t('participants.active.count', { active: activeCount, total: participants.length })}
        </span>
      </div>
      {participants.length === 0 ? (
        <p className={styles.muted}>{t('participants.active.empty')}</p>
      ) : (
        <ul className={styles.toggleList}>
          {participants.map((p, i) => (
            <li key={p.id}>
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={p.active}
                  disabled={locked}
                  onChange={(e) =>
                    setActive.mutate(
                      { id: p.id, active: e.target.checked },
                      { onError: (error) => notify(error) },
                    )
                  }
                />
                <ParticipantAvatar participant={p} index={i} size={32} />
                <span className={p.active ? styles.toggleName : styles.toggleNameOff}>
                  {fullName(p.firstName, p.lastName)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
