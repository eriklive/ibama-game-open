/**
 * O "ultra slow" da perseguição, num lugar só: a fita da música, a animação de quem corre e o
 * zoom da câmera usam os mesmos números, para a cena desacelerar e voltar junto com o som.
 */
export const CHASE_SLOWMO = {
  /** Velocidade no fundo do slow (1 = normal): a fita cai para isto (tempo e tom juntos). */
  rate: 0.25,
  /** Segundos da rampa de descida (linear, como a da fita). */
  slowRamp: 0.4,
  /** Segundos da volta: rápida, no gesto. */
  resumeRamp: 0.15,
  /**
   * Parte da desaceleração que vira zoom: no fundo do slow o FOV fecha `(1 − rate) × zoom`
   * (com 0,25 e 0,12: 9%, um zoom pequeno).
   */
  zoom: 0.12,
} as const;

/**
 * Fator do slow num instante: `progress` de 0 (normal) a 1 (fundo do slow) vira a velocidade
 * (1 → `rate`), o mesmo valor que a fita da música tem naquele momento.
 */
export function slowmoRate(progress: number): number {
  return 1 - (1 - CHASE_SLOWMO.rate) * Math.min(1, Math.max(0, progress));
}

/** FOV com o zoom do slow, para a velocidade `rate` (1: sem zoom). */
export function slowmoFov(fov: number, rate: number): number {
  return fov * (1 - (1 - rate) * CHASE_SLOWMO.zoom);
}

/**
 * Pulso de slow-mo da corrida (caixote e porta): o tempo desacelera até parar (`downMs`), fica
 * parado (`holdMs`: o dado da porta) e volta (`upMs`). Pega os dois corredores juntos: ninguém
 * para, o tempo é que para (e quem corre fica congelado na pose em que estava, sem trocar para a
 * animação de parado).
 *
 * No caixote o tempo parado é a escolha do jogador: até `vaultHoldMs` (10 s) se ele não tocar em
 * nada; escolheu, o tempo volta na hora.
 */
export const SLOWMO_PULSE = {
  downMs: 300,
  holdMs: 1000,
  vaultHoldMs: 10000,
  upMs: 300,
} as const;

/** Duração total do pulso (ms), com `holdMs` de tempo parado. */
export const pulseTotalMs = (holdMs: number = SLOWMO_PULSE.holdMs): number =>
  SLOWMO_PULSE.downMs + holdMs + SLOWMO_PULSE.upMs;

/** Fim do tempo parado (ms desde o começo do pulso): a decisão fecha aqui. */
export const pulseHoldEndMs = (holdMs: number = SLOWMO_PULSE.holdMs): number => SLOWMO_PULSE.downMs + holdMs;

/** Velocidade do tempo `ms` depois de começar o pulso (1 normal, 0 parado). */
export function pulseRate(ms: number, holdMs: number = SLOWMO_PULSE.holdMs): number {
  const { downMs, upMs } = SLOWMO_PULSE;
  if (ms <= 0) return 1;
  if (ms < downMs) return 1 - ms / downMs;
  if (ms < downMs + holdMs) return 0;
  if (ms < downMs + holdMs + upMs) return (ms - downMs - holdMs) / upMs;
  return 1;
}

/**
 * Um pulso novo com outro ainda correndo: onde ele começa (ms atrás de agora) para emendar sem
 * pulo na velocidade (entra na descida na velocidade de agora, ou já no tempo parado).
 */
export function pulseRestart(rateNow: number): number {
  return SLOWMO_PULSE.downMs * (1 - Math.min(1, Math.max(0, rateNow)));
}
