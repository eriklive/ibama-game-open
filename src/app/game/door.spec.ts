import { describe, expect, it } from 'vitest';
import {
  DOOR_RULES,
  Door,
  DoorState,
  applyDoor,
  commonDoors,
  doorChance,
  doorNeed,
  resolveDoor,
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

  it('chance no d20', () => {
    expect(doorChance(12)).toBeCloseTo(0.45);
    expect(doorChance(3)).toBeCloseTo(0.9);
    expect(doorChance(0)).toBe(1);
    expect(doorChance(Infinity)).toBe(0);
  });
});
