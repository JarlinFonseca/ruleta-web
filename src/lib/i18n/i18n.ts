import i18next, { type i18n as I18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import { DEFAULT_LANGUAGE, detectLanguage, isLang, storeLanguage, type Lang } from './languages';

export const resources = { es: { translation: es }, en: { translation: en } } as const;

function applyDocumentLanguage(lang: Lang): void {
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

export function createI18n(lang: Lang = detectLanguage()): I18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    resources,
    lng: lang,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ['es', 'en'],
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
  });
  applyDocumentLanguage(lang);
  instance.on('languageChanged', (next) => {
    if (isLang(next)) applyDocumentLanguage(next);
  });
  return instance;
}

export const i18n = createI18n();

export function currentLanguage(instance: I18n = i18n): Lang {
  const lang = instance.resolvedLanguage ?? instance.language;
  return isLang(lang) ? lang : DEFAULT_LANGUAGE;
}

/** Cambia el idioma sin recargar (RF-66) y lo recuerda en el navegador (RF-62). */
export async function setLanguage(lang: Lang, instance: I18n = i18n): Promise<void> {
  storeLanguage(lang);
  if (currentLanguage(instance) !== lang) await instance.changeLanguage(lang);
}
