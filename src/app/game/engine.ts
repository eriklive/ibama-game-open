/**
 * Motor do ciclo do turno: o estado da partida que importa para todos os jogadores, mudado
 * só por ações. É o primeiro pedaço do motor do multiplayer (ver `docs/multiplayer.md`): o
 * mesmo `applyAction` vai rodar no servidor (que confere e transmite cada ação) e nos
 * clientes (que aplicam a ação e animam).
 *
 * Regras de ouro:
 * - o estado é serializável em JSON (nada de `Map`, `Set` ou classes);
 * - toda aleatoriedade já vem resolvida dentro da ação (os dados rolados viajam com ela);
 * - `applyAction` é puro: mesma entrada, mesma saída, sem relógio nem animação.
 *
 * Por enquanto o motor guarda só o turno, a vez, as posições dos agentes, os dados e o
 * movimento restante. Grupo, portas, inimigos e o resto continuam no componente e entram
 * aqui aos poucos.
 */
import { HexCoord, hexDistance } from './hex';

export interface TurnState {
  /** Turno global: aumenta a cada vez que um agente começa a jogar. */
  readonly turn: number;
  /** Ordem fixa da vez (ids dos agentes). */
  readonly order: readonly string[];
  /** Índice em `order` de quem está na vez. */
  readonly activeIndex: number;
  /** Onde cada agente está. */
  readonly positions: Readonly<Record<string, HexCoord>>;
  /** Dados da última rolagem de movimento (vazio antes da primeira). */
  readonly dice: readonly number[];
  /** Movimento que ainda sobra neste turno. */
  readonly movesLeft: number;
}

export type TurnAction =
  /** Rolagem de movimento: os dados sorteados e o movimento que deram (já com os bônus). */
  | { readonly type: 'roll'; readonly dice: readonly number[]; readonly movement: number }
  /** Agentes andam passo a passo (cada caminho parte de onde o agente está) e gastam `cost`. */
  | {
      readonly type: 'move';
      readonly paths: Readonly<Record<string, readonly HexCoord[]>>;
      readonly cost: number;
    }
  /** Gasta movimento sem andar (porta, pergunta…); nunca fica negativo. */
  | { readonly type: 'spend'; readonly cost: number }
  /** Põe agentes direto num hexágono (troca de vagas do grupo, fim da corrida, caso de teste). */
  | { readonly type: 'place'; readonly positions: Readonly<Record<string, HexCoord>> }
  /** A vez passa para o próximo agente da ordem. */
  | { readonly type: 'nextAgent' }
  /** A vez vai direto para um agente (caso de teste). */
  | { readonly type: 'setActive'; readonly agent: string };

export function initialTurnState(
  order: readonly string[],
  positions: Readonly<Record<string, HexCoord>>,
): TurnState {
  return {
    turn: 1,
    order: [...order],
    activeIndex: 0,
    positions: { ...positions },
    dice: [],
    movesLeft: 0,
  };
}

export const activeAgent = (state: TurnState): string => state.order[state.activeIndex];

const isCount = (n: number): boolean => Number.isInteger(n) && n >= 0;
const isHex = (h: HexCoord | undefined): h is HexCoord =>
  !!h && Number.isInteger(h.col) && Number.isInteger(h.row);

/** Por que a ação não vale neste estado, ou `null` se vale. É o que o servidor vai conferir. */
export function validateAction(state: TurnState, action: TurnAction): string | null {
  switch (action.type) {
    case 'roll':
      if (!action.dice.length || !action.dice.every((d) => Number.isInteger(d) && d >= 1))
        return 'dados inválidos';
      return isCount(action.movement) ? null : 'movimento inválido';
    case 'move': {
      if (!isCount(action.cost)) return 'custo inválido';
      for (const [id, path] of Object.entries(action.paths)) {
        let at = state.positions[id];
        if (!at) return `agente desconhecido: ${id}`;
        for (const step of path) {
          if (!isHex(step) || hexDistance(at, step) !== 1)
            return `caminho de ${id} não é passo a passo`;
          at = step;
        }
      }
      return null;
    }
    case 'spend':
      return isCount(action.cost) ? null : 'custo inválido';
    case 'place':
      for (const [id, hex] of Object.entries(action.positions)) {
        if (!state.positions[id]) return `agente desconhecido: ${id}`;
        if (!isHex(hex)) return `posição inválida para ${id}`;
      }
      return null;
    case 'nextAgent':
      return null;
    case 'setActive':
      return state.order.includes(action.agent) ? null : `agente desconhecido: ${action.agent}`;
  }
}

/** Aplica uma ação (que já passou por `validateAction`) e devolve o estado novo. */
export function applyAction(state: TurnState, action: TurnAction): TurnState {
  switch (action.type) {
    case 'roll':
      return { ...state, dice: [...action.dice], movesLeft: action.movement };
    case 'move': {
      const positions = { ...state.positions };
      for (const [id, path] of Object.entries(action.paths))
        if (path.length) positions[id] = { ...path.at(-1)! };
      return { ...state, positions, movesLeft: Math.max(0, state.movesLeft - action.cost) };
    }
    case 'spend':
      return { ...state, movesLeft: Math.max(0, state.movesLeft - action.cost) };
    case 'place': {
      const positions = { ...state.positions };
      for (const [id, hex] of Object.entries(action.positions)) positions[id] = { ...hex };
      return { ...state, positions };
    }
    case 'nextAgent':
      return {
        ...state,
        activeIndex: (state.activeIndex + 1) % state.order.length,
        turn: state.turn + 1,
      };
    case 'setActive':
      return { ...state, activeIndex: state.order.indexOf(action.agent) };
  }
}
