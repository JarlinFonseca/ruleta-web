#!/usr/bin/env node
/**
 * RNF-18: falla si falta una clave en es.json o en en.json, si el código usa una clave inexistente
 * o si falta la traducción de algún código de error del catálogo de la API (§11.2.2).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Se ejecuta desde la raíz del proyecto (npm run i18n:check o Vitest).
const root = process.cwd();
const localesDir = join(root, 'src', 'i18n', 'locales');
const PLURAL = /_(zero|one|two|few|many|other)$/;

export const ERROR_CATALOG = [
  'field.required',
  'field.size',
  'field.format',
  'field.range',
  'field.invalid',
  'request.malformed',
  'password_reset.invalid_token',
  'auth.unauthenticated',
  'auth.invalid_credentials',
  'auth.token_expired',
  'auth.session_revoked',
  'auth.csrf_invalid',
  'auth.forbidden',
  'raffle.not_found',
  'participant.not_found',
  'spin.not_found',
  'resource.not_found',
  'request.not_acceptable',
  'user.email.duplicate',
  'raffle.concurrent_modification',
  'participant.concurrent_modification',
  'user.concurrent_modification',
  'email.already_sent',
  'email.no_recipient',
  'file.too_large',
  'file.unsupported_type',
  'password.weak',
  'raffle.limit_reached',
  'participant.limit_reached',
  'spin.not_enough_participants',
  'raffle.name.invalid',
  'participant.name.invalid',
  'rate_limit.exceeded',
  'internal.error',
  'method.not_implemented',
  'service.unavailable',
  'network.unavailable',
  'network.timeout',
];

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

export function checkI18n() {
  const problems = [];
  const locales = Object.fromEntries(
    ['es', 'en'].map((lang) => [
      lang,
      JSON.parse(readFileSync(join(localesDir, `${lang}.json`), 'utf8')),
    ]),
  );
  const keys = Object.fromEntries(
    Object.entries(locales).map(([l, json]) => [l, new Set(flatten(json))]),
  );

  for (const [a, b] of [
    ['es', 'en'],
    ['en', 'es'],
  ]) {
    for (const key of keys[a]) if (!keys[b].has(key)) problems.push(`Falta "${key}" en ${b}.json`);
  }

  const base = new Set([...keys.es].map((k) => k.replace(PLURAL, '')));
  const exists = (key) => base.has(key);

  for (const code of ERROR_CATALOG) {
    if (!exists(`errors.${code}`))
      problems.push(`Falta la traducción del código de error "errors.${code}"`);
  }

  const usage = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;
  for (const file of walk(join(root, 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(usage)) {
      if (!exists(match[1]))
        problems.push(`${relative(root, file)} usa la clave inexistente "${match[1]}"`);
    }
  }

  return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const problems = checkI18n();
  if (problems.length > 0) {
    console.error(`i18n: ${problems.length} problema(s)\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log('i18n: es.json y en.json completos y consistentes.');
}
