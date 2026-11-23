/**
 * Laboratório do Modo Corrida (protótipo, só para renders): dois mapas de corrida montados a
 * partir do Aeroporto, esticados ao longo da corrida, com a pista no meio (3 faixas de 2
 * colunas). O corredor vai para o norte (fileira diminuindo).
 */
import { GameMap, parseLayout } from '../game/maps';
import { CoverKind } from '../game/scenery';
import { HexCoord } from '../game/hex';
import { MODELS } from '../game/character-model';

export const W = 26;
/** Colunas da pista: faixas esquerda (10–11), meio (12–13) e direita (14–15). */
export const LANES = { L: [10, 11], C: [12, 13], R: [14, 15] } as const;

type Row = string[];
const row = (fill: string): Row => Array.from({ length: W }, () => fill);
const put = (r: Row, cols: number[] | [number, number], ch: string): Row => {
  const [a, b] = cols.length === 2 ? cols : [cols[0], cols[cols.length - 1]];
  for (let c = a; c <= b; c++) r[c] = ch;
  return r;
};
const hash = (c: number, r: number) => {
  const x = Math.sin(c * 127.1 + r * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** Mata dos lados: fechada longe da pista, com algumas clareiras perto. */
function forest(r: number, track: [number, number], ground: string, margin = 2): Row {
  const line = row('T');
  for (let c = 0; c < W; c++) {
    const d = c < track[0] ? track[0] - c : c > track[1] ? c - track[1] : 0;
    if (d === 0) line[c] = ground;
    else if (d <= margin) line[c] = hash(c, r) < 0.82 ? '.' : 'T';
    else if (d <= margin + 2) line[c] = hash(c, r) < 0.35 ? '.' : 'T';
  }
  return line;
}

export interface RaceZone {
  id: string;
  name: string;
  rows: [number, number];
  /** Onde o corredor nasce quando a perseguição começa nesta zona. */
  start: HexCoord;
}
export interface RaceObstacle extends HexCoord {
  kind: CoverKind | 'log' | 'branch' | 'shutter' | 'fuel' | 'tarp';
  /** O que o jogador faz: pular, deslizar ou trocar de faixa. */
  move: 'pular' | 'deslizar' | 'desviar';
  span?: number;
}
export interface RaceMap {
  map: GameMap;
  zones: RaceZone[];
  obstacles: RaceObstacle[];
}

const T: [number, number] = [10, 15];

/** Mapa A: pista de terra → portão → hangar (avião) → porta dos fundos → trilha na mata. */
export function raceA(): RaceMap {
  const rows: Row[] = [];
  // 0..43 mata norte (trilha de grama)
  for (let r = 0; r < 44; r++) rows.push(forest(r, T, '.', 1));
  // 44..45 clareira atrás do hangar
  for (let r = 44; r < 46; r++) rows.push(forest(r, [6, 19], '.', 1));
  // 46 parede norte com a porta dos fundos (2 hexágonos, faixa do meio)
  rows.push(put(put(put(forest(46, [3, 22], '.', 0), [4, 21], '#'), [12, 13], 'D'), [4, 4], '#'));
  // 47..85 dentro do hangar
  for (let r = 47; r < 86; r++) {
    const line = forest(r, [3, 22], '.', 0);
    put(line, [4, 21], '_');
    line[4] = '#';
    line[21] = '#';
    rows.push(line);
  }
  // 86 portão (fileira de D)
  rows.push(put(put(forest(86, [3, 22], '.', 0), [4, 21], '#'), [6, 19], 'D'));
  // 87..96 pátio na frente do portão
  for (let r = 87; r < 97; r++) rows.push(put(forest(r, [5, 20], '.', 1), T, '~'));
  // 97..140 pista de terra
  for (let r = 97; r < 141; r++) rows.push(forest(r, T, '~', 2));
  // avião na metade oeste do hangar, de 60 a 65: tapa a faixa da esquerda
  for (let r = 60; r < 66; r++) for (let c = 4 + 1; c <= 12 - 1; c++) rows[r][c] = c >= 5 && c <= 11 ? 'A' : rows[r][c];
  // a fileira 66 com 8 colunas (o avião ocupa 8 × 6; aqui 7 × 6 basta para a faixa esquerda)
  const layout = parseLayout(rows.map((r) => r.join('')));
  const cover: (HexCoord & { kind: CoverKind })[] = [];
  const obstacles: RaceObstacle[] = [
    // pista de terra
    { col: 12, row: 128, kind: 'fuel', move: 'pular' },
    { col: 13, row: 128, kind: 'fuel', move: 'pular' },
    { col: 10, row: 120, kind: 'log', move: 'pular', span: 4 },
    { col: 14, row: 112, kind: 'crates', move: 'desviar' },
    { col: 15, row: 112, kind: 'crates', move: 'desviar' },
    { col: 12, row: 104, kind: 'tarp', move: 'deslizar', span: 2 },
    // pátio
    { col: 10, row: 92, kind: 'cages', move: 'pular' },
    { col: 11, row: 92, kind: 'cages', move: 'pular' },
    { col: 14, row: 90, kind: 'lowCrate', move: 'pular' },
    // hangar
    { col: 12, row: 80, kind: 'sacks', move: 'pular' },
    { col: 13, row: 80, kind: 'sacks', move: 'pular' },
    { col: 14, row: 74, kind: 'boxes', move: 'desviar' },
    { col: 15, row: 74, kind: 'boxes', move: 'desviar' },
    { col: 12, row: 56, kind: 'lowCrate', move: 'pular' },
    { col: 14, row: 52, kind: 'crates', move: 'desviar' },
    { col: 15, row: 52, kind: 'crates', move: 'desviar' },
    // porta dos fundos meio aberta: deslizar por baixo
    { col: 12, row: 46, kind: 'shutter', move: 'deslizar', span: 2 },
    // mata norte
    { col: 10, row: 36, kind: 'log', move: 'pular', span: 6 },
    { col: 14, row: 28, kind: 'branch', move: 'deslizar', span: 2 },
    { col: 10, row: 22, kind: 'branch', move: 'deslizar', span: 4 },
    { col: 14, row: 14, kind: 'log', move: 'pular', span: 2 },
  ];
  for (const o of obstacles) if (!['log', 'branch', 'shutter', 'fuel', 'tarp'].includes(o.kind)) cover.push({ col: o.col, row: o.row, kind: o.kind as CoverKind });
  const map: GameMap = {
    id: 'corrida-a',
    name: 'Corrida A · pelo hangar',
    subtitle: 'laboratório',
    available: false,
    ...layout,
    cover,
    structures: [{ kind: 'hangar', rect: { cols: [4, 21], rows: [46, 86] } }],
    starts: [{ col: 12, row: 124 }],
    enemies: [{ id: 'vigia', name: 'Vigia', model: MODELS.garimpeiro, patrol: [{ col: 13, row: 117 }] }],
  };
  const zones: RaceZone[] = [
    { id: 'pista', name: 'Pista de terra', rows: [97, 140], start: { col: 12, row: 132 } },
    { id: 'patio', name: 'Pátio do portão', rows: [87, 96], start: { col: 12, row: 96 } },
    { id: 'hangar', name: 'Hangar', rows: [47, 86], start: { col: 12, row: 70 } },
    { id: 'fundos', name: 'Porta dos fundos', rows: [44, 46], start: { col: 12, row: 50 } },
    { id: 'mata', name: 'Mata norte (fora da pista)', rows: [0, 43], start: { col: 12, row: 42 } },
  ];
  return { map, zones, obstacles };
}

/** Mapa B: pista de terra → pátio → pela lateral leste do hangar (por fora) → mata leste. */
export function raceB(): RaceMap {
  const rows: Row[] = [];
  const H: [number, number] = [0, 8];
  for (let r = 0; r < 40; r++) rows.push(forest(r, T, '.', 1));
  // 40..86: o hangar à esquerda (por fora, parede leste na coluna 8); a pista corre colada nele
  for (let r = 40; r < 87; r++) {
    const line = forest(r, [8, 17], '.', 1);
    put(line, H, '_');
    line[8] = '#';
    line[0] = '#';
    if (r === 40 || r === 86) put(line, H, '#');
    put(line, T, r < 80 ? '.' : '~');
    rows.push(line);
  }
  // porta lateral do hangar (por onde sai quem estava dentro)
  rows[66][8] = 'D';
  rows[67][8] = 'D';
  for (let r = 87; r < 97; r++) rows.push(put(forest(r, [5, 20], '.', 1), T, '~'));
  for (let r = 97; r < 141; r++) rows.push(forest(r, T, '~', 2));
  const layout = parseLayout(rows.map((r) => r.join('')));
  const obstacles: RaceObstacle[] = [
    { col: 12, row: 128, kind: 'fuel', move: 'pular' },
    { col: 13, row: 128, kind: 'fuel', move: 'pular' },
    { col: 10, row: 120, kind: 'log', move: 'pular', span: 4 },
    { col: 14, row: 112, kind: 'crates', move: 'desviar' },
    { col: 15, row: 112, kind: 'crates', move: 'desviar' },
    { col: 12, row: 104, kind: 'tarp', move: 'deslizar', span: 2 },
    // pátio: a pista vira para a lateral
    { col: 12, row: 90, kind: 'cages', move: 'pular' },
    { col: 13, row: 90, kind: 'cages', move: 'pular' },
    // lateral do hangar: carga largada do lado de fora (como no mapa tático)
    { col: 14, row: 80, kind: 'crates', move: 'desviar' },
    { col: 15, row: 80, kind: 'crates', move: 'desviar' },
    { col: 10, row: 74, kind: 'cages', move: 'pular' },
    { col: 11, row: 74, kind: 'cages', move: 'pular' },
    { col: 12, row: 60, kind: 'tarp', move: 'deslizar', span: 4 },
    { col: 14, row: 52, kind: 'lowCrate', move: 'pular' },
    { col: 15, row: 52, kind: 'lowCrate', move: 'pular' },
    { col: 10, row: 44, kind: 'crates', move: 'desviar' },
    { col: 11, row: 44, kind: 'crates', move: 'desviar' },
    // mata leste
    { col: 10, row: 32, kind: 'log', move: 'pular', span: 6 },
    { col: 12, row: 22, kind: 'branch', move: 'deslizar', span: 4 },
    { col: 10, row: 12, kind: 'log', move: 'pular', span: 2 },
  ];
  const cover = obstacles
    .filter((o) => !['log', 'branch', 'shutter', 'fuel', 'tarp'].includes(o.kind))
    .map((o) => ({ col: o.col, row: o.row, kind: o.kind as CoverKind }));
  const map: GameMap = {
    id: 'corrida-b',
    name: 'Corrida B · pela lateral',
    subtitle: 'laboratório',
    available: false,
    ...layout,
    cover,
    structures: [{ kind: 'hangar', rect: { cols: H, rows: [40, 86] } }],
    starts: [{ col: 12, row: 124 }],
    enemies: [{ id: 'vigia', name: 'Vigia', model: MODELS.garimpeiro, patrol: [{ col: 13, row: 117 }] }],
  };
  const zones: RaceZone[] = [
    { id: 'pista', name: 'Pista de terra', rows: [97, 140], start: { col: 12, row: 132 } },
    { id: 'patio', name: 'Pátio do portão', rows: [87, 96], start: { col: 12, row: 96 } },
    { id: 'lateral', name: 'Lateral do hangar', rows: [40, 86], start: { col: 12, row: 68 } },
    { id: 'mata', name: 'Mata leste (fora da pista)', rows: [0, 39], start: { col: 12, row: 38 } },
  ];
  return { map, zones, obstacles };
}
