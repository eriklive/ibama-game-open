import { describe, expect, it } from 'vitest';
import { auraOutline, splitHot } from './aura-layer';
import { HexCoord, hexKey, hexNeighbors } from './hex';

const key = (col: number, row: number) => hexKey({ col, row });
const ring = (h: HexCoord) => hexNeighbors(h).map(hexKey);

describe('contorno da aura', () => {
  it('um hexágono sozinho tem os 6 lados na fronteira', () => {
    const sides = auraOutline([key(4, 4)]);
    expect(sides).toHaveLength(6);
    // um lado para cada vizinho, sem repetir direção
    const angles = new Set(sides.map((s) => Math.round((s.angle * 180) / Math.PI)));
    expect(angles.size).toBe(6);
  });

  it('dois vizinhos dividem um lado e ele some do contorno', () => {
    const [n] = hexNeighbors({ col: 4, row: 4 });
    expect(auraOutline([key(4, 4), hexKey(n)])).toHaveLength(10);
  });

  it('o anel em volta de um aliado não abre buraco quando ele conta como dentro', () => {
    const center = { col: 5, row: 5 };
    const around = ring(center);
    // sem o aliado: 6 lados de dentro viram fronteira
    const open = auraOutline(around);
    const closed = auraOutline(around, [hexKey(center)]);
    expect(open.length - closed.length).toBe(6);
    expect(closed.every((s) => !(s.hex.col === center.col && s.hex.row === center.row))).toBe(true);
  });

  it('hexágonos que só contam como dentro não ganham lados próprios', () => {
    const sides = auraOutline([key(2, 2)], [key(9, 9)]);
    expect(sides.every((s) => hexKey(s.hex) === key(2, 2))).toBe(true);
  });
});

describe('aura acesa (agente dentro)', () => {
  it('acende só a parte ligada ao hexágono do agente', () => {
    const plane = ring({ col: 3, row: 3 });
    const supplies = ring({ col: 12, row: 12 });
    const { hot, cold } = splitHot([...plane, ...supplies], [plane[0]]);
    expect(new Set(hot)).toEqual(new Set(plane));
    expect(new Set(cold)).toEqual(new Set(supplies));
  });

  it('sem agente dentro, nada acende', () => {
    const plane = ring({ col: 3, row: 3 });
    expect(splitHot(plane, [key(20, 20)])).toEqual({ hot: [], cold: plane });
  });
});
