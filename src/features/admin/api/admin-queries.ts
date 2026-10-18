import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { z } from 'zod';
import { apiRequest, type QueryValue } from '@/lib/http/client';
import {
  activitySchema,
  ADMIN_PAGE_SIZE,
  adminRaffleSchema,
  adminSpinSchema,
  adminSummarySchema,
  adminUserSchema,
  type ActivityRange,
  type UserSortField,
} from './admin-schemas';

export type Page<T> = { items: T[]; total: number };

/** Todas las claves cuelgan de ['admin'] para invalidar el módulo completo tras una mutación. */
export const adminKeys = {
  all: ['admin'] as const,
  summary: ['admin', 'summary'] as const,
  activity: (days: number) => ['admin', 'activity', days] as const,
  users: (params: UsersParams) => ['admin', 'users', params] as const,
  raffles: (params: RafflesParams) => ['admin', 'raffles', params] as const,
  spins: (params: SpinsParams) => ['admin', 'spins', params] as const,
};

async function fetchPage<T>(
  path: string,
  schema: z.ZodType<T>,
  page: number,
  query: Record<string, QueryValue>,
  signal: AbortSignal,
  limit = ADMIN_PAGE_SIZE,
): Promise<Page<T>> {
  const { data, paging } = await apiRequest<T[]>(path, {
    query: { ...query, $init: page * limit, $limit: limit, $total: true },
    schema: schema.array() as z.ZodType<T[]>,
    signal,
  });
  return { items: data, total: paging?.total ?? data.length };
}

const emptyToUndefined = (v: string | null | undefined) => (v ? v : undefined);

export function useAdminSummary() {
  return useQuery(
    queryOptions({
      queryKey: adminKeys.summary,
      queryFn: async ({ signal }) =>
        (await apiRequest('/admin/summary', { schema: adminSummarySchema, signal })).data,
    }),
  );
}

export function useAdminActivity(days: ActivityRange) {
  return useQuery({
    queryKey: adminKeys.activity(days),
    queryFn: async ({ signal }) =>
      (await apiRequest('/admin/activity', { query: { days }, schema: activitySchema, signal }))
        .data,
    placeholderData: keepPreviousData,
  });
}

export type UsersParams = { q: string; page: number; orderby: UserSortField; asc: boolean };

export function useAdminUsers(params: UsersParams) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: ({ signal }) =>
      fetchPage(
        '/admin/users',
        adminUserSchema,
        params.page,
        {
          q: emptyToUndefined(params.q),
          $orderby: params.orderby,
          asc: params.asc,
        },
        signal,
      ),
    placeholderData: keepPreviousData,
  });
}

export type RafflesParams = { q: string; page: number; ownerId: string | null };

export function useAdminRaffles(params: RafflesParams) {
  return useQuery({
    queryKey: adminKeys.raffles(params),
    queryFn: ({ signal }) =>
      fetchPage(
        '/admin/raffles',
        adminRaffleSchema,
        params.page,
        {
          q: emptyToUndefined(params.q),
          ownerId: emptyToUndefined(params.ownerId),
        },
        signal,
      ),
    placeholderData: keepPreviousData,
  });
}

export type SpinsParams = {
  q: string;
  page: number;
  ownerId: string | null;
  raffleId: string | null;
  asc: boolean;
  limit?: number;
};

export function useAdminSpins(params: SpinsParams) {
  return useQuery({
    queryKey: adminKeys.spins(params),
    queryFn: ({ signal }) =>
      fetchPage(
        '/admin/spins',
        adminSpinSchema,
        params.page,
        {
          q: emptyToUndefined(params.q),
          ownerId: emptyToUndefined(params.ownerId),
          raffleId: emptyToUndefined(params.raffleId),
          asc: params.asc,
        },
        signal,
        params.limit ?? ADMIN_PAGE_SIZE,
      ),
    placeholderData: keepPreviousData,
  });
}

export type CreateUserInput = { email: string; password: string; language: 'es' | 'en' };
export type UpdateUserInput = { email?: string; password?: string; language?: 'es' | 'en' };

function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.all });
}

export function useCreateUser() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: async (input: CreateUserInput) =>
      (await apiRequest('/admin/users', { method: 'POST', body: input, schema: adminUserSchema }))
        .data,
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateUserInput }) =>
      (await apiRequest(`/admin/users/${id}`, { method: 'PATCH', body: patch })).data,
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
    },
    onSuccess: invalidate,
  });
}
