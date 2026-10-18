import { parseEnv } from './env';

describe('parseEnv', () => {
  it('usa /api-ruleta/v1 por defecto y apaga las banderas', () => {
    const env = parseEnv({});
    expect(env.apiBaseUrl).toBe('/api-ruleta/v1');
    expect(env.enableMsw).toBe(false);
    expect(env.enableParticipantEmail).toBe(false);
    expect(env.errorReportingUrl).toBeNull();
  });

  it('quita la barra final de la URL base y lee las banderas', () => {
    const env = parseEnv({
      VITE_API_BASE_URL: 'http://localhost:8080/api-ruleta/v1/',
      VITE_ENABLE_MSW: 'true',
    });
    expect(env.apiBaseUrl).toBe('http://localhost:8080/api-ruleta/v1');
    expect(env.enableMsw).toBe(true);
  });

  it('falla con valores inválidos', () => {
    expect(() => parseEnv({ VITE_ENABLE_MSW: 'yes' })).toThrow();
  });
});
