/**
 * Portas no motor: abrir, destrancar (com a Gazua do Agente) e arrombar (com o dano que cada
 * chute deixa), e a reação do cômodo a um arrombamento.
 *
 * As regras continuam em `../door.ts`; aqui elas viram ações sobre o `GameState`. O d20 vem
 * sorteado dentro da ação (`planDoor`, `planBreakIn`), e o resultado sai do motor
 * (`doorOutcome`), igual para todos.
 */
import { skillBonus } from '../agent-class';
import { rollDie } from '../dice';
import {
  BREAK_IN_RULES,
  BreakInRoll,
  DOOR_RULES,
  Door,
  DoorAction,
  DoorOutcome,
  applyDoor,
  doorNeed,
  isOpen,
  nextToDoor,
  resolveBreakIn,
  resolveDoor,
  roomBehind,
} from '../door';
import { EnemyState, facingBetween } from '../enemies';
import { HexCoord } from '../hex';
import type { HexRect } from '../maps';
import { GameState, World, activeAgent, classOfAgent, closedDoors, roundOf } from './state';

export type DoorsAction =
  /** O agente da vez faz `action` na porta `door` (pelo `hexKey`); `roll` é o d20 já sorteado. */
  | {
      readonly type: 'door';
      readonly agent: string;
      readonly door: string;
      readonly action: DoorAction;
      readonly roll: number;
    }
  /**
   * A porta cedeu ao chute: a equipe ganha intimidação por algumas rodadas e cada inimigo do
   * cômodo do outro lado reage (rende, corre ou fica parado), já resolvido.
   */
  | {
      readonly type: 'breakIn';
      readonly door: string;
      readonly reactions: readonly {
        readonly enemy: string;
        readonly outcome: BreakInRoll['outcome'];
      }[];
    };

export const DOORS_ACTIONS: ReadonlySet<string> = new Set<DoorsAction['type']>(['door', 'breakIn']);

type DoorAct = Extract<DoorsAction, { type: 'door' }>;

/** Gazua de quem destranca: a perícia do Agente (0 para o Capitão). */
export const pickBonusOf = (state: GameState, agent: string): number =>
  skillBonus(classOfAgent(state, agent), 'gazua');

/** O que o agente da vez precisa tirar no d20 para essa ação (ver `doorNeed`). */
export function doorNeedFor(state: GameState, key: string, action: DoorAction): number | null {
  const door = state.doors[key];
  if (!door) return null;
  return doorNeed(action, door, action === 'pick' ? pickBonusOf(state, activeAgent(state)) : 0);
}

/** A ação na porta, com o d20 sorteado por `rng`. */
export const planDoor = (
  state: GameState,
  key: string,
  action: DoorAction,
  rng: () => number,
): DoorAct => ({
  type: 'door',
  agent: activeAgent(state),
  door: key,
  action,
  roll: rollDie(DOOR_RULES.die, rng),
});

/** O resultado da ação (abriu, arrombou, quanto gastou…), o mesmo que o motor aplica. */
export function doorOutcome(state: GameState, act: DoorAct): DoorOutcome {
  const door = state.doors[act.door];
  return resolveDoor(
    act.action,
    door,
    act.roll,
    act.action === 'pick' ? pickBonusOf(state, act.agent) : 0,
  );
}

const inRect = (h: HexCoord, r: HexRect): boolean =>
  h.col >= r.cols[0] && h.col <= r.cols[1] && h.row >= r.rows[0] && h.row <= r.rows[1];

/**
 * A reação ao arrombamento da porta `key` por `agent`: o cômodo do outro lado (dentro da
 * estrutura da porta) e o d20 de cada inimigo nele. Devolve a ação e as rolagens completas,
 * que a tela usa para a cena de cada um.
 */
export function planBreakIn(
  state: GameState,
  key: string,
  agent: string,
  world: World,
  rng: () => number,
): { act: Extract<DoorsAction, { type: 'breakIn' }>; rolls: BreakInRoll[] } {
  const door = state.doors[key];
  const from = state.positions[agent];
  const rect = door && world.structures.find((r) => inRect(door.hex, r));
  const rolls =
    door && rect && from
      ? resolveBreakIn(
          door.hex,
          roomBehind(door.hex, from, rect, new Set([...world.roomWalls, ...closedDoors(state)])),
          state.enemies,
          () => rollDie(DOOR_RULES.die, rng),
        )
      : [];
  return {
    act: {
      type: 'breakIn',
      door: key,
      reactions: rolls.map((r) => ({ enemy: r.enemy.id, outcome: r.outcome })),
    },
    rolls,
  };
}

export function validateDoors(state: GameState, action: DoorsAction): string | null {
  const door: Door | undefined = state.doors[action.door];
  if (!door) return `porta desconhecida: ${action.door}`;
  if (action.type === 'breakIn') {
    if (!door.broken) return 'a porta não foi arrombada';
    const ids = new Set(state.enemies.map((e) => e.id));
    return action.reactions.every((r) => ids.has(r.enemy))
      ? null
      : 'inimigo desconhecido na reação';
  }
  if (action.agent !== activeAgent(state)) return 'só quem está na vez mexe na porta';
  const at = state.positions[action.agent];
  if (!at || !nextToDoor(at, door.hex)) return 'longe da porta';
  if (!Number.isInteger(action.roll) || action.roll < 1 || action.roll > DOOR_RULES.die)
    return 'd20 inválido';
  if (isOpen(door)) return 'a porta já está aberta';
  if (action.action === 'pick') {
    if (doorNeedFor(state, action.door, 'pick') === null) return 'não há o que destrancar';
    if (state.movesLeft < DOOR_RULES.pickCost) return 'movimento insuficiente para destrancar';
  }
  return null;
}

/** Inimigo virado para a porta, depois da reação ao arrombamento. */
function reacted(e: EnemyState, doorHex: HexCoord, outcome: BreakInRoll['outcome']): EnemyState {
  const facing = facingBetween(e.hex, doorHex);
  if (outcome === 'surrender') return { ...e, status: 'surrendered', facing };
  if (outcome === 'flee') return { ...e, status: 'alert', facing };
  return { ...e, facing };
}

export function applyDoors(state: GameState, action: DoorsAction): GameState {
  const door = state.doors[action.door];
  if (action.type === 'breakIn') {
    const outcome = new Map(action.reactions.map((r) => [r.enemy, r.outcome]));
    return {
      ...state,
      breakInUntil: roundOf(state) + BREAK_IN_RULES.rounds,
      enemies: state.enemies.map((e) => {
        const o = outcome.get(e.id);
        return o ? reacted(e, door.hex, o) : e;
      }),
    };
  }
  const out = doorOutcome(state, action);
  return {
    ...state,
    doors: { ...state.doors, [action.door]: applyDoor(door, out) },
    movesLeft: Math.max(0, state.movesLeft - out.cost),
  };
}

/** Intimidação extra da equipe agora (o arrombamento assusta por algumas rodadas). */
export const breakInBoostOf = (
  state: Pick<GameState, 'turn' | 'order' | 'breakInUntil'>,
): number => (roundOf(state) < state.breakInUntil ? BREAK_IN_RULES.intimidation : 0);
