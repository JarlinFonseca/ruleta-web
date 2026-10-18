import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import styles from './field.module.css';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Texto adicional junto a la etiqueta, p. ej. "(opcional)". */
  labelSuffix?: string | undefined;
  /** Elemento al lado derecho de la etiqueta (p. ej. "¿La olvidaste?"). */
  labelAction?: ReactNode;
  hint?: string | undefined;
  error?: string | undefined;
  tone?: 'raised' | 'dark';
};

/** Campo accesible: `label`, `aria-invalid` y `aria-describedby` con la ayuda y el error. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    labelSuffix,
    labelAction,
    hint,
    error,
    tone = 'raised',
    id,
    className,
    'aria-describedby': extraDescribedBy,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId, extraDescribedBy].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn(styles.field, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {labelSuffix ? <span className={styles.optional}> {labelSuffix}</span> : null}
        </label>
        {labelAction}
      </div>
      <input
        ref={ref}
        id={inputId}
        className={cn(styles.input, tone === 'dark' && styles.inputDark)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
      {hint ? (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
});
