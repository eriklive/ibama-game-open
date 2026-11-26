import { beforeEach, describe, expect, it } from 'vitest';
import {
  AUTOSAVE_KEY,
  SAVE_VERSION,
  SLOT_COUNT,
  SaveGames,
  SaveState,
  parseSave,
  savedAtLabel,
} from './save-game';

const state = (over: Partial<SaveState> = {}): SaveState => ({
  version: SAVE_VERSION,
  savedAt: new Date(2026, 10, 26, 18, 5).getTime(),
  mapId: 'aeroporto',
  mapName: 'Aeroporto',
  round: 3,
  activeName: 'Ana',
  roster: { points: {}, captain: 'ana' },
  turn: 9,
  activeIndex: 0,
  positions: [['ana', { col: 1, row: 2 }]],
  group: ['ana'],
  groupLine: ['ana'],
  enemies: [],
  doors: [],
  burned: ['aviao'],
  noticed: [],
  found: [],
  noticeRolled: [],
  seenAgents: [],
  ranThisRound: [],
  caughtThisRound: [],
  dialogues: [['piloto', { asked: ['q1'], unlocked: [] }]],
  linePools: [],
  clueLog: [],
  fieldNotes: [],
  hasKey: true,
  keySeenBy: [],
  planeNote: null,
  breakInUntil: 0,
  ...over,
});

describe('saves da sessão', () => {
  beforeEach(() => sessionStorage.clear());

  it('ignora save de outra versão ou quebrado', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('{oops')).toBeNull();
    expect(parseSave(JSON.stringify(state({ version: SAVE_VERSION + 1 })))).toBeNull();
    expect(parseSave(JSON.stringify(state()))?.round).toBe(3);
  });

  it('grava e lê o automático e os slots, com a lista do menu', () => {
    const saves = new SaveGames();
    expect(saves.summaries().auto).toBeNull();
    expect(saves.summaries().slots).toHaveLength(SLOT_COUNT);

    saves.write('auto', state());
    saves.write(2, state({ round: 5, activeName: 'Clara' }));
    expect(sessionStorage.getItem(AUTOSAVE_KEY)).not.toBeNull();

    const list = saves.summaries();
    expect(list.auto).toMatchObject({ id: 'auto', round: 3, mapName: 'Aeroporto' });
    expect(list.slots.map((s) => s.save?.round ?? null)).toEqual([null, 5, null]);
    expect(saves.read(2)?.dialogues).toEqual([['piloto', { asked: ['q1'], unlocked: [] }]]);

    saves.clear('auto');
    expect(saves.read('auto')).toBeNull();
    expect(saves.read(2)).not.toBeNull();
  });

  it('mostra quando foi salvo em dia/mês hora:minuto', () => {
    expect(savedAtLabel(new Date(2026, 10, 26, 18, 5).getTime())).toBe('26/11 18:05');
  });
});
