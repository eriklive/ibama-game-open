import * as THREE from 'three';
import type { BreakInRoll } from './door';

/**
 * Cena de quem reage ao arrombamento (ver `GameScreen.breakIn`): a câmera fecha no garimpeiro,
 * o cenário que tapa a vista some, a papelada da HUD sai e só ficam a ficha do d20 e os avisos.
 * Depois do carimbo, o jogo espera o **Confirmar**. Os tempos, num lugar só (ms).
 */
export const BREAK_IN_SCENE = {
  /** A câmera chega nele e ele olha de um lado para o outro, antes de rolar. */
  lookMs: 900,
  /** O d20 gira este tempo (em slow) até parar: devagar o bastante para acompanhar. */
  rollMs: 2200,
  /** Depois do carimbo, a reação (rende, vira para correr) antes do botão aparecer. */
  reactMs: 650,
  /** Zoom da câmera da cena por cima do da porta (menor = mais perto; o chute usa 0,66). */
  zoom: 0.55,
  /** Giro e rolagem de leve da câmera para o lado dele (rad), como `tiltCineTo`. */
  yaw: 0.1,
  roll: 0.035,
  /** Alturas (m) do corpo que a câmera precisa enxergar: pés, peito e cabeça. */
  bodyHeights: [0.25, 1.2, 1.75],
  /**
   * Distância (m) antes do corpo em que o raio da câmera para: o que está colado nele (a
   * cadeira em que senta, a parede atrás) não conta como "na frente".
   */
  clearance: 0.6,
  /** Texto do botão que fecha a ficha e devolve o jogo. */
  confirm: 'Confirmar',
} as const;

/** Aviso do resultado de quem reagiu ("Fulano se rendeu!"). */
export function breakInVerdict(r: Pick<BreakInRoll, 'outcome' | 'test'> & { enemy: { name: string } }): string {
  const who = r.enemy.name;
  switch (r.outcome) {
    case 'surrender':
      return `${who} se rendeu!`;
    case 'flee':
      return r.test === 'resist' ? `${who} não se rendeu: vai correr` : `${who} tomou coragem: vai correr`;
    case 'stay':
      return `${who} não se rendeu, mas ficou parado`;
  }
}

/**
 * Peças do cenário entre a câmera (`origin`) e algum dos `points`: cada candidato que um raio
 * da câmera até o ponto atravessa antes de chegar a `clearance` do ponto. `shown` filtra os
 * acertos (o raio pega também o que está escondido, como o telhado recolhido); por padrão,
 * todo acerto conta. Os candidatos precisam estar com a matriz de mundo em dia.
 */
export function viewBlockers(
  origin: THREE.Vector3,
  points: readonly THREE.Vector3[],
  candidates: Iterable<THREE.Object3D>,
  opts: { clearance?: number; shown?: (hit: THREE.Object3D, root: THREE.Object3D) => boolean } = {},
): Set<THREE.Object3D> {
  const clearance = opts.clearance ?? BREAK_IN_SCENE.clearance;
  const shown = opts.shown ?? (() => true);
  const list = [...candidates];
  const blockers = new Set<THREE.Object3D>();
  const ray = new THREE.Raycaster();
  const dir = new THREE.Vector3();
  for (const p of points) {
    dir.copy(p).sub(origin);
    const len = dir.length();
    if (len <= clearance) continue;
    ray.set(origin, dir.divideScalar(len));
    ray.near = 0;
    ray.far = len - clearance;
    for (const c of list) {
      if (blockers.has(c)) continue;
      if (ray.intersectObject(c, true).some((h) => shown(h.object, c))) blockers.add(c);
    }
  }
  return blockers;
}
