import { describe, expect, it } from 'vitest';
import { followLeader, rallyPoints } from './group';
import { HexCoord, hexDistance, hexKey, hexNeighbors, rectArea } from './hex';

const AREA = rectArea(10, 10);

const units = (entries: [string, HexCoord][]) => new Map(entries);
const ends = (paths: Map<string, HexCoord[]>, from: Map<string, HexCoord>) =>
  new Map([...from].map(([id, h]) => [id, paths.get(id)?.at(-1) ?? h]));

describe('rallyPoints', () => {
  const team = units([
    ['ana', { col: 2, row: 2 }],
    ['bruno', { col: 6, row: 2 }],
    ['clara', { col: 4, row: 5 }],
  ]);

  it('só oferece pontos que todos alcançam, com o líder no ponto e os outros em volta', () => {
    const plans = rallyPoints('ana', team, 4, AREA, new Set());
    expect(plans.size).toBeGreaterThan(0);
    for (const plan of plans.values()) {
      const final = ends(plan.paths, team);
      expect(final.get('ana')).toEqual(plan.point);
      expect(hexDistance(final.get('bruno')!, plan.point)).toBe(1);
      expect(hexDistance(final.get('clara')!, plan.point)).toBe(1);
      expect(hexKey(final.get('bruno')!)).not.toBe(hexKey(final.get('clara')!));
      expect(plan.cost).toBeLessThanOrEqual(4);
      expect(plan.cost).toBe(Math.max(...[...plan.paths.values()].map((p) => p.length)));
    }
  });

  it('prefere o grupo compacto: os seguidores ficam vizinhos entre si', () => {
    const plans = rallyPoints('ana', team, 4, AREA, new Set());
    for (const plan of plans.values()) {
      const final = ends(plan.paths, team);
      expect(hexDistance(final.get('bruno')!, final.get('clara')!)).toBe(1);
    }
  });

  it('sem movimento suficiente não há ponto em comum', () => {
    expect(rallyPoints('ana', team, 1, AREA, new Set()).size).toBe(0);
  });

  it('não usa hexágonos bloqueados nem ocupados', () => {
    const blocked = new Set(['4,2', '4,3']);
    const plans = rallyPoints('ana', team, 4, AREA, blocked);
    expect(plans.has('4,2')).toBe(false);
    for (const plan of plans.values())
      for (const p of plan.paths.values()) for (const h of p) expect(blocked.has(hexKey(h))).toBe(false);
    expect(plans.has('6,2')).toBe(false);
  });
});

describe('followLeader', () => {
  it('os seguidores ocupam o rastro logo atrás do líder', () => {
    const leaderFrom = { col: 2, row: 2 };
    const path = [{ col: 3, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 2 }];
    const followers = units([
      ['bruno', { col: 1, row: 2 }],
      ['clara', { col: 2, row: 3 }],
    ]);
    const { paths, left } = followLeader(leaderFrom, path, followers, AREA, new Set());
    expect(left).toEqual([]);
    const final = [...ends(paths, followers).values()].map(hexKey).sort();
    expect(final).toEqual(['3,2', '4,2'].sort());
  });

  it('com rastro curto, completa com hexágonos em volta do destino', () => {
    const followers = units([
      ['bruno', { col: 3, row: 2 }],
      ['clara', { col: 2, row: 3 }],
    ]);
    const { paths, left } = followLeader({ col: 2, row: 2 }, [{ col: 2, row: 1 }], followers, AREA, new Set());
    expect(left).toEqual([]);
    const final = ends(paths, followers);
    const keys = new Set([...final.values()].map(hexKey));
    expect(keys.size).toBe(2);
    expect(keys.has('2,1')).toBe(false);
    for (const h of final.values()) expect(hexDistance(h, { col: 2, row: 1 })).toBeLessThanOrEqual(2);
  });

  it('quem não tem como chegar fica para trás', () => {
    // clara está cercada por paredes, bem ao lado do líder
    const clara = { col: 4, row: 4 };
    const walls = new Set(hexNeighbors(clara).map(hexKey));
    const followers = units([['clara', clara]]);
    const { left } = followLeader({ col: 4, row: 2 }, [{ col: 5, row: 2 }], followers, AREA, walls);
    expect(left).toEqual(['clara']);
  });
});
