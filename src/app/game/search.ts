import { HexCoord, hexDistance } from './hex';
import { HexRect, inStructure } from './maps';

/**
 * Testes de dados fora do movimento: todos com 1d20, e passa quem tira **mais que** o número
 * da regra.
 *
 * - `notice` (percepção passiva): quem anda pelo cômodo de um móvel com algo escondido (o armário
 *   do caseiro, o fundo do hangar com o quadro de chaves) rola percepção uma vez. Passando, repara
 *   no móvel: ele ganha o contorno pulsante dos alvos tocáveis e a equipe passa a poder abri-lo
 *   (zoom, com a peça — a arma, a chave do avião — destacada). Falhando, nada se destaca. Um
 *   suspeito que conta (o caseiro, o piloto) também faz o móvel contar como percebido.
 */
export const SEARCH_RULES = {
  die: 20,
  notice: 6,
} as const;

/** Algo escondido no mapa (a arma no armário, por exemplo). */
export interface HiddenItem {
  id: string;
  /** Nome do que está escondido ("arma"). */
  name: string;
  /** Onde está guardado ("armário"): o hexágono do móvel. */
  furniture: string;
  /** Título do zoom no móvel ("Armário do caseiro"). */
  title: string;
  /** O móvel com a preposição, para as frases ("no armário"). */
  at: string;
  /** O que se vê tocando no resto do móvel ("Potes, latas e roupa dobrada."). */
  clutter: string;
  /** O que se destaca no zoom do móvel ("Uma coronha de madeira…"). */
  glimpse: string;
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

/**
 * Precisa rolar percepção: o agente `who` entrou (pelo `path`) no cômodo do móvel `id`, ainda
 * não rolou ali e ninguém reparou nele. Já percebido — por um teste ou porque alguém contou
 * (um suspeito que confessa, ver `Outcome.notices` em `interrogation.ts`) — não rola mais.
 */
export function needsNoticeRoll(
  item: { id: string; room: HexRect },
  who: string,
  path: readonly HexCoord[],
  noticed: ReadonlySet<string>,
  rolled: ReadonlySet<string>,
): boolean {
  return !noticed.has(item.id) && !rolled.has(`${item.id}:${who}`) && entersRoom(path, item.room);
}
