import { z } from 'zod';
import { idSchema } from '@/lib/http/schemas';

/** RN-08: máximo de participantes por sorteo. */
export const MAX_PARTICIPANTS = 200;
/** RN-07. */
export const NAME_MAX = 60;

export const participantSchema = z
  .object({
    id: idSchema,
    raffleId: idSchema.optional(),
    firstName: z.string(),
    lastName: z.string().default(''),
    initials: z.string().optional(),
    email: z.string().nullable().optional(),
    photoUrl: z
      .string()
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    active: z.boolean().default(true),
    /** Migrado del modo prueba sin apellido (HU-05). */
    needsLastName: z.boolean().optional(),
    sortOrder: z.number().optional(),
    version: z.number().int().optional(),
  })
  .loose();
export type Participant = z.infer<typeof participantSchema>;

export const participantListSchema = z.array(participantSchema);

export function needsLastName(p: Participant): boolean {
  return p.needsLastName ?? p.lastName.trim() === '';
}

/** Formulario de alta y edición (HU-13, HU-14). Los mensajes son claves de `participants.validation`. */
export const participantFormSchema = z.object({
  firstName: z.string().trim().min(1, 'required').max(NAME_MAX, 'tooLong'),
  lastName: z.string().trim().min(1, 'required').max(NAME_MAX, 'tooLong'),
  email: z
    .string()
    .trim()
    .max(254, 'email')
    .refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'email'),
});
export type ParticipantFormValues = z.infer<typeof participantFormSchema>;
