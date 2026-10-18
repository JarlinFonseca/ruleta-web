import { z } from 'zod';

const booleanFlag = z
  .enum(['true', 'false', ''])
  .optional()
  .transform((v) => v === 'true');

const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== '' ? v.replace(/\/$/, '') : '/api-ruleta/v1')),
  VITE_ENABLE_MSW: booleanFlag,
  VITE_ENABLE_WHEEL_3D: booleanFlag,
  VITE_ENABLE_PARTICIPANT_EMAIL: booleanFlag,
  VITE_ERROR_REPORTING_URL: z
    .union([z.literal(''), z.url()])
    .optional()
    .transform((v) => (v ? v : null)),
});

export type Env = {
  apiBaseUrl: string;
  enableMsw: boolean;
  enableWheel3d: boolean;
  enableParticipantEmail: boolean;
  errorReportingUrl: string | null;
  isDev: boolean;
};

export function parseEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.parse(raw);
  return {
    apiBaseUrl: parsed.VITE_API_BASE_URL,
    enableMsw: parsed.VITE_ENABLE_MSW,
    enableWheel3d: parsed.VITE_ENABLE_WHEEL_3D,
    enableParticipantEmail: parsed.VITE_ENABLE_PARTICIPANT_EMAIL,
    errorReportingUrl: parsed.VITE_ERROR_REPORTING_URL,
    isDev: raw.DEV === true,
  };
}

export const env: Env = parseEnv(import.meta.env);
