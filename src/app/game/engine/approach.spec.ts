import { describe, expect, it } from 'vitest';
import { APPROACH_RULES, EnemySpawn, spawnEnemy } from '../enemies';
import { HexCoord, hexKey, rectArea } from '../hex';
import {
  GameAction,
  GameState,
  World,
  applyAction,
  approachPreview,
  approachZonesFor,
  findEnemy,
  initialGameState,
  planApproach,
  validateAction,
} from '.';

const world = (blocked: string[] = []): World => ({
  area: rectArea(20, 20),
  blocked: new Set(blocked),
  lowCover: new Set(),
  roomWalls: new Set(),
  structures: [],
});

const guard = (id: string, hex: HexCoord): EnemySpawn => ({ id, name: id, patrol: [hex] });

/**
 * A Ana em (5,5), sozinha (sem grupo nem Capitão, raio base 3): um suspeito em cada faixa,
 * em linha reta para baixo, e um já rendido colado nela.
 */
const scene = (): GameState => {
  const s = initialGameState({
    order: ['ana', 'bruno'],
    positions: { ana: { col: 5, row: 5 }, bruno: { col: 15, row: 15 } },
    enemies: [
      guard('perto', { col: 5, row: 7 }), // 2: se rende
      guard('meio', { col: 5, row: 10 }), // 5: rola (modificador 0)
      guard('longe', { col: 5, row: 12 }), // 7: corre sem rolar
      guard('fora', { col: 5, row: 14 }), // 9: nem ouve
      guard('rendido', { col: 6, row: 5 }),
    ].map(spawnEnemy),
  });
  return {
    ...s,
    group: [],
    enemies: s.enemies.map((e) =>
      e.id === 'rendido' ? { ...e, status: 'surrendered' as const } : e,
    ),
  };
};

/** O d20 sai sempre `face`. */
const d20 = (face: number) => () => (face - 1) / 20;

const run = (state: GameState, ...actions: GameAction[]): GameState =>
  actions.reduce((s, a) => {
    expect(validateAction(s, a)).toBeNull();
    return applyAction(s, a);
  }, state);

describe('motor: abordagem', () => {
  it('a prévia separa quem se rende, quem rola e quem corre (rendidos não contam)', () => {
    const p = approachPreview(scene(), world());
    expect(p.surrender.map((e) => e.id)).toEqual(['perto']);
    expect(p.roll.map((c) => [c.enemy.id, c.distance, c.modifier])).toEqual([['meio', 5, 0]]);
    expect(p.flee.map((e) => e.id)).toEqual(['longe']);
  });

  it('o teste de fuga: abaixo da dificuldade se rende, a partir dela corre', () => {
    const fail = planApproach(scene(), world(), d20(APPROACH_RULES.escapeDC - 1));
    expect(fail.act.surrender).toEqual(['perto', 'meio']);
    expect(fail.act.flee).toEqual(['longe']);
    expect(fail.act.rolls).toEqual([{ enemy: 'meio', roll: APPROACH_RULES.escapeDC - 1 }]);
    const pass = planApproach(scene(), world(), d20(APPROACH_RULES.escapeDC));
    expect(pass.act.surrender).toEqual(['perto']);
    expect(pass.act.flee).toEqual(['meio', 'longe']);
  });

  it('aplica: rendidos e em alerta, todos virados para quem abordou; quem não ouviu fica igual', () => {
    const s0 = scene();
    const s1 = run(s0, planApproach(s0, world(), d20(1)).act);
    expect(findEnemy(s1, 'perto')!.status).toBe('surrendered');
    expect(findEnemy(s1, 'meio')!.status).toBe('surrendered');
    expect(findEnemy(s1, 'longe')!.status).toBe('alert');
    // virado para cima (para a Ana)
    expect(Math.sin(findEnemy(s1, 'longe')!.facing)).toBeLessThan(-0.9);
    expect(findEnemy(s1, 'fora')).toEqual(findEnemy(s0, 'fora'));
  });

  it('parede no meio tira o suspeito da abordagem', () => {
    const wall = [hexKey({ col: 5, row: 6 })];
    expect(approachPreview(scene(), world(wall)).surrender).toEqual([]);
  });

  it('grupo e Liderança aumentam o alcance', () => {
    const alone = approachZonesFor(scene());
    const led = approachZonesFor({ ...scene(), group: ['ana', 'bruno'], captain: 'ana' });
    expect(led.surrenderRange).toBeGreaterThan(alone.surrenderRange);
    expect(led.radius).toBeGreaterThan(alone.radius);
  });

  it('recusa abordagem fora da vez, sem ninguém, ou com quem já se rendeu', () => {
    const s0 = scene();
    const { act } = planApproach(s0, world(), d20(1));
    expect(validateAction({ ...s0, activeIndex: 1 }, act)).toMatch(/vez/);
    expect(validateAction(s0, { ...act, surrender: [], flee: [] })).toMatch(/ninguém/);
    expect(validateAction(s0, { ...act, surrender: ['rendido'] })).toMatch(/não reage/);
    expect(validateAction(s0, { ...act, flee: ['perto'] })).toMatch(/repetido/);
  });
});
