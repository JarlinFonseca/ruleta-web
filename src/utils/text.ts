/** Iniciales de nombre y apellido: "María Fernanda" + "López" → "ML" (HU-13). */
export function initials(firstName: string, lastName = ''): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0) || firstName.trim().split(/\s+/)[1]?.charAt(0) || '';
  return (first + last).toLocaleUpperCase();
}

/** Para buscar sin distinguir tildes ni mayúsculas (HU-14). */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .trim();
}

export function matchesSearch(query: string, ...fields: string[]): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  return (
    fields.some((f) => normalizeForSearch(f).includes(q)) ||
    normalizeForSearch(fields.join(' ')).includes(q)
  );
}

/** "María Fernanda" + "López" → "María López" (nombre corto de la ruleta, pantalla 03). */
export function shortName(firstName: string, lastName: string): string {
  const first = firstName.trim().split(/\s+/)[0] ?? '';
  return [first, lastName.trim()].filter(Boolean).join(' ');
}

export function fullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

/** "maria.lopez@correo.com" → "ma•••@correo.com" (correo enmascarado del diseño). */
export function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 2)}•••@${domain}`;
}
