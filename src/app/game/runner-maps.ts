/**
 * Modo Corrida — os mapas de corrida (ver `runner.ts`). Cada um é o Aeroporto redesenhado como
 * um **caminho com curvas** (`runner-path.ts`), no estilo do Temple Run: trechos retos de **3
 * faixas** ligados por esquinas de 90°. O chão, o hangar, a mata e a carga são gerados em volta do
 * caminho (`buildRaceMap`), com o mesmo `HexBoard` do tabuleiro.
 *
 * - **Mapa A** (pelo hangar): pista de terra → pátio → portão → hangar: a pista passa **ao lado do
 *   avião** (a asa baixa cobre a faixa mais perto dele: deslizar), vira **por trás dele** e sai
 *   pela **porta dos fundos** do outro lado, virando de novo (2 curvas). Fora, a **mata** tem 4
 *   curvas (vai para um lado, sobe, volta e sobe de novo).
 * - **Mapa B** (pela lateral): pista → pátio → por fora, colado na parede leste do hangar (a porta
 *   lateral) → a mesma mata, com 4 curvas.
 * - **Variante** (o lado): com o garimpeiro **à direita** (no tático), ele passa pela direita do
 *   avião, corre por trás dele **para a esquerda** e sai pela porta do oeste **virando à direita**.
 *   À esquerda, tudo espelhado. A mata espelha junto.
 *
 * Qual mapa, qual lado e onde a corrida começa saem da perseguição no tático (`runnerStart`): a
 * rota de fuga que passa pelo hangar vai para o A, a que contorna, para o B; a zona tática em que
 * o suspeito estava (`aeroportoZone`) dá a zona de largada. Fora da pista é sempre a mata.
 */
import { GameMap, parseLayout } from './maps';
import { CoverKind } from './scenery';
import { HexCoord, hexDistance, hexKey, hexToWorld } from './hex';
import { MODELS } from './character-model';
import type { Lane, LaneObstacle, RunnerMove } from './runner';
import { Point, S3, Segment, TRACK_HALF, buildPath, nearestOnPath, pathLength, pathPose, pathTurns } from './runner-path';

/** Tamanho do mapa de corrida (colunas × fileiras) e a coluna do meio da pista de terra. */
export const W = 80;
export const H = 158;
const X0 = 60;
const zRow = (row: number) => S3 * row;

export type Variant = 'direita' | 'esquerda';

export interface RaceZone {
  id: string;
  name: string;
  /** Onde o corredor nasce quando a perseguição começa nesta zona (fileiras do caminho). */
  at: number;
}

export type ObstacleKind = CoverKind | 'log' | 'branch' | 'fuel' | 'tarp' | 'wing';

/** Obstáculo no caminho: `d` fileiras depois do começo do trecho `seg`, nas faixas `lanes`. */
export interface RaceObstacle {
  seg: number;
  d: number;
  lanes: Lane[];
  kind: ObstacleKind;
  move: RunnerMove;
}

export interface RaceMap {
  id: 'A' | 'B';
  variant: Variant;
  map: GameMap;
  path: Segment[];
  zones: RaceZone[];
  obstacles: RaceObstacle[];
  /** Avião: centro (mundo) e o quanto afundou (pousado de barriga). */
  plane?: { x: number; z: number; sink: number };
}

/** Onde um obstáculo fica no caminho (fileiras). */
export const obstacleAt = (race: Pick<RaceMap, 'path'>, o: RaceObstacle): number => race.path[o.seg].at + o.d;

// ---------------------------------------------------------------------------
// Gerador de mapa a partir do caminho
// ---------------------------------------------------------------------------

const hash = (c: number, r: number, salt = 0) => {
  const x = Math.sin(c * 127.1 + r * 311.7 + salt * 74.7) * 43758.5453;
  return x - Math.floor(x);
};

interface HangarSpec {
  cols: [number, number];
  rows: [number, number];
  /** Portão (fileira de portas) na parede sul: colunas. */
  gate?: [number, number];
  /** Porta lateral na parede leste: fileiras. */
  sideDoor?: [number, number];
  /** Corredor de caixas dos dois lados da pista, por dentro. */
  corridor: boolean;
}

interface MapSpec {
  id: 'A' | 'B';
  variant: Variant;
  points: Point[];
  hangar: HangarSpec;
  obstacles: RaceObstacle[];
  zones: (path: Segment[]) => RaceZone[];
  plane?: { x: number; z: number; sink: number };
}

/** Fileira da parede de cima e de baixo do pátio (a clareira na frente do portão). */
const PATIO = { rows: [108, 118] as [number, number], half: 22 };
/** Raio (mundo) da clareira em volta de cada esquina. */
const CORNER_CLEARING = 7;
/** Abaixo disto (sul), a pista é de terra. */
const DIRT_ROW = 108;

function buildRaceMap(spec: MapSpec): RaceMap {
  const path = buildPath(spec.points);
  const hg = spec.hangar;
  const inHangar = (c: number, r: number) => c >= hg.cols[0] && c <= hg.cols[1] && r >= hg.rows[0] && r <= hg.rows[1];
  const onWall = (c: number, r: number) =>
    inHangar(c, r) && (c === hg.cols[0] || c === hg.cols[1] || r === hg.rows[0] || r === hg.rows[1]);
  const plane = spec.plane;
  const nearPlane = (x: number, z: number) => !!plane && Math.abs(x - plane.x) < 8.5 && z > plane.z - 9.5 && z < plane.z + 6;
  // as esquinas ganham uma clareira: a câmera gira por fora delas e não pode passar dentro de copa
  const corners = pathTurns(path);
  const nearCorner = (x: number, z: number) => corners.some((t) => Math.hypot(x - t.x, z - t.z) <= CORNER_CLEARING);
  const rows: string[][] = [];
  const planeHexes: HexCoord[] = [];
  const corridor: (HexCoord & { kind: CoverKind })[] = [];
  for (let r = 0; r < H; r++) {
    const line: string[] = [];
    for (let c = 0; c < W; c++) {
      const p = hexToWorld({ col: c, row: r }, 1);
      const near = nearestOnPath(path, p.x, p.z);
      const onTrack = near.dist <= TRACK_HALF;
      let ch: string;
      if (inHangar(c, r)) {
        ch = '_';
        if (onWall(c, r)) {
          ch = '#';
          // portas: o portão ao sul, a porta lateral a leste, e onde a pista cruza a parede
          if (r === hg.rows[1] && hg.gate && c >= hg.gate[0] && c <= hg.gate[1]) ch = 'D';
          else if (c === hg.cols[1] && hg.sideDoor && r >= hg.sideDoor[0] && r <= hg.sideDoor[1]) ch = 'D';
          else if (onTrack && near.dist <= TRACK_HALF - 0.3) ch = 'D';
        } else if (plane && Math.abs(p.x - plane.x) <= 1.6 && p.z >= plane.z - 7.5 && p.z <= plane.z + 4.4) {
          ch = 'A';
          planeHexes.push({ col: c, row: r });
        } else if (hg.corridor && !onTrack && near.dist <= TRACK_HALF + 1.9 && !nearPlane(p.x, p.z) && r < hg.rows[1] - 1) {
          // corredor: uma parede de caixas colada nas três faixas
          corridor.push({ col: c, row: r, kind: hash(c, r, 3) < 0.5 ? 'boxes' : 'crates' });
        }
      } else if (onTrack) {
        ch = r >= DIRT_ROW ? '~' : '.';
      } else if (r >= PATIO.rows[0] && r <= PATIO.rows[1] && Math.abs(p.x - X0) <= PATIO.half) {
        ch = '.';
      } else if (nearCorner(p.x, p.z)) {
        ch = '.';
      } else {
        // mata: aberta perto da pista, fechada longe (como a do mapa tático)
        const d = near.dist - TRACK_HALF;
        const keep = d <= 0.8 ? 0.9 : d <= 4 ? 0.3 : d <= 9 ? 0.1 : 0;
        ch = hash(c, r) < keep ? '.' : 'T';
      }
      line.push(ch);
    }
    rows.push(line);
  }
  const layout = parseLayout(rows.map((l) => l.join('')));
  // carga dos obstáculos: nos hexágonos do retângulo da faixa (2 colunas ou 2 fileiras)
  const cover: (HexCoord & { kind: CoverKind })[] = [];
  const taken = new Set<string>();
  for (const o of spec.obstacles) {
    if (!isCover(o.kind)) continue;
    const at = path[o.seg].at + o.d;
    for (const lane of o.lanes) {
      for (const h of laneHexes(path, at, lane)) {
        const k = hexKey(h);
        if (taken.has(k)) continue;
        taken.add(k);
        cover.push({ ...h, kind: o.kind as CoverKind });
      }
    }
  }
  // decoração do hangar: carga espalhada longe da pista
  const decor: (HexCoord & { kind: CoverKind })[] = [];
  const kinds: CoverKind[] = ['crates', 'boxes', 'sacks', 'cages', 'boxes'];
  for (let r = hg.rows[0] + 2; r <= hg.rows[1] - 2; r++) {
    for (let c = hg.cols[0] + 2; c <= hg.cols[1] - 2; c++) {
      const p = hexToWorld({ col: c, row: r }, 1);
      if (nearestOnPath(path, p.x, p.z).dist < TRACK_HALF + 4 || nearPlane(p.x, p.z) || rows[r][c] !== '_') continue;
      if (hash(c, r, 9) < 0.07) decor.push({ col: c, row: r, kind: kinds[Math.floor(hash(c, r, 5) * kinds.length)] });
    }
  }
  const covered = new Set(cover.map(hexKey));
  const map: GameMap = {
    id: `corrida-${spec.id}-${spec.variant}`,
    name: `Corrida ${spec.id}`,
    subtitle: 'Modo Corrida',
    available: false,
    ...layout,
    cover: [...cover, ...[...corridor, ...decor].filter((h) => !covered.has(hexKey(h)))],
    structures: [{ kind: 'hangar', rect: { cols: hg.cols, rows: hg.rows } }],
    starts: [{ col: X0 / 1.5, row: H - 4 }],
    enemies: [{ id: 'vigia', name: 'Vigia', model: MODELS.garimpeiro, patrol: [{ col: X0 / 1.5, row: H - 10 }] }],
  };
  return { id: spec.id, variant: spec.variant, map, path, zones: spec.zones(path), obstacles: spec.obstacles, plane: spec.plane };
}

const isCover = (k: ObstacleKind): k is CoverKind => !['log', 'branch', 'fuel', 'tarp', 'wing'].includes(k);

/** Hexágonos do quadrado da faixa (largura da faixa, ~1 fileira de fundo) num ponto do caminho. */
function laneHexes(path: Segment[], at: number, lane: Lane): HexCoord[] {
  const c = pathPose(path, at, lane);
  const fx = Math.sin(c.yaw);
  const fz = Math.cos(c.yaw);
  const out: HexCoord[] = [];
  let best: HexCoord | null = null;
  let bestD = Infinity;
  const col0 = Math.round(c.x / 1.5);
  const row0 = Math.round(c.z / S3);
  for (let col = col0 - 2; col <= col0 + 2; col++) {
    for (let row = row0 - 2; row <= row0 + 2; row++) {
      const p = hexToWorld({ col, row }, 1);
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const along = dx * fx + dz * fz;
      const across = -dx * fz + dz * fx;
      if (Math.abs(along) <= 0.9 && Math.abs(across) <= 1.3) out.push({ col, row });
      const d = Math.hypot(dx, dz);
      if (d < bestD) [bestD, best] = [d, { col, row }];
    }
  }
  return out.length ? out : best ? [best] : [];
}

// ---------------------------------------------------------------------------
// Os dois mapas
// ---------------------------------------------------------------------------

/** Espelha as faixas (a variante da esquerda): esquerda ↔ direita. */
const mirrorLanes = (lanes: Lane[], m: number): Lane[] => (m > 0 ? lanes.map((l) => (2 - l) as Lane) : lanes);

/** A mata com 4 curvas, a partir de `start` (indo para o norte): vai para o lado `−m` (+1 leste), sobe, volta e sobe. */
function forestPoints(start: Point, m: number, zTurn1: number, zTurn2: number, zEnd: number): Point[] {
  const across = 27;
  return [
    { x: start.x, z: zTurn1 },
    { x: start.x - m * across, z: zTurn1 },
    { x: start.x - m * across, z: zTurn2 },
    { x: start.x, z: zTurn2 },
    { x: start.x, z: zEnd },
  ];
}

/**
 * Obstáculos da mata, nos 4 trechos depois da primeira curva dela (`first` é o trecho logo depois
 * dessa curva). O trecho que chega na primeira curva é de cada mapa.
 */
function forestObstacles(first: number, m: number): RaceObstacle[] {
  const o = (seg: number, d: number, lanes: Lane[], kind: ObstacleKind, move: RunnerMove): RaceObstacle => ({
    seg: first + seg,
    d,
    lanes: mirrorLanes(lanes, m),
    kind,
    move,
  });
  return [
    o(0, 7, [0, 1], 'branch', 'deslizar'),
    o(1, 6, [0, 1, 2], 'log', 'pular'),
    o(1, 13, [2], 'branch', 'deslizar'),
    o(2, 8, [0, 1], 'log', 'pular'),
    o(3, 8, [1, 2], 'branch', 'deslizar'),
    o(3, 18, [0, 1, 2], 'log', 'pular'),
    o(3, 27, [0, 1], 'tarp', 'deslizar'),
  ];
}

/** Obstáculos da pista de terra e do pátio (trecho 0, do começo até o portão). */
function pistaObstacles(m: number): RaceObstacle[] {
  const o = (d: number, lanes: Lane[], kind: ObstacleKind, move: RunnerMove): RaceObstacle => ({ seg: 0, d, lanes: mirrorLanes(lanes, m), kind, move });
  return [
    o(27, [1], 'fuel', 'pular'),
    o(35, [0, 1], 'log', 'pular'),
    o(41, [2], 'crates', 'desviar'),
    o(44, [0], 'cages', 'pular'),
  ];
}

/** Hangar do mapa A: colunas e fileiras; o portão; a fileira do avião (o centro dele). */
const HANGAR_A = { cols: [18, 62] as [number, number], rows: [72, 108] as [number, number], planeRow: 85 };

/**
 * Mapa A: pista → pátio → hangar em S em volta do avião → porta dos fundos → mata com 4 curvas.
 * Com `variant` `direita` (o garimpeiro à direita), o avião fica à esquerda da pista: ela vira à
 * esquerda por trás dele e sai pela porta do oeste virando à direita. `esquerda`: espelhado.
 */
export function raceA(variant: Variant = 'direita'): RaceMap {
  // m: para onde a pista vai por trás do avião (−1 oeste, +1 leste)
  const m = variant === 'direita' ? -1 : 1;
  const zPlane = zRow(HANGAR_A.planeRow);
  // a esquina fica atrás da cauda (o avião vai 7,8 da asa até a ponta da cauda)
  const zCorner = zPlane - 13.5;
  const door = { x: X0 + m * 24, z: zCorner };
  const points: Point[] = [
    { x: X0, z: zRow(H - 3) },
    { x: X0, z: zCorner },
    door,
    // na mata, primeiro volta para o meio do mapa (para o lado contrário ao da porta)
    ...forestPoints(door, m, zRow(59), zRow(41), zRow(3)),
  ];
  const planeX = X0 + m * 9;
  // a asa (no meio da corda: 0,9 à frente do centro) cobre a faixa mais perto do avião
  const wingLane: Lane = m < 0 ? 0 : 2;
  const dWing = (zRow(H - 3) - (zPlane + 0.9)) / S3;
  const o = (seg: number, d: number, lanes: Lane[], kind: ObstacleKind, move: RunnerMove): RaceObstacle => ({ seg, d, lanes, kind, move });
  const obstacles: RaceObstacle[] = [
    ...pistaObstacles(m),
    // dentro do hangar, ao lado do avião
    o(0, 53, mirrorLanes([1], m), 'sacks', 'pular'),
    o(0, 60, mirrorLanes([2], m), 'boxes', 'desviar'),
    o(0, dWing, [wingLane], 'wing', 'deslizar'),
    // por trás do avião
    o(1, 6, [1], 'lowCrate', 'pular'),
    // saindo pela porta dos fundos, na trilha
    o(2, 10, mirrorLanes([1, 2], m), 'log', 'pular'),
    ...forestObstacles(3, m),
  ];
  return buildRaceMap({
    id: 'A',
    variant,
    points,
    hangar: { cols: HANGAR_A.cols, rows: HANGAR_A.rows, gate: [32, 48], corridor: true },
    obstacles,
    plane: { x: planeX, z: zPlane, sink: 1.1 },
    zones: (path) => {
      const turns = pathTurns(path);
      return [
        { id: 'pista', name: 'Pista de terra', at: 5 },
        { id: 'patio', name: 'Pátio do portão', at: 38 },
        { id: 'hangar', name: 'Hangar', at: 50 },
        // logo depois da porta dos fundos
        { id: 'fundos', name: 'Porta dos fundos', at: turns[1].at + 4 },
        { id: 'mata', name: 'Mata (fora da pista)', at: turns[2].at + 1 },
      ];
    },
  });
}

/** Hangar do mapa B: a oeste da pista; a parede leste corre colada nela. */
const HANGAR_B = { cols: [10, 36] as [number, number], rows: [72, 108] as [number, number] };

/** Mapa B: pista → pátio → lateral do hangar (por fora) → mata com 4 curvas. */
export function raceB(variant: Variant = 'direita'): RaceMap {
  const m = variant === 'direita' ? -1 : 1;
  const start: Point = { x: X0, z: zRow(66) };
  const points: Point[] = [{ x: X0, z: zRow(H - 3) }, ...forestPoints(start, -m, zRow(66), zRow(46), zRow(3))];
  const o = (seg: number, d: number, lanes: Lane[], kind: ObstacleKind, move: RunnerMove): RaceObstacle => ({ seg, d, lanes, kind, move });
  const obstacles: RaceObstacle[] = [
    ...pistaObstacles(m),
    // lateral do hangar: carga largada do lado de fora
    o(0, 55, [1], 'cages', 'pular'),
    o(0, 64, [1, 2], 'tarp', 'deslizar'),
    o(0, 72, [2], 'crates', 'desviar'),
    o(0, 80, [0], 'lowCrate', 'pular'),
    ...forestObstacles(1, m),
    // (a lateral emenda direto na mata: o trecho 0 vai da pista até a primeira curva dela)
  ];
  return buildRaceMap({
    id: 'B',
    variant,
    points,
    hangar: { cols: HANGAR_B.cols, rows: HANGAR_B.rows, sideDoor: [89, 90], corridor: false },
    obstacles,
    zones: (path) => {
      const turns = pathTurns(path);
      return [
        { id: 'pista', name: 'Pista de terra', at: 5 },
        { id: 'patio', name: 'Pátio do portão', at: 38 },
        { id: 'lateral', name: 'Lateral do hangar', at: 66 },
        { id: 'mata', name: 'Mata (fora da pista)', at: turns[0].at + 1 },
      ];
    },
  });
}

// ---------------------------------------------------------------------------
// Obstáculos por faixa (para as regras)
// ---------------------------------------------------------------------------

/** Os obstáculos do mapa, faixa por faixa, na posição do caminho (fileiras). */
export function laneObstacles(race: RaceMap): LaneObstacle[] {
  const out: LaneObstacle[] = [];
  for (const o of race.obstacles) {
    const at = obstacleAt(race, o);
    for (const lane of o.lanes) out.push({ at, lane, move: o.move, kind: o.kind === 'wing' ? 'asa' : o.kind });
  }
  return out;
}

/** Comprimento do caminho de um mapa (fileiras). */
export const raceLength = (race: Pick<RaceMap, 'path'>): number => pathLength(race.path);

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
/** Coluna do meio do hangar tático: à direita dela, o garimpeiro está "à direita". */
const TACTICAL_MID_COL = 21.5;

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
  variant: Variant;
  race: RaceMap;
  zone: RaceZone;
  /** Zona tática de onde ele fugiu. */
  from: TacticalZone;
}

const built = new Map<string, RaceMap>();
const raceMap = (id: 'A' | 'B', variant: Variant): RaceMap => {
  const key = `${id}-${variant}`;
  let m = built.get(key);
  if (!m) built.set(key, (m = id === 'A' ? raceA(variant) : raceB(variant)));
  return m;
};

/** O mapa tático tem Modo Corrida? (por enquanto só o Aeroporto) */
export const hasRunner = (mapId: string | undefined): boolean => mapId === 'aeroporto';

/**
 * Qual mapa de corrida, qual lado e onde começa: a fuga (`route`, do suspeito até a saída) que
 * passa por dentro do hangar vai para o mapa A; a que contorna, para o B. O lado é onde ele está
 * (à direita do meio do hangar: `direita`). A zona tática em que ele estava dá a zona de largada
 * (fora da pista é sempre a mata).
 */
export function runnerStart(enemyHex: HexCoord, route: readonly HexCoord[], map: Pick<GameMap, 'ground'>): RunnerStart {
  const through = [enemyHex, ...route].some((h) => inside(h, TACTICAL.hangar));
  const id = through ? 'A' : 'B';
  const variant: Variant = enemyHex.col >= TACTICAL_MID_COL ? 'direita' : 'esquerda';
  const race = raceMap(id, variant);
  const from = aeroportoZone(enemyHex, map);
  const zone = race.zones.find((z) => z.id === START_ZONE[id][from]) ?? race.zones.find((z) => z.id === 'mata')!;
  return { id, variant, race, zone, from };
}
