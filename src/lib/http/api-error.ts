import { z } from 'zod';

export const apiErrorItemSchema = z.object({
  code: z.string(),
  description: z.string().optional(),
  traceId: z.string().optional(),
  field: z.string().optional(),
});
export type ApiErrorItem = z.infer<typeof apiErrorItemSchema>;

/** Códigos propios del front para fallos que no traen sobre de la API. */
export const CLIENT_ERROR_CODES = {
  network: 'network.unavailable',
  timeout: 'network.timeout',
} as const;

export class ApiError extends Error {
  readonly status: number;
  readonly errors: ApiErrorItem[];
  /** Segundos de espera indicados por `Retry-After` (429). */
  readonly retryAfterSeconds: number | null;

  constructor(status: number, errors: ApiErrorItem[], retryAfterSeconds: number | null = null) {
    super(errors[0]?.code ?? `http.${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  get code(): string {
    return this.errors[0]?.code ?? `http.${this.status}`;
  }

  get traceId(): string | undefined {
    return this.errors.find((e) => e.traceId)?.traceId;
  }

  get fieldErrors(): (ApiErrorItem & { field: string })[] {
    return this.errors.filter((e): e is ApiErrorItem & { field: string } => Boolean(e.field));
  }

  hasCode(code: string): boolean {
    return this.errors.some((e) => e.code === code);
  }
}

/** La respuesta no cumple el contrato (esquema Zod). */
export class ContractError extends Error {
  readonly contract: string;
  readonly issues: z.ZodError;

  constructor(contract: string, issues: z.ZodError) {
    super(`contract.${contract}`);
    this.name = 'ContractError';
    this.contract = contract;
    this.issues = issues;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Primeros 8 caracteres del traceId: código de soporte que ve el usuario. */
export function supportCode(error: unknown): string | null {
  if (error instanceof ApiError && error.traceId) return error.traceId.slice(0, 8);
  return null;
}

export function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, Math.round((date - Date.now()) / 1000));
}
