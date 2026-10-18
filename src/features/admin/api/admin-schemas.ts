import { z } from 'zod';
import { apiDateSchema, idSchema } from '@/lib/http/schemas';

const count = z.number().int().nonnegative();

export const adminSummarySchema = z.object({
  users: count,
  admins: count,
  raffles: count,
  participants: count,
  spins: count,
  spinsLast24h: count,
  pendingEmails: count,
});
export type AdminSummary = z.infer<typeof adminSummarySchema>;

export const activityPointSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newUsers: count,
  newRaffles: count,
  spins: count,
});
export type ActivityPoint = z.infer<typeof activityPointSchema>;
export const activitySchema = z.array(activityPointSchema);

export const ROLES = ['USER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const adminUserSchema = z
  .object({
    id: idSchema,
    email: z.string(),
    language: z.string(),
    role: z.enum(ROLES).catch('USER'),
    creationDate: apiDateSchema,
    raffleCount: count,
    participantCount: count,
    spinCount: count,
    lastActivityDate: apiDateSchema.nullable().optional(),
  })
  .loose();
export type AdminUser = z.infer<typeof adminUserSchema>;

export const adminRaffleSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    ownerId: idSchema,
    ownerEmail: z.string(),
    participantCount: count,
    activeCount: count,
    spinCount: count,
    creationDate: apiDateSchema,
    updateDate: apiDateSchema,
  })
  .loose();
export type AdminRaffle = z.infer<typeof adminRaffleSchema>;

export const adminSpinSchema = z
  .object({
    id: idSchema,
    round: z.number().int().positive(),
    winnerName: z.string(),
    poolSize: count,
    emailStatus: z.string().nullable().optional(),
    creationDate: apiDateSchema,
    raffleId: idSchema,
    raffleName: z.string(),
    ownerId: idSchema,
    ownerEmail: z.string(),
  })
  .loose();
export type AdminSpin = z.infer<typeof adminSpinSchema>;

export const USER_SORT_FIELDS = ['creationDate', 'email', 'lastActivity', 'spinCount'] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export const ACTIVITY_RANGES = [7, 30, 90] as const;
export type ActivityRange = (typeof ACTIVITY_RANGES)[number];

export const ADMIN_PAGE_SIZE = 20;
