import * as Dialog from '@radix-ui/react-dialog';
import { useId, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import dialogStyles from '@/components/ui/dialog.module.css';
import { cropToSquareBlob } from '@/utils/image-file';
import styles from './participants.module.css';

type PhotoCropDialogProps = {
  src: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
};

/** HU-15: ajustar el encuadre en un círculo antes de subir (recorte en el cliente). */
export function PhotoCropDialog({ src, onCancel, onCropped }: PhotoCropDialogProps) {
  const { t } = useTranslation();
  const zoomId = useId();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

  const confirm = async () => {
    if (!area) return;
    setWorking(true);
    try {
      onCropped(await cropToSquareBlob(src, area));
    } catch {
      setFailed(true);
      setWorking(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className={dialogStyles.overlay} />
        <Dialog.Content className={dialogStyles.content} aria-describedby={undefined}>
          <Dialog.Title className={dialogStyles.title}>
            {t('participants.photo.cropTitle')}
          </Dialog.Title>
          <div className={styles.cropArea}>
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, pixels) => setArea(pixels)}
            />
          </div>
          <label htmlFor={zoomId} className={styles.zoomLabel}>
            {t('participants.photo.zoom')}
            <input
              id={zoomId}
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
          {failed ? (
            <p className={styles.errorText} role="alert">
              {t('participants.photo.invalid')}
            </p>
          ) : null}
          <div className={dialogStyles.actions}>
            <Button variant="outline" size="md" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button size="md" onClick={() => void confirm()} disabled={!area || working}>
              {working ? t('common.working') : t('participants.photo.useCrop')}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
