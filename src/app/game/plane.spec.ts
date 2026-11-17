import { describe, expect, it } from 'vitest';
import { INITIAL_PLANE, PlaneState, leftKey, lookInside, needsKeyRoll, nextToPanel, seesKey, witness } from './plane';

const s = (p: Partial<PlaneState> = {}): PlaneState => ({ ...INITIAL_PLANE, ...p });

describe('quadro de chaves', () => {
  it('só dá para mexer colado nele', () => {
    const panel = { spot: { col: 20, row: 5 } };
    expect(nextToPanel({ col: 20, row: 6 }, panel)).toBe(true);
    expect(nextToPanel({ col: 20, row: 8 }, panel)).toBe(false);
  });

  it('rola percepção, uma vez por agente, se ninguém sabe qual é a chave', () => {
    expect(needsKeyRoll(s(), 'ana', new Set())).toBe(true);
    expect(needsKeyRoll(s(), 'ana', new Set(['ana']))).toBe(false);
    expect(needsKeyRoll(s(), 'bruno', new Set(['ana']))).toBe(true);
  });

  it('não rola se alguém já tentou o avião ou se o piloto contou', () => {
    expect(needsKeyRoll(s({ tried: true }), 'ana', new Set())).toBe(false);
    expect(needsKeyRoll(s({ told: true }), 'ana', new Set())).toBe(false);
  });

  it('quem viu a chave e deixou lá faz a equipe reconhecê-la', () => {
    const st = s({ seenBy: ['clara'] });
    expect(needsKeyRoll(st, 'bruno', new Set())).toBe(false);
    expect(seesKey(st, false)).toBe(true);
  });

  it('com a chave na mão, não há o que rolar nem ver', () => {
    expect(needsKeyRoll(s({ hasKey: true }), 'ana', new Set())).toBe(false);
    expect(seesKey(s({ hasKey: true, tried: true }), true)).toBe(false);
  });

  it('vê a chave passando no teste, ou direto se já sabe qual é', () => {
    expect(seesKey(s(), true)).toBe(true);
    expect(seesKey(s(), false)).toBe(false);
    expect(seesKey(s({ tried: true }), false)).toBe(true);
  });
});

describe('avião trancado', () => {
  it('olhar dentro: trancado sem a chave, aberto com ela', () => {
    expect(lookInside(s())).toBe('locked');
    expect(lookInside(s({ hasKey: true }))).toBe('open');
  });

  it('quem viu a chave e deixou lá é lembrado, sem repetir', () => {
    let st = s();
    expect(witness(st)).toBeNull();
    st = leftKey(st, 'clara');
    st = leftKey(st, 'ana');
    st = leftKey(leftKey(st, 'clara'), 'clara');
    expect(st.seenBy).toEqual(['clara', 'ana']);
    expect(witness(st)).toBe('clara');
  });

  it('depois de pegar a chave, ninguém mais comenta', () => {
    expect(witness(s({ seenBy: ['clara'], hasKey: true }))).toBeNull();
  });
});
