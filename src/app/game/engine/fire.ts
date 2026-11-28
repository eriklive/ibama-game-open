/**
 * Queima e fim da operação no motor: atear fogo num alvo (o avião, os suprimentos) e encerrar
 * a operação.
 *
 * As regras continuam em `../burn.ts` (alcance e quem vê o fogo) e `../mission.ts`
 * (objetivos); aqui viram ações sobre o `GameState`. Quem vê o fogo sai decidido na ação
 * (`planBurn`).
 */
import { Burnable, canBurn, seeFire } from '../burn';
import { facingBetween } from '../enemies';
import { HexCoord } from '../hex';
import { GameState, activeAgent, findEnemy } from './state';

export type FireAction =
  /**
   * O agente da vez ateia fogo em `target`; `at` é o hexágono do alvo para onde quem viu vira, e
   * `witnesses` quem vigiava perto e viu as chamas (entra em alerta).
   */
  | {
      readonly type: 'burn';
      readonly agent: string;
      readonly target: string;
      readonly at: HexCoord;
      readonly witnesses: readonly string[];
    }
  /** A equipe encerra a operação: nada mais anda. */
  | { readonly type: 'endOperation' };

export const FIRE_ACTIONS: ReadonlySet<string> = new Set<FireAction['type']>([
  'burn',
  'endOperation',
]);

/** Atear fogo em `target` (que vem do mapa), se o agente da vez estiver colado nele. */
export function planBurn(
  state: GameState,
  target: Burnable,
): Extract<FireAction, { type: 'burn' }> | null {
  const agent = activeAgent(state);
  const from = state.positions[agent];
  if (!from || state.burned.includes(target.id) || !canBurn(from, target)) return null;
  return {
    type: 'burn',
    agent,
    target: target.id,
    at: { ...target.hexes[0] },
    witnesses: seeFire(target, state.enemies).map((e) => e.id),
  };
}

export function validateFire(state: GameState, action: FireAction): string | null {
  if (state.over) return 'a operação já foi encerrada';
  if (action.type === 'endOperation') return null;
  if (action.agent !== activeAgent(state)) return 'só quem está na vez ateia fogo';
  if (state.burned.includes(action.target)) return 'já está queimando';
  for (const id of action.witnesses) {
    const e = findEnemy(state, id);
    if (!e) return `inimigo desconhecido: ${id}`;
    if (e.status !== 'patrol') return `${id} não estava vigiando`;
  }
  return null;
}

export function applyFire(state: GameState, action: FireAction): GameState {
  if (action.type === 'endOperation') return { ...state, over: true };
  const saw = new Set(action.witnesses);
  return {
    ...state,
    burned: [...state.burned, action.target],
    // quem viu as chamas vira para elas e vai tentar correr
    enemies: state.enemies.map((e) =>
      saw.has(e.id)
        ? { ...e, status: 'alert' as const, facing: facingBetween(e.hex, action.at) }
        : e,
    ),
  };
}
