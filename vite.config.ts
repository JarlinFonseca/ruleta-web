/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_PROXY_TARGET ?? 'http://localhost:8080';

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      // Mismo origen en desarrollo: las cookies HttpOnly y XSRF-TOKEN funcionan sin CORS.
      proxy: {
        '/api-ruleta': { target: apiTarget, changeOrigin: false },
        '/media': { target: apiTarget, changeOrigin: false },
      },
    },
    build: {
      target: 'es2022',
      sourcemap: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/testing/setup.ts'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
      coverage: {
        provider: 'v8',
        include: ['src/lib/**', 'src/components/wheel/**', 'src/utils/**'],
        exclude: ['**/*.test.*', 'src/testing/**'],
      },
    },
  };
});
