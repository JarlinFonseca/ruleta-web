import * as Tabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { DashboardTab } from './dashboard-tab';
import { RafflesTab, type OwnerFilter } from './raffles-tab';
import { SpinsTab, type SpinFilters } from './spins-tab';
import { UsersTab } from './users-tab';
import styles from './admin.module.css';

const ADMIN_TABS = ['dashboard', 'users', 'raffles', 'spins'] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

/** Parámetros de la URL: pestaña y filtros, para poder compartir o recargar la vista. */
const P = {
  tab: 'tab',
  raffleOwner: 'duenoSorteos',
  raffleOwnerLabel: 'duenoSorteosNombre',
  spinOwner: 'usuario',
  spinOwnerLabel: 'usuarioNombre',
  spinRaffle: 'sorteo',
  spinRaffleLabel: 'sorteoNombre',
} as const;

function readFilter(params: URLSearchParams, id: string, label: string) {
  const value = params.get(id);
  return value ? { id: value, label: params.get(label) ?? value } : null;
}

/** Módulo de administración: dashboard, usuarios, sorteos y jugadas (solo ROLE_ADMIN). */
export function AdminView({ headerActions }: { headerActions?: ReactNode }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get(P.tab);
  const tab: AdminTab = (ADMIN_TABS as readonly string[]).includes(rawTab ?? '')
    ? (rawTab as AdminTab)
    : 'dashboard';
  const raffleOwner = readFilter(params, P.raffleOwner, P.raffleOwnerLabel);
  const spinFilters: SpinFilters = {
    owner: readFilter(params, P.spinOwner, P.spinOwnerLabel),
    raffle: readFilter(params, P.spinRaffle, P.spinRaffleLabel),
  };

  const update = (changes: Record<string, string | null>, replace = false) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v === null) next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace },
    );

  const setSpinFilters = (filters: SpinFilters, tabChange?: AdminTab) =>
    update({
      ...(tabChange ? { [P.tab]: tabChange } : {}),
      [P.spinOwner]: filters.owner?.id ?? null,
      [P.spinOwnerLabel]: filters.owner?.label ?? null,
      [P.spinRaffle]: filters.raffle?.id ?? null,
      [P.spinRaffleLabel]: filters.raffle?.label ?? null,
    });

  const setRaffleOwner = (owner: OwnerFilter) =>
    update(
      { [P.raffleOwner]: owner?.id ?? null, [P.raffleOwnerLabel]: owner?.label ?? null },
      true,
    );

  return (
    <main id="contenido" className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>{t('admin.eyebrow')}</span>
          <h1 className={styles.pageTitle}>{t('admin.title')}</h1>
        </div>
        <div className={styles.headerActions}>{headerActions}</div>
      </div>

      <Tabs.Root
        value={tab}
        onValueChange={(v) => update({ [P.tab]: v })}
        className={styles.tabsRoot}
      >
        <Tabs.List aria-label={t('admin.tabs.label')} className={styles.tabs}>
          {ADMIN_TABS.map((key) => (
            <Tabs.Trigger key={key} value={key} className={styles.tab}>
              {t(`admin.tabs.${key}`)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="dashboard" className={styles.tabContent}>
          <DashboardTab />
        </Tabs.Content>
        <Tabs.Content value="users" className={styles.tabContent}>
          <UsersTab
            onShowSpins={(u) =>
              setSpinFilters({ owner: { id: u.id, label: u.email }, raffle: null }, 'spins')
            }
          />
        </Tabs.Content>
        <Tabs.Content value="raffles" className={styles.tabContent}>
          <RafflesTab
            owner={raffleOwner}
            onOwnerChange={setRaffleOwner}
            onShowSpins={(r) =>
              setSpinFilters({ owner: null, raffle: { id: r.id, label: r.name } }, 'spins')
            }
          />
        </Tabs.Content>
        <Tabs.Content value="spins" className={styles.tabContent}>
          <SpinsTab filters={spinFilters} onFiltersChange={(f) => setSpinFilters(f)} />
        </Tabs.Content>
      </Tabs.Root>
    </main>
  );
}
