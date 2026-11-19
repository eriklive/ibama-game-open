import { describe, expect, it } from 'vitest';
import { findMap, structureRect } from '../maps';
import {
  BIOMES,
  INTERIORS,
  OPEN_AIR,
  allLayers,
  sameZone,
  zoneAt,
  zoneLevels,
  zoneMuffle,
} from './ambience';

const airport = findMap('aeroporto')!;
const hangar = structureRect(airport, 'hangar')!;
const house = structureRect(airport, 'house')!;
const inside = (r: { cols: [number, number]; rows: [number, number] }) => ({
  col: Math.round((r.cols[0] + r.cols[1]) / 2),
  row: Math.round((r.rows[0] + r.rows[1]) / 2),
});
const level = (levels: Map<string, number>, key: string) => levels.get(key) ?? -1;

describe('zona do ambiente', () => {
  it('fora das estruturas é a mata sem interior', () => {
    const z = zoneAt(airport, airport.starts[0]);
    expect(z).toEqual({ biome: 'mata', interior: undefined, states: [] });
    expect(zoneMuffle(z)).toBe(OPEN_AIR);
  });

  it('dentro do hangar e da casa, o interior abafa o lado de fora', () => {
    const h = zoneAt(airport, inside(hangar));
    const c = zoneAt(airport, inside(house));
    expect(h.interior).toBe('hangar');
    expect(c.interior).toBe('house');
    expect(zoneMuffle(h)).toBe(INTERIORS.hangar.muffle);
    expect(zoneMuffle(c)).toBe(INTERIORS.house.muffle);
  });

  it('compara zonas pelo conteúdo', () => {
    expect(sameZone(zoneAt(airport, airport.starts[0]), zoneAt(airport, airport.starts[1]))).toBe(
      true,
    );
    expect(
      sameZone(zoneAt(airport, airport.starts[0]), zoneAt(airport, airport.starts[0], ['fogo'])),
    ).toBe(false);
  });
});

describe('níveis das camadas', () => {
  it('na pista: a mata com os níveis do caderno de som, sem interior nem fogo', () => {
    const lv = zoneLevels({ biome: 'mata', states: [] });
    for (const l of BIOMES['mata'].layers)
      expect(level(lv, `bioma:mata:${l.id}`)).toBe(l.sound ? l.level : 0);
    expect(level(lv, 'bioma:mata:passaros')).toBe(0.89);
    expect(level(lv, 'interior:hangar:zumbido')).toBe(0);
    expect(level(lv, 'estado:fogo:fogo')).toBe(0);
  });

  it('a vaga de animais fica muda até ganhar um som', () => {
    expect(level(zoneLevels({ biome: 'mata', states: [] }), 'bioma:mata:animais')).toBe(0);
  });

  it('dentro do hangar: menos pássaros, nenhum galho e o zumbido do galpão', () => {
    const lv = zoneLevels({ biome: 'mata', interior: 'hangar', states: [] });
    expect(level(lv, 'bioma:mata:passaros')).toBeCloseTo(0.89 * 0.5);
    expect(level(lv, 'bioma:mata:galhos')).toBe(0);
    expect(level(lv, 'interior:hangar:zumbido')).toBe(0.75);
    expect(level(lv, 'interior:house:talheres')).toBe(0);
  });

  it('com o avião queimando, os pássaros fogem e o fogo distante entra', () => {
    const lv = zoneLevels({ biome: 'mata', states: ['fogo'] });
    expect(level(lv, 'bioma:mata:passaros')).toBe(0);
    expect(level(lv, 'estado:fogo:fogo')).toBe(0.8);
  });

  it('toda camada tem uma chave única', () => {
    const keys = allLayers().map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
