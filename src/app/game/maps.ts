export interface GameMap {
  id: string;
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  /** Disponível para jogar agora. */
  available: boolean;
  start: { col: number; row: number };
}

export const MAPS: GameMap[] = [
  {
    id: 'teste-12x12',
    name: 'Campo de teste',
    subtitle: 'Mapa 12×12 · teste de movimentação',
    cols: 12,
    rows: 12,
    available: true,
    start: { col: 5, row: 6 },
  },
  {
    id: 'missao-1-hangar',
    name: 'Missão 1 · Hangar',
    subtitle: 'Em breve',
    cols: 27,
    rows: 11,
    available: false,
    start: { col: 2, row: 6 },
  },
];

export const findMap = (id: string | null | undefined): GameMap | undefined =>
  MAPS.find((m) => m.id === id && m.available);

/** Regras do teste de movimentação. */
export const MOVE_RANGE = 2;
export const MOVES_PER_TEST = 3;
