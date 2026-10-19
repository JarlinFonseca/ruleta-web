import { z } from 'zod';
import { apiDateSchema, idSchema } from '@/lib/http/schemas';

/** RN: nombre del sorteo de 1 a 80 caracteres (modelo de datos). */
export const RAFFLE_NAME_MAX = 80;
/** RN-08: máximo de sorteos por usuario. */
export const MAX_RAFFLES = 50;

export const raffleSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    removeWinnerAfterSpin: z.boolean().default(false),
    /** HU-24/HU-29: correo al ganador y su idioma (independiente del idioma de la interfaz). */
    sendWinnerEmail: z.boolean().optional(),
    emailLanguage: z.string().optional(),
    participantCount: z.number().int().optional(),
    activeCount: z.number().int().optional(),
    spinCount: z.number().int().optional(),
    version: z.number().int().optional(),
    creationDate: apiDateSchema.optional(),
    updateDate: apiDateSchema.optional(),
  })
  .loose();
export type Raffle = z.infer<typeof raffleSchema>;

export const raffleListSchema = z.array(raffleSchema);

export const raffleNameSchema = z
  .string()
  .trim()
  .min(1, 'required')
  .max(RAFFLE_NAME_MAX, 'tooLong');
