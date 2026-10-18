export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type Lang = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Lang = 'es';

const STORAGE_KEY = 'ruleta.lang';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** RF-61: si el idioma del navegador empieza por "en" se usa inglés; en cualquier otro caso, español. */
export function languageFromNavigator(languages: readonly string[] | undefined): Lang {
  const first = languages?.[0] ?? '';
  return first.toLowerCase().startsWith('en') ? 'en' : 'es';
}

/** Preferencia del visitante (RF-62). localStorage puede fallar (modo privado, cuota): se ignora. */
export function readStoredLanguage(): Lang | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isLang(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeLanguage(lang: Lang): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Sin almacenamiento disponible: en la próxima visita se vuelve a detectar.
  }
}

export function detectLanguage(): Lang {
  const stored = readStoredLanguage();
  if (stored) return stored;
  const langs =
    typeof navigator === 'undefined'
      ? undefined
      : navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language];
  return languageFromNavigator(langs);
}

/** Etiqueta BCP 47 para Intl. */
export function intlLocale(lang: Lang): string {
  return lang === 'en' ? 'en-US' : 'es-CO';
}
