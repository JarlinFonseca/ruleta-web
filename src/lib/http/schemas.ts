import { z } from 'zod';
import { apiErrorItemSchema } from './api-error';

/** Ids `bigint` enviados como texto (§11.2). */
export const idSchema = z.string().min(1);

/** Fechas ISO 8601 en UTC con el desfase aparte (§11.2). */
export const apiDateSchema = z.object({ date: z.string(), utcOffset: z.string() });

const linkSchema = z.record(z.string(), z.object({ href: z.string().nullable() }));

export const pagingSchema = z.object({
  init: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  total: z.number().int().nonnegative().optional(),
  links: z.array(linkSchema).optional(),
});
export type Paging = z.infer<typeof pagingSchema>;

export const envelopeSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(apiErrorItemSchema).optional(),
  paging: pagingSchema.optional(),
});

/** `201 Created`: `data.id` en el cuerpo. */
export const createdSchema = z.object({ id: idSchema }).loose();
export type Created = z.infer<typeof createdSchema>;
