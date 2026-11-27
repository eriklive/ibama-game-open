/**
 * Motor da partida (ver `docs/multiplayer.md`): `GameState` mudado só por `GameAction`.
 * `validateAction` diz se a ação vale; `applyAction` aplica. No multiplayer, o servidor roda
 * os dois e transmite a ação; cada cliente aplica e anima.
 */
import { EnemyAction, ENEMY_ACTIONS, applyEnemy, validateEnemy } from './enemy-turn';
import { APPROACH_ACTIONS, ApproachAction, applyApproach, validateApproach } from './approach';
import { DOORS_ACTIONS, DoorsAction, applyDoors, validateDoors } from './doors';
import { GROUP_ACTIONS, GroupAction, applyGroup, validateGroup } from './group';
import { GameState } from './state';
import { TurnAction, applyTurn, validateTurn } from './turn';

export type GameAction = TurnAction | EnemyAction | GroupAction | DoorsAction | ApproachAction;

const isEnemyAction = (a: GameAction): a is EnemyAction => ENEMY_ACTIONS.has(a.type);
const isGroupAction = (a: GameAction): a is GroupAction => GROUP_ACTIONS.has(a.type);
const isDoorsAction = (a: GameAction): a is DoorsAction => DOORS_ACTIONS.has(a.type);
const isApproachAction = (a: GameAction): a is ApproachAction => APPROACH_ACTIONS.has(a.type);

/** Por que a ação não vale neste estado, ou `null` se vale. */
export function validateAction(state: GameState, action: GameAction): string | null {
  if (isEnemyAction(action)) return validateEnemy(state, action);
  if (isGroupAction(action)) return validateGroup(state, action);
  if (isDoorsAction(action)) return validateDoors(state, action);
  if (isApproachAction(action)) return validateApproach(state, action);
  return validateTurn(state, action);
}

/** Aplica uma ação (que já passou por `validateAction`) e devolve o estado novo. */
export function applyAction(state: GameState, action: GameAction): GameState {
  if (isEnemyAction(action)) return applyEnemy(state, action);
  if (isGroupAction(action)) return applyGroup(state, action);
  if (isDoorsAction(action)) return applyDoors(state, action);
  if (isApproachAction(action)) return applyApproach(state, action);
  return applyTurn(state, action);
}

export * from './state';
export type { TurnAction } from './turn';
export { movementFor } from './turn';
export type { EnemyAction, Sighting } from './enemy-turn';
export { blockedFor, firstSighting, planFleeAct, planPatrolAct } from './enemy-turn';
export type { GroupAction } from './group';
export { planMove, planRally, planReline, rallyFree, rallyOptions } from './group';
export type { DoorsAction } from './doors';
export {
  breakInBoostOf,
  doorNeedFor,
  doorOutcome,
  pickBonusOf,
  planBreakIn,
  planDoor,
} from './doors';
export type { ApproachAction } from './approach';
export { approachPreview, approachZonesFor, planApproach } from './approach';
