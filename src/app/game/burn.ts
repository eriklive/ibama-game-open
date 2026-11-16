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
