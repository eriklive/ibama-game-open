import { describe, expect, it } from 'vitest';
import { HexCoord, hexKey } from '../hex';
import { findMap, structureRect } from '../maps';
import { surfaceAt } from './footsteps';
import { DB_PER_HEX, FULL_RANGE, SILENT_RANGE, distanceGain } from './positional';

const airport = findMap('aeroporto')!;
const firstWith = (
  ground: string,
  inRect?: { cols: [number, number]; rows: [number, number] },
): HexCoord => {
  for (const [k, g] of airport.ground!) {
    if (g !== ground) continue;
    const [col, row] = k.split(',').map(Number);
    if (
      !inRect ||
      (col >= inRect.cols[0] &&
        col <= inRect.cols[1] &&
        row >= inRect.rows[0] &&
        row <= inRect.rows[1])
    )
      return { col, row };
  }
  throw new Error(`sem ${ground}`);
};

describe('chão dos passos', () => {
  it('segue o símbolo do mapa', () => {
    expect(surfaceAt(airport, firstWith('dirt'))).toBe('terra');
    expect(surfaceAt(airport, firstWith('grass'))).toBe('mato');
  });

  it('o mesmo piso é concreto no hangar e tábua na casa', () => {
    const hangar = firstWith('floor', structureRect(airport, 'hangar'));
    const house = firstWith('floor', structureRect(airport, 'house'));
    expect(airport.ground!.get(hexKey(hangar))).toBe(airport.ground!.get(hexKey(house)));
    expect(surfaceAt(airport, hangar)).toBe('hangar');
    expect(surfaceAt(airport, house)).toBe('madeira');
  });
});

describe('volume pela distância', () => {
  it('cheio de perto, −3 dB por hexágono depois, mudo bem longe', () => {
    expect(distanceGain(0)).toBe(1);
    expect(distanceGain(FULL_RANGE)).toBe(1);
    expect(20 * Math.log10(distanceGain(FULL_RANGE + 2))).toBeCloseTo(-2 * DB_PER_HEX);
    expect(distanceGain(SILENT_RANGE)).toBe(0);
  });
});
