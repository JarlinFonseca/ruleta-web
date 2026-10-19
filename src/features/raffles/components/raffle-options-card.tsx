import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useRaffle, useUpdateRaffle, type RafflePatch } from '../api/raffle-queries';
import styles from './raffles.module.css';

const EMAIL_LANGUAGES = ['es', 'en'] as const;

/**
 * RF-23: "Quitar al ganador después de cada giro". HU-24/HU-29: correo al ganador (solo llega a quien
 * tenga correo) y el idioma de ese correo, independiente del idioma de la interfaz.
 */
export function RaffleOptionsCard({ raffleId, locked }: { raffleId: string; locked: boolean }) {
  const { t } = useTranslation();
  const removeId = useId();
  const emailId = useId();
  const languageId = useId();
  const hintId = useId();
  const { notify } = useErrorHandler();
  const { data: raffle } = useRaffle(raffleId);
  const update = useUpdateRaffle(raffleId);
  const save = (patch: RafflePatch) => update.mutate(patch, { onError: (err) => notify(err) });
  const sendEmail = raffle?.sendWinnerEmail ?? false;
  const disabled = locked || !raffle;

  return (
    <section className={styles.optionsCard} aria-label={t('raffles.options.label')}>
      <label htmlFor={removeId} className={styles.optionRow}>
        <span className={styles.optionText}>{t('raffles.options.removeWinner')}</span>
        <input
          id={removeId}
          type="checkbox"
          checked={raffle?.removeWinnerAfterSpin ?? false}
          disabled={disabled}
          onChange={(e) => save({ removeWinnerAfterSpin: e.target.checked })}
        />
      </label>
      <div className={styles.optionRow}>
        <span className={styles.optionStack}>
          <label htmlFor={emailId} className={styles.optionText}>
            {t('raffles.options.winnerEmail')}
          </label>
          <span id={hintId} className={styles.optionHint}>
            {t('raffles.options.winnerEmailHint')}
          </span>
        </span>
        <input
          id={emailId}
          type="checkbox"
          checked={sendEmail}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={(e) => save({ sendWinnerEmail: e.target.checked })}
        />
      </div>
      {sendEmail ? (
        <div className={styles.optionRow}>
          <label htmlFor={languageId} className={styles.optionText}>
            {t('raffles.options.emailLanguage')}
          </label>
          <select
            id={languageId}
            className={styles.optionSelect}
            value={raffle?.emailLanguage ?? 'es'}
            disabled={disabled}
            onChange={(e) => save({ emailLanguage: e.target.value })}
          >
            {EMAIL_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {t(`raffles.options.languages.${lang}`)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </section>
  );
}
