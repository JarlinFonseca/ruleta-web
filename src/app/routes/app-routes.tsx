import type { TFunction } from 'i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { LanguageSwitch } from '@/components/layout/language-switch';
import { Button, LinkButton } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { useWheelController } from '@/components/wheel/use-wheel-controller';
import { MAX_SEGMENTS_WITH_AVATARS } from '@/components/wheel/wheel-svg';
import { Wheel } from '@/components/wheel/wheel';
import type { WheelSegment } from '@/components/wheel/wheel-types';
import { WinnerDialog } from '@/components/winner/winner-dialog';
import { AccountView } from '@/features/account/components/account-view';
import {
  useParticipants,
  useSetParticipantActive,
} from '@/features/participants/api/participant-queries';
import { ActiveToggleList } from '@/features/participants/components/active-toggle-list';
import { ParticipantsView } from '@/features/participants/components/participants-view';
import { useRaffle } from '@/features/raffles/api/raffle-queries';
import { RaffleHeader } from '@/features/raffles/components/raffle-header';
import { RaffleOptionsCard } from '@/features/raffles/components/raffle-options-card';
import { useEnsureRaffle } from '@/features/raffles/hooks/use-ensure-raffle';
import { HistoryView } from '@/features/spins/components/history-view';
import { RecentWinners } from '@/features/spins/components/recent-winners';
import { useServerSpin } from '@/features/spins/hooks/use-server-spin';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { usePreloadImages } from '@/hooks/use-preload-images';
import { ApiError } from '@/lib/http/api-error';
import { clearSessionData, signOut, updateLastRaffle, useSession } from '@/lib/session/session';
import { toast } from '@/lib/toast/toast-store';
import { fullName, initials, shortName } from '@/utils/text';
import styles from './routes.module.css';

/** "/sorteos" → último sorteo usado, o crea "Mi primer sorteo" si no hay ninguno. */
export function AppIndexRoute() {
  const { t } = useTranslation();
  const { data: user } = useSession();
  const { raffleId, error, retry } = useEnsureRaffle(user?.lastRaffleId);
  if (raffleId) return <Navigate to={`/sorteos/${raffleId}`} replace />;
  if (error) {
    return (
      <PageState title={t('errors.loadFailed')}>
        <Button variant="outline" onClick={retry}>
          {t('common.retry')}
        </Button>
      </PageState>
    );
  }
  return <PageState busy />;
}

/** Carga el sorteo de la URL y muestra "no encontrado" si no existe o no es del usuario (404). */
function RaffleGate({
  children,
}: {
  children: (raffleId: string, raffleName: string) => ReactNode;
}) {
  const { t } = useTranslation();
  const { raffleId = '' } = useParams();
  const raffle = useRaffle(raffleId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (raffle.data) void updateLastRaffle(queryClient, raffleId);
  }, [raffle.data, raffleId, queryClient]);

  if (raffle.isPending) return <PageState busy />;
  if (raffle.error) {
    const notFound = raffle.error instanceof ApiError && raffle.error.status === 404;
    return (
      <PageState title={notFound ? t('errors.raffle.not_found') : t('errors.loadFailed')}>
        <LinkButton to="/sorteos" variant="primary" size="md">
          {t('raffles.goToMine')}
        </LinkButton>
      </PageState>
    );
  }
  return <>{children(raffleId, raffle.data.name)}</>;
}

/** "/sorteos/:raffleId" → pantalla 03 (HU-11, HU-16 a HU-22). */
export function RaffleRoute() {
  return (
    <RaffleGate>{(raffleId) => <RafflePanel key={raffleId} raffleId={raffleId} />}</RaffleGate>
  );
}

function RafflePanel({ raffleId }: { raffleId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notify } = useErrorHandler();
  const { data: participants = [], isPending } = useParticipants(raffleId);
  const setActive = useSetParticipantActive(raffleId);
  const controller = useWheelController();

  const segments = useMemo<WheelSegment[]>(
    () =>
      participants
        .filter((p) => p.active)
        .map((p) => ({
          id: p.id,
          label: shortName(p.firstName, p.lastName),
          initials: p.initials ?? initials(p.firstName, p.lastName),
          photoUrl: p.photoUrl,
        })),
    [participants],
  );
  const server = useServerSpin(raffleId, segments, controller);
  const displayed = server.displayedSegments;
  const photoUrls = useMemo(
    () =>
      displayed.length <= MAX_SEGMENTS_WITH_AVATARS
        ? displayed.flatMap((s) => (s.photoUrl ? [s.photoUrl] : []))
        : [],
    [displayed],
  );
  const photosReady = usePreloadImages(photoUrls);

  const locked = controller.spinning || server.pending;
  const n = displayed.length;
  const cannotSpin = n < 2 || locked || !photosReady || isPending;
  const reveal = server.reveal;
  const winnerNow = reveal ? participants.find((p) => p.id === reveal.winner.id) : undefined;
  const winnerRemoved = Boolean(
    reveal && (reveal.winnerRemoved || (winnerNow ? !winnerNow.active : true)),
  );

  const wheelLabel = locked
    ? t('wheel.spinningLabel')
    : n < 2
      ? t('raffles.panel.needTwo')
      : t('wheel.spinLabel', { count: n });

  return (
    <>
      <RaffleHeader
        raffleId={raffleId}
        locked={locked}
        onNavigate={(id) => void navigate(id ? `/sorteos/${id}` : '/sorteos')}
        actions={
          <>
            <LanguageSwitch />
            <Link to={`/sorteos/${raffleId}/participantes`} className={styles.manageLink}>
              {t('raffles.panel.manage')}
            </Link>
          </>
        }
      />
      <main id="contenido" className={styles.panelMain}>
        <section className={styles.wheelSection} aria-label={t('raffles.panel.wheelRegion')}>
          <Wheel
            segments={displayed}
            controller={controller}
            showAvatars
            disabled={cannotSpin}
            onSpinRequest={() => void server.spin()}
            emptyMessage={isPending ? t('common.loading') : t('raffles.panel.needTwo')}
            ariaLabel={wheelLabel}
            announcement={
              reveal
                ? t('wheel.announce', {
                    name: fullName(reveal.winner.firstName, reveal.winner.lastName),
                  })
                : ''
            }
          />
        </section>
        <aside className={styles.panelAside}>
          <ActiveToggleList raffleId={raffleId} participants={participants} locked={locked} />
          <RaffleOptionsCard raffleId={raffleId} locked={locked} />
          <button
            type="button"
            className={styles.spinButton}
            onClick={() => void server.spin()}
            disabled={cannotSpin}
          >
            {locked ? t('wheel.spinning') : t('wheel.spin')}
          </button>
          {n < 2 && !isPending ? (
            <p className={styles.spinHint}>{t('raffles.panel.needTwo')}</p>
          ) : null}
          <RecentWinners raffleId={raffleId} />
        </aside>
      </main>

      {reveal ? (
        <WinnerDialog
          open
          onClose={server.close}
          winnerName={fullName(reveal.winner.firstName, reveal.winner.lastName)}
          round={reveal.round}
          poolSize={reveal.poolSize}
          avatar={{
            photoUrl: reveal.winner.photoUrl,
            initials:
              reveal.winner.initials ?? initials(reveal.winner.firstName, reveal.winner.lastName),
          }}
          saved
          removed={winnerRemoved}
          removing={setActive.isPending}
          emailNote={winnerEmailNote(reveal.emailStatus, reveal.maskedEmail, t)}
          onSpinAgain={() => {
            server.close();
            void server.spin();
          }}
          onRemove={() =>
            setActive.mutate(
              { id: reveal.winner.id, active: false },
              { onSuccess: () => server.close(), onError: (e) => notify(e) },
            )
          }
        />
      ) : null}
    </>
  );
}

/** "/sorteos/:raffleId/participantes" → pantalla 04. */
export function ParticipantsRoute() {
  return (
    <RaffleGate>
      {(raffleId, name) => (
        <ParticipantsView
          key={raffleId}
          raffleId={raffleId}
          raffleName={name}
          headerActions={<LanguageSwitch />}
        />
      )}
    </RaffleGate>
  );
}

/** "/sorteos/:raffleId/historial" (HU-21). */
export function HistoryRoute() {
  return (
    <RaffleGate>
      {(raffleId, name) => (
        <HistoryView
          key={raffleId}
          raffleId={raffleId}
          raffleName={name}
          headerActions={<LanguageSwitch />}
        />
      )}
    </RaffleGate>
  );
}

/** "/cuenta" (HU-08, HU-10, HU-28). */
export function AccountRoute() {
  const { t } = useTranslation();
  const { data: user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  if (!user) return null;
  const leave = () => {
    void navigate('/', { replace: true });
    clearSessionData(queryClient);
  };
  return (
    <AccountView
      user={user}
      onSignOut={() => void signOut().then(leave)}
      onDeleted={() => {
        leave();
        toast.success(t('account.delete.done'));
      }}
    />
  );
}

/** HU-25: qué pasó con el correo al ganador, según el estado que devolvió el giro. */
function winnerEmailNote(
  status: string | null | undefined,
  maskedEmail: string | null | undefined,
  t: TFunction,
): string | null {
  switch (status) {
    case 'SCHEDULED':
      return maskedEmail
        ? t('winner.email.scheduledTo', { email: maskedEmail })
        : t('winner.email.scheduled');
    case 'SENT':
      return t('winner.email.sent');
    case 'NO_EMAIL':
      return t('winner.email.noEmail');
    case 'FAILED':
      return t('winner.email.failed');
    default:
      return null;
  }
}
