import { describe, expect, it } from 'vitest';
import { MAPS } from './maps';
import { aeroportoZone, laneObstacles, raceA, raceB, runnerStart } from './runner-maps';
import { pathTurns } from './runner-path';

const aero = MAPS.find((m) => m.id === 'aeroporto')!;
const sides = (race: ReturnType<typeof raceA>) => pathTurns(race.path).map((t) => t.side);

describe('Modo Corrida: zonas do Aeroporto', () => {
  it('cada lugar do mapa tático cai na zona certa', () => {
    expect(aeroportoZone({ col: 21, row: 30 }, aero)).toBe('pista');
    // a beira da pista (2 hexágonos da terra) ainda é pista
    expect(aeroportoZone({ col: 17, row: 23 }, aero)).toBe('pista');
    expect(aeroportoZone({ col: 27, row: 19 }, aero)).toBe('patio');
    expect(aeroportoZone({ col: 20, row: 10 }, aero)).toBe('hangar');
    expect(aeroportoZone({ col: 14, row: 2 }, aero)).toBe('fundos');
    expect(aeroportoZone({ col: 32, row: 29 }, aero)).toBe('casa');
    expect(aeroportoZone({ col: 4, row: 34 }, aero)).toBe('mata');
  });
});

describe('Modo Corrida: as curvas', () => {
  it('mapa A, garimpeiro à direita: no hangar, esquerda (por trás do avião) e direita (porta); na mata, 4 curvas', () => {
    expect(sides(raceA('direita'))).toEqual(['esquerda', 'direita', 'direita', 'esquerda', 'esquerda', 'direita']);
  });

  it('mapa A, garimpeiro à esquerda: tudo espelhado', () => {
    expect(sides(raceA('esquerda'))).toEqual(['direita', 'esquerda', 'esquerda', 'direita', 'direita', 'esquerda']);
  });

  it('o avião fica do lado de onde a pista vira por trás dele', () => {
    const right = raceA('direita');
    const left = raceA('esquerda');
    // à direita: a pista vira para o oeste, então o avião fica a oeste dela (x menor)
    expect(right.plane!.x).toBeLessThan(right.path[0].x);
    expect(left.plane!.x).toBeGreaterThan(left.path[0].x);
    // a asa cobre a faixa do lado dele
    const wing = (r: typeof right) => laneObstacles(r).find((o) => o.kind === 'asa')!;
    expect(wing(right)).toMatchObject({ lane: 0, move: 'deslizar' });
    expect(wing(left)).toMatchObject({ lane: 2, move: 'deslizar' });
  });

  it('mapa B: a lateral reta e as 4 curvas da mata', () => {
    expect(sides(raceB('direita'))).toHaveLength(4);
  });
});

describe('Modo Corrida: qual mapa, qual lado e onde começa', () => {
  it('a fuga que passa por dentro do hangar vai para o mapa A; a que contorna, para o B', () => {
    const through = runnerStart({ col: 21, row: 24 }, [{ col: 21, row: 20 }, { col: 21, row: 12 }, { col: 14, row: 4 }], aero);
    expect(through).toMatchObject({ id: 'A', zone: { id: 'pista' } });
    const around = runnerStart({ col: 21, row: 24 }, [{ col: 30, row: 22 }, { col: 36, row: 18 }, { col: 44, row: 10 }], aero);
    expect(around).toMatchObject({ id: 'B', zone: { id: 'pista' } });
  });

  it('o lado é onde ele está no tático: à direita do meio do hangar, variante direita', () => {
    expect(runnerStart({ col: 27, row: 19 }, [{ col: 27, row: 12 }], aero)).toMatchObject({ variant: 'direita', zone: { id: 'patio' } });
    expect(runnerStart({ col: 15, row: 19 }, [{ col: 15, row: 12 }], aero)).toMatchObject({ variant: 'esquerda' });
  });

  it('fora da pista é sempre o trecho de mata do mapa escolhido', () => {
    expect(runnerStart({ col: 6, row: 30 }, [{ col: 2, row: 30 }], aero).zone.id).toBe('mata');
    expect(runnerStart({ col: 6, row: 12 }, [{ col: 12, row: 10 }], aero)).toMatchObject({ id: 'A', zone: { id: 'mata' } });
  });

  it('as zonas de largada ficam em ordem no caminho', () => {
    for (const race of [raceA('direita'), raceA('esquerda'), raceB('direita')]) {
      const at = race.zones.map((z) => z.at);
      expect([...at].sort((a, b) => a - b)).toEqual(at);
    }
  });
});
