import type { EnemyState } from './enemies';
import { HexCoord, hexDistance } from './hex';

/**
 * Queimar o que sustenta o garimpo (o avião, a pilha de suprimentos). É a missão principal:
 * colado no alvo, o agente ateia fogo, o que **encerra a vez** dele. O fogo e a fumaça
 * chamam atenção: quem está vigiando a até `alertRadius` hexágonos vê e entra em alerta
 * (vai tentar correr no turno inimigo, como depois de uma abordagem).
 */
export const BURN_RULES = {
  /** Distância máxima até algum hexágono do alvo para atear fogo (1 = colado). */
  reach: 1,
  /** Inimigos vigiando a até este raio do fogo veem as chamas e entram em alerta. */
  alertRadius: 5,
  /**
   * Tocar num hexágono a até esta distância do avião vale como tocar nele: o agente vai sozinho
   * para o lado do avião mais perto do toque (ver `sideSpot`).
   */
  snap: 2,
} as const;

/** Algo que a equipe pode queimar: ocupa um ou mais hexágonos (que continuam bloqueando). */
export interface Burnable {
  id: string;
  /**
   * Com artigo, para as frases: "o avião", "os suprimentos do garimpo" (o aviso junta com
   * "n": "no avião", "nos suprimentos").
   */
  name: string;
  /** Rótulo curto para o botão: "avião", "suprimentos". */
  short: string;
  hexes: HexCoord[];
  /**
   * Não se queima direto: o botão é **Inspecionar** (o avião trancado), e o menu dele traz
   * `olhar dentro` e `queimar` (ver `plane.ts`).
   */
  inspect?: boolean;
}

/** Distância do agente até o hexágono mais próximo do alvo. */
export const distanceTo = (agent: HexCoord, target: Burnable): number =>
  Math.min(...target.hexes.map((h) => hexDistance(agent, h)));

/** Colado no alvo: dá para atear fogo. */
export const canBurn = (agent: HexCoord, target: Burnable): boolean => distanceTo(agent, target) <= BURN_RULES.reach;

/** Primeiro alvo ainda inteiro ao alcance do agente (ou `null`). */
export const burnTarget = (
  agent: HexCoord,
  targets: readonly Burnable[],
  burned: ReadonlySet<string>,
): Burnable | null => targets.find((t) => !burned.has(t.id) && canBurn(agent, t)) ?? null;

/** Inimigos vigiando perto o bastante para ver o fogo (entram em alerta). */
export const seeFire = (target: Burnable, enemies: readonly EnemyState[]): EnemyState[] =>
  enemies.filter((e) => e.status === 'patrol' && distanceTo(e.hex, target) <= BURN_RULES.alertRadius);

/** O toque neste hexágono vale como tocar no alvo (o entorno do avião, ver `BURN_RULES.snap`). */
export const inSnap = (hex: HexCoord, target: Burnable): boolean => distanceTo(hex, target) <= BURN_RULES.snap;

/**
 * Para onde o agente vai ao tocar no alvo: um hexágono colado nele, entre `options` (os destinos
 * possíveis, com o custo para chegar) e o próprio lugar do agente (`from`, custo 0, se já está
 * colado). Com `near` (o hexágono tocado no entorno), o mais perto do toque; senão, o mais barato.
 * `null`: não dá para chegar colado neste turno.
 */
export function sideSpot(
  target: Burnable,
  from: HexCoord,
  options: readonly { hex: HexCoord; cost: number }[],
  near?: HexCoord,
): HexCoord | null {
  const spots = options.filter((o) => canBurn(o.hex, target));
  if (canBurn(from, target)) spots.push({ hex: from, cost: 0 });
  let best: { hex: HexCoord; cost: number; gap: number } | null = null;
  for (const o of spots) {
    const gap = near ? hexDistance(o.hex, near) : 0;
    if (!best || gap < best.gap || (gap === best.gap && o.cost < best.cost)) best = { ...o, gap };
  }
  return best?.hex ?? null;
}
