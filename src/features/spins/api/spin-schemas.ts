import { z } from 'zod';
import { apiDateSchema, idSchema } from '@/lib/http/schemas';

export const EMAIL_STATUSES = ['SCHEDULED', 'SENT', 'FAILED', 'NO_EMAIL', 'DISABLED'] as const;

// El backend lo expone como texto libre (R2): se acepta cualquier valor para no romper el contrato.
const emailStatusSchema = z.string().nullable().optional();

/** `POST /raffles/{id}/spins` → 201. El ganador lo decide el servidor (D-01). */
export const spinSchema = z
  .object({
    id: idSchema,
    round: z.number().int().positive(),
    winner: z
      .object({
        id: idSchema,
        firstName: z.string(),
        lastName: z.string().default(''),
        initials: z.string().optional(),
        photoUrl: z
          .string()
          .nullable()
          .optional()
          .transform((v) => v ?? null),
      })
      .loose(),
    poolSize: z.number().int().min(2),
    emailStatus: emailStatusSchema,
    maskedEmail: z.string().nullable().optional(),
    /** RN-06: el servidor ya lo dejó inactivo. */
    winnerRemoved: z.boolean().optional(),
    creationDate: apiDateSchema,
  })
  .loose();
export type Spin = z.infer<typeof spinSchema>;

/** Historial (RN-11: el nombre tal como estaba en ese giro). */
export const spinHistoryItemSchema = z
  .object({
    id: idSchema,
    round: z.number().int().positive(),
    winnerName: z.string(),
    winnerId: idSchema.nullable().optional(),
    poolSize: z.number().int(),
    emailStatus: emailStatusSchema,
    creationDate: apiDateSchema,
  })
  .loose();
export type SpinHistoryItem = z.infer<typeof spinHistoryItemSchema>;

export const spinHistorySchema = z.array(spinHistoryItemSchema);
