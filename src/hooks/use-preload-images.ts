import { useEffect, useMemo, useState } from 'react';

const loaded = new Set<string>();
const MAX_WAIT_MS = 4000;

/**
 * HU-18: las fotos de la ruleta se precargan antes de habilitar el giro.
 * Si alguna tarda o falla, se habilita igual tras 4 s (se verán las iniciales).
 */
export function usePreloadImages(urls: readonly string[]): boolean {
  const unique = useMemo(() => [...new Set(urls)].sort(), [urls]);
  const key = unique.join('|');
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const allLoaded = unique.every((u) => loaded.has(u));

  useEffect(() => {
    if (allLoaded) return;
    const pending = key.split('|').filter((u) => u && !loaded.has(u));
    let cancelled = false;
    let remaining = pending.length;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0 && !cancelled) setReadyKey(key);
    };
    for (const url of pending) {
      const img = new Image();
      img.onload = () => {
        loaded.add(url);
        done();
      };
      img.onerror = done;
      img.src = url;
    }
    const timer = setTimeout(() => {
      if (!cancelled) setReadyKey(key);
    }, MAX_WAIT_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, allLoaded]);

  return allLoaded || readyKey === key;
}
