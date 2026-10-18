import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { logger } from '@/lib/logger';
import { NotFoundRoute } from './guest-routes';

/** ErrorBoundary de las rutas: pantalla de error con "Volver a intentar" (§7.1). */
export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundRoute />;
  logger.error('render.error', { message: error instanceof Error ? error.message : 'unknown' });
  return (
    <PageState title={t('errors.renderFailed')}>
      <Button variant="primary" size="md" onClick={() => window.location.reload()}>
        {t('common.retry')}
      </Button>
    </PageState>
  );
}
