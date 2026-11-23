import { describe, expect, it } from 'vitest';
import { followLeader, lineMoves, lineSwapPaths, rallyPoints, suggestedRally, toBack, toFront } from './group';
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

describe('suggestedRally', () => {
  const team = units([
    ['ana', { col: 2, row: 2 }],
    ['bruno', { col: 6, row: 2 }],
    ['clara', { col: 4, row: 5 }],
  ]);

  it('sugere o ponto que gasta menos movimento', () => {
    const plans = rallyPoints('ana', team, 4, AREA, new Set());
    const best = suggestedRally(plans, 'ana')!;
    expect(best).toBeDefined();
    expect(plans.get(hexKey(best.point))).toBe(best);
    for (const plan of plans.values()) expect(best.cost).toBeLessThanOrEqual(plan.cost);
  });

  it('sem pontos possíveis, não sugere nada', () => {
    expect(suggestedRally(new Map(), 'ana')).toBeUndefined();
  });
});

describe('fila do grupo', () => {
  // em fila, de cima para baixo: ana na frente
  const line = ['ana', 'bruno', 'clara'];
  const pos = units([
    ['ana', { col: 4, row: 2 }],
    ['bruno', { col: 4, row: 3 }],
    ['clara', { col: 4, row: 4 }],
  ]);

  it('na vez dele, o agente vai para a frente e o primeiro vai para o lugar dele', () => {
    expect(toFront(line, 'clara')).toEqual(['clara', 'bruno', 'ana']);
    expect(toFront(line, 'bruno')).toEqual(['bruno', 'ana', 'clara']);
    // já na frente (ou fora do grupo): nada muda
    expect(toFront(line, 'ana')).toEqual(line);
    expect(toFront(line, 'davi')).toEqual(line);
  });

  it('ao encerrar a vez, ele vai para o fim e os de trás andam para a frente', () => {
    expect(toBack(line, 'ana')).toEqual(['bruno', 'clara', 'ana']);
    expect(toBack(['bruno', 'ana'], 'bruno')).toEqual(['ana', 'bruno']);
    expect(toBack(line, 'davi')).toEqual(line);
  });

  it('girando a fila, o próximo da vez já fica na frente', () => {
    // ana, bruno e clara jogam nessa ordem: a frente vai passando de um para o outro
    let l = line;
    for (const who of ['ana', 'bruno', 'clara', 'ana']) {
      l = toFront(l, who);
      expect(l[0]).toBe(who);
      l = toBack(l, who);
    }
  });

  it('as vagas não mudam: cada um vai para o hexágono de quem ocupava a vaga nova', () => {
    const moves = lineMoves(line, toBack(line, 'ana'), pos);
    expect(moves.get('bruno')).toEqual(pos.get('ana'));
    expect(moves.get('clara')).toEqual(pos.get('bruno'));
    expect(moves.get('ana')).toEqual(pos.get('clara'));
    // quem fica no lugar não anda
    expect(lineMoves(line, toFront(line, 'bruno'), pos).has('clara')).toBe(false);
    expect(lineMoves(line, line, pos).size).toBe(0);
  });

  it('cada um anda até a vaga nova, passando pelos colegas', () => {
    const moves = lineMoves(line, toBack(line, 'ana'), pos);
    const paths = lineSwapPaths(moves, pos, AREA, new Set())!;
    expect(paths.get('ana')!.at(-1)).toEqual(pos.get('clara'));
    expect(paths.get('ana')!.length).toBe(2);
    expect(paths.get('bruno')!).toEqual([pos.get('ana')]);
  });

  it('grupo espalhado (vaga longe demais): a fila fica como está', () => {
    const far = units([
      ['ana', { col: 0, row: 0 }],
      ['bruno', { col: 9, row: 9 }],
    ]);
    const moves = lineMoves(['ana', 'bruno'], ['bruno', 'ana'], far);
    expect(lineSwapPaths(moves, far, AREA, new Set())).toBeNull();
  });
});
