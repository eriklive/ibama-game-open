/**
 * Grupo no motor: agrupar (com o Comando do Capitão), desagrupar, andar em fila com o líder
 * e a troca de vagas da fila no começo e no fim da vez.
 *
 * As regras geométricas (pontos de encontro, rastro do líder, troca de vagas) continuam em
 * `../group.ts`; aqui elas viram ações sobre o `GameState`. Como no turno inimigo, quem
 * precisa do mapa é o planejador (`planRally`, `planMove`, `planReline`), e a ação sai
 * resolvida: só caminhos e listas, que o servidor confere passo a passo.
 */
import { commandFree, rallyCost } from '../agent-class';
import { RallyPlan, followLeader, lineMoves, lineSwapPaths, rallyPoints, toFront } from '../group';
import { HexCoord, hexKey, sameHex } from '../hex';
import {
  GameState,
  World,
  activeAgent,
  classOfAgent,
  enemyWalls,
  inGroup,
  isGrouped,
  lineOf,
  positionsOf,
} from './state';
import { TurnAction, stepByStep } from './turn';

type Paths = Readonly<Record<string, readonly HexCoord[]>>;

export type GroupAction =
  /**
   * Agrupar: cada agente anda até o ponto de encontro (o da vez no ponto, os outros em volta)
   * e a equipe inteira passa a andar junta. `cost` é o plano sem o Comando: o motor decide se
   * sai de graça.
   */
  | {
      readonly type: 'rally';
      readonly leader: string;
      readonly paths: Paths;
      readonly cost: number;
    }
  /** Desagrupar: cada um por si. */
  | { readonly type: 'ungroup' }
  /**
   * A fila do grupo muda de ordem (quem joga vai para a frente; quem jogou, para o fim) e cada
   * um anda até a vaga nova: `paths` para animar, `positions` onde cada um termina.
   */
  | {
      readonly type: 'reline';
      readonly line: readonly string[];
      readonly paths: Paths;
      readonly positions: Readonly<Record<string, HexCoord>>;
    };

export const GROUP_ACTIONS: ReadonlySet<string> = new Set<GroupAction['type']>([
  'rally',
  'ungroup',
  'reline',
]);

/** Pontos de encontro possíveis para o agente da vez (só com a equipe separada). */
export function rallyOptions(state: GameState, world: World): Map<string, RallyPlan> {
  if (state.group.length) return new Map();
  return rallyPoints(
    activeAgent(state),
    positionsOf(state),
    state.movesLeft,
    world.area,
    enemyWalls(state, world),
  );
}

/** O Agrupar do agente da vez sai de graça agora (Comando do Capitão ainda não usado no turno). */
export const rallyFree = (state: GameState): boolean =>
  commandFree(classOfAgent(state, activeAgent(state)), state.commandsUsed);

/** Agrupar no ponto `point`, se ele é um ponto de encontro possível. */
export function planRally(
  state: GameState,
  point: HexCoord,
  world: World,
): Extract<GroupAction, { type: 'rally' }> | null {
  const plan = rallyOptions(state, world).get(hexKey(point));
  if (!plan) return null;
  return {
    type: 'rally',
    leader: activeAgent(state),
    paths: Object.fromEntries(plan.paths),
    cost: plan.cost,
  };
}

/**
 * Andar com o agente da vez pelo caminho `path`. Agrupado, os companheiros seguem o rastro
 * dele: a fila fica na ordem em que andam, e quem não conseguiu seguir sai do grupo (`left`).
 */
export function planMove(
  state: GameState,
  path: readonly HexCoord[],
  world: World,
): Extract<TurnAction, { type: 'move' }> {
  const leader = activeAgent(state);
  const paths = new Map<string, HexCoord[]>([[leader, [...path]]]);
  if (!isGrouped(state))
    return { type: 'move', paths: Object.fromEntries(paths), cost: path.length };
  const followers = new Map(
    [...positionsOf(state)].filter(([id]) => id !== leader && inGroup(state, id)),
  );
  const plan = followLeader(
    state.positions[leader],
    path,
    followers,
    world.area,
    enemyWalls(state, world),
  );
  for (const [id, p] of plan.paths) paths.set(id, p);
  return {
    type: 'move',
    paths: Object.fromEntries(paths),
    cost: path.length,
    line: [...paths.keys()],
    ...(plan.left.length ? { left: plan.left } : {}),
  };
}

/** Arruma a fila do grupo como `next` (cada um anda até a vaga nova); `null` se ninguém precisa andar. */
export function planReline(
  state: GameState,
  next: readonly string[],
  world: World,
): Extract<GroupAction, { type: 'reline' }> | null {
  const positions = positionsOf(state);
  const moves = lineMoves(lineOf(state), next, positions);
  if (!moves.size) return null;
  const paths = lineSwapPaths(moves, positions, world.area, enemyWalls(state, world));
  if (!paths) return null;
  return {
    type: 'reline',
    line: [...next],
    paths: Object.fromEntries(paths),
    positions: Object.fromEntries([...moves].map(([id, h]) => [id, { ...h }])),
  };
}

const samePeople = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id) => b.includes(id));

export function validateGroup(state: GameState, action: GroupAction): string | null {
  switch (action.type) {
    case 'rally': {
      if (action.leader !== activeAgent(state)) return 'só quem está na vez chama o grupo';
      if (state.group.length) return 'a equipe já está agrupada';
      if (!Number.isInteger(action.cost) || action.cost < 0 || action.cost > state.movesLeft) {
        return 'movimento insuficiente para agrupar';
      }
      for (const id of state.order) {
        const path = action.paths[id] ?? [];
        if (!stepByStep(state.positions[id], path)) return `caminho de ${id} não é passo a passo`;
        if (path.length > action.cost) return `${id} anda mais que o custo do encontro`;
      }
      const leaderAt = action.paths[action.leader]?.at(-1) ?? state.positions[action.leader];
      const others = state.order.filter((id) => id !== action.leader);
      const ends = others.map((id) => action.paths[id]?.at(-1) ?? state.positions[id]);
      if (ends.some((h) => sameHex(h, leaderAt))) return 'dois agentes no mesmo hexágono';
      return null;
    }
    case 'ungroup':
      return state.group.length ? null : 'a equipe não está agrupada';
    case 'reline': {
      if (!samePeople(action.line, lineOf(state))) return 'a fila nova não tem as mesmas pessoas';
      for (const [id, path] of Object.entries(action.paths)) {
        if (!inGroup(state, id)) return `${id} não está no grupo`;
        if (!stepByStep(state.positions[id], path)) return `caminho de ${id} não é passo a passo`;
      }
      for (const [id, hex] of Object.entries(action.positions)) {
        const end = action.paths[id]?.at(-1);
        if (!end || !sameHex(end, hex)) return `${id} não termina na vaga nova`;
      }
      return null;
    }
  }
}

export function applyGroup(state: GameState, action: GroupAction): GameState {
  switch (action.type) {
    case 'rally': {
      const positions = { ...state.positions };
      for (const [id, path] of Object.entries(action.paths))
        if (path.length) positions[id] = { ...path.at(-1)! };
      const free = rallyFree(state);
      const cls = classOfAgent(state, action.leader);
      const joined: GameState = { ...state, positions, group: [...state.order] };
      return {
        ...joined,
        // quem chamou o grupo fica na frente da fila
        groupLine: toFront(lineOf(joined), action.leader),
        movesLeft: Math.max(0, state.movesLeft - rallyCost(action.cost, cls, state.commandsUsed)),
        commandsUsed: state.commandsUsed + (free ? 1 : 0),
      };
    }
    case 'ungroup':
      return { ...state, group: [] };
    case 'reline': {
      const positions = { ...state.positions };
      for (const [id, hex] of Object.entries(action.positions)) positions[id] = { ...hex };
      return { ...state, positions, groupLine: [...action.line] };
    }
  }
}
