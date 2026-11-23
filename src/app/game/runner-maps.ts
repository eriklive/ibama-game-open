/**
 * Modo Corrida — os mapas de corrida (ver `runner.ts`). Cada um é o Aeroporto redesenhado para
 * correr em linha reta: a mesma pista, o mesmo hangar, a mesma mata, esticados ao longo da corrida
 * (o hangar tem 39 fileiras; no tático, 15) e mais largos (40 colunas; o hangar tem 32), com a
 * pista no meio: **3 faixas de 2 colunas** (17–18, 19–20, 21–22). O corredor vai para o norte
 * (fileira diminuindo).
 *
 * - **Mapa A** (pelo hangar): pista de terra → pátio → portão → hangar (um corredor entre duas
 *   paredes de caixas, com o avião pousado de barriga colado na faixa esquerda: o corpo fecha a
 *   esquerda e a asa baixa, a 1,57 m, cobre o meio) → porta dos fundos (só o meio passa,
 *   deslizando sob a porta de enrolar) → trilha na mata norte.
 * - **Mapa B** (pela lateral): pista de terra → pátio → por fora, colado na parede leste do
 *   hangar (porta lateral) → mata leste.
 *
 * Qual mapa e onde a corrida começa saem da perseguição no tático (`runnerStart`): a rota de fuga
 * que passa pelo hangar vai para o A, a que contorna, para o B; a zona tática em que o suspeito
 * estava (`aeroportoZone`) dá a zona de largada. Fora da pista é sempre o trecho de mata.
 */
import { GameMap, parseLayout } from './maps';
import { CoverKind } from './scenery';
import { HexCoord, hexDistance, hexKey } from './hex';
import { MODELS } from './character-model';
import type { Lane, LaneObstacle, RunnerMove } from './runner';

export const W = 40;
/** Primeira coluna da pista: faixas esquerda (17–18), meio (19–20) e direita (21–22). */
export const TO = 17;
export const LANES = { L: [17, 18], C: [19, 20], R: [21, 22] } as const;
/** x (mundo) do meio de cada faixa e das bordas. */
/** x (mundo) do meio de uma faixa (contínua: 0 esquerda, 1 meio, 2 direita). */
export const laneX = (lane: number): number => 1.5 * (TO + 2 * lane + 0.5);
/** Faixa de uma coluna do mapa de corrida (fora da pista: `null`). */
export const laneOfCol = (col: number): Lane | null => (col < TO || col > TO + 5 ? null : (Math.floor((col - TO) / 2) as Lane));

type Row = string[];
const row = (fill: string): Row => Array.from({ length: W }, () => fill);
const put = (r: Row, cols: [number, number], ch: string): Row => {
  for (let c = cols[0]; c <= cols[1]; c++) r[c] = ch;
  return r;
};
const hash = (c: number, r: number) => {
  const x = Math.sin(c * 127.1 + r * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** Mata dos lados: fechada longe da pista, com clareiras e trilhas perto (como a do mapa tático). */
function forest(r: number, track: [number, number], ground: string, margin = 2): Row {
  const line = row('T');
  for (let c = 0; c < W; c++) {
    const d = c < track[0] ? track[0] - c : c > track[1] ? c - track[1] : 0;
    if (d === 0) line[c] = ground;
    else if (d <= margin) line[c] = hash(c, r) < 0.85 ? '.' : 'T';
    else if (d <= margin + 4) line[c] = hash(c, r) < 0.42 ? '.' : 'T';
    else if (d <= margin + 8) line[c] = hash(c, r) < 0.16 ? '.' : 'T';
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
  /** Fileira e primeira coluna; `span` colunas para o leste. */
  kind: CoverKind | 'log' | 'branch' | 'shutter' | 'fuel' | 'tarp' | 'plane';
  /** O que o jogador faz: pular, deslizar ou trocar de faixa. */
  move: 'pular' | 'deslizar' | 'desviar' | 'deslizar|desviar';
  span?: number;
}
export interface RaceMap {
  map: GameMap;
  zones: RaceZone[];
  obstacles: RaceObstacle[];
  /** Carga de cenário (fora da pista): só enfeita e dá a escala do lugar. */
  decor: (HexCoord & { kind: CoverKind })[];
  /** Avião: hexágonos que ele ocupa e a pose (centro em x e o quanto afundou, de barriga no chão). */
  plane?: { hexes: HexCoord[]; x: number; sink: number };
}

const T: [number, number] = [TO, TO + 5];
const SPECIAL = ['log', 'branch', 'shutter', 'fuel', 'tarp', 'plane'];
const asCover = (o: RaceObstacle[]) =>
  o.filter((x) => !SPECIAL.includes(x.kind)).map((x) => ({ col: x.col, row: x.row, kind: x.kind as CoverKind }));

/** Hangar do mapa A: colunas 4–35, fileiras 46 (fundo) a 86 (portão). */
const HA = { cols: [4, 35] as [number, number], rows: [46, 86] as [number, number] };

/** Carga das laterais do hangar, inspirada no hangar do mapa tático. */
function hangarDecor(): (HexCoord & { kind: CoverKind })[] {
  const d: (HexCoord & { kind: CoverKind })[] = [];
  const add = (col: number, row: number, kind: CoverKind) => d.push({ col, row, kind });
  // oeste: duas fileiras de caixotes com vãos (passagens), sacos e gaiolas no meio
  for (const r of [52, 53, 54, 76, 77]) add(6, r, 'crates');
  for (const r of [56, 57]) add(6, r, 'sacks');
  for (const r of [50, 51, 52]) add(10, r, 'boxes');
  for (const r of [55, 56]) add(10, r, 'cages');
  for (const r of [72, 73, 74]) add(8, r, 'crates');
  for (const r of [78, 79]) add(10, r, 'sacks');
  for (const r of [80, 81, 82]) add(6, r, 'boxes');
  // leste: um "L" de caixas e caixotes, gaiolas junto ao portão, a pilha de suprimentos no fundo
  for (const c of [26, 27, 28, 29]) add(c, 60, 'boxes');
  for (const r of [61, 62, 63, 64]) add(29, r, 'crates');
  for (const c of [30, 31, 32]) add(c, 49, 'supplies');
  for (const c of [33, 34]) add(c, 83, 'cages');
  for (const c of [33, 34]) add(c, 84, 'cages');
  for (const r of [68, 69, 70]) add(32, r, 'sacks');
  add(26, 75, 'lowCrate');
  add(27, 76, 'crates');
  add(31, 78, 'boxes');
  add(34, 66, 'shelf');
  add(25, 52, 'table');
  return d;
}

/**
 * Dentro do hangar, a pista é um corredor: uma parede contínua de carga alta (caixotes e caixas de
 * amido, em trechos de 2 a 4) colada em cada lado das três faixas (colunas 16 e 23), do portão até
 * a parede do fundo. Do lado esquerdo ela abre só onde o avião está: ali o próprio corpo é a parede.
 */
function laneWalls(): (HexCoord & { kind: CoverKind })[] {
  const d: (HexCoord & { kind: CoverKind })[] = [];
  for (const col of [TO - 1, TO + 6]) {
    let kind: CoverKind = col < TO ? 'crates' : 'boxes';
    let left = 0;
    for (let r = 85; r >= 47; r--) {
      if (col < TO && r >= 61 && r <= 68) continue;
      if (left <= 0) {
        kind = kind === 'crates' ? 'boxes' : 'crates';
        left = 2 + Math.floor(hash(col, r) * 3);
      }
      d.push({ col, row: r, kind });
      left--;
    }
  }
  return d;
}

/** Mapa A: pista de terra → portão → hangar (avião) → porta dos fundos → trilha na mata. */
export function raceA(): RaceMap {
  const rows: Row[] = [];
  for (let r = 0; r < 44; r++) rows.push(forest(r, T, '.', 1));
  // clareira atrás do hangar
  for (let r = 44; r < 46; r++) rows.push(forest(r, [8, 31], '.', 2));
  // parede norte com a porta dos fundos (2 hexágonos, faixa do meio)
  rows.push(put(put(forest(46, [2, 37], '.', 0), HA.cols, '#'), [TO + 2, TO + 3], 'D'));
  for (let r = 47; r < 86; r++) {
    const line = forest(r, [2, 37], '.', 0);
    put(line, HA.cols, '_');
    line[HA.cols[0]] = '#';
    line[HA.cols[1]] = '#';
    rows.push(line);
  }
  // portão largo (fileira de D), como o do mapa tático
  rows.push(put(put(forest(86, [2, 37], '.', 0), HA.cols, '#'), [8, 31], 'D'));
  // pátio na frente do portão
  for (let r = 87; r < 97; r++) rows.push(put(forest(r, [6, 33], '.', 2), T, '~'));
  // pista de terra
  for (let r = 97; r < 141; r++) rows.push(forest(r, T, '~', 3));
  // avião: o corpo encostado na beira da faixa esquerda (colunas 15–17), nariz para o sul
  const planeHexes: HexCoord[] = [];
  for (let r = 62; r < 68; r++) for (const c of [15, 16, 17]) { rows[r][c] = 'A'; planeHexes.push({ col: c, row: r }); }
  const layout = parseLayout(rows.map((r) => r.join('')));
  const L = TO;
  const obstacles: RaceObstacle[] = [
    // pista de terra
    { col: L + 2, row: 128, kind: 'fuel', move: 'pular' },
    { col: L + 3, row: 128, kind: 'fuel', move: 'pular' },
    { col: L, row: 120, kind: 'log', move: 'pular', span: 4 },
    { col: L + 4, row: 112, kind: 'crates', move: 'desviar' },
    { col: L + 5, row: 112, kind: 'crates', move: 'desviar' },
    { col: L + 2, row: 104, kind: 'tarp', move: 'deslizar', span: 2 },
    // pátio
    { col: L, row: 92, kind: 'cages', move: 'pular' },
    { col: L + 1, row: 92, kind: 'cages', move: 'pular' },
    { col: L + 4, row: 90, kind: 'lowCrate', move: 'pular' },
    // hangar
    { col: L + 2, row: 80, kind: 'sacks', move: 'pular' },
    { col: L + 3, row: 80, kind: 'sacks', move: 'pular' },
    { col: L + 4, row: 74, kind: 'boxes', move: 'desviar' },
    { col: L + 5, row: 74, kind: 'boxes', move: 'desviar' },
    // o avião: corpo na esquerda, asa baixa por cima da esquerda e do meio
    { col: L, row: 64, kind: 'plane', move: 'deslizar|desviar', span: 4 },
    { col: L + 2, row: 55, kind: 'lowCrate', move: 'pular' },
    { col: L + 4, row: 51, kind: 'crates', move: 'desviar' },
    { col: L + 5, row: 51, kind: 'crates', move: 'desviar' },
    // porta dos fundos meio aberta: deslizar por baixo
    { col: L + 2, row: 46, kind: 'shutter', move: 'deslizar', span: 2 },
    // mata norte
    { col: L, row: 36, kind: 'log', move: 'pular', span: 6 },
    { col: L + 4, row: 28, kind: 'branch', move: 'deslizar', span: 2 },
    { col: L, row: 22, kind: 'branch', move: 'deslizar', span: 4 },
    { col: L + 4, row: 14, kind: 'log', move: 'pular', span: 2 },
  ];
  const decor = [...hangarDecor(), ...laneWalls()];
  const map: GameMap = {
    id: 'corrida-a',
    name: 'Corrida A · pelo hangar',
    subtitle: 'laboratório',
    available: false,
    ...layout,
    cover: [...asCover(obstacles), ...decor],
    props: [{ col: 7, row: 60 }, { col: 33, row: 56 }, { col: 12, row: 84 }, { col: 30, row: 72 }],
    structures: [{ kind: 'hangar', rect: HA }],
    starts: [{ col: L + 2, row: 124 }],
    enemies: [{ id: 'vigia', name: 'Vigia', model: MODELS.garimpeiro, patrol: [{ col: L + 3, row: 117 }] }],
  };
  const zones: RaceZone[] = [
    { id: 'pista', name: 'Pista de terra', rows: [97, 140], start: { col: L + 2, row: 132 } },
    { id: 'patio', name: 'Pátio do portão', rows: [87, 96], start: { col: L + 2, row: 96 } },
    { id: 'hangar', name: 'Hangar', rows: [47, 86], start: { col: L + 2, row: 78 } },
    { id: 'fundos', name: 'Porta dos fundos', rows: [44, 46], start: { col: L + 2, row: 50 } },
    { id: 'mata', name: 'Mata norte (fora da pista)', rows: [0, 43], start: { col: L + 2, row: 42 } },
  ];
  // corpo com o centro em x = 24,4 (a fuselagem, de 2 de largura, morde a beira da faixa esquerda).
  // Pousou de barriga (o trem quebrou): afunda 1,1 até a fuselagem tocar o piso, nivelado. A asa
  // fica a 2,09 (1,57 m) do chão, abaixo da cabeça da Ana (1,70 m), da faixa esquerda até a do meio.
  return { map, zones, obstacles, decor, plane: { hexes: planeHexes, x: 24.4, sink: 1.1 } };
}

/** Mapa B: pista de terra → pátio → pela lateral leste do hangar (por fora) → mata leste. */
export function raceB(): RaceMap {
  const rows: Row[] = [];
  const H: [number, number] = [0, 15];
  for (let r = 0; r < 40; r++) rows.push(forest(r, T, '.', 1));
  for (let r = 40; r < 87; r++) {
    const line = forest(r, [15, 24], '.', 2);
    put(line, H, '_');
    line[H[0]] = '#';
    line[H[1]] = '#';
    if (r === 40 || r === 86) put(line, H, '#');
    put(line, T, r < 80 ? '.' : '~');
    rows.push(line);
  }
  // porta lateral do hangar (por onde sai quem estava dentro)
  rows[66][H[1]] = 'D';
  rows[67][H[1]] = 'D';
  for (let r = 87; r < 97; r++) rows.push(put(forest(r, [6, 33], '.', 2), T, '~'));
  for (let r = 97; r < 141; r++) rows.push(forest(r, T, '~', 3));
  const layout = parseLayout(rows.map((r) => r.join('')));
  const L = TO;
  const obstacles: RaceObstacle[] = [
    { col: L + 2, row: 128, kind: 'fuel', move: 'pular' },
    { col: L + 3, row: 128, kind: 'fuel', move: 'pular' },
    { col: L, row: 120, kind: 'log', move: 'pular', span: 4 },
    { col: L + 4, row: 112, kind: 'crates', move: 'desviar' },
    { col: L + 5, row: 112, kind: 'crates', move: 'desviar' },
    { col: L + 2, row: 104, kind: 'tarp', move: 'deslizar', span: 2 },
    { col: L + 2, row: 90, kind: 'cages', move: 'pular' },
    { col: L + 3, row: 90, kind: 'cages', move: 'pular' },
    { col: L + 4, row: 80, kind: 'crates', move: 'desviar' },
    { col: L + 5, row: 80, kind: 'crates', move: 'desviar' },
    { col: L, row: 74, kind: 'cages', move: 'pular' },
    { col: L + 1, row: 74, kind: 'cages', move: 'pular' },
    { col: L + 2, row: 60, kind: 'tarp', move: 'deslizar', span: 4 },
    { col: L + 4, row: 52, kind: 'lowCrate', move: 'pular' },
    { col: L + 5, row: 52, kind: 'lowCrate', move: 'pular' },
    { col: L, row: 44, kind: 'crates', move: 'desviar' },
    { col: L + 1, row: 44, kind: 'crates', move: 'desviar' },
    { col: L, row: 32, kind: 'log', move: 'pular', span: 6 },
    { col: L + 2, row: 22, kind: 'branch', move: 'deslizar', span: 4 },
    { col: L, row: 12, kind: 'log', move: 'pular', span: 2 },
  ];
  // carga largada do lado de fora do hangar, entre a parede e a mata (como no mapa tático)
  const decor: (HexCoord & { kind: CoverKind })[] = [
    { col: 25, row: 70, kind: 'crates' }, { col: 26, row: 71, kind: 'crates' }, { col: 25, row: 58, kind: 'cages' },
    { col: 26, row: 58, kind: 'cages' }, { col: 16, row: 50, kind: 'sacks' }, { col: 16, row: 76, kind: 'boxes' },
  ];
  const map: GameMap = {
    id: 'corrida-b',
    name: 'Corrida B · pela lateral',
    subtitle: 'laboratório',
    available: false,
    ...layout,
    cover: [...asCover(obstacles), ...decor],
    structures: [{ kind: 'hangar', rect: { cols: H, rows: [40, 86] } }],
    starts: [{ col: L + 2, row: 124 }],
    enemies: [{ id: 'vigia', name: 'Vigia', model: MODELS.garimpeiro, patrol: [{ col: L + 3, row: 117 }] }],
  };
  const zones: RaceZone[] = [
    { id: 'pista', name: 'Pista de terra', rows: [97, 140], start: { col: L + 2, row: 132 } },
    { id: 'patio', name: 'Pátio do portão', rows: [87, 96], start: { col: L + 2, row: 96 } },
    { id: 'lateral', name: 'Lateral do hangar', rows: [40, 86], start: { col: L + 2, row: 68 } },
    { id: 'mata', name: 'Mata leste (fora da pista)', rows: [0, 39], start: { col: L + 2, row: 38 } },
  ];
  return { map, zones, obstacles, decor };
}

// ---------------------------------------------------------------------------
// Obstáculos por faixa (para as regras)
// ---------------------------------------------------------------------------

/**
 * Os obstáculos do mapa, faixa por faixa. O avião vira dois: o corpo fecha a faixa esquerda
 * (desviar) e a asa cobre o meio (deslizar). A porta dos fundos (porta de enrolar) pede deslize
 * no meio, e a parede do fundo fecha as outras duas.
 */
export function laneObstacles(race: RaceMap): LaneObstacle[] {
  const out: LaneObstacle[] = [];
  for (const o of race.obstacles) {
    if (o.kind === 'plane') {
      out.push({ row: o.row, lane: 0, move: 'desviar', kind: 'aviao' }, { row: o.row, lane: 1, move: 'deslizar', kind: 'asa' });
      continue;
    }
    if (o.kind === 'shutter') {
      out.push(
        { row: o.row, lane: 0, move: 'desviar', kind: 'parede' },
        { row: o.row, lane: 1, move: 'deslizar', kind: 'porta' },
        { row: o.row, lane: 2, move: 'desviar', kind: 'parede' },
      );
      continue;
    }
    const lanes = new Set<Lane>();
    for (let c = o.col; c < o.col + (o.span ?? 1); c++) {
      const l = laneOfCol(c);
      if (l !== null) lanes.add(l);
    }
    for (const lane of lanes) out.push({ row: o.row, lane, move: o.move as RunnerMove, kind: o.kind });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Do tático para a corrida
// ---------------------------------------------------------------------------

/** Zonas do Aeroporto tático (de onde a corrida começa). */
export type TacticalZone = 'pista' | 'patio' | 'hangar' | 'fundos' | 'mata' | 'casa';

/** Hangar e casa do Aeroporto tático (colunas e fileiras, inclusive). */
const TACTICAL = {
  hangar: { cols: [11, 32], rows: [4, 18] },
  casa: { cols: [29, 41], rows: [26, 32] },
  /** Faixa ao norte do hangar (atrás das portas dos fundos). */
  fundos: { cols: [9, 34], rows: [-99, 3] },
  /** Na frente do portão. */
  patio: { cols: [9, 34], rows: [19, 21] },
} as const;

const inside = (h: HexCoord, r: { cols: readonly number[]; rows: readonly number[] }) =>
  h.col >= r.cols[0] && h.col <= r.cols[1] && h.row >= r.rows[0] && h.row <= r.rows[1];

/** Até quantos hexágonos da terra ainda é a pista. */
const PISTA_MARGIN = 2;

/** Zona tática de um hexágono do Aeroporto. Fora da pista (e de tudo o mais) é mata. */
export function aeroportoZone(h: HexCoord, map: Pick<GameMap, 'ground'>): TacticalZone {
  if (inside(h, TACTICAL.hangar)) return 'hangar';
  if (inside(h, TACTICAL.casa)) return 'casa';
  if (inside(h, TACTICAL.fundos)) return 'fundos';
  if (inside(h, TACTICAL.patio)) return 'patio';
  // a pista e a beira dela (até 2 hexágonos da terra: a pista de corrida também tem margem de grama)
  for (let col = h.col - PISTA_MARGIN; col <= h.col + PISTA_MARGIN; col++) {
    for (let row = h.row - PISTA_MARGIN; row <= h.row + PISTA_MARGIN; row++) {
      const n = { col, row };
      if (hexDistance(h, n) <= PISTA_MARGIN && map.ground?.get(hexKey(n)) === 'dirt') return 'pista';
    }
  }
  return 'mata';
}

/** Zona de largada em cada mapa de corrida, para cada zona tática. */
const START_ZONE: Record<'A' | 'B', Record<TacticalZone, string>> = {
  A: { pista: 'pista', patio: 'patio', hangar: 'hangar', fundos: 'fundos', mata: 'mata', casa: 'mata' },
  B: { pista: 'pista', patio: 'patio', hangar: 'lateral', fundos: 'lateral', mata: 'mata', casa: 'mata' },
};

export interface RunnerStart {
  id: 'A' | 'B';
  race: RaceMap;
  zone: RaceZone;
  /** Zona tática de onde ele fugiu. */
  from: TacticalZone;
}

const built = new Map<'A' | 'B', RaceMap>();
const raceMap = (id: 'A' | 'B'): RaceMap => {
  let m = built.get(id);
  if (!m) built.set(id, (m = id === 'A' ? raceA() : raceB()));
  return m;
};

/** O mapa tático tem Modo Corrida? (por enquanto só o Aeroporto) */
export const hasRunner = (mapId: string | undefined): boolean => mapId === 'aeroporto';

/**
 * Qual mapa de corrida e onde começa: a fuga (`route`, do suspeito até a saída) que passa por
 * dentro do hangar vai para o mapa A; a que contorna, para o B. A zona tática em que ele estava
 * dá a zona de largada (fora da pista é sempre a mata).
 */
export function runnerStart(enemyHex: HexCoord, route: readonly HexCoord[], map: Pick<GameMap, 'ground'>): RunnerStart {
  const through = [enemyHex, ...route].some((h) => inside(h, TACTICAL.hangar));
  const id = through ? 'A' : 'B';
  const race = raceMap(id);
  const from = aeroportoZone(enemyHex, map);
  const zone = race.zones.find((z) => z.id === START_ZONE[id][from]) ?? race.zones.find((z) => z.id === 'mata')!;
  return { id, race, zone, from };
}
