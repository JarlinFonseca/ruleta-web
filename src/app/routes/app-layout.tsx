import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useMatch, useNavigate } from 'react-router';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { PageState } from '@/components/ui/page-state';
import { clearSessionData, signOut, useSession } from '@/lib/session/session';
import styles from './routes.module.css';

/** Guard de sesión (`GET /sessions/current`) + barra lateral de la aplicación. */
export function AppLayout() {
  const { t } = useTranslation();
  const { data: user, isPending } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const match = useMatch('/sorteos/:raffleId/*');
  const [loggingOut, setLoggingOut] = useState(false);

  if (isPending) return <PageState busy />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/acceso?next=${next}`} replace />;
  }

  const raffleId = match?.params.raffleId ?? user.lastRaffleId ?? null;

  const logout = async () => {
    setLoggingOut(true);
    await signOut();
    // HU-08: vuelve a la página principal en modo prueba.
    void navigate('/', { replace: true });
    clearSessionData(queryClient);
    setLoggingOut(false);
  };

  return (
    <div className={styles.appShell}>
      <a href="#contenido" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <AppSidebar
        raffleId={raffleId}
        email={user.email}
        isAdmin={user.role === 'ADMIN'}
        onLogout={() => void logout()}
        loggingOut={loggingOut}
      />
      <div className={styles.appContent}>
        <Outlet />
      </div>
    </div>
  );
}
