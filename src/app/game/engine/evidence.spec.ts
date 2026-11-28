import { describe, expect, it } from 'vitest';
import { KEY_PANEL_ID } from '../plane';
import { SEARCH_RULES } from '../search';
import {
  GameAction,
  GameState,
  applyAction,
  initialGameState,
  noticePasses,
  planNotice,
  validateAction,
} from '.';

const team = (): GameState =>
  initialGameState({
    order: ['ana', 'bruno'],
    positions: { ana: { col: 1, row: 1 }, bruno: { col: 2, row: 1 } },
  });

/** O d20 sai sempre `face`. */
const d20 = (face: number) => () => (face - 1) / 20;

const run = (state: GameState, ...actions: GameAction[]): GameState =>
  actions.reduce((s, a) => {
    expect(validateAction(s, a)).toBeNull();
    return applyAction(s, a);
  }, state);

describe('motor: percepção', () => {
  it('passa quem tira mais que o alvo', () => {
    expect(noticePasses(SEARCH_RULES.notice)).toBe(false);
    expect(noticePasses(SEARCH_RULES.notice + 1)).toBe(true);
  });

  it('falhando, só marca que rolou; passando, a equipe repara no móvel', () => {
    const fail = run(team(), planNotice('ana', 'armario', d20(SEARCH_RULES.notice)));
    expect(fail.noticeRolled).toEqual(['armario:ana']);
    expect(fail.noticed).toEqual([]);
    const pass = run(fail, planNotice('bruno', 'armario', d20(20)));
    expect(pass.noticed).toEqual(['armario']);
  });

  it('cada agente rola uma vez por móvel, e ninguém rola no que a equipe já reparou', () => {
    const s1 = run(team(), planNotice('ana', 'armario', d20(1)));
    expect(validateAction(s1, planNotice('ana', 'armario', d20(20)))).toMatch(/já rolou/);
    const s2 = run(s1, planNotice('bruno', 'armario', d20(20)));
    expect(validateAction(s2, planNotice('ana', 'quadro', d20(20)))).toBeNull();
    expect(
      validateAction({ ...s2, noticeRolled: [] }, planNotice('ana', 'armario', d20(20))),
    ).toMatch(/já reparou/);
  });

  it('um suspeito que conta marca o móvel sem rolar (transitório)', () => {
    expect(run(team(), { type: 'markNoticed', spot: 'quadro' }).noticed).toEqual(['quadro']);
  });
});

describe('motor: achados e a chave do avião', () => {
  it('pegar um achado: vai para os achados, uma vez só', () => {
    const s1 = run(team(), { type: 'take', agent: 'ana', item: 'arma' });
    expect(s1.found).toEqual(['arma']);
    expect(validateAction(s1, { type: 'take', agent: 'ana', item: 'arma' })).toMatch(/já foi pego/);
  });

  it('quem viu a chave e deixou lá fica lembrado (uma vez por agente, na ordem)', () => {
    const s1 = run(
      team(),
      { type: 'leaveKey', agent: 'bruno' },
      { type: 'leaveKey', agent: 'ana' },
      { type: 'leaveKey', agent: 'bruno' },
    );
    expect(s1.keySeenBy).toEqual(['bruno', 'ana']);
  });

  it('pegar a chave: fica com a equipe e ninguém mais "viu e deixou"', () => {
    const s1 = run(
      team(),
      { type: 'leaveKey', agent: 'bruno' },
      { type: 'take', agent: 'ana', item: KEY_PANEL_ID },
    );
    expect(s1.hasKey).toBe(true);
    expect(s1.keySeenBy).toEqual([]);
    expect(validateAction(s1, { type: 'take', agent: 'ana', item: KEY_PANEL_ID })).toMatch(
      /já está/,
    );
    expect(validateAction(s1, { type: 'leaveKey', agent: 'ana' })).toMatch(/já está/);
  });

  it('só quem está na vez pega', () => {
    expect(validateAction(team(), { type: 'take', agent: 'bruno', item: 'arma' })).toMatch(/vez/);
  });

  it('o estado da investigação sobrevive a JSON', () => {
    const s1 = run(team(), planNotice('ana', 'armario', d20(20)), {
      type: 'take',
      agent: 'ana',
      item: 'arma',
    });
    expect(JSON.parse(JSON.stringify(s1))).toEqual(s1);
  });
});
