/** RF-33: JPG, PNG o WebP de hasta 2 MB. */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PHOTO_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function isAcceptedPhoto(file: File): boolean {
  return (
    (PHOTO_ACCEPTED_TYPES as readonly string[]).includes(file.type) && file.size <= PHOTO_MAX_BYTES
  );
}

export type PixelArea = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image.load'));
    img.src = src;
  });
}

/**
 * Recorte en el cliente (HU-15): cuadrado de 512 px en JPEG. El servidor lo re-codifica a 256×256,
 * le quita los metadatos y lo vuelve a validar.
 */
export async function cropToSquareBlob(src: string, area: PixelArea, size = 512): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas.unavailable');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9),
  );
  if (!blob) throw new Error('canvas.blob');
  return blob;
}
