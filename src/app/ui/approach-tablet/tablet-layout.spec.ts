import { describe, expect, it } from 'vitest';
import { TabletMarkIn, layoutTablet, reticlePath, ringPath, roughLoop } from './tablet-layout';

const rect = { x: 20, y: 60, w: 340, h: 500 };
const mark = (
  id: string,
  x: number,
  y: number,
  result: 'surrender' | 'flee' = 'surrender',
  roll: string | null = null,
): TabletMarkIn => ({
  id,
  name: id.toUpperCase(),
  result,
  roll,
  at: { x, y },
});

/** Caixa aproximada de um texto posicionado (mesma conta do layout). */
function box(x: number, y: number, w: number, h: number, anchor: string) {
  const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return { x: left, y: y - 12, w, h };
}
const hit = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('roughLoop', () => {
  it('desenha o mesmo traço para o mesmo seed', () => {
    expect(roughLoop(100, 100, 20, 18, 7, 0, 7)).toBe(roughLoop(100, 100, 20, 18, 7, 0, 7));
    expect(roughLoop(100, 100, 20, 18, 7, 0, 7)).not.toBe(roughLoop(100, 100, 20, 18, 8, 0, 7));
  });

  it('começa com um ponto e segue em curvas', () => {
    const d = roughLoop(50, 50, 10, 10, 1, 0, Math.PI * 2);
    expect(d.startsWith('M')).toBe(true);
    expect(d.split('Q').length).toBeGreaterThan(50);
  });
});

describe('reticlePath e ringPath', () => {
  it('a retícula tem quatro cantos', () => {
    expect(reticlePath({ x: 0, y: 0 }).match(/M/g)?.length).toBe(4);
  });

  it('o anel precisa de três pontos e fecha', () => {
    expect(ringPath([{ x: 0, y: 0 }])).toBe('');
    expect(
      ringPath([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ]).endsWith('Z'),
    ).toBe(true);
  });
});

describe('layoutTablet', () => {
  it('ignora quem está atrás da câmera', () => {
    const out = layoutTablet(
      [{ ...mark('a', 100, 200), at: null }, mark('b', 150, 300)],
      null,
      rect,
    );
    expect(out.map((m) => m.id)).toEqual(['b']);
  });

  it('prende na borda quem está fora da tela e aponta para ele', () => {
    const [m] = layoutTablet([mark('a', 900, 300)], null, rect);
    expect(m.at.x).toBeLessThan(rect.x + rect.w);
    expect(m.pointer).not.toBeNull();
    const [n] = layoutTablet([mark('b', 200, 300)], null, rect);
    expect(n.pointer).toBeNull();
  });

  it('espalha pela borda quem está fora da tela do mesmo lado', () => {
    const out = layoutTablet(
      [mark('a', 900, 300), mark('b', 900, 305), mark('c', 950, 310)],
      null,
      rect,
    );
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++)
        expect(
          Math.hypot(out[i].at.x - out[j].at.x, out[i].at.y - out[j].at.y),
        ).toBeGreaterThanOrEqual(44);
  });

  it('a seta de fuga aponta para longe de quem abordou', () => {
    const agent = { x: 200, y: 400 };
    const [m] = layoutTablet([mark('a', 200, 250, 'flee', 'd20 16+1=17')], agent, rect);
    const tip = m.escape!.shaft.trim().split(' ').slice(-2).map(Number);
    // o suspeito está acima do agente: a seta sobe ainda mais
    expect(tip[1]).toBeLessThan(250);
    expect(m.ghost).not.toBeNull();
  });

  it('quem se rendeu não tem seta nem segundo traço', () => {
    const [m] = layoutTablet([mark('a', 200, 250)], { x: 200, y: 400 }, rect);
    expect(m.escape).toBeNull();
    expect(m.ghost).toBeNull();
    expect(m.note.text).toBe('rendido');
  });

  it('afasta as anotações de suspeitos vizinhos', () => {
    const out = layoutTablet(
      [
        mark('a', 150, 300, 'surrender', 'd20 7+2=9'),
        mark('b', 175, 330, 'surrender'),
        mark('c', 140, 345, 'flee', 'd20 14+3=17'),
      ],
      { x: 250, y: 420 },
      rect,
    );
    const notes = out.map((m) =>
      box(
        m.note.x,
        m.note.y,
        Math.max(m.note.text.length * 9, (m.roll?.length ?? 0) * 6.2),
        m.roll ? 28 : 16,
        m.note.anchor,
      ),
    );
    for (let i = 0; i < notes.length; i++)
      for (let j = i + 1; j < notes.length; j++) expect(hit(notes[i], notes[j])).toBe(false);
  });

  it('as anotações ficam dentro da tela', () => {
    const out = layoutTablet(
      [mark('a', 40, 110), mark('b', 350, 540, 'flee', 'd20 16+1=17')],
      { x: 200, y: 300 },
      rect,
    );
    for (const m of out) {
      const b = box(
        m.note.x,
        m.note.y,
        Math.max(m.note.text.length * 9, (m.roll?.length ?? 0) * 6.2),
        m.roll ? 28 : 16,
        m.note.anchor,
      );
      expect(b.x).toBeGreaterThanOrEqual(rect.x);
      expect(b.x + b.w).toBeLessThanOrEqual(rect.x + rect.w);
    }
  });
});
