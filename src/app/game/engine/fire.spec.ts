import { describe, expect, it } from 'vitest';
import { BURN_RULES, Burnable } from '../burn';
import { EnemySpawn, spawnEnemy } from '../enemies';
import { HexCoord } from '../hex';
import {
  GameAction,
  GameState,
  applyAction,
  findEnemy,
  initialGameState,
  planBurn,
  validateAction,
} from '.';

const PLANE: Burnable = {
  id: 'aviao',
  name: 'o avião',
  short: 'avião',
  hexes: [
    { col: 5, row: 5 },
    { col: 6, row: 5 },
  ],
};

const guard = (id: string, hex: HexCoord): EnemySpawn => ({ id, name: id, patrol: [hex] });

/** A Ana colada no avião; um vigia perto (vê o fogo) e outro longe. */
const scene = (ana: HexCoord = { col: 5, row: 6 }): GameState =>
  initialGameState({
    order: ['ana', 'bruno'],
    positions: { ana, bruno: { col: 0, row: 0 } },
    enemies: [
      guard('perto', { col: 5, row: 5 + BURN_RULES.alertRadius }),
      guard('longe', { col: 5, row: 5 + BURN_RULES.alertRadius + 1 }),
    ].map(spawnEnemy),
  });

const run = (state: GameState, ...actions: GameAction[]): GameState =>
  actions.reduce((s, a) => {
    expect(validateAction(s, a)).toBeNull();
    return applyAction(s, a);
  }, state);

describe('motor: queima', () => {
  it('colado no alvo, ateia fogo; quem vigia perto vê as chamas, vira para elas e entra em alerta', () => {
    const s0 = scene();
    const act = planBurn(s0, PLANE)!;
    expect(act.witnesses).toEqual(['perto']);
    const s1 = run(s0, act);
    expect(s1.burned).toEqual(['aviao']);
    expect(findEnemy(s1, 'perto')!.status).toBe('alert');
    // virado para cima (para o avião)
    expect(Math.sin(findEnemy(s1, 'perto')!.facing)).toBeLessThan(-0.9);
    expect(findEnemy(s1, 'longe')!.status).toBe('patrol');
  });

  it('longe do alvo, ou já queimando: nada a queimar', () => {
    expect(planBurn(scene({ col: 1, row: 1 }), PLANE)).toBeNull();
    const s1 = run(scene(), planBurn(scene(), PLANE)!);
    expect(planBurn(s1, PLANE)).toBeNull();
    expect(validateAction(s1, planBurn(scene(), PLANE)!)).toMatch(/queimando/);
  });

  it('só quem está na vez ateia fogo', () => {
    const act = planBurn(scene(), PLANE)!;
    expect(validateAction({ ...scene(), activeIndex: 1 }, act)).toMatch(/vez/);
  });

  it('encerrar a operação: depois dela, nada mais vale', () => {
    const s1 = run(scene(), { type: 'endOperation' });
    expect(s1.over).toBe(true);
    expect(validateAction(s1, { type: 'endOperation' })).toMatch(/encerrada/);
    expect(validateAction(s1, planBurn(scene(), PLANE)!)).toMatch(/encerrada/);
  });
});
