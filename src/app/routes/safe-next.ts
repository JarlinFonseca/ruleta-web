/** Solo rutas internas: evita redirecciones abiertas con `?next=`. */
export function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
    ? value
    : '/sorteos';
}
