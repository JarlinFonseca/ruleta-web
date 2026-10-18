const SESSION_EXPIRED = 'ruleta:session-expired';

/** Se emite cuando la sesión ya no es válida (refresh fallido o `auth.session_revoked`). */
export function emitSessionExpired(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED));
}

export function onSessionExpired(listener: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED, listener);
  return () => window.removeEventListener(SESSION_EXPIRED, listener);
}
