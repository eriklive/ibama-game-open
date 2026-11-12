import { HexCoord, hexDistance, hexKey, hexLine, hexToWorld, hexesInRange, pathTo, reachableHexes } from './hex';

/**
 * Regras dos inimigos — pensadas para iterar: todos os números ficam aqui.
 *
 * - No turno inimigo (depois de todos os agentes), quem está em patrulha anda
 *   `patrolSteps` passos pela rota.
 * - Cada inimigo em patrulha enxerga um cone à frente (`visionRange` hexágonos,
 *   abertura de `visionAngle` graus). Paredes bloqueiam a linha de visão.
 * - Se um agente estiver no cone (porque andou para dentro dele ou porque o inimigo
 *   virou para ele), o inimigo é "spotado": fica em alerta.
 * - Em alerta, no turno inimigo ele corre `fleeSteps` passos rumo à borda mais
 *   próxima. Chegando à borda, ele foge do mapa.
 * - Agentes, paredes e outros inimigos bloqueiam o caminho: cercar as saídas o
 *   deixa encurralado.
 */
export const ENEMY_RULES = {
  patrolSteps: 2,
  fleeSteps: 4,
  visionRange: 3,
  visionAngle: 120,
} as const;

/**
 * Abordagem: o agente da vez anuncia a abordagem ("Ibama! Parados!") e todos os
 * inimigos no raio reagem. Quem está a até `surrenderRange` hexágonos se rende; quem
 * está mais longe, mas dentro de `radius`, entra em alerta e tenta correr no turno
 * inimigo. A distância é em linha reta (paredes não abafam o grito, por enquanto).
 * Abordar encerra a vez do agente.
 */
export const APPROACH_RULES = {
  radius: 4,
  surrenderRange: 2,
} as const;

export type EnemyStatus = 'patrol' | 'alert' | 'surrendered' | 'fled';

/** Inimigo como definido no mapa. */
export interface EnemySpawn {
  id: string;
  name: string;
  /** Rota de patrulha (ida e volta pelos pontos). O primeiro é a posição inicial. */
  patrol: HexCoord[];
}

export interface EnemyState {
  id: string;
  name: string;
  hex: HexCoord;
  /** Para onde olha: ângulo no plano XZ do mundo (atan2(dz, dx)). */
  facing: number;
  status: EnemyStatus;
  patrol: HexCoord[];
  /** Índice do próximo ponto da rota. */
  waypoint: number;
  /** Sentido em que percorre a rota (1 = ida, -1 = volta). */
  dir: 1 | -1;
}

export function spawnEnemy(spawn: EnemySpawn): EnemyState {
  const [start, next = start] = spawn.patrol;
  return {
    id: spawn.id,
    name: spawn.name,
    hex: { ...start },
    facing: facingBetween(start, next),
    status: 'patrol',
    patrol: spawn.patrol.map((h) => ({ ...h })),
    waypoint: spawn.patrol.length > 1 ? 1 : 0,
    dir: 1,
  };
}

/** Ângulo de `a` para `b` no plano do mundo (0 se forem o mesmo hexágono). */
export function facingBetween(a: HexCoord, b: HexCoord): number {
  const pa = hexToWorld(a, 1);
  const pb = hexToWorld(b, 1);
  return pa.x === pb.x && pa.z === pb.z ? 0 : Math.atan2(pb.z - pa.z, pb.x - pa.x);
}

export const isBorder = (h: HexCoord, cols: number, rows: number): boolean =>
  h.col === 0 || h.row === 0 || h.col === cols - 1 || h.row === rows - 1;

/** Nenhum hexágono entre `a` e `b` (exclusive) é parede. */
export function lineOfSight(a: HexCoord, b: HexCoord, walls: ReadonlySet<string>): boolean {
  const line = hexLine(a, b);
  return line.slice(1, -1).every((h) => !walls.has(hexKey(h)));
}

/** Hexágonos que o inimigo enxerga: dentro do alcance, do cone e sem parede no meio. */
export function visionHexes(
  enemy: Pick<EnemyState, 'hex' | 'facing'>,
  cols: number,
  rows: number,
  walls: ReadonlySet<string>,
  range: number = ENEMY_RULES.visionRange,
  angle: number = ENEMY_RULES.visionAngle,
): HexCoord[] {
  const half = (angle / 2) * (Math.PI / 180) + 1e-6;
  const fx = Math.cos(enemy.facing);
  const fz = Math.sin(enemy.facing);
  const o = hexToWorld(enemy.hex, 1);
  return hexesInRange(enemy.hex, range, cols, rows).filter((h) => {
    if (walls.has(hexKey(h))) return false;
    const p = hexToWorld(h, 1);
    const dx = p.x - o.x;
    const dz = p.z - o.z;
    const cos = (dx * fx + dz * fz) / Math.hypot(dx, dz);
    return Math.acos(Math.min(1, Math.max(-1, cos))) <= half && lineOfSight(enemy.hex, h, walls);
  });
}

/** Primeiro agente (pela ordem dada) que o inimigo em patrulha enxerga. */
export function spotted(
  enemy: EnemyState,
  agents: ReadonlyMap<string, HexCoord>,
  cols: number,
  rows: number,
  walls: ReadonlySet<string>,
): string | null {
  if (enemy.status !== 'patrol') return null;
  const seen = new Set(visionHexes(enemy, cols, rows, walls).map(hexKey));
  for (const [id, h] of agents) if (seen.has(hexKey(h))) return id;
  return null;
}

/**
 * Próximo trecho da patrulha: até `steps` passos rumo ao ponto seguinte da rota
 * (ida e volta). Devolve o caminho (sem a origem) e o estado da rota depois dele.
 */
export function planPatrol(
  enemy: EnemyState,
  steps: number,
  cols: number,
  rows: number,
  blocked: ReadonlySet<string>,
): { path: HexCoord[]; waypoint: number; dir: 1 | -1 } {
  let { waypoint, dir } = enemy;
  let from = enemy.hex;
  const path: HexCoord[] = [];
  const route = enemy.patrol;
  if (route.length < 2) return { path, waypoint, dir };
  // limita as voltas para não girar em falso se o alvo estiver bloqueado
  for (let guard = 0; path.length < steps && guard < route.length * 2; guard++) {
    const target = route[waypoint];
    if (hexKey(target) === hexKey(from)) {
      ({ waypoint, dir } = advance(waypoint, dir, route.length));
      continue;
    }
    const reach = reachableHexes(from, cols * rows, cols, rows, blocked);
    const leg = pathTo(reach, target);
    if (!leg.length) break; // rota bloqueada (por um agente, por exemplo): espera
    const take = leg.slice(0, steps - path.length);
    path.push(...take);
    from = take[take.length - 1];
    if (hexKey(from) === hexKey(target)) ({ waypoint, dir } = advance(waypoint, dir, route.length));
  }
  return { path, waypoint, dir };
}

function advance(i: number, dir: 1 | -1, n: number): { waypoint: number; dir: 1 | -1 } {
  if (i + dir < 0 || i + dir >= n) dir = dir === 1 ? -1 : 1;
  return { waypoint: i + dir, dir };
}

/**
 * Fuga: caminho mais curto até a borda, desviando dos bloqueios. Entre as bordas
 * igualmente próximas, prefere a mais longe dos agentes. `path` vem cortado em
 * `steps`; `full` é o caminho inteiro (vazio se estiver encurralado).
 */
export function planFlee(
  from: HexCoord,
  steps: number,
  cols: number,
  rows: number,
  blocked: ReadonlySet<string>,
  agents: readonly HexCoord[] = [],
): { path: HexCoord[]; full: HexCoord[]; escapes: boolean; cornered: boolean } {
  if (isBorder(from, cols, rows)) return { path: [], full: [], escapes: true, cornered: false };
  const reach = reachableHexes(from, cols * rows, cols, rows, blocked);
  let best: { coord: HexCoord; cost: number; safety: number } | null = null;
  for (const { coord, cost } of reach.values()) {
    if (!isBorder(coord, cols, rows)) continue;
    const safety = agents.length ? Math.min(...agents.map((a) => hexDistance(a, coord))) : 0;
    if (!best || cost < best.cost || (cost === best.cost && safety > best.safety)) {
      best = { coord, cost, safety };
    }
  }
  if (!best) return { path: [], full: [], escapes: false, cornered: true };
  const full = pathTo(reach, best.coord);
  const path = full.slice(0, steps);
  return { path, full, escapes: path.length === full.length, cornered: false };
}

/** Ainda no tabuleiro (ocupa um hexágono): em patrulha, em alerta ou rendido. */
export const onBoard = (e: Pick<EnemyState, 'status'>): boolean => e.status !== 'fled';

/** Ainda age no turno inimigo: em patrulha ou em alerta. */
export const canAct = (e: Pick<EnemyState, 'status'>): boolean => e.status === 'patrol' || e.status === 'alert';

/** Quem se rende e quem tenta correr se o agente em `from` iniciar uma abordagem. */
export function resolveApproach(
  from: HexCoord,
  enemies: readonly EnemyState[],
  rules: { radius: number; surrenderRange: number } = APPROACH_RULES,
): { surrender: EnemyState[]; flee: EnemyState[] } {
  const surrender: EnemyState[] = [];
  const flee: EnemyState[] = [];
  for (const e of enemies) {
    if (!canAct(e)) continue;
    const d = hexDistance(from, e.hex);
    if (d <= rules.surrenderRange) surrender.push(e);
    else if (d <= rules.radius) flee.push(e);
  }
  return { surrender, flee };
}
