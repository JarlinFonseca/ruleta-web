import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { onSessionExpired } from '@/lib/http/session-events';
import { setLanguage } from '@/lib/i18n/i18n';
import {
  clearSessionData,
  SESSION_QUERY_KEY,
  sessionLanguage,
  useSession,
  type SessionUser,
} from '@/lib/session/session';
import { toast } from '@/lib/toast/toast-store';

/**
 * Efectos globales de la sesión:
 * - HU-28: al iniciar sesión se aplica el idioma guardado en el perfil.
 * - RNF-02: si la sesión se revoca o no se puede renovar, se limpia la caché y se avisa.
 */
export function SessionEffects() {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const { data: user } = useSession();
  const applied = useRef<string | null>(null);

  useEffect(() => {
    const lang = sessionLanguage(user);
    if (!user || !lang) {
      applied.current = null;
      return;
    }
    const key = `${user.id}:${lang}`;
    if (applied.current === key) return;
    applied.current = key;
    void setLanguage(lang, i18n);
  }, [user, i18n]);

  useEffect(
    () =>
      onSessionExpired(() => {
        const current = queryClient.getQueryData<SessionUser | null>(SESSION_QUERY_KEY);
        if (!current) return;
        clearSessionData(queryClient);
        toast.info(t('auth.sessionExpired'));
      }),
    [queryClient, t],
  );

  return null;
}
