import { HexCoord, hexDistance } from './hex';
import { HexRect, inStructure } from './maps';

/**
 * Testes de dados fora do movimento (estilo "percepção passiva"): todos com 1d20, e
 * passa quem tira **mais que** o número da regra.
 *
 * - `notice`: ao entrar no cômodo de um esconderijo, cada agente rola percepção uma vez.
 *   Passando, ele repara no móvel e a equipe pode inspecioná-lo.
 * - `find`: inspecionar o móvel (colado nele) rola de novo; passando, acha o que está
 *   escondido. Cada tentativa gasta 1 de movimento, e dá para tentar de novo.
 */
export const SEARCH_RULES = {
  die: 20,
  notice: 6,
  find: 4,
  /** Movimento gasto por tentativa de inspecionar. */
  inspectCost: 1,
} as const;

/** Algo escondido no mapa (a arma na prateleira, por exemplo). */
export interface HiddenItem {
  id: string;
  /** Nome do que está escondido ("arma"). */
  name: string;
  /** Onde está guardado ("prateleira"): o hexágono do móvel. */
  furniture: string;
  spot: HexCoord;
  /** Aviso quando é achado ("Arma apreendida!"). */
  seized: string;
  /** Cômodo em que se rola percepção ao entrar (colunas e fileiras, inclusive). */
  room: HexRect;
}

/** Passa no teste: tirou mais que o alvo. */
export const beats = (roll: number, target: number): boolean => roll > target;

/** Chance (0..1) de passar num d`sides` precisando de mais que `target`. */
export const chance = (target: number, sides: number = SEARCH_RULES.die): number =>
  Math.min(1, Math.max(0, (sides - target) / sides));

/** Algum passo do caminho (ou a posição de partida) cai dentro do cômodo. */
export const entersRoom = (path: readonly HexCoord[], room: HexRect): boolean => path.some((h) => inStructure(h, room));

/** Colado no móvel: dá para inspecionar. */
export const canReach = (agent: HexCoord, spot: HexCoord): boolean => hexDistance(agent, spot) === 1;
