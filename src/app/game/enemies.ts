import type { ModelDef } from './character-model';
import { HexArea, HexCoord, hexDistance, hexKey, hexLine, hexToWorld, hexesInRange, pathTo, reachableHexes } from './hex';

/**
 * Regras dos inimigos — pensadas para iterar: todos os números ficam aqui.
 *
 * - No turno inimigo (depois de todos os agentes), quem está em patrulha anda
 *   `patrolSteps` passos pela rota.
 * - Cada inimigo em patrulha enxerga um cone à frente (`visionRange` hexágonos,
 *   abertura de `visionAngle` graus). Paredes (e carga alta) bloqueiam a linha de visão.
 *   Carga baixa não bloqueia: ele enxerga por cima, mas não vê o agente colado nela,
 *   do lado de lá.
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
 * Abordagem: o agente da vez anuncia a abordagem ("Ibama! Parados!") e os inimigos em volta
 * reagem conforme a distância (em linha reta). Só conta quem o agente alcança **direto**:
 * parede, porta fechada ou carga alta no meio do caminho tiram o inimigo da abordagem.
 * São três faixas, uma logo depois da outra:
 *
 * 1. **Raio de abordagem** (até `surrenderRange`): se rende.
 * 2. **Zona de rolagem** (`rollBand` hexágonos): rola 1d`escapeDie` + modificador e passa
 *    no teste com `escapeDC` ou mais. Passando, não se rende: entra em alerta e corre no
 *    turno inimigo. Falhando, se rende. O modificador vem de `rollMods`, do hexágono mais
 *    perto da abordagem (mais difícil) ao mais perto da fuga (mais fácil).
 * 3. **Zona de fuga** (`fleeBand` hexágonos): entra em alerta e corre, sem rolar.
 *
 * A intimidação (e o grupo) aumentam o raio de abordagem, e as outras faixas se afastam
 * junto (ver `approachZones` e `approachRulesFor` em `stats.ts`). Quem passou no teste e
 * ainda não fugiu pode ser abordado de novo e rola outra vez. Abordar encerra a vez.
 */
export const APPROACH_RULES = {
  surrenderRange: 3,
  rollBand: 3,
  fleeBand: 1,
  escapeDie: 20,
  escapeDC: 8,
  /** Modificador do teste em cada hexágono da zona de rolagem (um por hexágono, de dentro para fora). */
  rollMods: [-1, 0, 1],
} as const;

/** Onde termina cada faixa da abordagem (distâncias em hexágonos a partir do agente). */
export interface ApproachZones {
  /** Raio de abordagem: até aqui, se rende. */
  surrenderRange: number;
  /** Fim da zona de rolagem. */
  rollRange: number;
  /** Fim da zona de fuga: o alcance total do grito. */
  radius: number;
}

/** As três faixas a partir de um raio de abordagem (nunca menor que 1). */
export function approachZones(
  surrenderRange: number = APPROACH_RULES.surrenderRange,
  rules: Pick<typeof APPROACH_RULES, 'rollBand' | 'fleeBand'> = APPROACH_RULES,
): ApproachZones {
  const s = Math.max(1, surrenderRange);
  return { surrenderRange: s, rollRange: s + rules.rollBand, radius: s + rules.rollBand + rules.fleeBand };
}

/** As faixas de um agente sem intimidação nem grupo. */
export const BASE_APPROACH: ApproachZones = approachZones();

/** Modificador do teste de fuga a `distance` hexágonos (0 fora da zona de rolagem). */
export function escapeModifier(
  distance: number,
  zones: ApproachZones,
  mods: readonly number[] = APPROACH_RULES.rollMods,
): number {
  return mods[distance - zones.surrenderRange - 1] ?? 0;
}

/** Passa no teste de fuga: dado + modificador alcança a dificuldade. */
export const passesEscape = (roll: number, modifier: number, dc: number = APPROACH_RULES.escapeDC): boolean =>
  roll + modifier >= dc;

/** Chance (0..1) de passar no teste de fuga com esse modificador. */
export function escapeChance(
  modifier: number,
  dc: number = APPROACH_RULES.escapeDC,
  sides: number = APPROACH_RULES.escapeDie,
): number {
  return Math.min(1, Math.max(0, (sides + 1 - (dc - modifier)) / sides));
}

/** Retângulo (colunas e fileiras, inclusive) onde um inimigo vagueia. */
export interface WanderZone {
  cols: [number, number];
  rows: [number, number];
}

/** Distância mínima até o próximo destino sorteado de quem vagueia (para não ficar dando passinhos). */
const WANDER_MIN_LEG = 3;

/**
 * `hidden`: escondido (ainda não apareceu no mapa). Não age, não ocupa hexágono e ninguém sabe
 * dele até ser revelado — por exemplo, quando um suspeito o entrega no interrogatório.
 */
export type EnemyStatus = 'patrol' | 'alert' | 'surrendered' | 'fled' | 'hidden';

/** Inimigo como definido no mapa. */
export interface EnemySpawn {
  id: string;
  name: string;
  /**
   * Rota de patrulha (ida e volta pelos pontos). O primeiro é a posição inicial. Com um
   * ponto só, o inimigo fica parado (ver `stationary`).
   */
  patrol: HexCoord[];
  /** Para onde olha no começo (um hexágono); sem isso, olha para o próximo ponto da rota. */
  facing?: HexCoord;
  /**
   * Vagueia (movimento semialeatório) dentro deste retângulo em vez de seguir a rota: sorteia
   * um ponto da área, anda até ele e sorteia outro. `patrol[0]` continua sendo onde começa.
   */
  wander?: WanderZone;
  /** Modelo 3D do inimigo; sem ele, o tabuleiro mostra a peça simples. */
  model?: ModelDef;
  /** Classe de NPC (diálogo do interrogatório, em `npc-dialogue.ts`); sem ela, não há o que interrogar. */
  npc?: string;
  /** Começa escondido: só aparece no mapa quando alguém o entrega (ver `reveals`). */
  hidden?: boolean;
  /** Id do inimigo escondido que este suspeito pode entregar no interrogatório. */
  reveals?: string;
  /** Agilidade na perseguição (sem uso por ora: as curvas não rolam mais; ver `chase.ts`). Sem ela, 0. */
  agilidade?: number;
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
  /** Área onde vagueia (ver `EnemySpawn.wander`). */
  wander?: WanderZone;
  /** Destino sorteado de quem vagueia (sem isso, sorteia um no próximo turno). */
  target?: HexCoord;
  /** Classe de NPC (ver `EnemySpawn.npc`). */
  npc?: string;
  /** Inimigo escondido que este pode entregar (ver `EnemySpawn.reveals`). */
  reveals?: string;
  /** Agilidade na perseguição (ver `EnemySpawn.agilidade`). */
  agilidade?: number;
  /**
   * Abalado: foi agarrado numa perseguição e se rendeu. O próximo interrogatório dele tem +2
   * para o agente (ver `CHASE_RULES.shakenBonus`). Some depois da primeira conversa ou no fim da
   * rodada seguinte.
   */
  shaken?: boolean;
}

export function spawnEnemy(spawn: EnemySpawn): EnemyState {
  const [start, next = start] = spawn.patrol;
  return {
    id: spawn.id,
    name: spawn.name,
    hex: { ...start },
    facing: facingBetween(start, spawn.facing ?? next),
    status: spawn.hidden ? 'hidden' : 'patrol',
    patrol: spawn.patrol.map((h) => ({ ...h })),
    waypoint: spawn.patrol.length > 1 ? 1 : 0,
    dir: 1,
    ...(spawn.wander ? { wander: spawn.wander } : {}),
    ...(spawn.npc ? { npc: spawn.npc } : {}),
    ...(spawn.reveals ? { reveals: spawn.reveals } : {}),
    ...(spawn.agilidade ? { agilidade: spawn.agilidade } : {}),
  };
}

/** Parado no lugar (rota de um ponto só): no turno inimigo, não anda nem gira. */
export const stationary = (e: Pick<EnemyState, 'patrol' | 'wander'>): boolean => e.patrol.length < 2 && !e.wander;

/** Ângulo de `a` para `b` no plano do mundo (0 se forem o mesmo hexágono). */
export function facingBetween(a: HexCoord, b: HexCoord): number {
  const pa = hexToWorld(a, 1);
  const pb = hexToWorld(b, 1);
  return pa.x === pb.x && pa.z === pb.z ? 0 : Math.atan2(pb.z - pa.z, pb.x - pa.x);
}

/** Na borda da área jogável: é por ali que o inimigo foge. */
export const isBorder = (h: HexCoord, area: HexArea): boolean => area.isEdge(h);

/** Nenhum hexágono entre `a` e `b` (exclusive) é parede. */
export function lineOfSight(a: HexCoord, b: HexCoord, walls: ReadonlySet<string>): boolean {
  const line = hexLine(a, b);
  return line.slice(1, -1).every((h) => !walls.has(hexKey(h)));
}

/**
 * Agente em `b` escondido de quem olha de `a`: o último hexágono antes dele, na linha
 * reta entre os dois, é carga baixa (ele está agachado, colado nela, do lado de lá).
 */
export function behindLowCover(a: HexCoord, b: HexCoord, lowCover: ReadonlySet<string>): boolean {
  if (!lowCover.size) return false;
  const line = hexLine(a, b);
  return line.length > 2 && lowCover.has(hexKey(line[line.length - 2]));
}

/**
 * Hexágonos que o inimigo enxerga: dentro do alcance, do cone e sem parede no meio.
 * Os hexágonos de carga baixa e os logo atrás dela (na linha do olhar) ficam de fora.
 */
export function visionHexes(
  enemy: Pick<EnemyState, 'hex' | 'facing'>,
  area: HexArea,
  walls: ReadonlySet<string>,
  range: number = ENEMY_RULES.visionRange,
  angle: number = ENEMY_RULES.visionAngle,
  lowCover: ReadonlySet<string> = new Set(),
): HexCoord[] {
  const half = (angle / 2) * (Math.PI / 180) + 1e-6;
  const fx = Math.cos(enemy.facing);
  const fz = Math.sin(enemy.facing);
  const o = hexToWorld(enemy.hex, 1);
  return hexesInRange(enemy.hex, range, area).filter((h) => {
    if (walls.has(hexKey(h)) || lowCover.has(hexKey(h))) return false;
    const p = hexToWorld(h, 1);
    const dx = p.x - o.x;
    const dz = p.z - o.z;
    const cos = (dx * fx + dz * fz) / Math.hypot(dx, dz);
    return (
      Math.acos(Math.min(1, Math.max(-1, cos))) <= half &&
      lineOfSight(enemy.hex, h, walls) &&
      !behindLowCover(enemy.hex, h, lowCover)
    );
  });
}

/** Primeiro agente (pela ordem dada) que o inimigo em patrulha enxerga. */
export function spotted(
  enemy: EnemyState,
  agents: ReadonlyMap<string, HexCoord>,
  area: HexArea,
  walls: ReadonlySet<string>,
  lowCover: ReadonlySet<string> = new Set(),
): string | null {
  if (enemy.status !== 'patrol') return null;
  const seen = new Set(
    visionHexes(enemy, area, walls, ENEMY_RULES.visionRange, ENEMY_RULES.visionAngle, lowCover).map(hexKey),
  );
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
  area: HexArea,
  blocked: ReadonlySet<string>,
  rng: () => number = Math.random,
): { path: HexCoord[]; waypoint: number; dir: 1 | -1; target?: HexCoord } {
  if (enemy.wander) return { ...planWander(enemy, enemy.wander, steps, area, blocked, rng), waypoint: enemy.waypoint, dir: enemy.dir };
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
    const reach = reachableHexes(from, area.hexes.length, area, blocked);
    const leg = pathTo(reach, target);
    if (!leg.length) break; // rota bloqueada (por um agente, por exemplo): espera
    const take = leg.slice(0, steps - path.length);
    path.push(...take);
    from = take[take.length - 1];
    if (hexKey(from) === hexKey(target)) ({ waypoint, dir } = advance(waypoint, dir, route.length));
  }
  return { path, waypoint, dir };
}

const inZone = (h: HexCoord, z: WanderZone): boolean =>
  h.col >= z.cols[0] && h.col <= z.cols[1] && h.row >= z.rows[0] && h.row <= z.rows[1];

/**
 * Vaguear: segue rumo ao destino sorteado; chegando (ou se ele ficou inalcançável), sorteia
 * outro hexágono livre da zona, a pelo menos `WANDER_MIN_LEG` passos, e continua.
 */
function planWander(
  enemy: EnemyState,
  zone: WanderZone,
  steps: number,
  area: HexArea,
  blocked: ReadonlySet<string>,
  rng: () => number,
): { path: HexCoord[]; target?: HexCoord } {
  const reach = reachableHexes(enemy.hex, area.hexes.length, area, blocked);
  let target = enemy.target;
  let leg = target && hexKey(target) !== hexKey(enemy.hex) ? pathTo(reach, target) : [];
  if (!leg.length) {
    const options = [...reach.values()]
      .map((r) => r.coord)
      .filter((h) => inZone(h, zone) && hexDistance(h, enemy.hex) >= WANDER_MIN_LEG);
    if (!options.length) return { path: [] };
    target = options[Math.min(options.length - 1, Math.floor(rng() * options.length))];
    leg = pathTo(reach, target);
  }
  const path = leg.slice(0, steps);
  const arrived = path.length && hexKey(path[path.length - 1]) === hexKey(target!);
  return { path, target: arrived ? undefined : target };
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
  area: HexArea,
  blocked: ReadonlySet<string>,
  agents: readonly HexCoord[] = [],
): { path: HexCoord[]; full: HexCoord[]; escapes: boolean; cornered: boolean } {
  if (isBorder(from, area)) return { path: [], full: [], escapes: true, cornered: false };
  const reach = reachableHexes(from, area.hexes.length, area, blocked);
  let best: { coord: HexCoord; cost: number; safety: number } | null = null;
  for (const { coord, cost } of reach.values()) {
    if (!isBorder(coord, area)) continue;
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

/** Ainda no tabuleiro (ocupa um hexágono): em patrulha, em alerta ou rendido (escondido e fugido, não). */
export const onBoard = (e: Pick<EnemyState, 'status'>): boolean => e.status !== 'fled' && e.status !== 'hidden';

/** A equipe sabe dele (já apareceu no mapa, mesmo que tenha fugido). */
export const known = (e: Pick<EnemyState, 'status'>): boolean => e.status !== 'hidden';

/** Ainda age no turno inimigo: em patrulha ou em alerta. */
export const canAct = (e: Pick<EnemyState, 'status'>): boolean => e.status === 'patrol' || e.status === 'alert';

/** Inimigo na zona de rolagem: vai rolar o teste de fuga. */
export interface EscapeCheck {
  enemy: EnemyState;
  distance: number;
  modifier: number;
  /** Chance (0..1) de passar no teste e correr. */
  chance: number;
}

/** O teste rolado: a face do dado, o total e se passou. */
export interface EscapeRoll extends EscapeCheck {
  roll: number;
  total: number;
  passed: boolean;
}

/**
 * Quem se rende, quem rola o teste de fuga e quem corre sem rolar se o agente em `from`
 * iniciar uma abordagem. Rendidos e fugidos não contam; quem já está em alerta, sim. Com
 * `walls`, só entra quem está em linha de visão direta (sem parede, porta fechada ou carga
 * alta no meio).
 */
export function resolveApproach(
  from: HexCoord,
  enemies: readonly EnemyState[],
  zones: ApproachZones = BASE_APPROACH,
  walls?: ReadonlySet<string>,
): { surrender: EnemyState[]; roll: EscapeCheck[]; flee: EnemyState[] } {
  const surrender: EnemyState[] = [];
  const roll: EscapeCheck[] = [];
  const flee: EnemyState[] = [];
  for (const e of enemies) {
    if (!canAct(e)) continue;
    if (walls && !lineOfSight(from, e.hex, walls)) continue;
    const d = hexDistance(from, e.hex);
    if (d <= zones.surrenderRange) surrender.push(e);
    else if (d <= zones.rollRange) {
      const modifier = escapeModifier(d, zones);
      roll.push({ enemy: e, distance: d, modifier, chance: escapeChance(modifier) });
    } else if (d <= zones.radius) flee.push(e);
  }
  return { surrender, roll, flee };
}

/** Rola o teste de fuga de quem está na zona de rolagem (`die` devolve a face do dado). */
export function rollEscape(check: EscapeCheck, die: () => number): EscapeRoll {
  const roll = die();
  return { ...check, roll, total: roll + check.modifier, passed: passesEscape(roll, check.modifier) };
}
