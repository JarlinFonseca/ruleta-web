import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/button';
import { env } from '@/config/env';
import { cn } from '@/utils/cn';
import { fullName } from '@/utils/text';
import { needsLastName, type Participant } from '../api/participant-schemas';
import { ParticipantAvatar } from './participant-avatar';
import styles from './participants.module.css';

type ParticipantsTableProps = {
  rows: { participant: Participant; index: number }[];
  selectedId: string | null;
  onEdit: (p: Participant) => void;
  onDelete: (p: Participant) => void;
  onToggleActive: (p: Participant, active: boolean) => void;
};

/** Pantalla 04: tabla de participantes (HU-13 a HU-16). */
export function ParticipantsTable({
  rows,
  selectedId,
  onEdit,
  onDelete,
  onToggleActive,
}: ParticipantsTableProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">{t('participants.table.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('participants.table.firstName')}</th>
            <th scope="col">{t('participants.table.lastName')}</th>
            {env.enableParticipantEmail ? (
              <th scope="col">{t('participants.table.email')}</th>
            ) : null}
            <th scope="col">{t('participants.table.active')}</th>
            <th scope="col" className={styles.alignEnd}>
              {t('participants.table.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ participant: p, index }) => {
            const name = fullName(p.firstName, p.lastName);
            return (
              <tr
                key={p.id}
                className={cn(
                  selectedId === p.id && styles.rowSelected,
                  !p.active && styles.rowInactive,
                )}
              >
                <td>
                  <span className={styles.nameCell}>
                    <ParticipantAvatar participant={p} index={index} />
                    <span className={styles.firstName}>{p.firstName}</span>
                  </span>
                </td>
                <td>
                  {needsLastName(p) ? (
                    <span className={styles.badgeWarning}>
                      {t('participants.needsLastNameShort')}
                    </span>
                  ) : (
                    p.lastName
                  )}
                </td>
                {env.enableParticipantEmail ? (
                  <td className={p.email ? styles.mail : styles.mailEmpty}>
                    {p.email || t('participants.table.noEmail')}
                  </td>
                ) : null}
                <td>
                  <input
                    type="checkbox"
                    checked={p.active}
                    aria-label={t('participants.table.activeLabel', { name })}
                    onChange={(e) => onToggleActive(p, e.target.checked)}
                  />
                </td>
                <td>
                  <span className={styles.rowActions}>
                    <IconButton
                      label={t('participants.table.edit', { name })}
                      onClick={() => onEdit(p)}
                    >
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
                        <path d="M4 20h4L19 9l-4-4L4 16z" />
                        <path d="M13.5 6.5l4 4" />
                      </svg>
                    </IconButton>
                    <IconButton
                      label={t('participants.table.delete', { name })}
                      tone="danger"
                      onClick={() => onDelete(p)}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                      </svg>
                    </IconButton>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
