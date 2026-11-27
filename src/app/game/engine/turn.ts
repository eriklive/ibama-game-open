/**
 * Ciclo do turno: rolagem de movimento, andar, gastar movimento e passar a vez.
 */
import { HexCoord, hexDistance } from '../hex';
import { GameState, isCount, isHex } from './state';

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

/** Confere se `path` anda de hexágono em hexágono a partir de `from`. */
export function stepByStep(from: HexCoord, path: readonly HexCoord[]): boolean {
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
      return isCount(action.movement) ? null : 'movimento inválido';
    case 'move': {
      if (!isCount(action.cost)) return 'custo inválido';
      for (const [id, path] of Object.entries(action.paths)) {
        const at = state.positions[id];
        if (!at) return `agente desconhecido: ${id}`;
        if (!stepByStep(at, path)) return `caminho de ${id} não é passo a passo`;
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

export function applyTurn(state: GameState, action: TurnAction): GameState {
  switch (action.type) {
    case 'roll':
      return { ...state, dice: [...action.dice], movesLeft: action.movement };
    case 'move': {
      const positions = { ...state.positions };
      for (const [id, path] of Object.entries(action.paths)) {
        if (path.length) positions[id] = { ...path.at(-1)! };
      }
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
