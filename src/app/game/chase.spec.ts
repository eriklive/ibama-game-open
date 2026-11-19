import { describe, expect, it } from 'vitest';
import { DOOR_RULES, Door, DoorState } from './door';
import { HexCoord, hexKey, hexNeighbors, rectArea } from './hex';
import { blockedHexes, findMap, playArea } from './maps';
import { spawnDoors } from './door';
import { spawnEnemy } from './enemies';
import {
  CHASE_RULES,
  agentSight,
  arrestQueue,
  chaseCandidates,
  chaseEnd,
  chaseRadius,
  fleeDoorAction,
  fleeDoorNeed,
  initiativeChance,
  initiativeCheck,
  lockRoute,
  resolveCurve,
  resolveFleeDoor,
  resolveShout,
  shoutResistNeed,
  agentCurves,
  routeCurves,
  routeStops,
  targetChoices,
} from './chase';

const h = (col: number, row: number): HexCoord => ({ col, row });
const door = (hex: HexCoord, state: DoorState, extra: Partial<Door> = {}): Door => ({
  hex,
  state,
  lock: DOOR_RULES.lock,
  broken: false,
  ...extra,
});
const line = (from: HexCoord, n: number, dc: number, dr: number): HexCoord[] =>
  Array.from({ length: n }, (_, i) => h(from.col + dc * i, from.row + dr * i));

describe('chaseRadius', () => {
  it('base + vigor + iniciativa, nunca negativo', () => {
    expect(chaseRadius()).toBe(CHASE_RULES.radiusBase);
    expect(chaseRadius({ vigor: 1, iniciativa: 2 })).toBe(CHASE_RULES.radiusBase + 3);
    expect(chaseRadius({ vigor: -5, iniciativa: -5 })).toBe(0);
  });
});

describe('chaseCandidates', () => {
  const area = rectArea(20, 20);
  it('entra quem chega até ele dentro do raio, o mais perto primeiro', () => {
    const out = chaseCandidates(
      h(10, 10),
      [
        { id: 'longe', hex: h(10, 14) },
        { id: 'perto', hex: h(10, 12) },
        { id: 'fora', hex: h(10, 18) },
      ],
      area,
      new Set(),
    );
    expect(out.map((c) => c.id)).toEqual(['perto', 'longe']);
    expect(out[0].path.at(-1)).toEqual(h(10, 10));
    expect(out[0].path.length).toBe(2);
  });

  it('parede no meio aumenta o caminho; quem já correu fica de fora', () => {
    const wall = new Set(line(h(9, 11), 3, 1, 0).map(hexKey));
    const out = chaseCandidates(h(10, 10), [{ id: 'a', hex: h(10, 12) }], area, wall);
    expect(out).toEqual([]);
    const far = chaseCandidates(
      h(10, 10),
      [{ id: 'a', hex: h(10, 12), stats: { vigor: 3 } }],
      area,
      wall,
    );
    expect(far[0].path.length).toBeGreaterThan(2);
    expect(
      chaseCandidates(h(10, 10), [{ id: 'a', hex: h(10, 12) }], area, new Set(), new Set(['a'])),
    ).toEqual([]);
  });

  it('o hexágono do garimpeiro pode estar bloqueado (é o destino)', () => {
    const out = chaseCandidates(
      h(10, 10),
      [{ id: 'a', hex: h(10, 12) }],
      area,
      new Set([hexKey(h(10, 10))]),
    );
    expect(out.length).toBe(1);
  });
});

describe('arrestQueue (voz de prisão)', () => {
  const area = rectArea(20, 20);

  it('quem abordou rola primeiro, mesmo mais longe e fora do raio de perseguição; depois todos, do mais perto do suspeito ao mais longe', () => {
    const out = arrestQueue(
      h(10, 2),
      'chefe',
      [
        { id: 'longe', hex: h(10, 18) },
        { id: 'chefe', hex: h(10, 12) },
        { id: 'perto', hex: h(10, 4) },
      ],
      area,
      new Set(),
    );
    expect(out.map((c) => c.id)).toEqual(['chefe', 'perto', 'longe']);
    expect(out[0].path.at(-1)).toEqual(h(10, 2));
    expect(out[0].path.length).toBe(10);
    expect(out[2].path.length).toBe(16);
  });

  it('quem já correu fica de fora; sem quem abordou no tabuleiro, os outros ainda entram', () => {
    const agents = [
      { id: 'chefe', hex: h(10, 12) },
      { id: 'b', hex: h(10, 13) },
    ];
    expect(arrestQueue(h(10, 8), 'chefe', agents, area, new Set(), new Set(['chefe'])).map((c) => c.id)).toEqual(['b']);
    expect(arrestQueue(h(10, 8), 'chefe', [agents[1]], area, new Set()).map((c) => c.id)).toEqual(['b']);
  });

  it('sem caminho até o suspeito, não entra na fila', () => {
    const ring = new Set(hexNeighbors(h(10, 8)).map(hexKey));
    expect(arrestQueue(h(10, 8), 'chefe', [{ id: 'chefe', hex: h(10, 12) }], area, ring)).toEqual([]);
  });
});

describe('targetChoices', () => {
  it('só os agentes no raio de mais de um garimpeiro', () => {
    const offers = new Map([
      [
        'g1',
        [
          { id: 'ana', path: [] },
          { id: 'bruno', path: [] },
        ],
      ],
      ['g2', [{ id: 'ana', path: [] }]],
    ]);
    expect([...targetChoices(offers)]).toEqual([['ana', ['g1', 'g2']]]);
  });
});

describe('initiativeCheck', () => {
  it('d20 + iniciativa, 8 ou mais; só o agente rola', () => {
    expect(CHASE_RULES.initiativeDC).toBe(8);
    expect(initiativeCheck(8)).toEqual({ total: 8, go: true });
    expect(initiativeCheck(7)).toEqual({ total: 7, go: false });
    expect(initiativeCheck(6, { iniciativa: 2 })).toEqual({ total: 8, go: true });
  });
  it('chance: 65% com +0, 75% com +2, limitada a 0..1', () => {
    expect(initiativeChance()).toBeCloseTo(0.65);
    expect(initiativeChance({ iniciativa: 2 })).toBeCloseTo(0.75);
    expect(initiativeChance({ iniciativa: 10 })).toBe(1);
    expect(initiativeChance({ iniciativa: -25 })).toBe(0);
  });
});

describe('routeCurves', () => {
  it('reta para o sul ou para o oeste (zigue-zague do grid) não tem curva', () => {
    expect(routeCurves(line(h(5, 1), 8, 0, 1))).toEqual([]);
    expect(routeCurves(line(h(12, 5), 8, -1, 0))).toEqual([]);
  });
  it('L: desce e vira para o leste = curva à esquerda de quem corre', () => {
    const pts = [...line(h(5, 1), 6, 0, 1), ...line(h(6, 6), 5, 1, 0)];
    const curves = routeCurves(pts);
    expect(curves.length).toBe(1);
    expect(curves[0].side).toBe('esquerda');
    expect(Math.abs(curves[0].index - 5)).toBeLessThanOrEqual(1);
  });
  it('desce e vira para o oeste = direita', () => {
    const pts = [...line(h(10, 1), 6, 0, 1), ...line(h(9, 6), 5, -1, 0)];
    expect(routeCurves(pts).map((c) => c.side)).toEqual(['direita']);
  });
});

describe('routeStops', () => {
  it('porta fechada vira parada e substitui a curva no mesmo hexágono', () => {
    const pts = [...line(h(5, 1), 6, 0, 1), ...line(h(6, 6), 5, 1, 0)];
    const corner = routeCurves(pts)[0].index;
    const d = door(pts[corner], 'encostada');
    const stops = routeStops(pts, new Map([[hexKey(d.hex), d]]));
    expect(stops.map((s) => s.kind)).toEqual(['porta']);
  });
  it('porta aberta não para', () => {
    const pts = line(h(5, 1), 6, 0, 1);
    const d = door(pts[3], 'aberta');
    expect(routeStops(pts, new Map([[hexKey(d.hex), d]]))).toEqual([]);
  });
});

describe('agentCurves', () => {
  it('a curva é do agente: índice na pista dele, inclusive no trecho até o garimpeiro', () => {
    // o agente desce até o garimpeiro e a fuga segue reto; quem dobra é o agente
    const track = [...line(h(5, 1), 6, 0, 1), ...line(h(6, 6), 5, 1, 0)];
    const curves = agentCurves(track, 8);
    expect(curves.map((c) => c.side)).toEqual(['esquerda']);
    expect(curves[0].index).toBe(routeCurves(track)[0].index);
  });
  it('pista toda reta: nada de esquerda ou direita', () => {
    expect(agentCurves(line(h(5, 1), 12, 0, 1), 4)).toEqual([]);
  });
  it('curva colada numa porta fechada da fuga não conta', () => {
    const track = [...line(h(5, 1), 6, 0, 1), ...line(h(6, 6), 5, 1, 0)];
    const corner = routeCurves(track)[0].index;
    const fleeStart = 2;
    const d = door(track[corner], 'encostada');
    const stops = routeStops(track.slice(fleeStart), new Map([[hexKey(d.hex), d]]));
    expect(agentCurves(track, fleeStart, stops)).toEqual([]);
  });
});

describe('lockRoute', () => {
  // corredor: parede na coluna 8 com uma porta em (8, 5); a borda leste fica do outro lado
  const area = rectArea(12, 11);
  const wall = new Set(Array.from({ length: 11 }, (_, r) => hexKey(h(8, r))));
  const at = (state: DoorState) => {
    const d = door(h(8, 5), state);
    return new Map([[hexKey(d.hex), d]]);
  };

  it('na borda: já fugiu', () => {
    expect(lockRoute(h(0, 5), area, new Set()).escapes).toBe(true);
  });
  it('passa pela porta encostada ou trancada e para nela', () => {
    for (const state of ['encostada', 'trancada'] as const) {
      const r = lockRoute(h(9, 5), rectArea(12, 11), wall, at(state), [
        h(10, 5),
        h(10, 4),
        h(10, 6),
        h(11, 5),
        h(11, 4),
        h(11, 6),
        h(9, 6),
        h(9, 4),
      ]);
      expect(r.cornered).toBe(false);
      expect(r.flee[0]).toEqual(h(8, 5));
      expect(r.stops[0]).toMatchObject({ kind: 'porta', index: 1 });
    }
  });
  it('bloqueada é parede: encurralado se não houver outra saída', () => {
    const r = lockRoute(h(9, 5), area, wall, at('bloqueada'), [
      h(10, 5),
      h(10, 4),
      h(10, 6),
      h(11, 5),
      h(11, 4),
      h(11, 6),
      h(9, 6),
      h(9, 4),
    ]);
    expect(r.cornered).toBe(true);
  });
  it('rota longa vai inteira até a borda, sem corte', () => {
    const big = rectArea(40, 40);
    const r = lockRoute(h(20, 20), big, new Set());
    expect(r.flee.length).toBeGreaterThan(12);
    expect(big.isEdge(r.flee.at(-1)!)).toBe(true);
    expect(r.escapes).toBe(true);
  });
  it('foge do que os agentes enxergam: dá a volta por trás do muro', () => {
    // campo 30×21; muro na coluna 14 com vão só na fileira 20 (a de baixo); o agente vê o lado oeste
    const field = rectArea(30, 21);
    const wall = new Set(Array.from({ length: 20 }, (_, r) => hexKey(h(14, r))));
    const sight = agentSight([h(5, 10)], field, wall, 30);
    expect(sight.has(hexKey(h(10, 10)))).toBe(true);
    expect(sight.has(hexKey(h(20, 10)))).toBe(false);
    const open = lockRoute(h(15, 2), field, wall);
    const hidden = lockRoute(h(15, 2), field, wall, new Map(), [h(5, 10)], sight);
    // sem ninguém olhando, a borda de cima é a mais perto; com o agente, ainda é (ele já está escondido)
    expect(open.flee.length).toBe(hidden.flee.length);
    expect(hidden.flee.every((p) => !sight.has(hexKey(p)))).toBe(true);
  });
  it('prefere o caminho mais longo escondido ao curto à vista', () => {
    // a borda oeste é a mais perto, mas o agente perto dela enxerga 3 hexágonos em volta
    const field = rectArea(21, 21);
    const agent = h(2, 10);
    const sight = agentSight([agent], field, new Set(), 3);
    const from = h(6, 10);
    const seen = (r: { flee: HexCoord[] }) => r.flee.filter((p) => sight.has(hexKey(p))).length;
    const plain = lockRoute(from, field, new Set(), new Map(), [agent]);
    const hidden = lockRoute(from, field, new Set(), new Map(), [agent], sight);
    expect(seen(plain)).toBeGreaterThan(0);
    expect(seen(hidden)).toBeLessThan(seen(plain));
    expect(hidden.flee.length).toBeGreaterThan(plain.flee.length);
    expect(field.isEdge(hidden.flee.at(-1)!)).toBe(true);
  });
});

describe('resolveCurve', () => {
  const base = { side: 'direita' as const, agent: {} };
  const cases: [string, 'direita' | 'esquerda' | null, number, number][] = [
    ['bateu', 'esquerda', 20, 1],
    ['não deslizou', null, 20, 1],
    ['certo, falhou', 'direita', 3, 0],
    ['certo, passou', 'direita', 6, -1],
  ];
  for (const [name, swiped, agentRoll, delta] of cases) {
    it(name, () => expect(resolveCurve({ ...base, swiped, agentRoll }).delta).toBe(delta));
  }
  it('agilidade soma no d20 do agente', () => {
    const r = resolveCurve({ ...base, swiped: 'direita', agentRoll: 4, agent: { agilidade: 2 } });
    expect(r).toMatchObject({ agentPass: true, delta: -1 });
  });
});

describe('porta na fuga', () => {
  it('d4 1–2 abre, 3–4 arromba', () => {
    expect([1, 2, 3, 4].map(fleeDoorAction)).toEqual(['abrir', 'abrir', 'arrombar', 'arrombar']);
  });
  it('o que ele precisa tirar', () => {
    expect(fleeDoorNeed('abrir', door(h(0, 0), 'encostada'))).toBe(3);
    expect(fleeDoorNeed('arrombar', door(h(0, 0), 'encostada'))).toBe(3);
    expect(fleeDoorNeed('abrir', door(h(0, 0), 'trancada', { lock: 10 }))).toBe(10);
    expect(fleeDoorNeed('arrombar', door(h(0, 0), 'trancada'))).toBe(12);
    expect(fleeDoorNeed('abrir', door(h(0, 0), 'aberta'))).toBe(0);
    expect(fleeDoorNeed('arrombar', door(h(0, 0), 'bloqueada'))).toBe(Infinity);
  });
  it('passou: abrir deixa aberta, arrombar deixa quebrada; falhou: −1 e porta igual', () => {
    const d = door(h(0, 0), 'trancada');
    expect(resolveFleeDoor(d, 1, 12).door.state).toBe('aberta');
    expect(resolveFleeDoor(d, 4, 12).door.broken).toBe(true);
    const fail = resolveFleeDoor(d, 4, 11);
    expect(fail).toMatchObject({ pass: false, delta: -1 });
    expect(fail.door).toBe(d);
  });
});

describe('grito', () => {
  it('o agente precisa de d20 + vigor ≥ 8 para gritar', () => {
    expect(resolveShout(7, {}, 1).shouted).toBe(false);
    expect(resolveShout(7, {}, 1).delta).toBe(0);
    expect(resolveShout(6, { vigor: 2 }, 1).shouted).toBe(true);
  });
  it('gritou: ele precisa de 4 + intimidação no d20, senão olha para trás (−1)', () => {
    expect(shoutResistNeed({ intimidacao: 3 })).toBe(7);
    expect(resolveShout(10, { intimidacao: 3 }, 6)).toEqual({ shouted: true, lookedBack: true, delta: -1 });
    expect(resolveShout(10, { intimidacao: 3 }, 7)).toEqual({ shouted: true, lookedBack: false, delta: 0 });
    expect(resolveShout(10, {}, 3).lookedBack).toBe(true);
  });
});

describe('fim', () => {
  it('distância 0 agarra (mesmo no fim da rota); rota no fim, foge', () => {
    expect(chaseEnd(0, false)).toBe('agarrou');
    expect(chaseEnd(0, true)).toBe('agarrou');
    expect(chaseEnd(2, true)).toBe('fugiu');
    expect(chaseEnd(2, false)).toBeNull();
  });
});

describe('rotas no Aeroporto', () => {
  const m = findMap('aeroporto')!;
  const route = (from: HexCoord, agent: HexCoord) =>
    lockRoute(from, playArea(m), blockedHexes(m), spawnDoors(m.doors ?? [], m.doorStates), [agent]);

  it('pista de terra: reta para o sul, sem paradas', () => {
    const r = route(h(22, 26), h(21, 21));
    expect(r.flee.every((p) => p.col === 22)).toBe(true);
    expect(r.stops).toEqual([]);
  });
  it('com um agente olhando a pista, ele sai dela pela mata até a borda', () => {
    const area = playArea(m);
    const agent = h(21, 21);
    const sight = agentSight([agent], area, blockedHexes(m));
    const r = lockRoute(h(22, 26), area, blockedHexes(m), spawnDoors(m.doors ?? [], m.doorStates), [agent], sight);
    const onRunway = r.flee.filter((p) => m.ground?.get(hexKey(p)) === 'dirt').length;
    expect(onRunway).toBeLessThanOrEqual(2);
    expect(r.flee.filter((p) => sight.has(hexKey(p))).length).toBeLessThan(r.flee.length / 3);
    expect(area.isEdge(r.flee.at(-1)!)).toBe(true);
  });
  it('trilha na mata: o zigue-zague vira poucas curvas, espaçadas', () => {
    const r = route(h(11, 21), h(15, 21));
    expect(r.stops.length).toBeGreaterThan(0);
    expect(r.stops.length).toBeLessThanOrEqual(3);
    r.stops
      .slice(1)
      .forEach((s, i) =>
        expect(s.index - r.stops[i].index).toBeGreaterThanOrEqual(CHASE_RULES.curveSpacing),
      );
  });
  it('casa: sai pela porta encostada, que é a primeira parada', () => {
    const r = route(h(33, 28), h(31, 28));
    expect(r.stops[0]).toMatchObject({ kind: 'porta', door: { state: 'encostada' } });
  });
});

describe('agilidade dos suspeitos do Aeroporto', () => {
  it('vigia e piloto +2, garimpeiro 0, da pá −1, Jô −2', () => {
    const ag = Object.fromEntries(
      findMap('aeroporto')!.enemies.map((e) => [e.id, spawnEnemy(e).agilidade ?? 0]),
    );
    expect(ag).toEqual({ garimpeiro: 0, piloto: 2, 'garimpeiro-pa': -1, 'vigia-pista': 2, jo: -2 });
  });
});
