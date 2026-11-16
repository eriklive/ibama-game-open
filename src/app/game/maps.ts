import type { Burnable } from './burn';
import { ModelDef, MODELS } from './character-model';
import { EnemySpawn } from './enemies';
import type { Objective } from './mission';
import type { HiddenItem } from './search';
import { HexArea, HexCoord, circleArea, hexDistance, hexKey, rectArea } from './hex';
import type { CoverKind } from './scenery';
import { Terrain, openWorld } from './world';

/** Tipo de chão de um hexágono (só muda a aparência; quem bloqueia são paredes e árvores). */
export type Ground = 'grass' | 'runway' | 'apron' | 'floor' | 'dirt';

/** Retângulo de hexágonos (colunas e fileiras, inclusive): a planta de uma estrutura. */
export interface HexRect {
  cols: [number, number];
  rows: [number, number];
}

export interface GameMap {
  id: string;
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  /** Disponível para jogar agora. */
  available: boolean;
  /** Posições iniciais, uma por personagem (na ordem de `CHARACTERS`). */
  starts: { col: number; row: number }[];
  /** Hexágonos com parede: bloqueiam passagem e visão. */
  walls: { col: number; row: number }[];
  /** Hexágonos com árvores: bloqueiam passagem e visão, como as paredes. */
  trees?: HexCoord[];
  /** Chão de cada hexágono (chave de `hexKey`); sem isso, o tabuleiro azul de teste. */
  ground?: ReadonlyMap<string, Ground>;
  /**
   * Carga empilhada que serve de cobertura (ver `COVER_HEIGHT`): a alta bloqueia passagem e
   * visão, como parede; a baixa só bloqueia passagem e esconde quem está colado nela.
   */
  cover?: (HexCoord & { kind: CoverKind })[];
  /** Hexágonos com decoração solta (galões, botijão): não bloqueiam nada. */
  props?: HexCoord[];
  /** Hexágonos ocupados pelo avião estacionado: bloqueiam passagem e visão. */
  plane?: HexCoord[];
  /** Hangar: retângulo (colunas e fileiras, inclusive) cujas paredes viram chapa reta, com telhado em arco. */
  hangar?: HexRect;
  /**
   * Casa: retângulo cujas paredes viram tábuas, com telhado de duas águas que some quando um
   * agente entra. Paredes de dentro (divisórias) são colunas inteiras de `#` dentro do retângulo.
   */
  house?: HexRect;
  /** Coisas escondidas: aparecem com um teste de percepção e se acham inspecionando o móvel. */
  hidden?: HiddenItem[];
  /** O que a equipe pode queimar (o avião, os suprimentos do garimpo). */
  burnables?: Burnable[];
  /** Objetivos da missão (aparecem numa ficha na tela). */
  objectives?: Objective[];
  /** Inimigos e suas rotas de patrulha. */
  enemies: EnemySpawn[];
  /**
   * Área da missão: um círculo de `radius` passos em volta de `center`. Só se joga dentro
   * dele; sem isso, o retângulo `cols` × `rows` inteiro é jogável.
   */
  mission?: { center: HexCoord; radius: number };
  /** Mundo de cenário em volta da missão, até `radius` passos do centro dela. */
  world?: { radius: number; terrain: (h: HexCoord) => Terrain };
}

export interface Character {
  id: string;
  name: string;
  /** Letra exibida no retrato da interface. */
  initial: string;
  /** Cor do corpo da peça no tabuleiro e do retrato (hex RGB). */
  color: number;
  /** Modelo 3D do personagem; sem ele, o tabuleiro mostra a peça simples. */
  model?: ModelDef;
}

/** Os agentes jogáveis, na ordem dos turnos. */
export const CHARACTERS: Character[] = [
  { id: 'ana', name: 'Ana', initial: 'A', color: 0x2f9e57, model: MODELS.ana },
  { id: 'bruno', name: 'Bruno', initial: 'B', color: 0xe0712c, model: MODELS.bruno },
  { id: 'clara', name: 'Clara', initial: 'C', color: 0x9b5bd6, model: MODELS.clara },
];

/**
 * Monta as partes "desenháveis" de um mapa a partir de um esboço em texto: uma string
 * por linha, um caractere por coluna (lembrando que as colunas ímpares ficam meio
 * hexágono mais abaixo).
 *
 * `.` grama · `T` árvores · `#` parede · `_` piso interno · `D` porta (piso, passa)
 * `=` pista de asfalto · `:` pátio · `~` terra batida · `A` avião estacionado (piso, não passa)
 *
 * Carga no piso (cobertura, ver `COVER_HEIGHT`): `B` caixotes de madeira e `M` caixas de
 * papelão (altas) · `S` sacos no palete e `G` gaiolas vazias (baixas) · `f` galões e botijão
 * (só decoração, passa)
 *
 * Móveis: `m` mesa (baixa, como os sacos) · `P` prateleira encostada na parede (alta)
 *
 * `R` suprimentos do garimpo (pilha alta de caixas, galões e mangueiras: dá para queimar)
 */
export function parseLayout(
  layout: readonly string[],
): Pick<GameMap, 'cols' | 'rows' | 'walls' | 'trees' | 'ground' | 'plane' | 'cover' | 'props'> {
  const cols = layout[0].length;
  const walls: HexCoord[] = [];
  const trees: HexCoord[] = [];
  const plane: HexCoord[] = [];
  const cover: (HexCoord & { kind: CoverKind })[] = [];
  const props: HexCoord[] = [];
  const ground = new Map<string, Ground>();
  const kinds: Record<string, Ground> = {
    '.': 'grass', T: 'grass', '#': 'floor', _: 'floor', D: 'floor', A: 'floor', '=': 'runway', ':': 'apron', '~': 'dirt',
    B: 'floor', M: 'floor', S: 'floor', G: 'floor', f: 'floor', m: 'floor', P: 'floor', R: 'floor',
  };
  const coverKinds: Record<string, CoverKind> = {
    B: 'crates', M: 'boxes', S: 'sacks', G: 'cages', m: 'table', P: 'shelf', R: 'supplies',
  };
  layout.forEach((line, row) => {
    if (line.length !== cols) throw new Error(`Linha ${row} do mapa tem ${line.length} colunas (esperado: ${cols})`);
    [...line].forEach((ch, col) => {
      const kind = kinds[ch];
      if (!kind) throw new Error(`Caractere "${ch}" desconhecido no mapa (${col},${row})`);
      const h = { col, row };
      ground.set(hexKey(h), kind);
      if (ch === '#') walls.push(h);
      if (ch === 'T') trees.push(h);
      if (ch === 'A') plane.push(h);
      if (ch === 'f') props.push(h);
      if (coverKinds[ch]) cover.push({ ...h, kind: coverKinds[ch] });
    });
  });
  return { cols, rows: layout.length, walls, trees, ground, plane, cover, props };
}

/**
 * Altura de cada tipo de carga. **Alta**: ninguém passa e ninguém enxerga através (como
 * parede). **Baixa**: ninguém passa, mas o inimigo enxerga por cima — só não vê o agente
 * que está colado nela, do lado de lá (ver `visionHexes`).
 */
export const COVER_HEIGHT: Record<CoverKind, 'high' | 'low'> = {
  crates: 'high',
  boxes: 'high',
  sacks: 'low',
  cages: 'low',
  table: 'low',
  shelf: 'high',
  supplies: 'high',
};

const coverOf = (map: GameMap, height: 'high' | 'low'): HexCoord[] =>
  (map.cover ?? []).filter((c) => COVER_HEIGHT[c.kind] === height);

const areas = new WeakMap<GameMap, HexArea>();

/** Região jogável do mapa: o círculo da missão ou, sem missão, o retângulo inteiro. */
export function playArea(map: GameMap): HexArea {
  let area = areas.get(map);
  if (!area) {
    area = map.mission ? circleArea(map.mission.center, map.mission.radius) : rectArea(map.cols, map.rows);
    areas.set(map, area);
  }
  return area;
}

/** Hexágonos em que ninguém entra e através dos quais ninguém enxerga: paredes, árvores, o avião e a carga alta. */
export const blockedHexes = (map: GameMap): Set<string> =>
  new Set([...map.walls, ...(map.trees ?? []), ...(map.plane ?? []), ...coverOf(map, 'high')].map(hexKey));

/** Carga baixa: ninguém entra, mas não bloqueia a visão (só esconde quem está colado nela). */
export const lowCoverHexes = (map: GameMap): Set<string> => new Set(coverOf(map, 'low').map(hexKey));

/**
 * Aeroporto clandestino: o hangar fica ao norte, com um portão largo (12 hexágonos) e duas
 * portas nos fundos. A pista é um rastro de terra de 6 hexágonos de largura que sai do meio
 * do portão e corta a mata de sul a norte, até a borda do mapa. Por dentro cabem quatro aviões lado a lado (cada um ocupa
 * 4 colunas × 3 fileiras) em mais de uma fileira; por enquanto há um só, no meio. A carga
 * empilhada (cobertura) faz duas fileiras com vãos a oeste, um "L" a leste e um canto de gaiolas
 * junto ao portão; os vãos são passagens e janelas de visão. O resto é
 * mata fechada, cortada por trilhas e clareiras: a equipe parte de uma clareira no canto sudoeste.
 *
 * A leste da pista, numa clareira, fica a **casa** dos garimpeiros (colunas 29–41, fileiras
 * 26–32): dois cômodos de 5 × 5 separados por uma divisória com porta. Entra-se pela porta
 * do oeste, que dá para a pista. No cômodo 1 o Garimpeiro Jô come de costas para a entrada,
 * na mesa (`m`); no cômodo 2, a prateleira (`P`) na parede do leste esconde uma arma.
 *
 * A missão principal é queimar o **avião** e a pilha de **suprimentos do garimpo** (`R`), no
 * fundo do hangar, à direita de quem entra pelo portão.
 */
const AEROPORTO_LAYOUT = parseLayout([
  'TTTTTTTTTTTTT..TTTTTTTTTTTTTTT..TTTTTTTTTTTT',
  'TTTTTTTTTT.TTT.TTTTTTT..TTTTT...TTTTTTTTTTTT',
  'TTTTTTTTT..........................TTTTTTTTT',
  'TTTTTTTTT.T......................T.TTTTTTTTT',
  'TTTTTTTTT..###D##############D###...TTTTTTTT',
  'TTTTTTTTT..#____________________#..TTT.TTTTT',
  'TTTTTT.....#____________________#.......TTTT',
  'TTTT....T..#_BMB_MB_____________#........TTT',
  'TTTTT...TT.#_S____S____RRR_____f#.TTT...TTTT',
  'TTTTT..TT..#__________________B_#..TTT..TTTT',
  'TTTTTT.....#________AAAA______M_#.......TTTT',
  'TT.....TT..#________AAAA______Sf#..TTT....TT',
  'TTT.T.TT...#________AAAA______S_#..TT....TTT',
  'TTTT....T..#____________fSBMS___#........TTT',
  'TTTTT..TT..#_SS_MSS_____________#..TTT..TTTT',
  'T.T.T.TT...#____________________#..TT....TTT',
  '......TTT.T#__________________GG#T.TTT.T....',
  'T.T...TTT..#f_________________GG#..TTT...TTT',
  'TTTTT..TT..#####DDDDDDDDDDDD#####..TTT..TTTT',
  'TTTT...TT..........~~~~~~..........TTT..TTTT',
  'TTTTTT.TT.T........~~~~~~........T....TTTTTT',
  '...................~~~~~~...................',
  'T.TT.TTTT..TTT..TT.~~~~~~..T..TTT.TT..TTTT.T',
  'TTT..TTTTT.TT...T..~~~~~~.TT.TTTT..TTT.TTTTT',
  'TT.T..TTT...TTT..T.~~~~~~.TT..TT.TTTT..TT.TT',
  '...................~~~~~~...................',
  'TT.TTTTT..TTTTTTTT.~~~~~~..T.#############.T',
  'TTTTTTTT..TT.TTTT..~~~~~~.TT.#_____#_____#.T',
  'TTTT.......T.....T.~~~~~~.TT.#_____#_____#.T',
  'TTTTT.T......TTTTT.~~~~~~....D___m_D____P#.T',
  'TT........T..TTTTT.~~~~~~..T.#_____#_____#.T',
  'T........TTT...TT..~~~~~~.TT.#_____#_____#..',
  '..........TTT....T.~~~~~~.TT.#############.T',
  '.........TTTT...TT.~~~~~~.T................T',
  '.........TTT..T.TT.~~~~~~..TT.TT..TTTTTTTTTT',
  '........TTT...TTT..~~~~~~.TTTTTT..TTTTTTTTTT',
  'T.......TTTT.T.T.T.~~~~~~.TTTTT...TTTTTTTTTT',
  'TT.....TTTTTT..TTT.~~~~~~.TTTTT..TTTTTTTTTTT',
]);

/**
 * Mundo semiaberto: a missão é um círculo de 26 passos centrado no meio do desenho (pega o
 * hangar, a pista e a clareira da equipe; só as pontas dos cantos do desenho ficam de fora, como cenário).
 * Em volta, 100 passos de mata para a câmera passear — a pista e as trilhas continuam por ela.
 */
const AEROPORTO = openWorld(AEROPORTO_LAYOUT, { center: { col: 22, row: 19 }, radius: 26 }, 100);

export const MAPS: GameMap[] = [
  {
    id: 'teste-12x12',
    name: 'Campo de teste',
    subtitle: 'Mapa 12×12 · teste de movimentação',
    cols: 12,
    rows: 12,
    available: true,
    starts: [{ col: 5, row: 6 }, { col: 4, row: 7 }, { col: 6, row: 7 }],
    walls: [
      // muro ao norte, entre o piloto e os agentes
      { col: 4, row: 3 }, { col: 5, row: 4 }, { col: 6, row: 3 }, { col: 7, row: 4 },
      // pedras a oeste
      { col: 2, row: 6 }, { col: 2, row: 7 },
      // barreira a leste
      { col: 8, row: 6 }, { col: 8, row: 7 }, { col: 9, row: 8 },
      // tronco ao sul
      { col: 4, row: 9 }, { col: 5, row: 10 },
    ],
    enemies: [
      { id: 'piloto', name: 'Piloto', model: MODELS.piloto, patrol: [{ col: 2, row: 2 }, { col: 9, row: 2 }] },
      { id: 'garimpeiro', name: 'Garimpeiro', model: MODELS.garimpeiro, patrol: [{ col: 10, row: 4 }, { col: 10, row: 9 }] },
      {
        id: 'garimpeiro-pa',
        name: 'Garimpeiro da pá',
        model: MODELS.garimpeiroPa,
        patrol: [{ col: 8, row: 10 }, { col: 2, row: 10 }, { col: 1, row: 8 }],
      },
    ],
  },
  {
    id: 'aeroporto',
    name: 'Aeroporto',
    subtitle: 'Missão circular · pista de terra, hangar e mata',
    ...AEROPORTO,
    hangar: { cols: [11, 32], rows: [4, 18] },
    house: { cols: [29, 41], rows: [26, 32] },
    hidden: [
      {
        id: 'arma',
        name: 'arma',
        furniture: 'prateleira',
        spot: { col: 40, row: 29 },
        seized: 'Arma apreendida!',
        room: { cols: [36, 40], rows: [27, 31] },
      },
    ],
    burnables: [
      { id: 'aviao', name: 'o avião', short: 'avião', hexes: AEROPORTO.plane ?? [] },
      {
        id: 'suprimentos',
        name: 'os suprimentos do garimpo',
        short: 'suprimentos',
        hexes: (AEROPORTO.cover ?? []).filter((c) => c.kind === 'supplies').map(({ col, row }) => ({ col, row })),
      },
    ],
    objectives: [
      { id: 'queimar-aviao', text: 'Queimar o avião', burn: 'aviao', primary: true, unlocksEnd: true },
      { id: 'queimar-suprimentos', text: 'Queimar os suprimentos do garimpo', burn: 'suprimentos', primary: true },
      { id: 'render-jo', text: 'Render o Garimpeiro Jô', surrender: 'jo' },
      { id: 'apreender-arma', text: 'Apreender a arma escondida', find: 'arma' },
    ],
    available: true,
    starts: [{ col: 4, row: 34 }, { col: 3, row: 35 }, { col: 5, row: 35 }],
    enemies: [
      // dentro do hangar, dando a volta no avião
      {
        id: 'piloto',
        name: 'Piloto',
        model: MODELS.piloto,
        patrol: [{ col: 14, row: 6 }, { col: 29, row: 6 }, { col: 29, row: 16 }, { col: 14, row: 16 }],
      },
      // no pátio, em frente ao portão
      { id: 'garimpeiro', name: 'Garimpeiro', model: MODELS.garimpeiro, patrol: [{ col: 14, row: 20 }, { col: 29, row: 20 }] },
      // nos fundos, entre as duas portas
      { id: 'garimpeiro-pa', name: 'Garimpeiro da pá', model: MODELS.garimpeiroPa, patrol: [{ col: 13, row: 2 }, { col: 30, row: 2 }] },
      // na casa: parado, comendo na mesa, de costas para a porta
      {
        id: 'jo',
        name: 'Garimpeiro Jô',
        model: MODELS.garimpeiro,
        patrol: [{ col: 32, row: 29 }],
        facing: { col: 33, row: 29 },
      },
    ],
  },
  {
    id: 'missao-1-hangar',
    name: 'Missão 1 · Hangar',
    subtitle: 'Em breve',
    cols: 27,
    rows: 11,
    available: false,
    starts: [{ col: 2, row: 6 }, { col: 1, row: 5 }, { col: 1, row: 7 }],
    walls: [],
    enemies: [],
  },
];

/** Distância (em hexágonos) a partir da qual o interior de uma estrutura deixa de ser desenhado. */
export const STRUCTURE_SIGHT = 6;

/** O hexágono fica na planta da estrutura (paredes e portas inclusive). */
export const inStructure = (h: HexCoord, rect: HexRect): boolean =>
  h.col >= rect.cols[0] && h.col <= rect.cols[1] && h.row >= rect.rows[0] && h.row <= rect.rows[1];

/** Passos de um hexágono até a estrutura (0 se estiver nela). */
export function stepsToStructure(h: HexCoord, rect: HexRect): number {
  if (inStructure(h, rect)) return 0;
  const [c0, c1] = rect.cols;
  const [r0, r1] = rect.rows;
  // de fora, o hexágono mais próximo está sempre no perímetro
  let best = Infinity;
  for (let col = c0; col <= c1; col++) {
    best = Math.min(best, hexDistance(h, { col, row: r0 }), hexDistance(h, { col, row: r1 }));
  }
  for (let row = r0; row <= r1; row++) {
    best = Math.min(best, hexDistance(h, { col: c0, row }), hexDistance(h, { col: c1, row }));
  }
  return best;
}

/**
 * O que se desenha de uma estrutura, dadas as posições dos agentes: o teto some quando
 * algum agente entra (de fora ele fica) e o que há dentro só aparece com um agente a
 * até `sight` hexágonos dela.
 */
export function structureView(
  rect: HexRect,
  agents: Iterable<HexCoord>,
  sight = STRUCTURE_SIGHT,
): { roof: boolean; interior: boolean } {
  let roof = true;
  let interior = false;
  for (const a of agents) {
    if (inStructure(a, rect)) roof = false;
    if (stepsToStructure(a, rect) <= sight) interior = true;
  }
  return { roof, interior };
}

export const findMap = (id: string | null | undefined): GameMap | undefined =>
  MAPS.find((m) => m.id === id && m.available);

/** Regras de movimento: no início de cada turno o personagem rola 2d4 e anda a soma. */
export const MOVE_DICE = { count: 2, sides: 4 } as const;
