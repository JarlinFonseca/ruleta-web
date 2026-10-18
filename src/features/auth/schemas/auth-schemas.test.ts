import { passwordChecks, signInSchema, signUpSchema } from './auth-schemas';

describe('RN-09', () => {
  it.each([
    ['abc', { length: false, letter: true, number: false }],
    ['12345678', { length: true, letter: false, number: true }],
    ['abcdefgh', { length: true, letter: true, number: false }],
    ['clave123', { length: true, letter: true, number: true }],
  ])('%s', (pw, expected) => {
    expect(passwordChecks(pw)).toEqual(expected);
  });
});

describe('signUpSchema (HU-06)', () => {
  it('exige que las contraseñas coincidan', () => {
    const r = signUpSchema.safeParse({
      email: 'ana@correo.com',
      password: 'clave123',
      confirm: 'clave124',
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ['confirm'], message: 'mismatch' });
  });

  it('rechaza contraseñas débiles', () => {
    const r = signUpSchema.safeParse({
      email: 'ana@correo.com',
      password: 'abcdefgh',
      confirm: 'abcdefgh',
    });
    expect(r.error?.issues[0]).toMatchObject({ path: ['password'], message: 'weak' });
  });

  it('acepta datos válidos y recorta el correo', () => {
    const r = signUpSchema.parse({
      email: ' ana@correo.com ',
      password: 'clave123',
      confirm: 'clave123',
    });
    expect(r.email).toBe('ana@correo.com');
  });
});

describe('signInSchema', () => {
  it('valida el formato del correo', () => {
    const r = signInSchema.safeParse({ email: 'maria@', password: 'x' });
    expect(r.error?.issues[0]?.message).toBe('email');
  });
});
