import { describe, expect, it } from 'vitest';
import { MAPS } from './maps';
import { aeroportoZone, laneObstacles, raceA, raceB, runnerStart } from './runner-maps';

const aero = MAPS.find((m) => m.id === 'aeroporto')!;

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

describe('Modo Corrida: qual mapa e onde começa', () => {
  it('a fuga que passa por dentro do hangar vai para o mapa A; a que contorna, para o B', () => {
    const through = runnerStart({ col: 21, row: 24 }, [{ col: 21, row: 20 }, { col: 21, row: 12 }, { col: 14, row: 4 }], aero);
    expect(through.id).toBe('A');
    expect(through.zone.id).toBe('pista');
    const around = runnerStart({ col: 21, row: 24 }, [{ col: 30, row: 22 }, { col: 36, row: 18 }, { col: 44, row: 10 }], aero);
    expect(around.id).toBe('B');
    expect(around.zone.id).toBe('pista');
  });

  it('fora da pista é sempre o trecho de mata do mapa escolhido', () => {
    expect(runnerStart({ col: 6, row: 30 }, [{ col: 2, row: 30 }], aero).zone.id).toBe('mata');
    expect(runnerStart({ col: 6, row: 12 }, [{ col: 12, row: 10 }], aero)).toMatchObject({ id: 'A', zone: { id: 'mata' } });
  });

  it('de dentro do hangar: no A, a zona do hangar; no B, a porta lateral', () => {
    expect(runnerStart({ col: 20, row: 10 }, [{ col: 14, row: 4 }], aero).zone.id).toBe('hangar');
    // (de dentro sempre "passa" pelo hangar: o B só vem de rotas de fora)
    expect(raceB().zones.map((z) => z.id)).toContain('lateral');
  });
});

describe('Modo Corrida: obstáculos por faixa', () => {
  it('o avião: corpo fecha a esquerda, a asa pede deslize no meio, a direita fica livre', () => {
    const obs = laneObstacles(raceA());
    const plane = obs.filter((o) => o.kind === 'aviao' || o.kind === 'asa');
    expect(plane).toEqual([
      { row: 64, lane: 0, move: 'desviar', kind: 'aviao' },
      { row: 64, lane: 1, move: 'deslizar', kind: 'asa' },
    ]);
  });

  it('a porta dos fundos: só o meio passa, deslizando', () => {
    const back = laneObstacles(raceA()).filter((o) => o.row === 46);
    expect(back.map((o) => [o.lane, o.move])).toEqual([[0, 'desviar'], [1, 'deslizar'], [2, 'desviar']]);
  });

  it('a tora de 4 colunas cobre duas faixas', () => {
    const log = laneObstacles(raceA()).filter((o) => o.row === 120);
    expect(log.map((o) => o.lane)).toEqual([0, 1]);
  });
});
