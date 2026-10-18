import { useTranslation } from 'react-i18next';
import { SiteHeader } from '@/components/layout/site-header';
import { LinkButton } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { GuestRaffleView } from '@/features/guest-raffle/components/guest-raffle-view';

/** "/" → pantalla 01, modo prueba. */
export function GuestRoute() {
  return (
    <>
      <SiteHeader />
      <GuestRaffleView />
    </>
  );
}

export function NotFoundRoute() {
  const { t } = useTranslation();
  return (
    <>
      <SiteHeader />
      <main id="contenido">
        <PageState title={t('notFound.title')}>
          <LinkButton to="/" variant="primary" size="md">
            {t('notFound.cta')}
          </LinkButton>
        </PageState>
      </main>
    </>
  );
}
