/** Clave común de las mutaciones que guardan datos de un sorteo (indicador de guardado, RF-24). */
export function saveMutationKey(raffleId: string) {
  return ['save', raffleId] as const;
}
