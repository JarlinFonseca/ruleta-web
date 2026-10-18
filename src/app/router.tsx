import { createBrowserRouter, type RouteObject } from 'react-router';
import { GuestRoute, NotFoundRoute } from './routes/guest-routes';
import { RouteError } from './routes/route-error';

const authRoutes = () => import('./routes/auth-routes');
const appRoutes = () => import('./routes/app-routes');

/**
 * Rutas en español sin prefijo de idioma (HU-11 pide `/sorteos/{id}`; el idioma se guarda en el
 * navegador y en el perfil, no en la URL).
 *
 * El modo prueba ("/") va en el JS inicial; el acceso y la aplicación con cuenta se cargan aparte
 * (formularios, recorte de fotos y menús no entran en la primera carga).
 */
export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <GuestRoute /> },
      { path: '/acceso', lazy: async () => ({ Component: (await authRoutes()).AccessRoute }) },
      {
        path: '/recuperar',
        lazy: async () => ({ Component: (await authRoutes()).ForgotPasswordRoute }),
      },
      {
        path: '/restablecer/:token',
        lazy: async () => ({ Component: (await authRoutes()).ResetPasswordRoute }),
      },
      {
        lazy: async () => ({ Component: (await import('./routes/app-layout')).AppLayout }),
        children: [
          {
            path: '/sorteos',
            lazy: async () => ({ Component: (await appRoutes()).AppIndexRoute }),
          },
          {
            path: '/sorteos/:raffleId',
            lazy: async () => ({ Component: (await appRoutes()).RaffleRoute }),
          },
          {
            path: '/sorteos/:raffleId/participantes',
            lazy: async () => ({ Component: (await appRoutes()).ParticipantsRoute }),
          },
          {
            path: '/sorteos/:raffleId/historial',
            lazy: async () => ({ Component: (await appRoutes()).HistoryRoute }),
          },
          { path: '/cuenta', lazy: async () => ({ Component: (await appRoutes()).AccountRoute }) },
          {
            path: '/admin',
            lazy: async () => ({ Component: (await import('./routes/admin-route')).AdminRoute }),
          },
        ],
      },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
