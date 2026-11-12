import { HUMANOID_ANIMS, ModelDef, heightOf } from './character-model';
import { EnemySpawn } from './enemies';

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

/** Modelo em `public/assets/characters/<id>/<id>.glb`, com a altura da pessoa em metros. */
const humanModel = (id: string, meters: number, tint?: number): ModelDef => ({
  url: `assets/characters/${id}/${id}.glb`,
  anims: HUMANOID_ANIMS,
  height: heightOf(meters),
  tint,
});

/** Os agentes jogáveis, na ordem dos turnos. */
export const CHARACTERS: Character[] = [
  {
    id: 'ana',
    name: 'Ana',
    initial: 'A',
    color: 0x2f9e57,
    model: humanModel('ana', 1.7),
  },
  { id: 'bruno', name: 'Bruno', initial: 'B', color: 0xe0712c, model: humanModel('bruno', 1.78) },
  { id: 'clara', name: 'Clara', initial: 'C', color: 0x9b5bd6, model: humanModel('clara', 1.68) },
];

/** Modelo dos inimigos: corpo masculino de barba, levemente tingido de vermelho. */
export const ENEMY_MODEL: ModelDef = humanModel('inimigo', 1.78, 0xc8323c);

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
      { id: 'madeireiro', name: 'Madeireiro', patrol: [{ col: 2, row: 2 }, { col: 9, row: 2 }] },
      { id: 'garimpeiro', name: 'Garimpeiro', patrol: [{ col: 10, row: 4 }, { col: 10, row: 9 }] },
      { id: 'cacador', name: 'Caçador', patrol: [{ col: 8, row: 10 }, { col: 2, row: 10 }, { col: 1, row: 8 }] },
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
