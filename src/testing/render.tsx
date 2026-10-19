import { QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { createI18n } from '@/lib/i18n/i18n';
import type { Lang } from '@/lib/i18n/languages';

type Options = Omit<RenderOptions, 'wrapper'> & {
  lang?: Lang;
  path?: string;
  /** Para sembrar la caché (p. ej. la sesión) antes del primer render. */
  seed?: (queryClient: QueryClient) => void;
};

/** Renderiza con QueryClient, i18n y router de memoria. */
export function renderWithProviders(
  ui: ReactElement,
  { lang = 'es', path = '/', seed, ...options }: Options = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  seed?.(queryClient);
  const i18n = createI18n(lang);
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [path] });
  const result = render(
    <AppProviders queryClient={queryClient} i18n={i18n}>
      <RouterProvider router={router} />
    </AppProviders>,
    options,
  );
  return { ...result, queryClient, i18n, router };
}
