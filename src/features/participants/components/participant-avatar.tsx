import { initials } from '@/utils/text';
import type { Participant } from '../api/participant-schemas';
import styles from './participants.module.css';

const TONES = [
  'var(--color-seg-1)',
  'var(--color-seg-2)',
  'var(--color-seg-3)',
  'var(--color-seg-4-avatar)',
  'var(--color-seg-5)',
];

/** Foto circular o iniciales (decorativo: el nombre siempre está al lado). */
export function ParticipantAvatar({
  participant,
  index,
  size = 40,
}: {
  participant: Participant;
  index: number;
  size?: number;
}) {
  const text = participant.initials ?? initials(participant.firstName, participant.lastName);
  return (
    <span
      aria-hidden="true"
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        background: participant.photoUrl ? undefined : TONES[index % TONES.length],
      }}
    >
      {participant.photoUrl ? <img src={participant.photoUrl} alt="" loading="lazy" /> : text}
    </span>
  );
}
