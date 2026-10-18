import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const FEATURES = ['guest-raffle', 'auth', 'raffles', 'participants', 'spins', 'account', 'admin'];

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    plugins: { react, 'import-x': importX },
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'react/no-danger': 'error',
      'react/jsx-key': 'error',
      // Ningún texto visible escrito en JSX: todo sale de i18n (RNF-18).
      'react/jsx-no-literals': [
        'error',
        { noStrings: true, ignoreProps: true, allowedStrings: ['·', '…', '→', '×', '*'] },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='fetch']",
          message: 'Usa lib/http: ningún componente llama a fetch directamente.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/wheel/wheel-webgl'],
              message: 'Usa <Wheel>, que decide qué versión cargar.',
            },
          ],
        },
      ],
      // Capas: shared → features → app. Una feature no importa de otra.
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            ...FEATURES.map((f) => ({
              target: `./src/features/${f}`,
              from: './src/features',
              except: [`./${f}`],
              message: 'Una feature no puede importar de otra feature.',
            })),
            {
              target: './src/features',
              from: './src/app',
              message: 'Las features no importan de app.',
            },
            {
              target: [
                './src/components',
                './src/lib',
                './src/hooks',
                './src/utils',
                './src/config',
                './src/types',
              ],
              from: ['./src/features', './src/app'],
              message: 'Lo compartido no importa de features ni de app.',
            },
          ],
        },
      ],
    },
  },
  {
    // El cliente HTTP es el único lugar que puede usar fetch.
    files: ['src/lib/http/**', 'src/testing/**', '**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/testing/**'],
    rules: { 'react/jsx-no-literals': 'off', 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
    extends: [js.configs.recommended],
  },
  prettier,
]);
