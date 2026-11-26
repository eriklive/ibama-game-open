import { HexCoord, hexDistance } from './hex';
import { HexRect, inStructure } from './maps';

/**
 * Testes de dados fora do movimento: todos com 1d20, e passa quem tira **mais que** o número
 * da regra.
 *
 * - `notice` (percepção): tocar num móvel com zoom (o armário de um esconderijo, o quadro de
 *   chaves) aproxima a câmera e rola percepção, uma vez por agente em cada móvel. Passando, a
 *   peça escondida (a arma, a chave do avião) ganha o destaque de "dá para pegar" e a equipe
 *   passa a reconhecê-la. Falhando, a peça continua lá e dá para pegá-la com um toque — só não
 *   se destaca entre o resto. Se a equipe já sabe (alguém percebeu, um suspeito contou), o
 *   destaque vem sem rolar.
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
  /** No que o agente repara quando a percepção passa ("numa coronha de madeira…"). */
  glimpse: string;
  spot: HexCoord;
  /** Aviso quando é achado ("Arma apreendida!"). */
  seized: string;
  /** Cômodo do esconderijo (colunas e fileiras, inclusive). */
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
 * Precisa rolar percepção no zoom do móvel `id`: a equipe ainda não reconhece a peça (`known`)
 * e o agente `who` não tentou nesse móvel (`rolled` guarda `móvel:agente`).
 */
export const needsPropRoll = (id: string, who: string, known: boolean, rolled: ReadonlySet<string>): boolean =>
  !known && !rolled.has(`${id}:${who}`);
