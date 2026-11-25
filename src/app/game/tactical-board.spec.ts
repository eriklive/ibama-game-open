import { describe, expect, it } from 'vitest';
import { approachZones } from './enemies';
import {
  LESSONS_KEY,
  approachBands,
  chalkCenter,
  chalkHexes,
  LessonId,
  insideScreen,
  lessonDue,
  lessonsToSkip,
  markSeen,
  readSeen,
  readShowLessons,
  regionOutline,
  writeShowLessons,
} from './tactical-board';

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

describe('lousa tática', () => {
  it('abre a abordagem quando um garimpeiro aparece na tela, uma vez só', () => {
    const none = new Set<never>();
    expect(lessonDue({ seen: none, suspectOnScreen: false, anySurrendered: false })).toBeNull();
    expect(lessonDue({ seen: none, suspectOnScreen: true, anySurrendered: false })).toBe(
      'abordagem',
    );
    expect(
      lessonDue({ seen: new Set(['abordagem']), suspectOnScreen: true, anySurrendered: false }),
    ).toBeNull();
  });

  it('abre o interrogatório no primeiro rendido, depois da abordagem', () => {
    expect(lessonDue({ seen: new Set(), suspectOnScreen: true, anySurrendered: true })).toBe(
      'abordagem',
    );
    expect(
      lessonDue({ seen: new Set(['abordagem']), suspectOnScreen: true, anySurrendered: true }),
    ).toBe('interrogatorio');
    expect(
      lessonDue({
        seen: new Set(['abordagem', 'interrogatorio']),
        suspectOnScreen: true,
        anySurrendered: true,
      }),
    ).toBeNull();
  });

  it('guarda as lições vistas e ignora lixo no armazenamento', () => {
    const s = memory({ [LESSONS_KEY]: 'foo,interrogatorio' });
    expect([...readSeen(s)]).toEqual(['interrogatorio']);
    markSeen('abordagem', s);
    expect(readSeen(s)).toEqual(new Set(['interrogatorio', 'abordagem']));
    expect(readSeen(null).size).toBe(0);
  });

  it('Exibir tutoriais vem desligada e fica guardada', () => {
    const data = new Map<string, string>();
    const s = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    expect(readShowLessons(s)).toBe(false);
    writeShowLessons(true, s);
    expect(readShowLessons(s)).toBe(true);
    writeShowLessons(false, s);
    expect(readShowLessons(s)).toBe(false);
    expect(readShowLessons(null)).toBe(false);
  });

  it('desligada, pula o que já foi visto; ligada, só o visto nesta partida', () => {
    const ever = new Set<LessonId>(['abordagem', 'interrogatorio']);
    const match = new Set<LessonId>(['interrogatorio']);
    expect(lessonsToSkip(false, ever, new Set())).toEqual(ever);
    expect(lessonsToSkip(true, ever, new Set()).size).toBe(0);
    expect(lessonsToSkip(true, ever, match)).toEqual(match);
  });

  it('só conta como na tela quem está dentro da folga das bordas', () => {
    expect(insideScreen({ x: 200, y: 400 }, 400, 800)).toBe(true);
    expect(insideScreen({ x: 5, y: 400 }, 400, 800)).toBe(false);
    expect(insideScreen({ x: 200, y: 790 }, 400, 800)).toBe(false);
    expect(insideScreen(null, 400, 800)).toBe(false);
    expect(insideScreen({ x: 0, y: 0 }, 0, 0)).toBe(false);
  });

  it('escreve as faixas com as distâncias do agente', () => {
    const [s, r, f] = approachBands(approachZones(3));
    expect([s.range, r.range, f.range]).toEqual(['1–3', '4–6', '7']);
    expect(r.outcome).toContain('8 ou mais');
    // com intimidação, tudo se afasta junto
    expect(approachBands(approachZones(5)).map((b) => b.range)).toEqual(['1–5', '6–8', '9']);
  });

  it('desenha os anéis de hexágonos do centro para fora', () => {
    const hexes = chalkHexes(2);
    expect(hexes).toHaveLength(19);
    expect(hexes[0]).toEqual({ q: 0, r: 0, d: 0 });
    expect(hexes.filter((h) => h.d === 2)).toHaveLength(12);
  });

  it('risca só a borda de fora de uma região', () => {
    const one = regionOutline([{ q: 0, r: 0 }], 10);
    expect(one.match(/M/g)).toHaveLength(6);
    // dois vizinhos dividem um lado: 10 lados de fora
    const two = regionOutline(
      [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      10,
    );
    expect(two.match(/M/g)).toHaveLength(10);
    const c = chalkCenter(1, 0, 10);
    expect(c.x).toBeCloseTo(15);
  });
});
