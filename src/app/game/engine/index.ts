/**
 * Motor da partida (ver `docs/multiplayer.md`): `GameState` mudado só por `GameAction`.
 * `validateAction` diz se a ação vale; `applyAction` aplica. No multiplayer, o servidor roda
 * os dois e transmite a ação; cada cliente aplica e anima.
 */
import { EnemyAction, ENEMY_ACTIONS, applyEnemy, validateEnemy } from './enemy-turn';
import { GROUP_ACTIONS, GroupAction, applyGroup, validateGroup } from './group';
import { GameState } from './state';
import { TurnAction, applyTurn, validateTurn } from './turn';

export type GameAction = TurnAction | EnemyAction | GroupAction;

const isEnemyAction = (a: GameAction): a is EnemyAction => ENEMY_ACTIONS.has(a.type);
const isGroupAction = (a: GameAction): a is GroupAction => GROUP_ACTIONS.has(a.type);

/** Por que a ação não vale neste estado, ou `null` se vale. */
export function validateAction(state: GameState, action: GameAction): string | null {
  if (isEnemyAction(action)) return validateEnemy(state, action);
  if (isGroupAction(action)) return validateGroup(state, action);
  return validateTurn(state, action);
}

/** Aplica uma ação (que já passou por `validateAction`) e devolve o estado novo. */
export function applyAction(state: GameState, action: GameAction): GameState {
  if (isEnemyAction(action)) return applyEnemy(state, action);
  if (isGroupAction(action)) return applyGroup(state, action);
  return applyTurn(state, action);
}

export * from './state';
export type { TurnAction } from './turn';
export { movementFor } from './turn';
export type { EnemyAction, Sighting } from './enemy-turn';
export { blockedFor, firstSighting, planFleeAct, planPatrolAct } from './enemy-turn';
export type { GroupAction } from './group';
export { planMove, planRally, planReline, rallyFree, rallyOptions } from './group';
