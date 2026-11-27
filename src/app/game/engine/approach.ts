/**
 * Abordagem no motor: o agente da vez anuncia ("Ibama! Parados!") e cada suspeito ao alcance
 * reage conforme a faixa em que está: se rende, rola o teste de fuga ou corre.
 *
 * As regras continuam em `../enemies.ts` (`resolveApproach`, `rollEscape`) e `../stats.ts`
 * (`approachRulesFor`); aqui viram uma ação sobre o `GameState`. Os d20 do teste de fuga vêm
 * sorteados dentro da ação, e quem se rendeu ou vai correr já sai decidido. A voz de prisão
 * que vem depois (perseguição) ainda é do componente e migra com a perseguição.
 */
import { rollDie } from '../dice';
import {
  APPROACH_RULES,
  ApproachZones,
  EnemyState,
  EscapeRoll,
  canAct,
  facingBetween,
  resolveApproach,
  rollEscape,
} from '../enemies';
import { approachRulesFor } from '../stats';
import { breakInBoostOf } from './doors';
import {
  GameState,
  World,
  activeAgent,
  findEnemy,
  isGrouped,
  isLed,
  loadoutOf,
  sightBlockers,
} from './state';

export type ApproachAction = {
  readonly type: 'approach';
  readonly agent: string;
  /** Quem se rendeu (no raio de abordagem, ou falhou no teste de fuga). */
  readonly surrender: readonly string[];
  /** Quem vai correr (passou no teste, ou estava na zona de fuga). */
  readonly flee: readonly string[];
  /** O d20 de cada um que rolou o teste de fuga (para o relato). */
  readonly rolls: readonly { readonly enemy: string; readonly roll: number }[];
};

export const APPROACH_ACTIONS: ReadonlySet<string> = new Set<ApproachAction['type']>(['approach']);

/**
 * Faixas da abordagem do agente da vez: o raio base + intimidação, grupo, Liderança e o
 * bônus do arrombamento (ver `approachRulesFor`).
 */
export const approachZonesFor = (state: GameState): ApproachZones =>
  approachRulesFor(
    loadoutOf(state, activeAgent(state)),
    isGrouped(state),
    APPROACH_RULES,
    breakInBoostOf(state),
    isLed(state),
  );

/** Quem se renderia, quem rolaria e quem correria se o agente da vez abordasse agora. */
export function approachPreview(
  state: GameState,
  world: World,
): ReturnType<typeof resolveApproach> {
  const from = state.positions[activeAgent(state)];
  if (!from) return { surrender: [], roll: [], flee: [] };
  // só quem o agente alcança direto (sem parede nem porta fechada no meio)
  return resolveApproach(from, state.enemies, approachZonesFor(state), sightBlockers(state, world));
}

/**
 * A abordagem, com o d20 de cada teste de fuga sorteado por `rng`. Devolve a ação e o
 * detalhe para a tela: os suspeitos (antes de reagirem) e as rolagens.
 */
export function planApproach(
  state: GameState,
  world: World,
  rng: () => number,
): { act: ApproachAction; surrender: EnemyState[]; flee: EnemyState[]; rolled: EscapeRoll[] } {
  const plan = approachPreview(state, world);
  const rolled = plan.roll.map((c) => rollEscape(c, () => rollDie(APPROACH_RULES.escapeDie, rng)));
  const surrender = [...plan.surrender, ...rolled.filter((r) => !r.passed).map((r) => r.enemy)];
  const flee = [...rolled.filter((r) => r.passed).map((r) => r.enemy), ...plan.flee];
  return {
    act: {
      type: 'approach',
      agent: activeAgent(state),
      surrender: surrender.map((e) => e.id),
      flee: flee.map((e) => e.id),
      rolls: rolled.map((r) => ({ enemy: r.enemy.id, roll: r.roll })),
    },
    surrender,
    flee,
    rolled,
  };
}

export function validateApproach(state: GameState, action: ApproachAction): string | null {
  if (action.agent !== activeAgent(state)) return 'só quem está na vez aborda';
  const ids = [...action.surrender, ...action.flee];
  if (!ids.length) return 'ninguém ao alcance da abordagem';
  if (new Set(ids).size !== ids.length) return 'suspeito repetido na abordagem';
  for (const id of ids) {
    const e = findEnemy(state, id);
    if (!e) return `inimigo desconhecido: ${id}`;
    if (!canAct(e)) return `${id} já não reage (rendido ou fora do mapa)`;
  }
  return null;
}

export function applyApproach(state: GameState, action: ApproachAction): GameState {
  const from = state.positions[action.agent];
  const surrender = new Set(action.surrender);
  const flee = new Set(action.flee);
  return {
    ...state,
    // todos viram para quem abordou
    enemies: state.enemies.map((e) => {
      if (surrender.has(e.id))
        return { ...e, status: 'surrendered', facing: facingBetween(e.hex, from) };
      if (flee.has(e.id)) return { ...e, status: 'alert', facing: facingBetween(e.hex, from) };
      return e;
    }),
  };
}
