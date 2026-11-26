import { describe, expect, it } from 'vitest';
import {
  INITIAL_PLANE,
  PLANE_LOCKED,
  PlaneState,
  leftKey,
  lockedClue,
  lookInside,
  nextToPanel,
  witness,
} from './plane';

const s = (p: Partial<PlaneState> = {}): PlaneState => ({ ...INITIAL_PLANE, ...p });

describe('quadro de chaves', () => {
  it('só dá para mexer colado nele', () => {
    const panel = { spot: { col: 20, row: 5 } };
    expect(nextToPanel({ col: 20, row: 6 }, panel)).toBe(true);
    expect(nextToPanel({ col: 20, row: 8 }, panel)).toBe(false);
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

describe('inspecionar o avião', () => {
  it('sem a chave, só abrir o menu já registra que está trancado (libera as perguntas da chave)', () => {
    // vale antes de alguém tocar em "olhar dentro"
    expect(lockedClue(s())).toBe(PLANE_LOCKED);
    expect(lockedClue(s({ seenBy: ['ana'] }))).toBe(PLANE_LOCKED);
  });

  it('com a chave na mão, não há pista de trancado', () => {
    expect(lockedClue(s({ hasKey: true }))).toBeNull();
  });
});
