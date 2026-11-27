/**
 * Turno inimigo no motor: cada inimigo que age vira **uma** ação já resolvida (o caminho
 * inteiro, quem ele avistou e em que passo, se fugiu do mapa). Primeiro o motor decide,
 * depois a tela anima; nada depende da animação.
 *
 * As regras (rota, cone de visão, fuga para a borda) continuam em `../enemies.ts`; aqui elas
 * são aplicadas ao `GameState`. A perseguição, que pode acontecer no meio do turno inimigo,
 * ainda é do componente e migra no passo dela (ver `docs/multiplayer.md`).
 */
import {
  ENEMY_RULES,
  EnemyState,
  facingBetween,
  isBorder,
  onBoard,
  planFlee,
  planPatrol,
  spotted,
} from '../enemies';
import { HexCoord, hexKey } from '../hex';
import { GameState, World, findEnemy, isHex } from './state';
import { stepByStep } from './turn';

/** O que um inimigo avistou: o agente e onde ele estava (o inimigo vira para lá). */
export interface Sighting {
  readonly agent: string;
  readonly at: HexCoord;
}

export type EnemyAction =
  /**
   * Trecho de patrulha: anda `path` (pode ser vazio: caminho bloqueado), atualiza a rota e,
   * se avistou alguém no último passo, entra em alerta virado para ele.
   */
  | {
      readonly type: 'enemyPatrol';
      readonly enemy: string;
      readonly path: readonly HexCoord[];
      readonly waypoint: number;
      readonly dir: 1 | -1;
      readonly target?: HexCoord;
      readonly spotted?: Sighting;
    }
  /** Fuga rumo à borda: anda `path`; `fled` se terminou na borda e saiu do mapa. */
  | {
      readonly type: 'enemyFlee';
      readonly enemy: string;
      readonly path: readonly HexCoord[];
      readonly cornered: boolean;
      readonly fled: boolean;
    }
  /** Um inimigo em patrulha avistou um agente (que andou para dentro do cone, por exemplo). */
  | { readonly type: 'spot'; readonly enemy: string; readonly agent: string; readonly at: HexCoord }
  /** Fim da rodada inimiga: o "abalado" passa, menos para quem foi agarrado agora. */
  | { readonly type: 'clearShaken'; readonly except: readonly string[] }
  /**
   * TRANSITÓRIO: muda um inimigo direto. Usado pelos sistemas que ainda não migraram para o
   * motor (abordagem, perseguição, interrogatório, casos de teste) e some quando eles migrarem.
   */
  | {
      readonly type: 'patchEnemy';
      readonly enemy: string;
      readonly patch: Partial<Omit<EnemyState, 'id'>>;
    };

export const ENEMY_ACTIONS: ReadonlySet<string> = new Set<EnemyAction['type']>([
  'enemyPatrol',
  'enemyFlee',
  'spot',
  'clearShaken',
  'patchEnemy',
]);

const agentsOf = (state: GameState): Map<string, HexCoord> =>
  new Map(Object.entries(state.positions));

/** Onde o inimigo `id` não pode pisar: o sólido do mapa, os agentes e os outros inimigos. */
export function blockedFor(state: GameState, id: string, world: World): Set<string> {
  return new Set([
    ...world.solid,
    ...Object.values(state.positions).map(hexKey),
    ...state.enemies.filter((e) => e.id !== id && onBoard(e)).map((e) => hexKey(e.hex)),
  ]);
}

/** O inimigo depois de andar `path`, virando a cada passo para onde anda. */
function walked(enemy: EnemyState, path: readonly HexCoord[]): EnemyState {
  let e = enemy;
  for (const hex of path) e = { ...e, hex: { ...hex }, facing: facingBetween(e.hex, hex) };
  return e;
}

/**
 * Decide o trecho de patrulha. Ao avistar um agente, o inimigo para naquele passo: o caminho
 * vem cortado ali e `spotted` diz quem. `rng` sorteia o destino de quem vagueia.
 */
export function planPatrolAct(
  state: GameState,
  id: string,
  world: World,
  rng: () => number,
): Extract<EnemyAction, { type: 'enemyPatrol' }> {
  const enemy = findEnemy(state, id)!;
  const plan = planPatrol(
    enemy,
    ENEMY_RULES.patrolSteps,
    world.area,
    blockedFor(state, id, world),
    rng,
  );
  const agents = agentsOf(state);
  const base = {
    type: 'enemyPatrol' as const,
    enemy: id,
    waypoint: plan.waypoint,
    dir: plan.dir,
    ...(plan.target ? { target: { ...plan.target } } : {}),
  };
  const path: HexCoord[] = [];
  let at = enemy;
  for (const hex of plan.path) {
    at = walked(at, [hex]);
    path.push({ ...hex });
    const who = spotted(at, agents, world.area, world.walls, world.lowCover);
    if (who) return { ...base, path, spotted: { agent: who, at: { ...agents.get(who)! } } };
  }
  return { ...base, path };
}

/** Decide a fuga: até `fleeSteps` passos rumo à borda mais segura; na borda, sai do mapa. */
export function planFleeAct(
  state: GameState,
  id: string,
  world: World,
): Extract<EnemyAction, { type: 'enemyFlee' }> {
  const enemy = findEnemy(state, id)!;
  const agents = Object.values(state.positions);
  const plan = planFlee(
    enemy.hex,
    ENEMY_RULES.fleeSteps,
    world.area,
    blockedFor(state, id, world),
    agents,
  );
  if (plan.cornered) return { type: 'enemyFlee', enemy: id, path: [], cornered: true, fled: false };
  const end = plan.path.at(-1) ?? enemy.hex;
  return {
    type: 'enemyFlee',
    enemy: id,
    path: plan.path.map((h) => ({ ...h })),
    cornered: false,
    fled: isBorder(end, world.area),
  };
}

/** Primeiro inimigo em patrulha que enxerga algum dos `agents` (posições ao vivo, no meio de um passo). */
export function firstSighting(
  state: GameState,
  agents: ReadonlyMap<string, HexCoord>,
  world: World,
  only?: string,
): { enemy: string; sighting: Sighting } | null {
  for (const e of state.enemies) {
    if (only && e.id !== only) continue;
    const who = spotted(e, agents, world.area, world.walls, world.lowCover);
    if (who) return { enemy: e.id, sighting: { agent: who, at: { ...agents.get(who)! } } };
  }
  return null;
}

export function validateEnemy(state: GameState, action: EnemyAction): string | null {
  if (action.type === 'clearShaken') return null;
  const enemy = findEnemy(state, action.enemy);
  if (!enemy) return `inimigo desconhecido: ${action.enemy}`;
  switch (action.type) {
    case 'enemyPatrol':
      if (enemy.status !== 'patrol') return `${enemy.id} não está em patrulha`;
      if (!stepByStep(enemy.hex, action.path)) return `caminho de ${enemy.id} não é passo a passo`;
      if (action.spotted && !state.positions[action.spotted.agent])
        return 'agente avistado desconhecido';
      return null;
    case 'enemyFlee':
      if (enemy.status !== 'alert') return `${enemy.id} não está em alerta`;
      return stepByStep(enemy.hex, action.path)
        ? null
        : `caminho de ${enemy.id} não é passo a passo`;
    case 'spot':
      if (enemy.status !== 'patrol') return `${enemy.id} não está em patrulha`;
      if (!state.positions[action.agent]) return `agente desconhecido: ${action.agent}`;
      return isHex(action.at) ? null : 'posição inválida';
    case 'patchEnemy':
      return null;
  }
}

const replace = (state: GameState, next: EnemyState): GameState => ({
  ...state,
  enemies: state.enemies.map((e) => (e.id === next.id ? next : e)),
});

/** Em alerta, virado para quem avistou. */
const alerted = (e: EnemyState, s: Sighting): EnemyState => ({
  ...e,
  status: 'alert',
  facing: facingBetween(e.hex, s.at),
});

export function applyEnemy(state: GameState, action: EnemyAction): GameState {
  if (action.type === 'clearShaken') {
    const keep = new Set(action.except);
    return {
      ...state,
      enemies: state.enemies.map((e) =>
        e.shaken && !keep.has(e.id) ? { ...e, shaken: false } : e,
      ),
    };
  }
  const enemy = findEnemy(state, action.enemy)!;
  switch (action.type) {
    case 'enemyPatrol': {
      let next: EnemyState = {
        ...walked(enemy, action.path),
        waypoint: action.waypoint,
        dir: action.dir,
      };
      // sem destino, quem vagueia sorteia outro no próximo turno
      if (action.target) next.target = { ...action.target };
      else delete next.target;
      if (action.spotted) next = alerted(next, action.spotted);
      return replace(state, next);
    }
    case 'enemyFlee': {
      const next = walked(enemy, action.path);
      return replace(state, action.fled ? { ...next, status: 'fled' } : next);
    }
    case 'spot':
      return replace(state, alerted(enemy, { agent: action.agent, at: action.at }));
    case 'patchEnemy':
      return replace(state, { ...enemy, ...action.patch });
  }
}
