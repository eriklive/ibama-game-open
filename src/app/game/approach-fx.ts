import { BASE_APPROACH } from './enemies';

/**
 * Tempo da abordagem: a onda de voz e o auto que aparece no fim.
 *
 * - Confirmada (no modo de abordagem), uma onda sai do agente a `waveSpeed` hexágonos por
 *   segundo; cada suspeito reage quando ela chega até ele (quem está perto reage primeiro).
 * - Depois da onda, o auto de abordagem fica na tela até o jogador fechar; só então a vez passa.
 */
export const APPROACH_FX = {
  /** Atraso entre a confirmação e a saída da onda (o grito). */
  waveDelay: 0.15,
  waveSpeed: 7,
  /** Quanto o hexágono pula e brilha quando a onda passa (s). */
  bumpTime: 0.35,
  /** Folga depois que a onda chega no último anel, antes do auto aparecer (s). */
  waveTail: 0.55,
} as const;

/** Segundos, a partir da confirmação, até a onda chegar a um hexágono a `distance` do agente. */
export function waveArrival(
  distance: number,
  fx: { waveDelay: number; waveSpeed: number } = APPROACH_FX,
): number {
  return fx.waveDelay + distance / fx.waveSpeed;
}

/** Duração total da onda (até o auto de abordagem aparecer), em segundos. */
export function waveDuration(radius: number = BASE_APPROACH.radius): number {
  return waveArrival(radius) + APPROACH_FX.waveTail;
}

/** Pulo/brilho (0 a 1) de um hexágono `t` segundos depois de a onda chegar nele. */
export function waveBump(t: number, width: number = APPROACH_FX.bumpTime): number {
  return t <= 0 || t >= width ? 0 : Math.sin((Math.PI * t) / width);
}
