import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateRaffle, useRaffles } from '../api/raffle-queries';

/**
 * Elige el sorteo que se abre al entrar (HU-07: el último usado) y, si no queda ninguno, crea
 * "Mi primer sorteo" vacío (HU-05, HU-12). Devuelve el id cuando lo sabe.
 */
export function useEnsureRaffle(lastRaffleId: string | null | undefined) {
  const { t } = useTranslation();
  const raffles = useRaffles();
  const create = useCreateRaffle();
  const creating = useRef(false);

  const list = raffles.data;
  const chosen =
    list && list.length > 0 ? (list.find((r) => r.id === lastRaffleId) ?? list[0]) : undefined;

  useEffect(() => {
    if (!list || list.length > 0 || creating.current) return;
    creating.current = true;
    create.mutate(t('raffles.firstRaffleName'));
  }, [list, create, t]);

  return {
    raffleId: chosen?.id ?? create.data ?? null,
    error: raffles.error ?? create.error,
    retry: () => {
      creating.current = false;
      void raffles.refetch();
    },
  };
}
