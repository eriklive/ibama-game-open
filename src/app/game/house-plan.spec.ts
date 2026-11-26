import { describe, expect, it } from 'vitest';
import { HexCoord, hexKey } from './hex';
import { wallFloorShape } from './house-plan';
import { MAPS, structureRect } from './maps';

const map = MAPS.find((m) => m.id === 'aeroporto')!;
const rect = structureRect(map, 'house')!;
const walls = new Set(map.walls.map(hexKey));
const h = (col: number, row: number): HexCoord => ({ col, row });
const inside = (hex: HexCoord) => wallFloorShape(hex, rect).fraction;

describe('piso dos hexágonos de parede da casa (paredes retas)', () => {
  it('laterais: meio a meio (a parede passa pelo centro da coluna)', () => {
    for (const row of [27, 28, 30, 31]) {
      expect(inside(h(29, row))).toBeCloseTo(0.5, 5);
      expect(inside(h(41, row))).toBeCloseTo(0.5, 5);
    }
  });

  it('fundo e frente: faixas de 1/4 e 3/4 alternando entre colunas pares e ímpares', () => {
    // fundo: a coluna par fica mais para fora (pouco piso), a ímpar mais para dentro
    const back = [inside(h(32, 26)), inside(h(33, 26))];
    const front = [inside(h(32, 32)), inside(h(33, 32))];
    expect(back[0]).toBeLessThan(0.5);
    expect(back[1]).toBeGreaterThan(0.5);
    expect(front[0]).toBeGreaterThan(0.5);
    expect(front[1]).toBeLessThan(0.5);
    // os dois padrões se completam (o mesmo recorte, espelhado)
    expect(back[0] + back[1]).toBeCloseTo(1, 5);
    expect(front[0]).toBeCloseTo(back[1], 5);
  });

  it('quinas: só um canto do hexágono é de dentro', () => {
    for (const corner of [h(29, 26), h(41, 26), h(29, 32), h(41, 32)]) {
      expect(walls.has(hexKey(corner))).toBe(true);
      expect(inside(corner)).toBeGreaterThan(0);
      expect(inside(corner)).toBeLessThan(0.5);
    }
  });

  it('divisória e cômodos: todo de dentro; fora da casa: nada', () => {
    expect(inside(h(35, 28))).toBeCloseTo(1, 5);
    expect(inside(h(38, 29))).toBeCloseTo(1, 5);
    expect(inside(h(27, 29))).toBe(0);
  });

  it('as janelas ficam entre dois hexágonos vizinhos da mesma parede', () => {
    const house = map.structures!.find((s) => s.kind === 'house')!;
    expect(house.windows?.length).toBe(2);
    for (const [a, b] of house.windows!) {
      expect(walls.has(hexKey(a)) && walls.has(hexKey(b))).toBe(true);
      expect(a.col === b.col || a.row === b.row).toBe(true);
    }
  });
});
