import { useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { GUEST_MAX_NAMES, useGuestListStore } from '@/lib/guest/guest-list-store';
import styles from './guest.module.css';

/** HU-01: agregar uno o varios nombres separados por comas, con Enter o "Agregar". */
export function GuestNameForm({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const add = useGuestListStore((s) => s.add);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    const result = add(draft);
    if (result.ok) {
      setDraft('');
      setError(null);
    } else if (result.reason === 'too_long') {
      setError(t('guest.form.tooLong'));
    } else if (result.reason === 'limit') {
      setError(t('guest.form.limit', { count: GUEST_MAX_NAMES }));
    } else {
      setDraft('');
      setError(null);
    }
    inputRef.current?.focus();
  };

  return (
    <form className={styles.nameForm} onSubmit={submit} noValidate>
      <label htmlFor={`${id}-name`} className={styles.fieldLabel}>
        {t('guest.form.label')}
      </label>
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          id={`${id}-name`}
          type="text"
          className={styles.nameInput}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          placeholder={t('guest.form.placeholder')}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${error ? `${id}-error ` : ''}${id}-hint`}
        />
        <button type="submit" className={styles.addButton} disabled={disabled}>
          {t('guest.form.add')}
        </button>
      </div>
      {error ? (
        <span id={`${id}-error`} className={styles.fieldError} role="alert">
          {error}
        </span>
      ) : null}
      <span id={`${id}-hint`} className={styles.fieldHint}>
        {t('guest.form.hint')}
      </span>
    </form>
  );
}
