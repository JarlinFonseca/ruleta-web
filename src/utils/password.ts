export const PASSWORD_MIN_LENGTH = 8;

export type PasswordChecks = { length: boolean; letter: boolean; number: boolean };

/** RN-09: mínimo 8 caracteres, con al menos 1 letra y 1 número. */
export function passwordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    letter: /\p{L}/u.test(password),
    number: /\p{N}/u.test(password),
  };
}

export function isStrongPassword(password: string): boolean {
  const c = passwordChecks(password);
  return c.length && c.letter && c.number;
}
