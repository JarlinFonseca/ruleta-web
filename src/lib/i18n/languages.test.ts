import { formatDateTime } from './format';
import {
  detectLanguage,
  languageFromNavigator,
  readStoredLanguage,
  storeLanguage,
} from './languages';

describe('languageFromNavigator (RF-61)', () => {
  it.each([
    [['en-US'], 'en'],
    [['EN'], 'en'],
    [['fr-FR', 'en'], 'es'],
    [['es-CO'], 'es'],
    [[], 'es'],
  ])('%j → %s', (langs, expected) => {
    expect(languageFromNavigator(langs)).toBe(expected);
  });
});

describe('preferencia guardada', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('la elección del visitante gana sobre el navegador', () => {
    storeLanguage('en');
    expect(readStoredLanguage()).toBe('en');
    expect(detectLanguage()).toBe('en');
  });

  it('si localStorage falla, vuelve a detectar sin romper', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => storeLanguage('en')).not.toThrow();
    expect(readStoredLanguage()).toBeNull();
  });
});

describe('formatDateTime (RF-64)', () => {
  it('formatea en inglés como "Oct 13, 2026"', () => {
    const text = formatDateTime({ date: '2026-10-13T23:42:10Z', utcOffset: '-05:00' }, 'en');
    expect(text).toMatch(/Oct 1[34], 2026/);
  });

  it('formatea en español', () => {
    const text = formatDateTime('2026-10-13T12:00:00Z', 'es');
    expect(text).toMatch(/oct/i);
    expect(text).toMatch(/2026/);
  });
});
