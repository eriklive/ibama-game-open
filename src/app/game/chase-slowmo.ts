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
