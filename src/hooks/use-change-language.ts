import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '@/lib/i18n/i18n';
import type { Lang } from '@/lib/i18n/languages';
import { setSessionLanguage, updateMyLanguage, useSession } from '@/lib/session/session';
import { useErrorHandler } from './use-error-handler';

/**
 * HU-27 y HU-28: cambia el idioma sin recargar, lo recuerda en el navegador y, con sesión,
 * lo guarda en el perfil con `PATCH /users/me`.
 */
export function useChangeLanguage() {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const { data: user } = useSession();
  const { notify } = useErrorHandler();

  return useCallback(
    async (lang: Lang) => {
      await setLanguage(lang, i18n);
      if (user && user.language !== lang) {
        setSessionLanguage(queryClient, lang);
        try {
          await updateMyLanguage(lang);
        } catch (error) {
          notify(error);
        }
      }
    },
    [user, queryClient, notify, i18n],
  );
}
