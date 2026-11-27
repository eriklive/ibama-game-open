import { describe, expect, it } from 'vitest';
import { BREAK_IN_RULES, Door, DoorSpec, spawnDoors } from '../door';
import { EnemySpawn, spawnEnemy } from '../enemies';
import { HexCoord, hexKey, rectArea } from '../hex';
import {
  GameAction,
  GameState,
  World,
  applyAction,
  breakInBoostOf,
  closedDoors,
  doorNeedFor,
  doorOutcome,
  findEnemy,
  initialGameState,
  planBreakIn,
  planDoor,
  sightBlockers,
  validateAction,
} from '.';

/**
 * Um cômodo de teste: parede na fileira 5 (de ponta a ponta) com a porta em (4,5). A equipe
 * fica embaixo, colada na porta; o cômodo é a parte de cima.
 */
const DOOR = { col: 4, row: 5 };
const KEY = hexKey(DOOR);
const WALL = Array.from({ length: 10 }, (_, c) => hexKey({ col: c, row: 5 })).filter(
  (k) => k !== KEY,
);
const WORLD: World = {
  area: rectArea(10, 10),
  blocked: new Set(WALL),
  lowCover: new Set(),
  roomWalls: new Set(WALL),
  structures: [{ cols: [0, 9], rows: [0, 9] }],
};

const guard = (id: string, hex: HexCoord): EnemySpawn => ({ id, name: id, patrol: [hex] });

/** Ana (Capitã) colada na porta; Bruno (Agente) também; o Bruno vem antes na vez. */
const room = (spec: DoorSpec, movesLeft = 4): GameState => ({
  ...initialGameState({
    order: ['bruno', 'ana'],
    positions: { bruno: { col: 4, row: 6 }, ana: { col: 3, row: 6 } },
    captain: 'ana',
    doors: Object.fromEntries(spawnDoors([DOOR], { [KEY]: spec })) as Record<string, Door>,
    enemies: [
      guard('perto', { col: 4, row: 3 }),
      guard('fundo', { col: 4, row: 0 }),
      guard('fora', { col: 8, row: 8 }),
    ].map(spawnEnemy),
  }),
  movesLeft,
});

/** O d20 sai sempre `face` (para o teste não depender de sorte). */
const d20 = (face: number) => () => (face - 1) / 20;

const run = (state: GameState, ...actions: GameAction[]): GameState =>
  actions.reduce((s, a) => {
    expect(validateAction(s, a)).toBeNull();
    return applyAction(s, a);
  }, state);

describe('motor: portas', () => {
  it('abrir uma porta encostada: abre sem rolar e sem gastar movimento', () => {
    const s0 = room({ state: 'encostada' });
    const act = planDoor(s0, KEY, 'abrir', d20(1));
    expect(doorOutcome(s0, act)).toMatchObject({ opened: true, rolled: false, cost: 0 });
    const s1 = run(s0, act);
    expect(s1.doors[KEY].state).toBe('aberta');
    expect(s1.movesLeft).toBe(4);
    expect(closedDoors(s1).size).toBe(0);
  });

  it('abrir uma trancada: não abre (sacode) e nada muda', () => {
    const s0 = room({ state: 'trancada' });
    const s1 = run(s0, planDoor(s0, KEY, 'abrir', d20(20)));
    expect(s1.doors[KEY]).toEqual(s0.doors[KEY]);
  });

  it('destrancar: o Agente tem a Gazua (fechadura 12 vira 6) e gasta 1 de movimento, dê certo ou não', () => {
    const s0 = room({ state: 'trancada', lock: 12 });
    expect(doorNeedFor(s0, KEY, 'pick')).toBe(6);
    const fail = run(s0, planDoor(s0, KEY, 'pick', d20(5)));
    expect(fail.doors[KEY].state).toBe('trancada');
    expect(fail.movesLeft).toBe(3);
    const pass = run(s0, planDoor(s0, KEY, 'pick', d20(6)));
    expect(pass.doors[KEY].state).toBe('aberta');
    expect(pass.movesLeft).toBe(3);
  });

  it('destrancar: o Capitão não tem a Gazua', () => {
    const base = room({ state: 'trancada', lock: 12 });
    // a Ana na vez, colada na porta (o Bruno sai da frente)
    const s0 = {
      ...base,
      activeIndex: 1,
      positions: { ana: { col: 4, row: 6 }, bruno: { col: 3, row: 7 } },
    };
    expect(doorNeedFor(s0, KEY, 'pick')).toBe(12);
    expect(run(s0, planDoor(s0, KEY, 'pick', d20(6))).doors[KEY].state).toBe('trancada');
  });

  it('destrancar sem movimento não vale', () => {
    const s0 = room({ state: 'trancada' }, 0);
    expect(validateAction(s0, planDoor(s0, KEY, 'pick', d20(20)))).toMatch(/movimento/);
  });

  it('arrombar: o chute que falha deixa a porta cedida, e o próximo precisa de menos', () => {
    const s0 = room({ state: 'trancada' });
    expect(doorNeedFor(s0, KEY, 'arrombar')).toBe(12);
    const s1 = run(s0, planDoor(s0, KEY, 'arrombar', d20(11)));
    expect(s1.doors[KEY].damage).toBe(2);
    expect(doorNeedFor(s1, KEY, 'arrombar')).toBe(10);
    const s2 = run(s1, planDoor(s1, KEY, 'arrombar', d20(10)));
    expect(s2.doors[KEY].broken).toBe(true);
    expect(sightBlockers(s2, WORLD).has(KEY)).toBe(false);
  });

  it('recusa quem está longe, quem não está na vez, porta aberta e d20 impossível', () => {
    const s0 = room({ state: 'encostada' });
    const act = planDoor(s0, KEY, 'abrir', d20(1));
    expect(
      validateAction({ ...s0, positions: { ...s0.positions, bruno: { col: 4, row: 9 } } }, act),
    ).toMatch(/longe/);
    expect(validateAction({ ...s0, activeIndex: 1 }, act)).toMatch(/vez/);
    expect(validateAction(run(s0, act), act)).toMatch(/aberta/);
    expect(validateAction(s0, { ...act, roll: 21 })).toMatch(/d20/);
    expect(validateAction(s0, { ...act, door: '0,0' })).toMatch(/desconhecida/);
  });
});

describe('motor: arrombamento', () => {
  const broken = (): GameState => {
    const s0 = room({ state: 'trancada' });
    return run(s0, planDoor(s0, KEY, 'arrombar', d20(20)));
  };

  it('só quem está no cômodo do outro lado reage: perto resiste, longe toma atitude', () => {
    const { rolls } = planBreakIn(broken(), KEY, 'bruno', WORLD, d20(1));
    expect(rolls.map((r) => [r.enemy.id, r.test, r.outcome])).toEqual([
      ['perto', 'resist', 'surrender'],
      ['fundo', 'attitude', 'stay'],
    ]);
  });

  it('aplica as reações, vira todos para a porta e dá intimidação à equipe por algumas rodadas', () => {
    const s0 = broken();
    expect(breakInBoostOf(s0)).toBe(0);
    const { act } = planBreakIn(s0, KEY, 'bruno', WORLD, d20(20));
    const s1 = run(s0, act);
    // tirando 20: o de perto resiste (vai correr) e o do fundo tem atitude (também corre)
    expect(findEnemy(s1, 'perto')!.status).toBe('alert');
    expect(findEnemy(s1, 'fundo')!.status).toBe('alert');
    expect(findEnemy(s1, 'fora')).toEqual(findEnemy(s0, 'fora'));
    expect(s1.breakInUntil).toBe(1 + BREAK_IN_RULES.rounds);
    expect(breakInBoostOf(s1)).toBe(BREAK_IN_RULES.intimidation);
    // o bônus acaba depois das rodadas
    const later = { ...s1, turn: 1 + BREAK_IN_RULES.rounds * s1.order.length };
    expect(breakInBoostOf(later)).toBe(0);
  });

  it('sem arrombar, não há reação', () => {
    const s0 = room({ state: 'trancada' });
    const { act } = planBreakIn(s0, KEY, 'bruno', WORLD, d20(1));
    expect(validateAction(s0, act)).toMatch(/arrombada/);
  });

  it('o estado com portas sobrevive a JSON', () => {
    const s1 = broken();
    expect(JSON.parse(JSON.stringify(s1))).toEqual(s1);
  });
});
