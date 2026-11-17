import { BASE_APPROACH } from './enemies';

/**
 * Tempo da abordagem: o gesto de segurar, a onda de voz e o auto que aparece no fim.
 *
 * - Toque rápido no **Abordar** (até `tapMs`) abre a prévia de sempre.
 * - Segurando, o raio cresce anel por anel até `radius`; ao fechar (`holdMs` depois do
 *   toque rápido) a abordagem é confirmada. Soltar antes desiste.
 * - Confirmada, uma onda sai do agente a `waveSpeed` hexágonos por segundo; cada suspeito
 *   reage quando ela chega até ele (quem está perto reage primeiro).
 * - Depois da onda, o auto de abordagem fica `reportMs` na tela e a vez passa.
 */
export const APPROACH_FX = {
  tapMs: 220,
  holdMs: 800,
  /** Atraso entre a confirmação e a saída da onda (o grito). */
  waveDelay: 0.15,
  waveSpeed: 7,
  /** Quanto o hexágono pula e brilha quando a onda passa (s). */
  bumpTime: 0.35,
  /** Folga depois que a onda chega no último anel, antes do auto aparecer (s). */
  waveTail: 0.55,
  reportMs: 2800,
} as const;

/** Progresso (0 a 1) do gesto de segurar, `ms` depois de apertar; 0 durante o toque rápido. */
export function holdProgress(
  ms: number,
  fx: { tapMs: number; holdMs: number } = APPROACH_FX,
): number {
  return Math.min(1, Math.max(0, (ms - fx.tapMs) / fx.holdMs));
}

/** Até que anel o raio já cresceu com esse progresso (0 = nenhum, `radius` = completo). */
export function holdRing(progress: number, radius: number = BASE_APPROACH.radius): number {
  return progress <= 0 ? 0 : Math.min(radius, Math.ceil(progress * radius));
}

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
