import { describe, expect, it } from 'vitest';
import { CHASE_RULES, ChaseStop, VaultSpot } from './chase';
import { ChaseRace, RaceEvent } from './chase-race';
import { DOOR_RULES, Door } from './door';
import { HexCoord } from './hex';

const R = CHASE_RULES;
const hs = R.hexSeconds;
const h = (col: number, row: number): HexCoord => ({ col, row });
/** Pista reta de `len` hexágonos. */
const straight = (len: number) => Array.from({ length: len }, (_, i) => h(0, i));
const lockedDoor = (hex: HexCoord): Door => ({ hex, state: 'trancada', lock: DOOR_RULES.lock, broken: false });

/** Roda o relógio em quadros de 1/60 s até `seconds` (ou até acabar), juntando os eventos. */
function run(race: ChaseRace, seconds: number, agentRate = 1, on?: (e: RaceEvent) => void): RaceEvent[] {
  const ev: RaceEvent[] = [];
  const dt = 1 / 60;
  for (let t = 0; t < seconds - 1e-9 && !race.over; t += dt) {
    const got = race.step(dt, agentRate);
    got.forEach((e) => on?.(e));
    ev.push(...got);
  }
  return ev;
}
const types = (ev: RaceEvent[]) => ev.map((e) => e.type).filter((t) => t !== 'passo' && t !== 'trecho');

describe('ChaseRace: tempo e distância', () => {
  it('na velocidade padrão os dois correm igual: a distância não muda e ele foge no fim', () => {
    const race = new ChaseRace({ track: straight(20), n: 4, rollDoor: () => 20 });
    race.start();
    expect(race.distance()).toBe(3);
    run(race, 5 * hs);
    expect(race.distance()).toBeCloseTo(3);
    const ev = run(race, 100);
    expect(race.over).toBe('fugiu');
    expect(types(ev)).toContain('fugiu');
  });

  it('colado na largada: agarra', () => {
    const race = new ChaseRace({ track: straight(10), n: 1, rollDoor: () => 20 });
    expect(types(race.start())).toEqual(['agarrou']);
  });

  it('encurralado: ele fica parado e o agente vai até ele', () => {
    const race = new ChaseRace({ track: straight(6), n: 5, rollDoor: () => 20, cornered: true });
    race.start();
    run(race, 10);
    expect(race.over).toBe('agarrou');
  });

  it('a corrida só acelera o agente', () => {
    const race = new ChaseRace({ track: straight(40), n: 10, rollDoor: () => 20 });
    race.start();
    run(race, 1, 1.5);
    // em 1 s ele corre 1/hs hexágonos e o agente 1,5/hs
    expect(9 - race.distance()).toBeCloseTo(0.5 / hs, 1);
  });
});

describe('ChaseRace: porta', () => {
  // ele começa em 12; a porta está em 15 (índice 3 da rota dele), ele arromba de 14
  const track = straight(40);
  const stop: ChaseStop = { kind: 'porta', index: 3, hex: track[15], door: lockedDoor(track[15]) };

  it('passou: ele emenda na animação de arrombar (o agente encosta esse tempo) e sai correndo', () => {
    const race = new ChaseRace({ track, n: 12, doors: [stop], rollDoor: () => 15 });
    race.start();
    const before = race.distance();
    const ev = run(race, 2 * hs + R.doorBreakSeconds + 1e-6);
    expect(types(ev)).toEqual(['porta-tenta', 'porta-abre']);
    expect(before - race.distance()).toBeCloseTo(R.doorBreakSeconds / hs, 0);
    run(race, 1);
    expect(race.pose('garimpeiro')!.leg.kind).toBe('corre');
  });

  it('falhou: ele se rende na porta', () => {
    const race = new ChaseRace({ track, n: 12, doors: [stop], rollDoor: () => 11 });
    race.start();
    const ev = run(race, 10);
    expect(types(ev)).toEqual(['porta-tenta', 'rendeu']);
    expect(race.over).toBe('rendeu');
  });
});

describe('ChaseRace: caixote', () => {
  // pista que dá a volta num caixote entre os índices i e i + 4 (o atalho por cima tem 3 passos)
  const track = straight(60);
  const spot = (index: number): VaultSpot => ({
    index,
    over: h(1, index + 2),
    land: index + 4,
    path: [h(1, index + 1), h(1, index + 2), track[index + 4]],
    saves: 1,
  });
  const lead = R.vaultLeadSeconds / hs;

  it('o aviso sai antes de chegar no caixote, e ninguém para', () => {
    const v = spot(12);
    const race = new ChaseRace({ track, n: 30, vaults: [v], rollDoor: () => 20 });
    race.start();
    // o agente anda 1 hexágono a cada `hs` segundos: onde ele estava quando o aviso saiu
    let warnedAt = -1;
    let steps = 0;
    run(race, 12 * hs - 0.05, 1, (e) => {
      if (e.type === 'passo' && e.who === 'agente') steps++;
      if (e.type === 'caixote-perto') warnedAt = steps;
    });
    expect(warnedAt).toBeGreaterThanOrEqual(Math.floor(v.index - lead));
    expect(warnedAt).toBeLessThanOrEqual(Math.ceil(v.index - lead));
    expect(warnedAt).toBeLessThan(v.index);
    // a distância não mudou: ninguém parou
    expect(race.distance()).toBeCloseTo(29);
  });

  it('sem escolha, dá a volta em x; pulou e passou: x/2; pulou e falhou: x', () => {
    const v = spot(12);
    const make = (pick?: { pass: boolean }) => {
      const race = new ChaseRace({ track, n: 40, vaults: [v], rollDoor: () => 20 });
      race.start();
      run(race, 12 * hs - 0.05);
      if (pick) race.decide(v, true, pick.pass);
      run(race, 0.1);
      return race.pose('agente')!.leg;
    };
    expect(make()).toMatchObject({ kind: 'volta', seconds: R.aroundSeconds });
    expect(make({ pass: true })).toMatchObject({ kind: 'pulo', seconds: R.aroundSeconds / 2 });
    expect(make({ pass: false })).toMatchObject({ kind: 'pulo', seconds: R.aroundSeconds, failed: true });
  });

  it('pular e passar ganha metade da volta em distância', () => {
    const v = spot(12);
    const go = (jump: boolean) => {
      const race = new ChaseRace({ track, n: 40, vaults: [v], rollDoor: () => 20 });
      race.start();
      run(race, 1);
      race.decide(v, jump, true);
      run(race, 4);
      return race.distance();
    };
    expect(go(false) - go(true)).toBeCloseTo(R.aroundSeconds / 2 / hs, 0);
  });

  it('no ar do pulo não agarra: só ao pousar, mesmo que a pista diga que já o alcançou', () => {
    const v = spot(12);
    // encurralado no pouso (índice 16): no meio do pulo a pista já o alcançaria (12 + 4t ≥ 15)
    const race = new ChaseRace({ track: track.slice(0, 17), n: 16, vaults: [v], rollDoor: () => 20, cornered: true });
    race.start();
    run(race, 12 * hs - 0.05);
    race.decide(v, true, true);
    let airDistance = Infinity;
    const ev = run(race, 5, 1, () => {
      const p = race.pose('agente');
      if (p?.leg.kind === 'pulo' && p.t < 1) airDistance = Math.min(airDistance, race.distance());
    });
    expect(airDistance).toBeGreaterThan(0);
    expect(race.over).toBe('agarrou');
    expect(types(ev)).toContain('agarrou');
    // agarrou depois de pousar, não no ar
    expect(race.pose('agente')?.t ?? 1).toBe(1);
  });

  it('ele também dá a volta no caixote da rota dele, em x', () => {
    const race = new ChaseRace({ track, n: 6, vaults: [spot(10)], rollDoor: () => 20 });
    race.start();
    run(race, 4 * hs + 0.01);
    expect(race.pose('garimpeiro')!.leg).toMatchObject({ kind: 'volta', seconds: R.aroundSeconds });
  });
});
