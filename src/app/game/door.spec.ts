import { describe, expect, it } from 'vitest';
import { EnemyState } from './enemies';
import { hexKey } from './hex';
import {
  DOOR_RULES,
  Door,
  DoorState,
  applyDoor,
  commonDoors,
  doorChance,
  doorNeed,
  resolveBreakIn,
  resolveDoor,
  roomBehind,
  seeThroughDoors,
  spawnDoors,
} from './door';

const door = (state: DoorState, extra: Partial<Door> = {}): Door => ({
  hex: { col: 5, row: 5 },
  state,
  lock: DOOR_RULES.lock,
  broken: false,
  ...extra,
});

describe('doorNeed', () => {
  it('arrombar: encostada precisa de 3, trancada de 12, bloqueada nunca passa', () => {
    expect(doorNeed('arrombar', door('encostada'))).toBe(3);
    expect(doorNeed('arrombar', door('trancada'))).toBe(12);
    expect(doorNeed('arrombar', door('bloqueada'))).toBe(Infinity);
    expect(doorNeed('arrombar', door('aberta'))).toBe(0);
  });

  it('pick lock: sem tranca precisa de 0; trancada usa a fechadura da porta', () => {
    expect(doorNeed('pick', door('encostada'))).toBe(0);
    expect(doorNeed('pick', door('trancada', { lock: 15 }))).toBe(15);
    expect(doorNeed('pick', door('bloqueada'))).toBe(Infinity);
    expect(doorNeed('pick', door('aberta'))).toBeNull();
  });

  it('abrir: só encostada abre; trancada e bloqueada não', () => {
    expect(doorNeed('abrir', door('encostada'))).toBe(0);
    expect(doorNeed('abrir', door('trancada'))).toBeNull();
    expect(doorNeed('abrir', door('bloqueada'))).toBeNull();
  });
});

describe('Gazua (perícia do Agente)', () => {
  it('baixa o valor da fechadura no destrancar, nunca abaixo de 1', () => {
    expect(doorNeed('pick', door('trancada'), 6)).toBe(6);
    expect(doorNeed('pick', door('trancada', { lock: 5 }), 6)).toBe(1);
    expect(doorChance(doorNeed('pick', door('trancada'), 6))).toBe(0.75);
  });

  it('não muda o resto: sem tranca, bloqueada e arrombar', () => {
    expect(doorNeed('pick', door('encostada'), 6)).toBe(0);
    expect(doorNeed('pick', door('bloqueada'), 6)).toBe(Infinity);
    expect(doorNeed('arrombar', door('trancada'), 6)).toBe(12);
  });

  it('o mesmo 9 no d20 destranca com a Gazua e falha sem ela', () => {
    expect(resolveDoor('pick', door('trancada'), 9, 6)).toMatchObject({ pass: true, opened: true });
    expect(resolveDoor('pick', door('trancada'), 9)).toMatchObject({ pass: false, opened: false });
  });
});

describe('resolveDoor', () => {
  it('trancada: arromba com 12 ou mais', () => {
    expect(resolveDoor('arrombar', door('trancada'), 11).pass).toBe(false);
    const ok = resolveDoor('arrombar', door('trancada'), 12);
    expect(ok).toMatchObject({
      pass: true,
      opened: true,
      broken: true,
      rolled: true,
      reaction: false,
    });
  });

  it('arrombar porta sem tranca faz quem vê reagir', () => {
    expect(resolveDoor('arrombar', door('encostada'), 3).reaction).toBe(true);
    expect(resolveDoor('arrombar', door('encostada'), 2).reaction).toBe(false);
    expect(resolveDoor('arrombar', door('aberta'), 1)).toMatchObject({
      rolled: false,
      pass: true,
      reaction: true,
    });
  });

  it('bloqueada nunca passa, nem com 20', () => {
    for (const a of ['arrombar', 'pick', 'abrir'] as const)
      expect(resolveDoor(a, door('bloqueada'), 20).pass).toBe(false);
  });

  it('pick lock gasta 1 de movimento e abre sozinho sem tranca', () => {
    expect(resolveDoor('pick', door('encostada'), 1)).toMatchObject({
      cost: 1,
      rolled: false,
      opened: true,
    });
    expect(resolveDoor('pick', door('trancada'), 11)).toMatchObject({
      cost: 1,
      rolled: true,
      pass: false,
      opened: false,
    });
    expect(resolveDoor('pick', door('trancada', { lock: 8 }), 8).opened).toBe(true);
  });

  it('applyDoor: arrombada fica aberta para sempre', () => {
    const d = applyDoor(door('trancada'), resolveDoor('arrombar', door('trancada'), 20));
    expect(d.broken).toBe(true);
    expect(doorNeed('abrir', d)).toBe(0);
  });

  it('cada chute que não arromba tira 2 de resistência, nunca abaixo de 1', () => {
    let d = door('trancada');
    const miss = resolveDoor('arrombar', d, 5);
    expect(miss).toMatchObject({ pass: false, damage: 2 });
    d = applyDoor(d, miss);
    expect(doorNeed('arrombar', d)).toBe(10);
    // o 10 que antes não passava agora arromba
    expect(resolveDoor('arrombar', d, 10).pass).toBe(true);
    for (let i = 0; i < 5; i++) d = applyDoor(d, resolveDoor('arrombar', d, 1));
    expect(doorNeed('arrombar', d)).toBe(1);
    // a encostada também cede: 3 → 1
    expect(doorNeed('arrombar', applyDoor(door('encostada'), resolveDoor('arrombar', door('encostada'), 1)))).toBe(1);
  });

  it('o desgaste não mexe na fechadura nem na bloqueada', () => {
    const d = door('trancada', { damage: 4 });
    expect(doorNeed('pick', d)).toBe(DOOR_RULES.lock);
    expect(resolveDoor('arrombar', door('bloqueada'), 20).damage).toBe(0);
    expect(doorNeed('arrombar', door('bloqueada', { damage: 30 }))).toBe(Infinity);
    expect(resolveDoor('pick', d, 1).damage).toBe(0);
  });
});

describe('portas do mapa', () => {
  it('portão (D seguidos) fica de fora', () => {
    const gate = [16, 17, 18].map((col) => ({ col, row: 18 }));
    const single = { col: 14, row: 4 };
    expect(commonDoors([...gate, single])).toEqual([single]);
  });

  it('spawnDoors usa o estado do mapa e começa encostada sem ele', () => {
    const doors = spawnDoors(
      [
        { col: 1, row: 1 },
        { col: 9, row: 9 },
      ],
      { '9,9': { state: 'trancada', lock: 15 } },
    );
    expect(doors.get('1,1')?.state).toBe('encostada');
    expect(doors.get('9,9')).toMatchObject({ state: 'trancada', lock: 15 });
  });

  it('só porta aberta (ou portão) revela o interior', () => {
    const doors = spawnDoors(
      [
        { col: 1, row: 1 },
        { col: 9, row: 9 },
      ],
      { '9,9': { state: 'aberta' } },
    );
    const gate = { col: 20, row: 20 };
    const all = [{ col: 1, row: 1 }, { col: 9, row: 9 }, gate];
    expect(seeThroughDoors(all, doors)).toEqual([{ col: 9, row: 9 }, gate]);
    doors.set('1,1', { ...doors.get('1,1')!, broken: true });
    expect(seeThroughDoors(all, doors)).toHaveLength(3);
  });

  it('chance no d20', () => {
    expect(doorChance(12)).toBeCloseTo(0.45);
    expect(doorChance(3)).toBeCloseTo(0.9);
    expect(doorChance(0)).toBe(1);
    expect(doorChance(Infinity)).toBe(0);
  });
});

describe('arrombamento', () => {
  // casinha: colunas 0–6, fileiras 0–4; divisória na coluna 3 com porta em (3,2)
  const rect = { cols: [0, 6] as [number, number], rows: [0, 4] as [number, number] };
  const walls = new Set<string>();
  for (let c = 0; c <= 6; c++) for (const r of [0, 4]) walls.add(hexKey({ col: c, row: r }));
  for (let r = 0; r <= 4; r++) for (const c of [0, 6]) walls.add(hexKey({ col: c, row: r }));
  for (const r of [1, 3]) walls.add(hexKey({ col: 3, row: r }));
  const door = { col: 3, row: 2 };
  const enemy = (
    id: string,
    col: number,
    row: number,
    status: EnemyState['status'] = 'patrol',
  ): EnemyState => ({
    id,
    name: id,
    hex: { col, row },
    facing: 0,
    status,
    patrol: [{ col, row }],
    waypoint: 0,
    dir: 1,
  });

  it('roomBehind pega só o cômodo do outro lado da porta', () => {
    const room = roomBehind(door, { col: 2, row: 2 }, rect, walls);
    expect(room.has('4,2')).toBe(true);
    expect(room.has('5,1')).toBe(true);
    expect(room.has('1,2')).toBe(false);
    expect(room.has('3,2')).toBe(false);
  });

  it('perto da porta se rende, a não ser que tire 19/18/17; longe só corre com atitude (mais que 12)', () => {
    const room = new Set(['4,2', '5,2', '9,2']);
    const es = [
      enemy('colado', 4, 2),
      enemy('dois', 5, 2),
      enemy('longe', 9, 2),
      enemy('fora', 1, 2),
      enemy('rendido', 4, 2, 'surrendered'),
    ];
    const rolls = [18, 18, 12];
    const out = resolveBreakIn(door, room, es, () => rolls.shift()!);
    expect(out.map((o) => [o.enemy.id, o.test, o.need, o.outcome])).toEqual([
      ['colado', 'resist', 19, 'surrender'],
      ['dois', 'resist', 18, 'flee'],
      ['longe', 'attitude', 12, 'stay'],
    ]);
  });
});
