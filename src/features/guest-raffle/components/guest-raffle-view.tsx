import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useWheelController } from '@/components/wheel/use-wheel-controller';
import { Wheel } from '@/components/wheel/wheel';
import type { WheelSegment } from '@/components/wheel/wheel-types';
import { WinnerDialog } from '@/components/winner/winner-dialog';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { useGuestListStore } from '@/lib/guest/guest-list-store';
import { useGuestSpin } from '../hooks/use-guest-spin';
import { GuestBanner } from './guest-banner';
import { GuestHistory } from './guest-history';
import { GuestNameChips } from './guest-name-chips';
import { GuestNameForm } from './guest-name-form';
import styles from './guest.module.css';

/** Pantalla 01 · Modo prueba sin cuenta (HU-01 a HU-04). */
export function GuestRaffleView() {
  const { t } = useTranslation();
  const entries = useGuestListStore((s) => s.entries);
  const removeEntry = useGuestListStore((s) => s.remove);
  const shuffle = useGuestListStore((s) => s.shuffle);
  const clear = useGuestListStore((s) => s.clear);
  const controller = useWheelController();
  const { spin, reveal, close } = useGuestSpin(controller);
  const [confirmClear, setConfirmClear] = useState(false);

  const n = entries.length;
  const locked = controller.spinning;
  const cannotSpin = n < 2 || locked;
  useBeforeUnload(n > 0);

  const segments = useMemo<WheelSegment[]>(
    () => entries.map((e) => ({ id: e.id, label: e.name, initials: '', photoUrl: null })),
    [entries],
  );

  const winnerStillIn = reveal ? entries.some((e) => e.id === reveal.entry.id) : false;
  const announcement = reveal ? t('wheel.announce', { name: reveal.entry.name }) : '';
  const wheelLabel = locked
    ? t('wheel.spinningLabel')
    : n < 2
      ? t('guest.wheel.needTwo')
      : t('wheel.spinLabel', { count: n });

  return (
    <>
      <GuestBanner />
      <main id="contenido" className={styles.main}>
        <section aria-labelledby="guest-title" className={styles.wheelColumn}>
          <div className={styles.heading}>
            <h1 id="guest-title" className={styles.title}>
              {t('guest.title.start')} <em className={styles.accent}>{t('guest.title.accent')}</em>
              {t('guest.title.end')}
            </h1>
            <p className={styles.subtitle}>{t('guest.subtitle')}</p>
          </div>
          <Wheel
            segments={segments}
            controller={controller}
            showAvatars={false}
            disabled={cannotSpin}
            onSpinRequest={() => void spin()}
            emptyMessage={t('guest.wheel.needTwo')}
            ariaLabel={wheelLabel}
            announcement={announcement}
          />
        </section>

        <aside aria-labelledby="guest-participants-title" className={styles.aside}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 id="guest-participants-title" className={styles.cardTitle}>
                {t('guest.list.title')}
              </h2>
              <span className={styles.count}>{t('guest.list.count', { count: n })}</span>
            </div>
            <GuestNameForm disabled={locked} />
            <GuestNameChips locked={locked} />
            <div className={styles.spinArea}>
              <button
                type="button"
                className={styles.spinButton}
                onClick={() => void spin()}
                disabled={cannotSpin}
              >
                {locked ? t('wheel.spinning') : t('wheel.spin')}
              </button>
              <div className={styles.listActions}>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={shuffle}
                  disabled={locked || n < 2}
                >
                  {t('guest.list.shuffle')}
                </button>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => setConfirmClear(true)}
                  disabled={locked || n === 0}
                >
                  {t('guest.list.clear')}
                </button>
              </div>
            </div>
          </section>
          <GuestHistory />
          <p className={styles.fairness}>{t('guest.fairness')}</p>
        </aside>
      </main>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={t('guest.clearDialog.title')}
        description={t('guest.clearDialog.description', { count: n })}
        confirmLabel={t('guest.clearDialog.confirm')}
        destructive
        onConfirm={() => {
          clear();
          setConfirmClear(false);
        }}
      />

      {reveal ? (
        <WinnerDialog
          open
          onClose={close}
          winnerName={reveal.entry.name}
          round={reveal.round}
          poolSize={reveal.poolSize}
          avatar={null}
          saved={false}
          removed={!winnerStillIn}
          onSpinAgain={() => {
            close();
            void spin();
          }}
          onRemove={() => {
            removeEntry(reveal.entry.id);
            close();
          }}
        />
      ) : null}
    </>
  );
}
