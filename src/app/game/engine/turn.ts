/**
 * Ciclo do turno: rolagem de movimento, andar, gastar movimento e passar a vez.
 */
import { sum } from '../dice';
import { HexCoord, hexDistance } from '../hex';
import { turnMovement } from '../stats';
import {
  GameState,
  activeAgent,
  inGroup,
  isCount,
  isGrouped,
  isHex,
  isLed,
  loadoutOf,
} from './state';

export type TurnAction =
  /** Rolagem de movimento: só os dados sorteados; o motor soma vigor, grupo e Liderança. */
  | { readonly type: 'roll'; readonly dice: readonly number[] }
  /**
   * Agentes andam passo a passo (cada caminho parte de onde o agente está) e gastam `cost`.
   * Andando em grupo, `line` é a fila nova (na ordem em que andaram) e `left`, quem não
   * conseguiu seguir o líder e saiu do grupo (ver `planMove`).
   */
  | {
      readonly type: 'move';
      readonly paths: Readonly<Record<string, readonly HexCoord[]>>;
      readonly cost: number;
      readonly line?: readonly string[];
      readonly left?: readonly string[];
    }
  /** Gasta movimento sem andar (porta, pergunta…); nunca fica negativo. */
  | { readonly type: 'spend'; readonly cost: number }
  /** Põe agentes direto num hexágono (fim da corrida, caso de teste). */
  | { readonly type: 'place'; readonly positions: Readonly<Record<string, HexCoord>> }
  /** A vez passa para o próximo agente da ordem. */
  | { readonly type: 'nextAgent' }
  /** A vez vai direto para um agente (caso de teste). */
  | { readonly type: 'setActive'; readonly agent: string };

/** Movimento do agente da vez com esses dados (soma + vigor + grupo + Liderança). */
export const movementFor = (state: GameState, dice: readonly number[]): number =>
  turnMovement(
    sum([...dice]),
    loadoutOf(state, activeAgent(state)),
    isGrouped(state),
    isLed(state),
  );

/** Confere se `path` anda de hexágono em hexágono a partir de `from`. */
export function stepByStep(from: HexCoord | undefined, path: readonly HexCoord[]): boolean {
  if (!from) return false;
  let at = from;
  for (const step of path) {
    if (!isHex(step) || hexDistance(at, step) !== 1) return false;
    at = step;
  }
  return true;
}

export function validateTurn(state: GameState, action: TurnAction): string | null {
  switch (action.type) {
    case 'roll':
      if (!action.dice.length || !action.dice.every((d) => Number.isInteger(d) && d >= 1)) {
        return 'dados inválidos';
      }
      return null;
    case 'move': {
      if (!isCount(action.cost)) return 'custo inválido';
      if (action.cost > state.movesLeft) return 'movimento insuficiente';
      const leader = activeAgent(state);
      for (const [id, path] of Object.entries(action.paths)) {
        if (!state.positions[id]) return `agente desconhecido: ${id}`;
        // só anda quem está na vez, e os companheiros dele no grupo
        if (path.length && id !== leader && !(isGrouped(state) && inGroup(state, id))) {
          return `${id} não anda na vez de ${leader}`;
        }
        if (!stepByStep(state.positions[id], path)) return `caminho de ${id} não é passo a passo`;
      }
      if (action.line?.some((id) => !inGroup(state, id))) return 'fila com quem não está no grupo';
      if (action.left?.some((id) => !inGroup(state, id)))
        return 'saindo do grupo quem não está nele';
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

export function applyTurn(state: GameState, action: TurnAction): GameState {
  switch (action.type) {
    case 'roll':
      return { ...state, dice: [...action.dice], movesLeft: movementFor(state, action.dice) };
    case 'move': {
      const positions = { ...state.positions };
      for (const [id, path] of Object.entries(action.paths)) {
        if (path.length) positions[id] = { ...path.at(-1)! };
      }
      const next: GameState = {
        ...state,
        positions,
        movesLeft: Math.max(0, state.movesLeft - action.cost),
        ...(action.line ? { groupLine: [...action.line] } : {}),
      };
      if (!action.left?.length) return next;
      // com menos de dois, o grupo acaba
      const group = state.group.filter((id) => !action.left!.includes(id));
      return { ...next, group: group.length > 1 ? group : [] };
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
        commandsUsed: 0,
      };
    case 'setActive':
      return { ...state, activeIndex: state.order.indexOf(action.agent), commandsUsed: 0 };
  }
}
