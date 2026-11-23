import { beforeEach, describe, expect, it } from 'vitest';
import { findMap } from './maps';
import { visibleObjectives } from './mission';
import {
  INTRO,
  easeInOutCubic,
  introSeen,
  introTargets,
  introZoom,
  markIntroSeen,
  penLoop,
  placeNote,
} from './mission-intro';

const aeroporto = findMap('aeroporto')!;
const start = {
  enemies: [],
  noticed: new Set<string>(),
  found: new Set<string>(),
  burned: new Set<string>(),
};

describe('abertura da missão: o que circular', () => {
  it('Aeroporto: o hangar (os dois queimáveis) e a casa (o Jô e a investigação)', () => {
    const targets = introTargets(aeroporto, visibleObjectives(aeroporto.objectives ?? [], start));
    expect(targets.map((t) => [t.kind, t.label, t.notes])).toEqual([
      ['hangar', 'Hangar', ['Queimar o avião', 'Queimar os suprimentos do garimpo']],
      ['house', 'Casa', ['Render o Caseiro Jô', 'Investigar a casa']],
    ]);
  });

  it('passo seguinte ainda escondido (apreender a arma) não aparece', () => {
    const notes = introTargets(
      aeroporto,
      visibleObjectives(aeroporto.objectives ?? [], start),
    ).flatMap((t) => t.notes);
    expect(notes).not.toContain('Apreender a arma escondida');
  });

  it('estrutura sem objetivo dentro não é circulada; sem objetivos, nada', () => {
    const onlyPlane = (aeroporto.objectives ?? []).filter((o) => o.id === 'queimar-aviao');
    expect(introTargets(aeroporto, onlyPlane).map((t) => t.kind)).toEqual(['hangar']);
    expect(introTargets(aeroporto, [])).toEqual([]);
  });
});

describe('abertura da missão: só na primeira vez', () => {
  beforeEach(() => localStorage.clear());

  it('marca o mapa como visto', () => {
    expect(introSeen('aeroporto')).toBe(false);
    markIntroSeen('aeroporto');
    expect(introSeen('aeroporto')).toBe(true);
    expect(introSeen('teste-12x12')).toBe(false);
  });
});

describe('abertura da missão: câmera', () => {
  it('a curva começa e termina parada e passa pelo meio', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.05)).toBeLessThan(0.05);
  });

  it('o zoom cabe a dimensão que mais aperta (largura na tela larga, fundo na estreita)', () => {
    const fit = (w: number, h: number, aspect: number) => introZoom(w, h, aspect, 40, 11.5);
    const visible = (z: number) => 2 * Math.tan((40 * Math.PI) / 360) * 11.5 * z;
    // 50 × 40 numa tela 16:9: manda a profundidade
    expect(visible(fit(50, 40, 16 / 9))).toBeCloseTo(40 * INTRO.framePad);
    // a mesma área numa tela de celular em pé: manda a largura
    expect(visible(fit(50, 40, 0.5))).toBeCloseTo(100 * INTRO.framePad);
  });
});

describe('abertura da missão: traço de caneta', () => {
  const e = { cx: 400, cy: 300, rx: 200, ry: 120 };

  it('é determinístico pelo seed e passa do ponto de partida', () => {
    expect(penLoop(e, 11)).toBe(penLoop(e, 11));
    expect(penLoop(e, 11)).not.toBe(penLoop(e, 12));
    expect(penLoop(e, 11).startsWith('M')).toBe(true);
  });

  it('anotação à direita quando cabe, à esquerda quando não, e embaixo sem espaço dos lados', () => {
    expect(placeNote(e, 150, 80, 1200, 800).anchor).toBe('start');
    expect(placeNote({ ...e, cx: 1000 }, 150, 80, 1200, 800).anchor).toBe('end');
    const narrow = placeNote({ cx: 200, cy: 200, rx: 170, ry: 100 }, 150, 80, 400, 800);
    expect(narrow.anchor).toBe('middle');
    expect(narrow.y).toBeGreaterThan(300);
  });

  it('anotação à direita começa depois do círculo e fica dentro da tela', () => {
    const p = placeNote(e, 150, 80, 1200, 800);
    expect(p.x).toBeGreaterThan(e.cx + e.rx);
    expect(p.x + 150).toBeLessThanOrEqual(1200 - 16);
    expect(p.y).toBeGreaterThanOrEqual(16);
  });
});
