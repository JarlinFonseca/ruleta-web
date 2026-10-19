import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { isAcceptedPhoto, PHOTO_ACCEPTED_TYPES } from '@/utils/image-file';
import { cn } from '@/utils/cn';
import { PhotoCropDialog } from './photo-crop-dialog';
import styles from './participants.module.css';

type PhotoFieldProps = {
  /** URL a mostrar (foto guardada o vista previa del recorte). */
  previewUrl: string | null;
  initials: string;
  disabled: boolean;
  onCropped: (blob: Blob) => void;
  onRemove: () => void;
  /** Por defecto "Foto (opcional)" y la pista de la ruleta; "Mi cuenta" usa sus propios textos. */
  label?: string;
  hint?: string;
  optional?: boolean;
};

/** HU-15: elegir o arrastrar JPG, PNG o WebP de hasta 2 MB, con vista previa circular. */
export function PhotoField({
  previewUrl,
  initials,
  disabled,
  onCropped,
  onRemove,
  label,
  hint,
  optional = true,
}: PhotoFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!isAcceptedPhoto(file)) {
      setError(t('participants.photo.invalid'));
      return;
    }
    setError(null);
    setSource(URL.createObjectURL(file));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) pick(event.dataTransfer.files[0]);
  };

  return (
    <div className={styles.photoField}>
      <span className={styles.fieldLabel}>
        {label ?? t('participants.photo.label')}
        {optional ? (
          <>
            {' '}
            <span className={styles.optional}>{t('common.optional')}</span>
          </>
        ) : null}
      </span>
      <div
        className={cn(styles.dropzone, dragging && styles.dropzoneActive)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className={styles.photoRing} aria-hidden="true">
          <span className={styles.photoPreview}>
            {previewUrl ? <img src={previewUrl} alt="" /> : <span>{initials}</span>}
          </span>
        </span>
        <div className={styles.photoActions}>
          <div className={styles.photoButtons}>
            <button
              type="button"
              className={styles.photoButton}
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              aria-describedby={hintId}
            >
              {previewUrl ? t('participants.photo.change') : t('participants.photo.choose')}
            </button>
            {previewUrl ? (
              <button
                type="button"
                className={styles.photoRemove}
                onClick={onRemove}
                disabled={disabled}
              >
                {t('participants.photo.remove')}
              </button>
            ) : null}
          </div>
          <span id={hintId} className={styles.hint}>
            {hint ?? t('participants.photo.hint')}
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_ACCEPTED_TYPES.join(',')}
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error ? (
        <span className={styles.errorText} role="alert">
          {error}
        </span>
      ) : null}
      {source ? (
        <PhotoCropDialog
          src={source}
          onCancel={() => setSource(null)}
          onCropped={(blob) => {
            setSource(null);
            onCropped(blob);
          }}
        />
      ) : null}
    </div>
  );
}
