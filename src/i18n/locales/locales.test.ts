// @ts-expect-error: script de Node en JavaScript, sin tipos.
import { checkI18n } from '../../../scripts/check-i18n.mjs';

describe('traducciones (RNF-18)', () => {
  it('es.json y en.json tienen las mismas claves, cubren el catálogo de errores y las claves usadas', () => {
    expect((checkI18n as () => string[])()).toEqual([]);
  });
});
