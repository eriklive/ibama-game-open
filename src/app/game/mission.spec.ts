import { describe, expect, it } from 'vitest';
import { spawnEnemy } from './enemies';
import { MissionProgress, Objective, canEndMission, missionVerdict, objectiveState, visibleObjectives } from './mission';

const objectives: Objective[] = [
  { id: 'q-aviao', text: 'Queimar o avião', burn: 'aviao', primary: true, unlocksEnd: true },
  { id: 'q-sup', text: 'Queimar os suprimentos', burn: 'suprimentos', primary: true },
  { id: 'jo', text: 'Render o Jô', surrender: 'jo' },
  { id: 'casa', text: 'Investigar a casa', notice: 'arma' },
  { id: 'arma', text: 'Achar a arma', find: 'arma', after: 'casa' },
];
const jo = spawnEnemy({ id: 'jo', name: 'Jô', patrol: [{ col: 1, row: 1 }] });
const progress = (burned: string[], extra: Partial<MissionProgress> = {}): MissionProgress => ({
  enemies: [jo],
  noticed: new Set(),
  found: new Set(),
  burned: new Set(burned),
  ...extra,
});

describe('objetivos e fim da operação', () => {
  it('situação de cada tipo de objetivo', () => {
    const p = progress(['aviao'], { enemies: [{ ...jo, status: 'fled' }], found: new Set(['arma']) });
    expect(objectives.map((o) => objectiveState(o, p))).toEqual(['done', 'open', 'failed', 'done', 'done']);
  });

  it('investigar a casa: ao reparar na arma, cumpre e mostra o passo seguinte (apreender)', () => {
    const ids = (p: MissionProgress) => visibleObjectives(objectives, p).map((o) => o.id);
    const before = progress([]);
    expect(ids(before)).not.toContain('arma');
    expect(objectiveState(objectives[3], before)).toBe('open');
    const noticed = progress([], { noticed: new Set(['arma']) });
    expect(objectiveState(objectives[3], noticed)).toBe('done');
    expect(ids(noticed)).toContain('arma');
    expect(objectiveState(objectives[4], noticed)).toBe('open');
  });

  it('só dá para encerrar depois de queimar o avião', () => {
    expect(canEndMission(objectives, progress([]))).toBe(false);
    expect(canEndMission(objectives, progress(['suprimentos']))).toBe(false);
    expect(canEndMission(objectives, progress(['aviao']))).toBe(true);
  });

  it('sem objetivo que libere o fim, não há botão de encerrar', () => {
    expect(canEndMission([objectives[2]], progress([]))).toBe(false);
  });

  it('resultado: os dois principais cumpridos, só um, ou nenhum', () => {
    expect(missionVerdict(objectives, progress(['aviao', 'suprimentos']))).toBe('success');
    expect(missionVerdict(objectives, progress(['aviao']))).toBe('partial');
    expect(missionVerdict(objectives, progress([]))).toBe('failure');
  });
});
