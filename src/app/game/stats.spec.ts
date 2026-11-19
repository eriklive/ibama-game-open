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
import { CLASS_RULES, classBaseStats } from './agent-class';

const st = (vigor: number, intimidacao: number, iniciativa = 0, agilidade = 0) => ({
  vigor,
  intimidacao,
  iniciativa,
  agilidade,
});

describe('distribuição de pontos', () => {
  it('todo agente começa com 0 e 1 ponto livre', () => {
    expect(ZERO_STATS).toEqual(st(0, 0));
    expect(STAT_RULES.points).toBe(1);
    expect(freePoints(ZERO_STATS)).toBe(1);
  });

  it('o ponto vai para um atributo só', () => {
    const v = addPoint(ZERO_STATS, 'vigor');
    expect(v).toEqual(st(1, 0));
    expect(freePoints(v)).toBe(0);
    expect(canAddPoint(v, 'intimidacao')).toBe(false);
    expect(addPoint(v, 'intimidacao')).toBe(v);
    expect(addPoint(v, 'vigor')).toBe(v);
  });

  it('só tira o ponto que o jogador colocou (o mínimo pelo jogador é 0)', () => {
    expect(canRemovePoint(ZERO_STATS, 'vigor')).toBe(false);
    expect(removePoint(ZERO_STATS, 'vigor')).toBe(ZERO_STATS);
    const i = addPoint(ZERO_STATS, 'intimidacao');
    expect(canRemovePoint(i, 'intimidacao')).toBe(true);
    expect(canRemovePoint(i, 'vigor')).toBe(false);
    expect(removePoint(i, 'intimidacao')).toEqual(ZERO_STATS);
  });

  it('não passa de +5 mesmo com ponto livre', () => {
    const base = st(5, 0);
    expect(canAddPoint(ZERO_STATS, 'vigor', base)).toBe(false);
    expect(canAddPoint(ZERO_STATS, 'intimidacao', base)).toBe(true);
  });

  it('a ficha fica na escala de −5 a +5', () => {
    expect(sheetStats(st(1, 0), st(5, -9))).toEqual(st(5, -5));
  });
});

describe('valores em campo', () => {
  const fast = { attributes: st(1, 0) };
  const scary = { attributes: st(0, 1) };

  it('separa atributo, equipamento e grupo', () => {
    expect(statBreakdown(fast, 'vigor', false)).toEqual({
      attribute: 1,
      equipment: 0,
      group: 0,
      leader: 0,
      total: 1,
    });
    expect(statBreakdown(fast, 'vigor', true)).toEqual({
      attribute: 1,
      equipment: 0,
      group: GROUP_RULES.moveBonus,
      leader: 0,
      total: 1 + GROUP_RULES.moveBonus,
    });
    expect(statBreakdown(scary, 'intimidacao', true).group).toBe(GROUP_RULES.approachBonus);
  });

  it('atributo + equipamento ficam presos a −5..+5; o grupo soma por cima', () => {
    const heavy = {
      attributes: st(-4, 5),
      equipment: st(-3, 2),
    };
    expect(statBreakdown(heavy, 'vigor', false).total).toBe(-5);
    expect(statBreakdown(heavy, 'intimidacao', false).total).toBe(5);
    expect(statBreakdown(heavy, 'intimidacao', true).total).toBe(5 + GROUP_RULES.approachBonus);
  });

  it('grupo dá +1 e a Liderança do Capitão mais +1 (só agrupado)', () => {
    expect(GROUP_RULES).toMatchObject({ moveBonus: 1, approachBonus: 1 });
    expect(statBreakdown(fast, 'vigor', true, true)).toEqual({
      attribute: 1,
      equipment: 0,
      group: 1,
      leader: 1,
      total: 3,
    });
    expect(statBreakdown(scary, 'intimidacao', true, true).total).toBe(3);
    // Capitão sem grupo não dá nada
    expect(statBreakdown(fast, 'vigor', false, true).leader).toBe(0);
  });

  it('movimento = 2d4 + vigor (+1 agrupado, +1 com o Capitão)', () => {
    expect(turnMovement(5, { attributes: ZERO_STATS }, false)).toBe(5);
    expect(turnMovement(5, fast, false)).toBe(6);
    expect(turnMovement(5, fast, true)).toBe(7);
    expect(turnMovement(5, fast, true, true)).toBe(8);
    expect(turnMovement(5, scary, true)).toBe(6);
    expect(turnMovement(5, scary, true, true)).toBe(7);
  });

  it('movimento nunca fica negativo', () => {
    expect(turnMovement(2, { attributes: st(-5, 0) }, false)).toBe(0);
  });

  it('raio de abordagem = 3 + intimidação (+1 agrupado, +1 com o Capitão); rolagem e fuga se afastam junto', () => {
    const base = APPROACH_RULES.surrenderRange;
    expect(base).toBe(3);
    expect(approachRulesFor({ attributes: ZERO_STATS }, false)).toEqual(BASE_APPROACH);
    expect(approachRulesFor(scary, false)).toEqual(approachZones(base + 1));
    expect(approachRulesFor(scary, false)).toEqual({ surrenderRange: 4, rollRange: 7, radius: 8 });
    expect(approachRulesFor({ attributes: ZERO_STATS }, true).surrenderRange).toBe(4);
    expect(
      approachRulesFor({ attributes: ZERO_STATS }, true, APPROACH_RULES, 0, true).surrenderRange,
    ).toBe(5);
    expect(approachRulesFor(scary, true, APPROACH_RULES, 0, true).surrenderRange).toBe(6);
    expect(approachRulesFor(scary, true)).toEqual(
      approachZones(base + 1 + GROUP_RULES.approachBonus),
    );
    expect(approachRulesFor(fast, true).surrenderRange).toBe(base + GROUP_RULES.approachBonus);
  });

  it('com intimidação negativa o raio de abordagem encolhe, mas fica ≥ 1', () => {
    const timid = { attributes: st(0, -4) };
    expect(approachRulesFor(timid, false)).toEqual({ surrenderRange: 1, rollRange: 4, radius: 5 });
    const mute = { attributes: st(0, -5) };
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

describe('atributos da perseguição', () => {
  it('a classe dá a base: Capitão +1 de iniciativa, Agente +1 de agilidade', () => {
    expect(classBaseStats('capitao')).toEqual(st(0, 0, 1, 0));
    expect(classBaseStats('agente')).toEqual(st(0, 0, 0, 1));
  });
  it('o ponto livre pode ir em iniciativa ou agilidade, por cima da base', () => {
    const base = classBaseStats('agente');
    const spent = addPoint(ZERO_STATS, 'agilidade', base);
    expect(sheetStats(spent, base)).toEqual(st(0, 0, 0, 2));
    expect(freePoints(spent)).toBe(0);
  });
  it('grupo e Liderança não somam em iniciativa nem agilidade', () => {
    const loadout = { attributes: st(0, 0, 1, 1) };
    for (const key of ['iniciativa', 'agilidade'] as const) {
      expect(statBreakdown(loadout, key, true, true).total).toBe(1);
      expect(CLASS_RULES.leadership[key]).toBe(0);
    }
  });
});
