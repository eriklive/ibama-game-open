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
function run(race: ChaseRace, seconds: number, agentRate = 1): RaceEvent[] {
  const ev: RaceEvent[] = [];
  const dt = 1 / 60;
  for (let t = 0; t < seconds - 1e-9 && !race.over && !race.pending; t += dt) ev.push(...race.step(dt, agentRate));
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

  it('encurralado: ele fica parado e o agente vai até ele', () => {
    const race = new ChaseRace({ track: straight(6), n: 5, rollDoor: () => 20, cornered: true });
    race.start();
    run(race, 10);
    expect(race.over).toBe('agarrou');
  });

  it('colado na largada: agarra', () => {
    const race = new ChaseRace({ track: straight(10), n: 1, rollDoor: () => 20 });
    expect(types(race.start())).toEqual(['agarrou']);
  });

  it('porta: ele para 1 s por tentativa; o agente não para e encosta um segundo inteiro', () => {
    // ele começa em 12; a porta está em 15 (índice 3 da rota dele), ele para em 14
    const track = straight(40);
    const stop: ChaseStop = { kind: 'porta', index: 3, hex: track[15], door: lockedDoor(track[15]) };
    const rolls = [5, 15];
    const race = new ChaseRace({ track, n: 12, doors: [stop], rollDoor: () => rolls.shift()! });
    race.start();
    const before = race.distance();
    // até a porta: 2 hexágonos; e mais 2 tentativas de 1 s (a primeira falha)
    const ev = run(race, 2 * hs + 2 * R.doorTrySeconds + 1e-6);
    expect(types(ev)).toEqual(['porta-tenta', 'porta-falha', 'porta-tenta', 'porta-abre']);
    // ele ficou 2 s parado e o agente correu esses 2 s
    expect(before - race.distance()).toBeCloseTo((2 * R.doorTrySeconds) / hs, 0);
  });

  it('porta: falhando sempre, o agente chega nele e agarra ali', () => {
    const track = straight(30);
    const stop: ChaseStop = { kind: 'porta', index: 2, hex: track[6], door: lockedDoor(track[6]) };
    const race = new ChaseRace({ track, n: 4, doors: [stop], rollDoor: () => 1 });
    race.start();
    const ev = run(race, 10);
    expect(race.over).toBe('agarrou');
    expect(types(ev).filter((t) => t === 'porta-tenta').length).toBeGreaterThan(0);
  });

  it('a corrida só acelera o agente', () => {
    const race = new ChaseRace({ track: straight(40), n: 10, rollDoor: () => 20 });
    race.start();
    run(race, 1, 1.5);
    // em 1 s ele corre 1/hs hexágonos e o agente 1,5/hs
    expect(9 - race.distance()).toBeCloseTo(0.5 / hs, 1);
  });
});

describe('ChaseRace: caixote', () => {
  // pista que dá a volta num caixote entre os índices 8 e 12 (o atalho por cima tem 3 passos)
  const track = straight(40);
  const spot = (index: number): VaultSpot => ({
    index,
    over: h(1, index + 2),
    land: index + 4,
    path: [h(1, index + 1), h(1, index + 2), track[index + 4]],
    saves: 1,
  });

  it('o agente chega no caixote: tudo congela até a escolha', () => {
    const race = new ChaseRace({ track, n: 6, vaults: [spot(3)], rollDoor: () => 20 });
    race.start();
    const ev = run(race, 5);
    expect(types(ev)).toEqual(['caixote']);
    expect(race.pending?.index).toBe(3);
    const d = race.distance();
    expect(race.step(1)).toEqual([]);
    expect(race.distance()).toBe(d);
  });

  it('dar a volta leva aroundSeconds; pular leva jumpSeconds', () => {
    const around = new ChaseRace({ track, n: 6, vaults: [spot(3)], rollDoor: () => 20 });
    const jump = new ChaseRace({ track, n: 6, vaults: [spot(3)], rollDoor: () => 20 });
    for (const r of [around, jump]) {
      r.start();
      run(r, 5);
    }
    // ele já passou do caixote (está à frente), então só o agente faz a escolha
    around.decide(false);
    jump.decide(true, true);
    expect(around.pose('agente')!.leg.kind).toBe('volta');
    expect(around.pose('agente')!.leg.seconds).toBe(R.aroundSeconds);
    expect(jump.pose('agente')!.leg.kind).toBe('pulo');
    expect(jump.pose('agente')!.leg.seconds).toBe(R.jumpSeconds);
    run(around, R.aroundSeconds);
    run(jump, R.aroundSeconds);
    // pular ganha a diferença de tempo, em hexágonos que ele corre
    expect(around.distance() - jump.distance()).toBeCloseTo((R.aroundSeconds - R.jumpSeconds) / hs, 0);
  });

  it('tropeçou no pulo: fica stumbleSeconds no chão do outro lado', () => {
    const race = new ChaseRace({ track, n: 6, vaults: [spot(3)], rollDoor: () => 20 });
    race.start();
    run(race, 5);
    race.decide(true, false);
    run(race, R.jumpSeconds + 0.01);
    expect(race.pose('agente')!.leg.kind).toBe('tropeco');
    expect(race.pose('agente')!.leg.seconds).toBe(R.stumbleSeconds);
  });

  it('ele também dá a volta no caixote da rota dele, em aroundSeconds', () => {
    const race = new ChaseRace({ track, n: 6, vaults: [spot(10)], rollDoor: () => 20 });
    race.start();
    const ev = run(race, 4 * hs + 0.01);
    expect(race.pose('garimpeiro')!.leg.kind).toBe('volta');
    expect(race.pose('garimpeiro')!.leg.seconds).toBe(R.aroundSeconds);
    expect(ev.some((e) => e.type === 'caixote')).toBe(false);
  });
});
