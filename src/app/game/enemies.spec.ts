import { describe, expect, it } from 'vitest';
import {
  APPROACH_RULES,
  BASE_APPROACH,
  approachZones,
  escapeChance,
  escapeModifier,
  passesEscape,
  rollEscape,
  ENEMY_RULES,
  behindLowCover,
  canAct,
  resolveApproach,
  facingBetween,
  isBorder,
  known,
  onBoard,
  lineOfSight,
  planFlee,
  planPatrol,
  spawnEnemy,
  spotted,
  stationary,
  visionHexes,
} from './enemies';
import { HexCoord, hexDistance, hexKey, hexNeighbors, rectArea } from './hex';
import { CHARACTERS, MAPS, playArea } from './maps';

const keys = (hs: HexCoord[]) => new Set(hs.map(hexKey));
const none = new Set<string>();

describe('visão dos inimigos', () => {
  const enemy = { hex: { col: 5, row: 5 }, facing: facingBetween({ col: 5, row: 5 }, { col: 5, row: 6 }) };

  it('enxerga à frente, dentro do alcance, e não às costas', () => {
    const seen = keys(visionHexes(enemy, rectArea(12, 12), none));
    expect(seen.has(hexKey({ col: 5, row: 6 }))).toBe(true);
    expect(seen.has(hexKey({ col: 5, row: 5 + ENEMY_RULES.visionRange }))).toBe(true);
    expect(seen.has(hexKey({ col: 5, row: 6 + ENEMY_RULES.visionRange }))).toBe(false);
    expect(seen.has(hexKey({ col: 5, row: 4 }))).toBe(false);
    expect(seen.has(hexKey(enemy.hex))).toBe(false);
  });

  it('o cone de 120° pega os 3 vizinhos da frente', () => {
    const seen = keys(visionHexes(enemy, rectArea(12, 12), none, 1));
    expect(seen.size).toBe(3);
  });

  it('paredes bloqueiam a visão (e não são vistas)', () => {
    const walls = keys([{ col: 5, row: 6 }]);
    const seen = keys(visionHexes(enemy, rectArea(12, 12), walls));
    expect(seen.has(hexKey({ col: 5, row: 6 }))).toBe(false);
    expect(seen.has(hexKey({ col: 5, row: 7 }))).toBe(false);
    expect(lineOfSight({ col: 5, row: 5 }, { col: 5, row: 8 }, walls)).toBe(false);
    expect(lineOfSight({ col: 5, row: 5 }, { col: 5, row: 8 }, none)).toBe(true);
  });

  it('carga baixa: enxerga por cima, mas não vê quem está colado nela do lado de lá', () => {
    const low = keys([{ col: 5, row: 6 }]);
    const seen = keys(visionHexes(enemy, rectArea(12, 12), none, ENEMY_RULES.visionRange, ENEMY_RULES.visionAngle, low));
    expect(seen.has(hexKey({ col: 5, row: 6 }))).toBe(false); // a própria carga
    expect(seen.has(hexKey({ col: 5, row: 7 }))).toBe(false); // colado nela, atrás
    expect(seen.has(hexKey({ col: 5, row: 8 }))).toBe(true); // mais longe: visto por cima
    expect(behindLowCover(enemy.hex, { col: 5, row: 7 }, low)).toBe(true);
    expect(behindLowCover(enemy.hex, { col: 5, row: 8 }, low)).toBe(false);
  });

  it('não avista o agente agachado atrás de carga baixa', () => {
    const e = spawnEnemy({ id: 'x', name: 'X', patrol: [{ col: 5, row: 5 }, { col: 5, row: 8 }] });
    const agents = new Map([['ana', { col: 5, row: 7 }]]);
    expect(spotted(e, agents, rectArea(12, 12), none, keys([{ col: 5, row: 6 }]))).toBeNull();
    expect(spotted(e, agents, rectArea(12, 12), none, keys([{ col: 4, row: 6 }]))).toBe('ana');
  });

  it('avista o agente no cone, mas só se estiver em patrulha', () => {
    const e = { ...spawnEnemy({ id: 'x', name: 'X', patrol: [{ col: 5, row: 5 }, { col: 5, row: 8 }] }) };
    const agents = new Map([['ana', { col: 5, row: 7 }]]);
    expect(spotted(e, agents, rectArea(12, 12), none)).toBe('ana');
    expect(spotted({ ...e, status: 'alert' }, agents, rectArea(12, 12), none)).toBeNull();
    expect(spotted(e, new Map([['ana', { col: 5, row: 3 }]]), rectArea(12, 12), none)).toBeNull();
  });
});

describe('patrulha', () => {
  const e = spawnEnemy({ id: 'x', name: 'X', patrol: [{ col: 2, row: 2 }, { col: 2, row: 5 }] });

  it('anda até N passos rumo ao próximo ponto e volta ao chegar no fim da rota', () => {
    const a = planPatrol(e, 2, rectArea(12, 12), none);
    expect(a.path).toEqual([{ col: 2, row: 3 }, { col: 2, row: 4 }]);
    const b = planPatrol({ ...e, hex: a.path[1], waypoint: a.waypoint, dir: a.dir }, 2, rectArea(12, 12), none);
    // chega ao fim (2,5) e já começa a voltar
    expect(b.path).toEqual([{ col: 2, row: 5 }, { col: 2, row: 4 }]);
    expect(b.dir).toBe(-1);
  });

  it('desvia de bloqueios e espera se a rota estiver fechada', () => {
    const around = planPatrol(e, 4, rectArea(12, 12), keys([{ col: 2, row: 3 }]));
    expect(around.path.some((h) => hexKey(h) === '2,3')).toBe(false);
    for (let i = 1; i < around.path.length; i++) expect(hexDistance(around.path[i - 1], around.path[i])).toBe(1);
    const walled = planPatrol({ ...e, hex: { col: 0, row: 0 }, waypoint: 1 }, 3, rectArea(12, 12), keys([{ col: 1, row: 0 }, { col: 0, row: 1 }]));
    expect(walled.path).toEqual([]);
  });
});

describe('vaguear', () => {
  const zone = { cols: [3, 8] as [number, number], rows: [3, 8] as [number, number] };
  const e = spawnEnemy({ id: 'w', name: 'W', patrol: [{ col: 5, row: 5 }], wander: zone });

  it('não conta como parado e sorteia um destino dentro da zona', () => {
    expect(stationary(e)).toBe(false);
    for (const r of [0, 0.5, 0.999]) {
      const plan = planPatrol(e, 2, rectArea(12, 12), none, () => r);
      expect(plan.path.length).toBeGreaterThan(0);
      expect(plan.path.length).toBeLessThanOrEqual(2);
      const t = plan.target!;
      expect(t.col >= 3 && t.col <= 8 && t.row >= 3 && t.row <= 8).toBe(true);
      expect(hexDistance(t, e.hex)).toBeGreaterThanOrEqual(3);
    }
  });

  it('segue para o destino já sorteado e sorteia outro ao chegar', () => {
    const target = { col: 5, row: 8 };
    const a = planPatrol({ ...e, target }, 2, rectArea(12, 12), none, () => 0);
    expect(a.path).toEqual([{ col: 5, row: 6 }, { col: 5, row: 7 }]);
    expect(a.target).toEqual(target);
    const b = planPatrol({ ...e, hex: { col: 5, row: 7 }, target }, 2, rectArea(12, 12), none, () => 0);
    expect(b.path).toEqual([{ col: 5, row: 8 }]);
    expect(b.target).toBeUndefined();
  });
});

describe('fuga', () => {
  it('corre pelo caminho mais curto até a borda', () => {
    const r = planFlee({ col: 2, row: 5 }, 4, rectArea(12, 12), none);
    expect(r.full.length).toBe(2);
    expect(r.escapes).toBe(true);
    expect(isBorder(r.full.at(-1)!, rectArea(12, 12))).toBe(true);
  });

  it('com poucos passos não chega e continua no mapa', () => {
    const r = planFlee({ col: 5, row: 5 }, 2, rectArea(12, 12), none);
    expect(r.path.length).toBe(2);
    expect(r.escapes).toBe(false);
  });

  it('fica encurralado se todos os vizinhos estiverem bloqueados', () => {
    const blocked = keys(hexNeighbors({ col: 5, row: 5 }));
    expect(planFlee({ col: 5, row: 5 }, 4, rectArea(12, 12), blocked).cornered).toBe(true);
  });

  it('já na borda, foge na hora', () => {
    expect(planFlee({ col: 0, row: 5 }, 4, rectArea(12, 12), none).escapes).toBe(true);
  });

  it('entre bordas igualmente próximas, prefere a mais longe dos agentes', () => {
    // de (1,1) há três bordas a 1 passo: (1,0), (0,1) e (0,2); com um agente ao sul, foge para o norte
    const r = planFlee({ col: 1, row: 1 }, 4, rectArea(12, 12), none, [{ col: 0, row: 4 }]);
    expect(r.full).toEqual([{ col: 1, row: 0 }]);
  });
});

describe('mapa de teste', () => {
  const map = MAPS[0];
  const walls = keys(map.walls);

  it('ninguém começa em parede, nem sobreposto, e as rotas evitam a borda e as paredes', () => {
    const starts = [...map.starts, ...map.enemies.map((e) => e.patrol[0])];
    expect(keys(starts).size).toBe(starts.length);
    for (const h of starts) expect(walls.has(hexKey(h))).toBe(false);
    for (const e of map.enemies) {
      for (const h of e.patrol) {
        expect(walls.has(hexKey(h))).toBe(false);
        expect(isBorder(h, playArea(map))).toBe(false);
      }
    }
  });

  it('no começo nenhum inimigo vê os agentes', () => {
    const agents = new Map(CHARACTERS.map((c, i) => [c.id, map.starts[i]]));
    for (const e of map.enemies.map(spawnEnemy)) expect(spotted(e, agents, playArea(map), walls)).toBeNull();
  });
});

describe('abordagem', () => {
  const at = (id: string, col: number, row: number, status: 'patrol' | 'alert' | 'surrendered' | 'fled' = 'patrol') => ({
    ...spawnEnemy({ id, name: id, patrol: [{ col, row }] }),
    status,
  });
  const zones = approachZones(2); // abordagem 1–2, rolagem 3–5, fuga 6
  const from = { col: 5, row: 5 };

  it('as faixas vêm uma logo depois da outra: abordagem, rolagem (3) e fuga (1)', () => {
    expect(BASE_APPROACH).toEqual({ surrenderRange: 2, rollRange: 5, radius: 6 });
    expect(approachZones(4)).toEqual({ surrenderRange: 4, rollRange: 7, radius: 8 });
  });

  it('o raio de abordagem nunca fica menor que 1', () => {
    expect(approachZones(-3)).toEqual({ surrenderRange: 1, rollRange: 4, radius: 5 });
  });

  it('perto se rende, na zona de rolagem rola, na zona de fuga corre, fora nem percebe', () => {
    const r = resolveApproach(
      from,
      [at('perto', 5, 7), at('rola', 5, 9), at('foge', 5, 11), at('longe', 5, 12)],
      zones,
    );
    expect(r.surrender.map((e) => e.id)).toEqual(['perto']);
    expect(r.roll.map((c) => [c.enemy.id, c.distance, c.modifier])).toEqual([['rola', 4, 0]]);
    expect(r.flee.map((e) => e.id)).toEqual(['foge']);
  });

  it('o modificador vai de −1 (perto da abordagem) a +1 (perto da fuga)', () => {
    expect([3, 4, 5].map((d) => escapeModifier(d, zones))).toEqual([-1, 0, 1]);
    expect(escapeModifier(2, zones)).toBe(0);
    expect(escapeModifier(6, zones)).toBe(0);
    // com mais intimidação a faixa se afasta e o −1 vai junto
    expect(escapeModifier(5, approachZones(4))).toBe(-1);
  });

  it('passa no teste com 8 ou mais (dado + modificador)', () => {
    expect(APPROACH_RULES.escapeDC).toBe(8);
    expect(passesEscape(8, 0)).toBe(true);
    expect(passesEscape(7, 0)).toBe(false);
    expect(passesEscape(8, -1)).toBe(false);
    expect(passesEscape(7, 1)).toBe(true);
    expect([-1, 0, 1].map((m) => escapeChance(m))).toEqual([0.6, 0.65, 0.7]);
    expect(escapeChance(-20)).toBe(0);
    expect(escapeChance(20)).toBe(1);
  });

  it('rolar: passou corre, falhou se rende', () => {
    const [check] = resolveApproach(from, [at('rola', 5, 8)], zones).roll; // 3 hex: −1
    expect(rollEscape(check, () => 9)).toEqual(expect.objectContaining({ roll: 9, total: 8, passed: true }));
    expect(rollEscape(check, () => 8)).toEqual(expect.objectContaining({ roll: 8, total: 7, passed: false }));
  });

  it('inimigo já em alerta também reage (e rola de novo); rendidos e fugidos não contam', () => {
    const r = resolveApproach(
      from,
      [at('a', 5, 6, 'alert'), at('b', 5, 9, 'alert'), at('r', 5, 4, 'surrendered'), at('f', 6, 5, 'fled')],
      zones,
    );
    expect(r.surrender.map((e) => e.id)).toEqual(['a']);
    expect(r.roll.map((c) => c.enemy.id)).toEqual(['b']);
    expect(r.flee).toEqual([]);
    expect(canAct(at('x', 1, 1, 'surrendered'))).toBe(false);
  });

  it('abordagem: parede ou porta fechada no meio tira o inimigo (só acesso direto)', () => {
    const from = { col: 5, row: 5 };
    const rules = approachZones(2);
    const near = spawnEnemy({ id: 'perto', name: 'perto', patrol: [{ col: 5, row: 7 }] });
    const walls = new Set([hexKey({ col: 5, row: 6 })]);
    expect(resolveApproach(from, [near], rules).surrender).toHaveLength(1);
    expect(resolveApproach(from, [near], rules, walls).surrender).toHaveLength(0);
  });
});

describe('inimigo escondido', () => {
  it('começa escondido: não age, não ocupa hexágono e a equipe não sabe dele', () => {
    const e = spawnEnemy({ id: 'comparsa', name: 'Comparsa', hidden: true, patrol: [{ col: 2, row: 2 }] });
    expect(e.status).toBe('hidden');
    expect(canAct(e)).toBe(false);
    expect(onBoard(e)).toBe(false);
    expect(known(e)).toBe(false);
    expect(known({ status: 'fled' })).toBe(true);
    expect(onBoard({ status: 'surrendered' })).toBe(true);
  });

  it('guarda a classe de NPC e quem ele pode entregar', () => {
    const e = spawnEnemy({ id: 'p', name: 'Piloto', npc: 'piloto', reveals: 'comparsa', patrol: [{ col: 0, row: 0 }] });
    expect([e.npc, e.reveals]).toEqual(['piloto', 'comparsa']);
  });
});
