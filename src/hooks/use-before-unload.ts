import { useEffect } from 'react';

/** HU-03: el navegador pide confirmación al cerrar o recargar si hay datos que se perderían. */
export function useBeforeUnload(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Requerido por navegadores antiguos; el texto lo pone el navegador.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);
}
