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
 * `=` pista · `:` pátio
 */
export function parseLayout(
  layout: readonly string[],
): Pick<GameMap, 'cols' | 'rows' | 'walls' | 'trees' | 'ground'> {
  const cols = layout[0].length;
  const walls: HexCoord[] = [];
  const trees: HexCoord[] = [];
  const ground = new Map<string, Ground>();
  const kinds: Record<string, Ground> = { '.': 'grass', T: 'grass', '#': 'floor', _: 'floor', D: 'floor', '=': 'runway', ':': 'apron' };
  layout.forEach((line, row) => {
    if (line.length !== cols) throw new Error(`Linha ${row} do mapa tem ${line.length} colunas (esperado: ${cols})`);
    [...line].forEach((ch, col) => {
      const kind = kinds[ch];
      if (!kind) throw new Error(`Caractere "${ch}" desconhecido no mapa (${col},${row})`);
      const h = { col, row };
      ground.set(hexKey(h), kind);
      if (ch === '#') walls.push(h);
      if (ch === 'T') trees.push(h);
    });
  });
  return { cols, rows: layout.length, walls, trees, ground };
}

/** Hexágonos em que ninguém entra e através dos quais ninguém enxerga: paredes e árvores. */
export const blockedHexes = (map: GameMap): Set<string> =>
  new Set([...map.walls, ...(map.trees ?? [])].map(hexKey));

/**
 * Aeroporto clandestino: o terminal fica ao norte, com a entrada da frente (2 hexágonos)
 * virada para o pátio e a pista, e duas portas nos fundos. O resto é mata fechada, cortada
 * por trilhas e clareiras: a equipe chega pelo sul, do outro lado da pista, e os corredores
 * entre o terminal e a mata levam às portas de trás.
 */
const AEROPORTO = parseLayout([
  'TTTTTT..TTTTTTTTTTTTTTTT..TTTTTT',
  'TTTT....TTT..........TTT....TTTT',
  'TTT...TTTT............TTTT...TTT',
  'TT...TTTT..............TTTT...TT',
  'TT..TTTT....#D####D#....TTTT..TT',
  'T...TTT.....#______#.....TTT...T',
  'T..TTTT.....#______#.....TTTT..T',
  'T...TTT.....#______#.....TTT...T',
  'TT..TT......###DD###......TT..TT',
  'TT.......::::::::::::::.......TT',
  'T........::::::::::::::........T',
  '.==============================.',
  '.==============================.',
  '.==============================.',
  'T..............................T',
  'TTT..TTTTT...TTTT..TTTT...TTT.TT',
  'TTTT..TTTTT..TTT....TTT..TTTT..T',
  'TTT...TTTT...TT..TT..TT...TTT..T',
  'TT..T..TT...TTT.TTTT.TTT...T..TT',
  'TT.TTT.....TTTT..TT..TTTT....TTT',
  'T..TTTT...TTTT........TTTT..TTTT',
  'TT..TTT..TTTT....TT....TTT..TTTT',
  'TTT..T...TTT....TTTT....T...TTTT',
  'TTTT....TTTT............TT..TTTT',
  'TTTTT..TTTTT...TTTTTT...TTTTTTTT',
  'TTTTTTTTTTTTT.TTTTTTTT.TTTTTTTTT',
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
    subtitle: 'Mapa 32×26 · pista, terminal e mata',
    ...AEROPORTO,
    available: true,
    starts: [{ col: 15, row: 22 }, { col: 14, row: 23 }, { col: 16, row: 23 }],
    enemies: [
      // dentro do terminal
      { id: 'madeireiro', name: 'Madeireiro', model: MODELS.madeireiro, patrol: [{ col: 13, row: 6 }, { col: 18, row: 6 }] },
      // no pátio, em frente à entrada
      { id: 'garimpeiro', name: 'Garimpeiro', model: MODELS.garimpeiro, patrol: [{ col: 10, row: 10 }, { col: 21, row: 10 }] },
      // nos fundos, entre as duas portas
      { id: 'cacador', name: 'Caçador', model: MODELS.cacador, patrol: [{ col: 11, row: 2 }, { col: 20, row: 2 }] },
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
