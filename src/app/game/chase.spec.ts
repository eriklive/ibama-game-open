import { describe, expect, it } from 'vitest';
import { DOOR_RULES, Door, DoorState } from './door';
import { HexCoord, hexKey, hexNeighbors, pathTo, reachableHexes, rectArea } from './hex';
import { blockedHexes, findMap, lowCoverHexes, playArea, vaultHexes } from './maps';
import { spawnDoors } from './door';
import { spawnEnemy } from './enemies';
import {
  CHASE_RULES,
  agentSight,
  arrestQueue,
  chaseCandidates,
  chaseEnd,
  chaseRadius,
  fleeDoorNeed,
  initiativeChance,
  initiativeCheck,
  lockRoute,
  resolveFleeDoor,
  resolveShout,
  resolveSprint,
  sprintRate,
  sprintTotalMs,
  agentVaults,
  vaultPasses,
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

describe('routeStops', () => {
  it('só portas fechadas param; curva não é parada', () => {
    const pts = [...line(h(5, 1), 6, 0, 1), ...line(h(6, 6), 5, 1, 0)];
    expect(routeStops(pts)).toEqual([]);
    const d = door(pts[5], 'encostada');
    const stops = routeStops(pts, new Map([[hexKey(d.hex), d]]));
    expect(stops).toMatchObject([{ kind: 'porta', index: 5 }]);
  });
  it('porta aberta não para', () => {
    const pts = line(h(5, 1), 6, 0, 1);
    const d = door(pts[3], 'aberta');
    expect(routeStops(pts, new Map([[hexKey(d.hex), d]]))).toEqual([]);
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

describe('porta na fuga', () => {
  it('o que ele precisa tirar para arrombar', () => {
    expect(fleeDoorNeed(door(h(0, 0), 'encostada'))).toBe(3);
    expect(fleeDoorNeed(door(h(0, 0), 'trancada', { lock: 10 }))).toBe(12);
    expect(fleeDoorNeed(door(h(0, 0), 'aberta'))).toBe(0);
    expect(fleeDoorNeed(door(h(0, 0), 'bloqueada'))).toBe(Infinity);
  });
  it('passou: arromba a porta; falhou: porta igual (ele tenta de novo)', () => {
    const d = door(h(0, 0), 'trancada');
    expect(resolveFleeDoor(d, 12)).toMatchObject({ pass: true });
    expect(resolveFleeDoor(d, 12).door.broken).toBe(true);
    const fail = resolveFleeDoor(d, 11);
    expect(fail).toMatchObject({ pass: false });
    expect(fail.door).toBe(d);
  });
  it('porta já aberta: passa sem quebrar', () => {
    const d = door(h(0, 0), 'aberta');
    expect(resolveFleeDoor(d, 1)).toMatchObject({ pass: true });
    expect(resolveFleeDoor(d, 1).door).toBe(d);
  });
});

describe('grito', () => {
  it('disputa: agente maior, ele olha para trás (−1)', () => {
    expect(resolveShout(12, {}, 9)).toEqual({ total: 12, lookedBack: true, delta: -1 });
  });
  it('empate também: ele olha para trás (−1)', () => {
    expect(resolveShout(10, {}, 10)).toEqual({ total: 10, lookedBack: true, delta: -1 });
  });
  it('ele maior: nada acontece', () => {
    expect(resolveShout(9, {}, 10)).toEqual({ total: 9, lookedBack: false, delta: 0 });
  });
  it('a intimidação do agente soma no d20 dele; vigor não conta', () => {
    expect(resolveShout(8, { intimidacao: 2 }, 10).lookedBack).toBe(true);
    expect(resolveShout(8, { vigor: 5 }, 10).lookedBack).toBe(false);
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
  it('trilha na mata: as curvas não viram paradas', () => {
    const r = route(h(11, 21), h(15, 21));
    expect(r.stops.every((s) => s.kind === 'porta')).toBe(true);
  });
  it('casa: sai pela porta encostada, que é a primeira parada', () => {
    const r = route(h(33, 28), h(31, 28));
    expect(r.stops[0]).toMatchObject({ kind: 'porta', door: { state: 'encostada' } });
  });
});

describe('pulo da carga baixa', () => {
  it('atalho por cima do caixote onde a pista dá a volta; só se poupar passos', () => {
    const area = rectArea(10, 10);
    const crate = h(4, 4);
    // a pista sobe pela coluna 4 e contorna o caixote pela coluna 5
    const around = [h(4, 7), h(4, 6), h(4, 5), h(5, 5), h(6, 4), h(6, 3), h(5, 3), h(4, 2), h(4, 1)];
    const [v, ...rest] = agentVaults(around, new Set([hexKey(crate)]), area);
    expect(rest).toEqual([]);
    expect(v.over).toEqual(crate);
    expect(v.path).toContainEqual(crate);
    expect(v.path.at(-1)).toEqual(around[v.land]);
    expect(v.saves).toBe(v.land - v.index - v.path.length);
    expect(v.saves).toBeGreaterThan(0);
    // pista reta, sem caixote no caminho: nada a pular
    expect(agentVaults(line(h(2, 8), 8, 0, -1), new Set([hexKey(crate)]), area)).toEqual([]);
  });
  it('pulo: d20 + agilidade, pelo menos vaultDC', () => {
    const need = CHASE_RULES.vaultDC;
    expect(vaultPasses(need)).toBe(true);
    expect(vaultPasses(need - 1)).toBe(false);
    expect(vaultPasses(need - 2, { agilidade: 2 })).toBe(true);
  });
  it('aeroporto: toda carga baixa é pulável (sacos, gaiolas, mesa); a alta, não', () => {
    const m = findMap('aeroporto')!;
    const vault = vaultHexes(m);
    expect(vault).toEqual(lowCoverHexes(m));
    const kinds = new Set((m.cover ?? []).filter((c) => vault.has(hexKey(c))).map((c) => c.kind));
    expect(kinds).toEqual(new Set(['sacks', 'cages', 'table']));
    for (const c of m.cover ?? []) {
      // meia altura: ninguém anda por ela, mas não tapa a visão
      if (vault.has(hexKey(c))) expect(blockedHexes(m).has(hexKey(c)), hexKey(c)).toBe(false);
      else expect(blockedHexes(m).has(hexKey(c)), hexKey(c)).toBe(true);
    }
  });
  it('aeroporto: no fundo do hangar ele contorna as gaiolas e o agente pode pular por cima', () => {
    const m = findMap('aeroporto')!;
    const area = playArea(m);
    const blocked = new Set([...blockedHexes(m), ...lowCoverHexes(m)]);
    const from = h(20, 7);
    const agent = h(24, 7);
    const r = lockRoute(from, area, blocked, spawnDoors(m.doors ?? [], m.doorStates), [agent]);
    expect(r.flee).toContainEqual(h(14, 4));
    const free = new Set(blocked);
    free.delete(hexKey(from));
    const approach = pathTo(reachableHexes(agent, 10, area, free), from);
    const vaults = agentVaults([agent, ...approach, ...r.flee], vaultHexes(m), area, blocked);
    expect(vaults.length).toBeGreaterThanOrEqual(1);
    const cover = new Map((m.cover ?? []).map((c) => [hexKey(c), c.kind]));
    expect(cover.get(hexKey(vaults[0].over))).toBe('cages');
    expect(vaults[0].saves).toBeGreaterThanOrEqual(1);
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

describe('corrida (teste de vigor: d20 + vigor = % de velocidade)', () => {
  it('o d20 vira o bônus em %', () => {
    expect(resolveSprint(1, {})).toEqual({ total: 1, percent: 1 });
    expect(resolveSprint(12, {})).toEqual({ total: 12, percent: 12 });
    expect(resolveSprint(20, {})).toEqual({ total: 20, percent: 20 });
  });
  it('o vigor soma no teste, e o bônus nunca fica abaixo de 1%', () => {
    expect(resolveSprint(12, { vigor: 2 })).toEqual({ total: 14, percent: 14 });
    expect(resolveSprint(20, { vigor: 1 }).percent).toBe(21);
    expect(resolveSprint(1, { vigor: -2 })).toEqual({ total: -1, percent: 1 });
  });
  it('entra suave, segura 5 s e sai suave', () => {
    const ramp = CHASE_RULES.sprintRampMs;
    expect(sprintRate(40, 0)).toBe(1);
    expect(sprintRate(40, ramp / 2)).toBeCloseTo(1.2);
    expect(sprintRate(40, ramp + 2500)).toBeCloseTo(1.4);
    expect(sprintRate(40, ramp + CHASE_RULES.sprintSeconds * 1000)).toBeCloseTo(1.4);
    expect(sprintRate(40, sprintTotalMs())).toBe(1);
    expect(sprintRate(0, 1000)).toBe(1);
  });
});
