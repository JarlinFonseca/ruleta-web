import { z } from 'zod';

/** Los mensajes son claves de `auth.validation.*` en los archivos de traducción. */
export { isStrongPassword, passwordChecks, PASSWORD_MIN_LENGTH } from '@/utils/password';
import { isStrongPassword } from '@/utils/password';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'required')
  .max(254, 'email')
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'email');

const strongPassword = z.string().min(1, 'required').refine(isStrongPassword, 'weak');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'required'),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: strongPassword,
    confirm: z.string().min(1, 'required'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' });
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password: strongPassword, confirm: z.string().min(1, 'required') })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
