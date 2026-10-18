import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '@/components/layout/language-switch';
import { LinkButton } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { AdminView } from '@/features/admin/components/admin-view';
import { useSession } from '@/lib/session/session';

/**
 * "/admin": solo ROLE_ADMIN. Sin sesión actúa el guard de AppLayout (→ /acceso); a un USER se le
 * muestra "no encontrada" para no revelar que la sección existe. La API vuelve a validar (403).
 */
export function AdminRoute() {
  const { t } = useTranslation();
  const { data: user, isPending } = useSession();
  if (isPending) return <PageState busy />;
  if (user?.role !== 'ADMIN') {
    return (
      <main id="contenido">
        <PageState title={t('notFound.title')}>
          <LinkButton to="/sorteos" variant="primary" size="md">
            {t('raffles.goToMine')}
          </LinkButton>
        </PageState>
      </main>
    );
  }
  return <AdminView headerActions={<LanguageSwitch />} />;
}
