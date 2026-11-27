import { describe, expect, it } from 'vitest';
import { ENEMY_RULES, EnemySpawn, spawnEnemy, spotted } from '../enemies';
import { HexCoord, hexDistance, hexKey, hexNeighbors, rectArea } from '../hex';
import {
  World,
  GameAction,
  GameState,
  applyAction,
  findEnemy,
  firstSighting,
  initialGameState,
  planFleeAct,
  planPatrolAct,
  validateAction,
} from '.';

const AREA = rectArea(12, 12);
const world = (walls: string[] = []): World => ({
  area: AREA,
  blocked: new Set(walls),
  lowCover: new Set(),
  roomWalls: new Set(),
  structures: [],
});

const game = (agents: Record<string, HexCoord>, ...spawns: EnemySpawn[]): GameState =>
  initialGameState({
    order: Object.keys(agents),
    positions: agents,
    enemies: spawns.map(spawnEnemy),
  });

const run = (state: GameState, ...actions: GameAction[]): GameState =>
  actions.reduce((s, a) => {
    expect(validateAction(s, a)).toBeNull();
    return applyAction(s, a);
  }, state);

/** Sempre o mesmo "sorteio": o teste não depende de sorte. */
const fixed = (v: number) => () => v;

const guard: EnemySpawn = {
  id: 'g',
  name: 'Garimpeiro',
  patrol: [
    { col: 1, row: 1 },
    { col: 1, row: 8 },
  ],
};

describe('motor: patrulha', () => {
  it('anda os passos da patrulha, virando para onde anda', () => {
    const s0 = game({ ana: { col: 10, row: 10 } }, guard);
    const act = planPatrolAct(s0, 'g', world(), fixed(0));
    expect(act.path).toHaveLength(ENEMY_RULES.patrolSteps);
    expect(act.spotted).toBeUndefined();
    const s1 = run(s0, act);
    const g = findEnemy(s1, 'g')!;
    expect(g.hex).toEqual(act.path.at(-1));
    expect(g.status).toBe('patrol');
    // virado para o sul (o caminho desce as fileiras)
    expect(Math.sin(g.facing)).toBeGreaterThan(0.9);
  });

  it('para no passo em que avista alguém e entra em alerta virado para ele', () => {
    // a Ana está mais à frente na rota: entra no cone no meio da patrulha
    const s0 = game({ ana: { col: 1, row: 5 } }, guard);
    const act = planPatrolAct(s0, 'g', world(), fixed(0));
    expect(act.spotted).toEqual({ agent: 'ana', at: { col: 1, row: 5 } });
    // antes do último passo ele ainda não via ninguém
    let probe = findEnemy(s0, 'g')!;
    act.path.slice(0, -1).forEach((hex) => {
      probe = { ...probe, hex };
      expect(spotted(probe, new Map([['ana', { col: 1, row: 5 }]]), AREA, new Set())).toBeNull();
    });
    const g = findEnemy(run(s0, act), 'g')!;
    expect(g.status).toBe('alert');
    expect(hexDistance(g.hex, { col: 1, row: 5 })).toBeLessThanOrEqual(ENEMY_RULES.visionRange);
    expect(Math.sin(g.facing)).toBeGreaterThan(0.9);
  });

  it('parede no meio esconde o agente', () => {
    const wall = Array.from({ length: 11 }, (_, c) => hexKey({ col: c + 1, row: 4 })).filter(
      (k) => k !== '1,4',
    );
    const s0 = game(
      { ana: { col: 3, row: 5 } },
      {
        ...guard,
        patrol: [
          { col: 3, row: 1 },
          { col: 3, row: 3 },
        ],
      },
    );
    const act = planPatrolAct(s0, 'g', world(wall), fixed(0));
    expect(act.spotted).toBeUndefined();
  });

  it('caminho bloqueado: fica parado, mas a rota continua a mesma', () => {
    const s0 = game({ ana: { col: 1, row: 2 } }, { ...guard, facing: { col: 2, row: 1 } });
    // cercado: a Ana num vizinho, parede nos outros
    const blocked = world(
      hexNeighbors({ col: 1, row: 1 })
        .map(hexKey)
        .filter((k) => k !== '1,2'),
    );
    const act = planPatrolAct(s0, 'g', blocked, fixed(0));
    expect(act.path).toEqual([]);
    expect(findEnemy(run(s0, act), 'g')!.hex).toEqual({ col: 1, row: 1 });
  });

  it('quem vagueia sorteia o destino com o rng da ação: mesmo sorteio, mesmo plano', () => {
    const wanderer: EnemySpawn = { ...guard, wander: { cols: [0, 11], rows: [0, 11] } };
    const s0 = game({ ana: { col: 11, row: 11 } }, wanderer);
    const a = planPatrolAct(s0, 'g', world(), fixed(0.3));
    const b = planPatrolAct(s0, 'g', world(), fixed(0.3));
    expect(a).toEqual(b);
    expect(a.target).toBeDefined();
    expect(findEnemy(run(s0, a), 'g')!.target).toEqual(a.target);
  });
});

describe('motor: fuga', () => {
  const runner = (hex: HexCoord): EnemySpawn => ({ id: 'r', name: 'Piloto', patrol: [hex] });
  const alert = (s: GameState) =>
    run(s, { type: 'patchEnemy', enemy: 'r', patch: { status: 'alert' } });

  it('perto da borda: corre até ela e sai do mapa', () => {
    const s0 = alert(game({ ana: { col: 6, row: 6 } }, runner({ col: 2, row: 6 })));
    const act = planFleeAct(s0, 'r', world());
    expect(act.fled).toBe(true);
    expect(AREA.isEdge(act.path.at(-1)!)).toBe(true);
    expect(findEnemy(run(s0, act), 'r')!.status).toBe('fled');
  });

  it('longe da borda: anda o que pode e continua em alerta', () => {
    const big = rectArea(30, 30);
    const s0 = alert(game({ ana: { col: 20, row: 15 } }, runner({ col: 15, row: 15 })));
    const act = planFleeAct(s0, 'r', { ...world(), area: big });
    expect(act.path).toHaveLength(ENEMY_RULES.fleeSteps);
    expect(act.fled).toBe(false);
    expect(findEnemy(run(s0, act), 'r')!.status).toBe('alert');
  });

  it('cercado: encurralado, não anda', () => {
    const s0 = alert(game({ ana: { col: 9, row: 9 } }, runner({ col: 5, row: 5 })));
    const ring = hexNeighbors({ col: 5, row: 5 }).map(hexKey);
    const act = planFleeAct(s0, 'r', world(ring));
    expect(act).toEqual({ type: 'enemyFlee', enemy: 'r', path: [], cornered: true, fled: false });
  });

  it('só foge quem está em alerta', () => {
    const s0 = game({ ana: { col: 6, row: 6 } }, runner({ col: 2, row: 6 }));
    const act = planFleeAct(alert(s0), 'r', world());
    expect(validateAction(s0, act)).toMatch(/alerta/);
  });
});

describe('motor: avistar e fim da rodada', () => {
  it('avistar põe em alerta virado para onde o agente estava', () => {
    const s0 = game({ ana: { col: 1, row: 3 } }, guard);
    const s1 = run(s0, { type: 'spot', enemy: 'g', agent: 'ana', at: { col: 1, row: 3 } });
    expect(findEnemy(s1, 'g')!.status).toBe('alert');
    // já em alerta, não avista de novo
    expect(
      validateAction(s1, { type: 'spot', enemy: 'g', agent: 'ana', at: { col: 1, row: 3 } }),
    ).toMatch(/patrulha/);
  });

  it('firstSighting usa as posições ao vivo (no meio de um passo)', () => {
    const s0 = game({ ana: { col: 10, row: 10 } }, guard);
    expect(firstSighting(s0, new Map([['ana', { col: 10, row: 10 }]]), world())).toBeNull();
    const seen = firstSighting(s0, new Map([['ana', { col: 1, row: 3 }]]), world());
    expect(seen).toEqual({ enemy: 'g', sighting: { agent: 'ana', at: { col: 1, row: 3 } } });
  });

  it('o abalado passa, menos para quem acabou de ser agarrado', () => {
    const other: EnemySpawn = { ...guard, id: 'h' };
    const s0 = run(
      game({ ana: { col: 10, row: 10 } }, guard, other),
      { type: 'patchEnemy', enemy: 'g', patch: { shaken: true } },
      { type: 'patchEnemy', enemy: 'h', patch: { shaken: true } },
    );
    const s1 = run(s0, { type: 'clearShaken', except: ['h'] });
    expect(findEnemy(s1, 'g')!.shaken).toBe(false);
    expect(findEnemy(s1, 'h')!.shaken).toBe(true);
  });

  it('recusa inimigo desconhecido e caminho que pula hexágonos', () => {
    const s0 = game({ ana: { col: 10, row: 10 } }, guard);
    expect(validateAction(s0, { type: 'clearShaken', except: [] })).toBeNull();
    expect(
      validateAction(s0, { type: 'spot', enemy: 'zé', agent: 'ana', at: { col: 0, row: 0 } }),
    ).toMatch(/desconhecido/);
    expect(
      validateAction(s0, {
        type: 'enemyPatrol',
        enemy: 'g',
        path: [{ col: 1, row: 4 }],
        waypoint: 1,
        dir: 1,
      }),
    ).toMatch(/passo a passo/);
  });

  it('o estado com inimigos sobrevive a JSON', () => {
    const s0 = game({ ana: { col: 1, row: 5 } }, guard);
    const s1 = run(s0, planPatrolAct(s0, 'g', world(), fixed(0)));
    expect(JSON.parse(JSON.stringify(s1))).toEqual(s1);
  });
});
