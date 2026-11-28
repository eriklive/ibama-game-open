import { describe, expect, it } from 'vitest';
import { EnemySpawn, spawnEnemy } from '../enemies';
import { rectArea } from '../hex';
import { INTERROGATION_RULES } from '../interrogation';
import { KEY_PANEL_ID, KEY_TAKEN } from '../plane';
import {
  GameAction,
  GameState,
  World,
  applyAction,
  askResult,
  cluesOf,
  findEnemy,
  initialGameState,
  memoryOf,
  planAsk,
  planEndTalk,
  validateAction,
} from '.';

const WORLD: World = {
  area: rectArea(12, 12),
  blocked: new Set(),
  lowCover: new Set(),
  roomWalls: new Set(),
  structures: [],
};

const suspect = (id: string, npc: string, extra: Partial<EnemySpawn> = {}): EnemySpawn => ({
  id,
  name: id === 'jo' ? 'Caseiro Jô' : id,
  npc,
  patrol: [{ col: 5, row: 6 }],
  ...extra,
});

/** A Ana colada no suspeito rendido; um comparsa escondido do caçador em (8,8). */
const scene = (npc = 'caseiro'): GameState => {
  const s = initialGameState({
    order: ['ana', 'bruno'],
    positions: { ana: { col: 5, row: 5 }, bruno: { col: 1, row: 1 } },
    enemies: [
      spawnEnemy(suspect('jo', npc, npc === 'cacador' ? { reveals: 'lourival' } : {})),
      spawnEnemy({ id: 'lourival', name: 'Lourival', patrol: [{ col: 8, row: 8 }], hidden: true }),
    ],
  });
  return {
    ...s,
    movesLeft: 4,
    enemies: s.enemies.map((e) => (e.id === 'jo' ? { ...e, status: 'surrendered' as const } : e)),
  };
};

/** Sorteios fixos: o d20 sai sempre `face` e a fala, a primeira. */
const fixed = (face: number) => {
  let n = 0;
  return () => (n++ % 2 === 0 ? (face - 1) / 20 : 0);
};

const run = (state: GameState, ...actions: GameAction[]): GameState =>
  actions.reduce((s, a) => {
    expect(validateAction(s, a)).toBeNull();
    return applyAction(s, a);
  }, state);

const talking = (npc?: string) => run(scene(npc), { type: 'startTalk', agent: 'ana', enemy: 'jo' });

describe('motor: conversa', () => {
  it('só conversa quem está na vez, colado num rendido que tem o que dizer', () => {
    const s0 = scene();
    expect(
      validateAction({ ...s0, activeIndex: 1 }, { type: 'startTalk', agent: 'ana', enemy: 'jo' }),
    ).toMatch(/vez/);
    const far = { ...s0, positions: { ...s0.positions, ana: { col: 1, row: 9 } } };
    expect(validateAction(far, { type: 'startTalk', agent: 'ana', enemy: 'jo' })).toMatch(/longe/);
    const free = { ...s0, enemies: s0.enemies.map((e) => ({ ...e, status: 'patrol' as const })) };
    expect(validateAction(free, { type: 'startTalk', agent: 'ana', enemy: 'jo' })).toMatch(
      /rendeu/,
    );
    expect(talking().talk).toEqual({ enemy: 'jo', asked: 0, reveal: null });
  });

  it('cedendo (d20 baixo): a verdade vai para a caderneta, e o esconderijo entregue conta como percebido', () => {
    const s1 = talking();
    const act = planAsk(s1, '0', fixed(1));
    expect(askResult(s1, act)!.answer.passed).toBe(false);
    const s2 = run(s1, act);
    expect(s2.fieldNotes).toEqual([
      {
        id: 1,
        suspect: 'Caseiro Jô',
        text: 'Há uma arma no quartinho de trás.',
        kind: 'confessou',
        depth: 0,
      },
    ]);
    expect(s2.noticed).toEqual(['arma']);
    expect(memoryOf(s2, 'jo').asked).toEqual(['0']);
    expect(s2.talk?.asked).toBe(1);
    expect(s2.movesLeft).toBe(4 - INTERROGATION_RULES.moveCost);
  });

  it('resistindo (d20 alto): a mentira, e a réplica fica liberada', () => {
    const s1 = talking();
    const s2 = run(s1, planAsk(s1, '0', fixed(20)));
    expect(s2.fieldNotes[0].text).toBe('Nega ter arma na casa.');
    expect(s2.noticed).toEqual([]);
    expect(memoryOf(s2, 'jo').unlocked).toEqual(['0.r']);
    // a réplica é a próxima pergunta possível; a mesma não se repete
    expect(validateAction(s2, planAsk(s2, '0.r', fixed(20)))).toBeNull();
    expect(validateAction(s2, planAsk(s2, '0', fixed(20)))).toMatch(/já feita/);
  });

  it('a nota seguinte ganha o próximo número', () => {
    const s1 = talking();
    const s2 = run(s1, planAsk(s1, '0', fixed(20)));
    const s3 = run(s2, planAsk(s2, '0.r', fixed(20)));
    expect(s3.fieldNotes.map((n) => n.id)).toEqual([1, 2]);
  });

  it('sem conversa aberta não se pergunta, e d20 impossível é recusado', () => {
    const s0 = scene();
    expect(validateAction(s0, { ...planAsk(talking(), '0', fixed(1)) })).toMatch(/conversa aberta/);
    expect(validateAction(talking(), { ...planAsk(talking(), '0', fixed(1)), roll: 0 })).toMatch(
      /d20/,
    );
  });

  it('o comparsa entregue aparece no mapa ao encerrar', () => {
    const s1 = talking('cacador');
    const s2 = run(s1, planAsk(s1, '0', fixed(1)));
    expect(s2.talk?.reveal).toBe('lourival');
    const end = planEndTalk(s2, WORLD);
    expect(end.revealAt).toEqual({ col: 8, row: 8 });
    const s3 = run(s2, end);
    expect(s3.talk).toBeNull();
    expect(findEnemy(s3, 'lourival')).toMatchObject({ status: 'patrol', hex: { col: 8, row: 8 } });
  });

  it('o abalado vale só para a primeira conversa (e só se perguntou)', () => {
    const shaken = (s: GameState) => ({
      ...s,
      enemies: s.enemies.map((e) => (e.id === 'jo' ? { ...e, shaken: true } : e)),
    });
    const quiet = run(shaken(talking()), { type: 'endTalk' });
    expect(findEnemy(quiet, 'jo')!.shaken).toBe(true);
    const s1 = shaken(talking());
    const asked = run(s1, planAsk(s1, '0', fixed(20)), { type: 'endTalk' });
    expect(findEnemy(asked, 'jo')!.shaken).toBe(false);
  });

  it('pistas: as anotadas, os achados e a chave pega liberam perguntas', () => {
    const s0 = run(
      scene(),
      { type: 'noteClue', clue: 'aviao-trancado' },
      { type: 'take', agent: 'ana', item: KEY_PANEL_ID },
    );
    expect([...cluesOf({ ...s0, found: ['arma'] })].sort()).toEqual(
      ['aviao-trancado', 'item:arma', KEY_TAKEN].sort(),
    );
  });

  it('o estado do interrogatório sobrevive a JSON', () => {
    const s1 = talking();
    const s2 = run(s1, planAsk(s1, '0', fixed(1)));
    expect(JSON.parse(JSON.stringify(s2))).toEqual(s2);
  });
});
