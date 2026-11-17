import { describe, expect, it } from 'vitest';
import {
  ABILITIES,
  CLASS_RULES,
  classAbilities,
  classOf,
  classSkills,
  commandFree,
  hasAbility,
  leadershipBonus,
  rallyCost,
  skillBonus,
} from './agent-class';

describe('classes', () => {
  it('a equipe tem um Capitão só; os demais são Agentes', () => {
    expect(classOf('ana', 'ana')).toBe('capitao');
    expect(classOf('bruno', 'ana')).toBe('agente');
    expect(classOf('ana', null)).toBe('agente');
  });

  it('Gazua: +6 para o Agente, 0 para o Capitão (qualquer um pode tentar)', () => {
    expect(skillBonus('agente', 'gazua')).toBe(6);
    expect(skillBonus('capitao', 'gazua')).toBe(0);
    expect(classSkills('agente').map((s) => [s.key, s.bonus])).toEqual([['gazua', 6]]);
    expect(classSkills('capitao')).toEqual([]);
  });

  it('Comando e Liderança são do Capitão', () => {
    expect(classAbilities('capitao').map((a) => a.key)).toEqual(['comando', 'lideranca']);
    expect(classAbilities('agente')).toEqual([]);
    expect(hasAbility('agente', 'comando')).toBe(false);
    expect(ABILITIES.lideranca.kind).toBe('passiva');
  });
});

describe('Comando', () => {
  it('o Agrupar do Capitão sai de graça uma vez por turno', () => {
    expect(CLASS_RULES.commandPerTurn).toBe(1);
    expect(commandFree('capitao', 0)).toBe(true);
    expect(rallyCost(4, 'capitao', 0)).toBe(0);
    expect(commandFree('capitao', 1)).toBe(false);
    expect(rallyCost(4, 'capitao', 1)).toBe(4);
  });

  it('o Agente paga o Agrupar normal', () => {
    expect(commandFree('agente', 0)).toBe(false);
    expect(rallyCost(4, 'agente', 0)).toBe(4);
  });
});

describe('Liderança', () => {
  it('+1 de vigor e +1 de intimidação só com o Capitão no grupo', () => {
    expect(leadershipBonus('vigor', true)).toBe(1);
    expect(leadershipBonus('intimidacao', true)).toBe(1);
    expect(leadershipBonus('vigor', false)).toBe(0);
  });
});
