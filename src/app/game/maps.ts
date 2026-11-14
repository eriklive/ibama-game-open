import { ModelDef, MODELS } from './character-model';
import { EnemySpawn } from './enemies';
import { HexCoord, hexKey } from './hex';

/** Tipo de chão de um hexágono (só muda a aparência; quem bloqueia são paredes e árvores). */
export type Ground = 'grass' | 'runway' | 'apron' | 'floor';

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
  /** Hexágonos ocupados pelo avião estacionado: bloqueiam passagem e visão. */
  plane?: HexCoord[];
  /** Hangar: retângulo (colunas e fileiras, inclusive) cujas paredes viram chapa reta, com telhado em arco. */
  hangar?: { cols: [number, number]; rows: [number, number] };
  /** Inimigos e suas rotas de patrulha. */
  enemies: EnemySpawn[];
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
 * `=` pista · `:` pátio · `A` avião estacionado (piso, não passa)
 */
export function parseLayout(
  layout: readonly string[],
): Pick<GameMap, 'cols' | 'rows' | 'walls' | 'trees' | 'ground' | 'plane'> {
  const cols = layout[0].length;
  const walls: HexCoord[] = [];
  const trees: HexCoord[] = [];
  const plane: HexCoord[] = [];
  const ground = new Map<string, Ground>();
  const kinds: Record<string, Ground> = { '.': 'grass', T: 'grass', '#': 'floor', _: 'floor', D: 'floor', A: 'floor', '=': 'runway', ':': 'apron' };
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
    });
  });
  return { cols, rows: layout.length, walls, trees, ground, plane };
}

/** Hexágonos em que ninguém entra e através dos quais ninguém enxerga: paredes, árvores e o avião. */
export const blockedHexes = (map: GameMap): Set<string> =>
  new Set([...map.walls, ...(map.trees ?? []), ...(map.plane ?? [])].map(hexKey));

/**
 * Aeroporto clandestino: o hangar fica ao norte, com o portão virado para o pátio e a
 * pista, e duas portas nos fundos. Por dentro cabem duas fileiras de quatro aviões (cada
 * um ocupa 4 colunas × 3 fileiras); por enquanto há um só, no meio. O resto é mata
 * fechada, cortada por trilhas e clareiras: a equipe chega pelo sul, do outro lado da pista.
 */
const AEROPORTO = parseLayout([
  'TTTTTTTTTTTTT..TTTTTTTTTTTTTTT..TTTTTTTTTTTT',
  'TTTTTTTTTT.TTT.TTTTTTT..TTTTT...TTTTTTTTTTTT',
  'TTTTTTTTT..........................TTTTTTTTT',
  'TTTTTTTTT.T......................T.TTTTTTTTT',
  'TTTTTTTTT..###D##############D###...TTTTTTTT',
  'TTTTTTTTT..#____________________#..TTT.TTTTT',
  'TTTTTT.....#____________________#.......TTTT',
  'TTTT....T..#____________________#........TTT',
  'TTTTT...TT.#________AAAA________#.TTT...TTTT',
  'TTTTT..TT..#________AAAA________#..TTT..TTTT',
  'TT.....TT..#________AAAA________#..TTT....TT',
  'T.T.T.TT...#____________________#..TT....TTT',
  '......TTT.T#____________________#T.TTT.T....',
  'T.T...TTT..#____________________#..TTT...TTT',
  'TTTTT..TT..########DDDDDD########..TTT..TTTT',
  'TTTT...TT....::::::::::::::::::....TTT..TTTT',
  'TTTTTT.TT.T..::::::::::::::::::..T....TTTTTT',
  '.............::::::::::::::::::.............',
  '.==========================================.',
  '.==========================================.',
  '.==========================================.',
  '............................................',
  'TT.TTTTT..TTTTTTTT...TT.TTTTT..TTTTT..TT.TTT',
  'TTTTTTTT..TT.TTTTTTTTT..TTTTTTT.TTT....TTTTT',
  'TTTT.......T......TTTT..TT.T.....TT.....TTTT',
  'TTTTT.T......TTTT......T.....TTTT....T..TTTT',
  'TT........T..TTTTTT......T.T.TTTT..........T',
  '...TT.TT.TTT...TTTTTT..TTTTTTTT..TTT.TT.TT..',
  'T.TTTTTTTTTTT...T.TTT...T.TTT....TTTTTTTTTTT',
  'TTTTTTTTTTTTT...........T.T......TTTTTTTTTTT',
  'TTTTTTTTTTTT..T..T...T......T.TT..TTTTTTTTTT',
  'TTTTTTTTTTT...TTTT........TTTTTT..TTTTTTTTTT',
  'TTTTTTTTTTTT.T.TTTTTT.....TTTTT...TTTTTTTTTT',
  'TTTTTTTTTTTTT..TTTTTTT..TTTTTTT..TTTTTTTTTTT',
]);

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
      // muro ao norte, entre o madeireiro e os agentes
      { col: 4, row: 3 }, { col: 5, row: 4 }, { col: 6, row: 3 }, { col: 7, row: 4 },
      // pedras a oeste
      { col: 2, row: 6 }, { col: 2, row: 7 },
      // barreira a leste
      { col: 8, row: 6 }, { col: 8, row: 7 }, { col: 9, row: 8 },
      // tronco ao sul
      { col: 4, row: 9 }, { col: 5, row: 10 },
    ],
    enemies: [
      { id: 'madeireiro', name: 'Madeireiro', model: MODELS.madeireiro, patrol: [{ col: 2, row: 2 }, { col: 9, row: 2 }] },
      { id: 'garimpeiro', name: 'Garimpeiro', model: MODELS.garimpeiro, patrol: [{ col: 10, row: 4 }, { col: 10, row: 9 }] },
      {
        id: 'cacador',
        name: 'Caçador',
        model: MODELS.cacador,
        patrol: [{ col: 8, row: 10 }, { col: 2, row: 10 }, { col: 1, row: 8 }],
      },
    ],
  },
  {
    id: 'aeroporto',
    name: 'Aeroporto',
    subtitle: 'Mapa 44×34 · pista, hangar e mata',
    ...AEROPORTO,
    hangar: { cols: [11, 32], rows: [4, 14] },
    available: true,
    starts: [{ col: 22, row: 30 }, { col: 21, row: 31 }, { col: 23, row: 31 }],
    enemies: [
      // dentro do hangar, dando a volta no avião
      {
        id: 'madeireiro',
        name: 'Madeireiro',
        model: MODELS.madeireiro,
        patrol: [{ col: 14, row: 6 }, { col: 29, row: 6 }, { col: 29, row: 12 }, { col: 14, row: 12 }],
      },
      // no pátio, em frente ao portão
      { id: 'garimpeiro', name: 'Garimpeiro', model: MODELS.garimpeiro, patrol: [{ col: 14, row: 16 }, { col: 29, row: 16 }] },
      // nos fundos, entre as duas portas
      { id: 'cacador', name: 'Caçador', model: MODELS.cacador, patrol: [{ col: 13, row: 2 }, { col: 30, row: 2 }] },
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

export const findMap = (id: string | null | undefined): GameMap | undefined =>
  MAPS.find((m) => m.id === id && m.available);

/** Regras de movimento: no início de cada turno o personagem rola 2d4 e anda a soma. */
export const MOVE_DICE = { count: 2, sides: 4 } as const;
