/**
 * Som posicional simplificado: o ouvinte é o agente da vez (a câmera segue ele). O volume
 * cai com a distância em hexágonos: cheio até `FULL_RANGE`, depois −3 dB por hexágono, e some
 * a partir de `SILENT_RANGE`.
 */
export const FULL_RANGE = 4;
export const DB_PER_HEX = 3;
export const SILENT_RANGE = 16;
/** Inimigos fora da vista (debaixo de um telhado) só se ouvem até aqui, e abafados. */
export const HIDDEN_RANGE = 5;
/** Passa-baixa (Hz) de quem está do outro lado de uma parede ou telhado. */
export const OCCLUDED = 900;

export function distanceGain(hexes: number): number {
  if (hexes >= SILENT_RANGE) return 0;
  if (hexes <= FULL_RANGE) return 1;
  return Math.pow(10, (-DB_PER_HEX * (hexes - FULL_RANGE)) / 20);
}
