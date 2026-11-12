import { describe, expect, it } from 'vitest';
import {
  APPROACH_RULES,
  ENEMY_RULES,
  canAct,
  resolveApproach,
  facingBetween,
  isBorder,
  lineOfSight,
  planFlee,
  planPatrol,
  spawnEnemy,
  spotted,
  visionHexes,
} from './enemies';
import { HexCoord, hexDistance, hexKey, hexNeighbors } from './hex';
import { CHARACTERS, MAPS } from './maps';

const keys = (hs: HexCoord[]) => new Set(hs.map(hexKey));
const none = new Set<string>();

describe('visão dos inimigos', () => {
  const enemy = { hex: { col: 5, row: 5 }, facing: facingBetween({ col: 5, row: 5 }, { col: 5, row: 6 }) };

  it('enxerga à frente, dentro do alcance, e não às costas', () => {
    const seen = keys(visionHexes(enemy, 12, 12, none));
    expect(seen.has(hexKey({ col: 5, row: 6 }))).toBe(true);
    expect(seen.has(hexKey({ col: 5, row: 5 + ENEMY_RULES.visionRange }))).toBe(true);
    expect(seen.has(hexKey({ col: 5, row: 6 + ENEMY_RULES.visionRange }))).toBe(false);
    expect(seen.has(hexKey({ col: 5, row: 4 }))).toBe(false);
    expect(seen.has(hexKey(enemy.hex))).toBe(false);
  });

  it('o cone de 120° pega os 3 vizinhos da frente', () => {
    const seen = keys(visionHexes(enemy, 12, 12, none, 1));
    expect(seen.size).toBe(3);
  });

  it('paredes bloqueiam a visão (e não são vistas)', () => {
    const walls = keys([{ col: 5, row: 6 }]);
    const seen = keys(visionHexes(enemy, 12, 12, walls));
    expect(seen.has(hexKey({ col: 5, row: 6 }))).toBe(false);
    expect(seen.has(hexKey({ col: 5, row: 7 }))).toBe(false);
    expect(lineOfSight({ col: 5, row: 5 }, { col: 5, row: 8 }, walls)).toBe(false);
    expect(lineOfSight({ col: 5, row: 5 }, { col: 5, row: 8 }, none)).toBe(true);
  });

  it('avista o agente no cone, mas só se estiver em patrulha', () => {
    const e = { ...spawnEnemy({ id: 'x', name: 'X', patrol: [{ col: 5, row: 5 }, { col: 5, row: 8 }] }) };
    const agents = new Map([['ana', { col: 5, row: 7 }]]);
    expect(spotted(e, agents, 12, 12, none)).toBe('ana');
    expect(spotted({ ...e, status: 'alert' }, agents, 12, 12, none)).toBeNull();
    expect(spotted(e, new Map([['ana', { col: 5, row: 3 }]]), 12, 12, none)).toBeNull();
  });
});

describe('patrulha', () => {
  const e = spawnEnemy({ id: 'x', name: 'X', patrol: [{ col: 2, row: 2 }, { col: 2, row: 5 }] });

  it('anda até N passos rumo ao próximo ponto e volta ao chegar no fim da rota', () => {
    const a = planPatrol(e, 2, 12, 12, none);
    expect(a.path).toEqual([{ col: 2, row: 3 }, { col: 2, row: 4 }]);
    const b = planPatrol({ ...e, hex: a.path[1], waypoint: a.waypoint, dir: a.dir }, 2, 12, 12, none);
    // chega ao fim (2,5) e já começa a voltar
    expect(b.path).toEqual([{ col: 2, row: 5 }, { col: 2, row: 4 }]);
    expect(b.dir).toBe(-1);
  });

  it('desvia de bloqueios e espera se a rota estiver fechada', () => {
    const around = planPatrol(e, 4, 12, 12, keys([{ col: 2, row: 3 }]));
    expect(around.path.some((h) => hexKey(h) === '2,3')).toBe(false);
    for (let i = 1; i < around.path.length; i++) expect(hexDistance(around.path[i - 1], around.path[i])).toBe(1);
    const walled = planPatrol({ ...e, hex: { col: 0, row: 0 }, waypoint: 1 }, 3, 12, 12, keys([{ col: 1, row: 0 }, { col: 0, row: 1 }]));
    expect(walled.path).toEqual([]);
  });
});

describe('fuga', () => {
  it('corre pelo caminho mais curto até a borda', () => {
    const r = planFlee({ col: 2, row: 5 }, 4, 12, 12, none);
    expect(r.full.length).toBe(2);
    expect(r.escapes).toBe(true);
    expect(isBorder(r.full.at(-1)!, 12, 12)).toBe(true);
  });

  it('com poucos passos não chega e continua no mapa', () => {
    const r = planFlee({ col: 5, row: 5 }, 2, 12, 12, none);
    expect(r.path.length).toBe(2);
    expect(r.escapes).toBe(false);
  });

  it('fica encurralado se todos os vizinhos estiverem bloqueados', () => {
    const blocked = keys(hexNeighbors({ col: 5, row: 5 }));
    expect(planFlee({ col: 5, row: 5 }, 4, 12, 12, blocked).cornered).toBe(true);
  });

  it('já na borda, foge na hora', () => {
    expect(planFlee({ col: 0, row: 5 }, 4, 12, 12, none).escapes).toBe(true);
  });

  it('entre bordas igualmente próximas, prefere a mais longe dos agentes', () => {
    // de (1,1) há três bordas a 1 passo: (1,0), (0,1) e (0,2); com um agente ao sul, foge para o norte
    const r = planFlee({ col: 1, row: 1 }, 4, 12, 12, none, [{ col: 0, row: 4 }]);
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
        expect(isBorder(h, map.cols, map.rows)).toBe(false);
      }
    }
  });

  it('no começo nenhum inimigo vê os agentes', () => {
    const agents = new Map(CHARACTERS.map((c, i) => [c.id, map.starts[i]]));
    for (const e of map.enemies.map(spawnEnemy)) expect(spotted(e, agents, map.cols, map.rows, walls)).toBeNull();
  });
});

describe('abordagem', () => {
  const at = (id: string, col: number, row: number, status: 'patrol' | 'alert' | 'surrendered' | 'fled' = 'patrol') => ({
    ...spawnEnemy({ id, name: id, patrol: [{ col, row }] }),
    status,
  });
  const rules = { radius: 4, surrenderRange: 2 };

  it('perto se rende, no raio tenta correr, fora do raio nem percebe', () => {
    const from = { col: 5, row: 5 };
    const r = resolveApproach(from, [at('perto', 5, 7), at('medio', 5, 9), at('longe', 5, 10)], rules);
    expect(r.surrender.map((e) => e.id)).toEqual(['perto']);
    expect(r.flee.map((e) => e.id)).toEqual(['medio']);
  });

  it('inimigo já em alerta também pode se render; rendidos e fugidos não contam', () => {
    const from = { col: 5, row: 5 };
    const r = resolveApproach(from, [at('a', 5, 6, 'alert'), at('r', 5, 4, 'surrendered'), at('f', 6, 5, 'fled')], rules);
    expect(r.surrender.map((e) => e.id)).toEqual(['a']);
    expect(r.flee).toEqual([]);
  });

  it('as regras padrão têm a rendição dentro do raio', () => {
    expect(APPROACH_RULES.surrenderRange).toBeLessThan(APPROACH_RULES.radius);
    expect(canAct(at('x', 1, 1, 'surrendered'))).toBe(false);
  });
});
