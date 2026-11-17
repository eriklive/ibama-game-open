import { describe, expect, it } from 'vitest';
import { APPROACH_RULES, BASE_APPROACH, approachZones } from './enemies';
import { GROUP_RULES } from './group';
import {
  STAT_RULES,
  ZERO_STATS,
  addPoint,
  approachRulesFor,
  canAddPoint,
  canRemovePoint,
  freePoints,
  removePoint,
  rulerCells,
  sheetStats,
  signed,
  statBreakdown,
  turnMovement,
} from './stats';

describe('distribuição de pontos', () => {
  it('todo agente começa com 0 e 1 ponto livre', () => {
    expect(ZERO_STATS).toEqual({ velocidade: 0, intimidacao: 0 });
    expect(STAT_RULES.points).toBe(1);
    expect(freePoints(ZERO_STATS)).toBe(1);
  });

  it('o ponto vai para um atributo só', () => {
    const v = addPoint(ZERO_STATS, 'velocidade');
    expect(v).toEqual({ velocidade: 1, intimidacao: 0 });
    expect(freePoints(v)).toBe(0);
    expect(canAddPoint(v, 'intimidacao')).toBe(false);
    expect(addPoint(v, 'intimidacao')).toBe(v);
    expect(addPoint(v, 'velocidade')).toBe(v);
  });

  it('só tira o ponto que o jogador colocou (o mínimo pelo jogador é 0)', () => {
    expect(canRemovePoint(ZERO_STATS, 'velocidade')).toBe(false);
    expect(removePoint(ZERO_STATS, 'velocidade')).toBe(ZERO_STATS);
    const i = addPoint(ZERO_STATS, 'intimidacao');
    expect(canRemovePoint(i, 'intimidacao')).toBe(true);
    expect(canRemovePoint(i, 'velocidade')).toBe(false);
    expect(removePoint(i, 'intimidacao')).toEqual(ZERO_STATS);
  });

  it('não passa de +5 mesmo com ponto livre', () => {
    const base = { velocidade: 5, intimidacao: 0 };
    expect(canAddPoint(ZERO_STATS, 'velocidade', base)).toBe(false);
    expect(canAddPoint(ZERO_STATS, 'intimidacao', base)).toBe(true);
  });

  it('a ficha fica na escala de −5 a +5', () => {
    expect(
      sheetStats({ velocidade: 1, intimidacao: 0 }, { velocidade: 5, intimidacao: -9 }),
    ).toEqual({
      velocidade: 5,
      intimidacao: -5,
    });
  });
});

describe('valores em campo', () => {
  const fast = { attributes: { velocidade: 1, intimidacao: 0 } };
  const scary = { attributes: { velocidade: 0, intimidacao: 1 } };

  it('separa atributo, equipamento e grupo', () => {
    expect(statBreakdown(fast, 'velocidade', false)).toEqual({
      attribute: 1,
      equipment: 0,
      group: 0,
      total: 1,
    });
    expect(statBreakdown(fast, 'velocidade', true)).toEqual({
      attribute: 1,
      equipment: 0,
      group: GROUP_RULES.moveBonus,
      total: 1 + GROUP_RULES.moveBonus,
    });
    expect(statBreakdown(scary, 'intimidacao', true).group).toBe(GROUP_RULES.approachBonus);
  });

  it('atributo + equipamento ficam presos a −5..+5; o grupo soma por cima', () => {
    const heavy = {
      attributes: { velocidade: -4, intimidacao: 5 },
      equipment: { velocidade: -3, intimidacao: 2 },
    };
    expect(statBreakdown(heavy, 'velocidade', false).total).toBe(-5);
    expect(statBreakdown(heavy, 'intimidacao', false).total).toBe(5);
    expect(statBreakdown(heavy, 'intimidacao', true).total).toBe(5 + GROUP_RULES.approachBonus);
  });

  it('movimento = 2d4 + velocidade (+2 agrupado)', () => {
    expect(turnMovement(5, { attributes: ZERO_STATS }, false)).toBe(5);
    expect(turnMovement(5, fast, false)).toBe(6);
    expect(turnMovement(5, fast, true)).toBe(8);
    expect(turnMovement(5, scary, true)).toBe(7);
  });

  it('movimento nunca fica negativo', () => {
    expect(turnMovement(2, { attributes: { velocidade: -5, intimidacao: 0 } }, false)).toBe(0);
  });

  it('raio de abordagem = base + intimidação (+2 agrupado); rolagem e fuga se afastam junto', () => {
    const base = APPROACH_RULES.surrenderRange;
    expect(approachRulesFor({ attributes: ZERO_STATS }, false)).toEqual(BASE_APPROACH);
    expect(approachRulesFor(scary, false)).toEqual(approachZones(base + 1));
    expect(approachRulesFor(scary, false)).toEqual({ surrenderRange: 3, rollRange: 6, radius: 7 });
    expect(approachRulesFor(scary, true)).toEqual(approachZones(base + 1 + GROUP_RULES.approachBonus));
    expect(approachRulesFor(fast, true).surrenderRange).toBe(base + GROUP_RULES.approachBonus);
  });

  it('com intimidação negativa o raio de abordagem encolhe, mas fica ≥ 1', () => {
    const timid = { attributes: { velocidade: 0, intimidacao: -3 } };
    expect(approachRulesFor(timid, false)).toEqual({ surrenderRange: 1, rollRange: 4, radius: 5 });
    const mute = { attributes: { velocidade: 0, intimidacao: -5 } };
    expect(approachRulesFor(mute, false).surrenderRange).toBe(1);
  });
});

describe('régua', () => {
  const states = (v: number, free: number) => rulerCells(v, free).map((c) => c.state);

  it('vai de −5 a +5 sem o 0', () => {
    expect(rulerCells(0, 0).map((c) => c.unit)).toEqual([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
  });

  it('positivo enche em verde e o ponto livre aparece tracejado', () => {
    expect(states(0, 1)).toEqual([
      ...Array(5).fill('neg-empty'),
      'slot',
      ...Array(4).fill('empty'),
    ]);
    expect(states(1, 0)).toEqual([...Array(5).fill('neg-empty'), 'pos', ...Array(4).fill('empty')]);
  });

  it('negativo enche em vermelho a partir do meio', () => {
    expect(states(-2, 0)).toEqual([
      'neg-empty',
      'neg-empty',
      'neg-empty',
      'neg',
      'neg',
      ...Array(5).fill('empty'),
    ]);
  });
});

it('sinal tipográfico', () => {
  expect([signed(2), signed(0), signed(-3)]).toEqual(['+2', '0', '−3']);
});
