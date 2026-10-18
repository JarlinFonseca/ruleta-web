export const CSRF_COOKIE = 'XSRF-TOKEN';
export const CSRF_HEADER = 'X-XSRF-TOKEN';

export function readCookie(name: string, cookieString: string = document.cookie): string | null {
  for (const part of cookieString.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return rest.join('=');
      }
    }
  }
  return null;
}

/** Cabecera CSRF para mutaciones (cookie legible `XSRF-TOKEN` → `X-XSRF-TOKEN`). */
export function csrfHeader(): Record<string, string> {
  const token = readCookie(CSRF_COOKIE);
  return token ? { [CSRF_HEADER]: token } : {};
}
