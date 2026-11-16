import type { EnemyState } from './enemies';

/**
 * Objetivo da missão: render um inimigo, achar algo escondido ou queimar um alvo.
 * `primary` marca os objetivos principais (o que define se a missão foi cumprida);
 * `unlocksEnd` libera o botão de encerrar a operação assim que é cumprido.
 */
export type Objective = { id: string; text: string; primary?: boolean; unlocksEnd?: boolean } & (
  | { surrender: string }
  | { find: string }
  | { burn: string }
);

export type ObjectiveState = 'open' | 'done' | 'failed';

/** O que já aconteceu na partida e decide a situação dos objetivos. */
export interface MissionProgress {
  enemies: readonly EnemyState[];
  found: ReadonlySet<string>;
  burned: ReadonlySet<string>;
}

export function objectiveState(o: Objective, p: MissionProgress): ObjectiveState {
  if ('surrender' in o) {
    const status = p.enemies.find((e) => e.id === o.surrender)?.status;
    return status === 'surrendered' ? 'done' : status === 'fled' ? 'failed' : 'open';
  }
  if ('find' in o) return p.found.has(o.find) ? 'done' : 'open';
  return p.burned.has(o.burn) ? 'done' : 'open';
}

/**
 * A equipe pode encerrar a operação: todos os objetivos que liberam o fim estão cumpridos.
 * Sem nenhum objetivo desse tipo no mapa, a operação não se encerra por botão.
 */
export function canEndMission(objectives: readonly Objective[], p: MissionProgress): boolean {
  const gates = objectives.filter((o) => o.unlocksEnd);
  return gates.length > 0 && gates.every((o) => objectiveState(o, p) === 'done');
}

export type Verdict = 'success' | 'partial' | 'failure';

/** Resultado da operação: todos os principais cumpridos, só alguns, ou nenhum. */
export function missionVerdict(objectives: readonly Objective[], p: MissionProgress): Verdict {
  const primary = objectives.filter((o) => o.primary);
  const done = primary.filter((o) => objectiveState(o, p) === 'done').length;
  if (primary.length && done === primary.length) return 'success';
  return done > 0 ? 'partial' : 'failure';
}
