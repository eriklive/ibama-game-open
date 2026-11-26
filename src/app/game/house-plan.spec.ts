import { describe, expect, it } from 'vitest';
import { HexCoord, hexKey, hexNeighbors, hexToWorld } from './hex';
import { floorSectors, housePlan, insidePolygon } from './house-plan';
import { MAPS, blockedHexes, structureRect } from './maps';

const map = MAPS.find((m) => m.id === 'aeroporto')!;
const rect = structureRect(map, 'house')!;
const walls = new Set(map.walls.map(hexKey));
const doors = new Set((map.doors ?? []).map(hexKey));
const plan = housePlan(rect, walls, doors);
const h = (col: number, row: number): HexCoord => ({ col, row });
const sectors = (hex: HexCoord) =>
  floorSectors(plan, hex).map((s) => ({ span: +(s.span / Math.PI).toFixed(3), inside: s.inside }));

describe('planta da casa (paredes pelo meio dos hexágonos)', () => {
  it('cada parede liga dois vizinhos: o contorno fecha, sem buraco entre hexágonos de parede', () => {
    for (const [a, b] of plan.edges) expect(hexNeighbors(a).map(hexKey)).toContain(hexKey(b));
    // o contorno é um ciclo de vizinhos
    expect(plan.outline.length).toBeGreaterThan(20);
    // o pé da divisória não tem atalho na diagonal: liga só à fileira e à coluna
    expect(plan.links.get('35,31')!.map(hexKey).sort()).toEqual(['35,30', '35,32']);
    expect(plan.links.get('35,32')!.map(hexKey).sort()).toEqual(['34,32', '35,31', '36,32']);
  });

  it('o contorno separa o dentro do fora', () => {
    expect(insidePolygon(hexToWorld(h(32, 29), 1), plan.outline)).toBe(true);
    expect(insidePolygon(hexToWorld(h(38, 29), 1), plan.outline)).toBe(true);
    expect(insidePolygon(hexToWorld(h(27, 29), 1), plan.outline)).toBe(false);
    expect(insidePolygon(hexToWorld(h(35, 34), 1), plan.outline)).toBe(false);
  });

  it('padrões do piso: meio a meio nas laterais, quinas de 1/3 e 2/3 no zigue-zague', () => {
    // lateral (coluna reta): metade dentro, metade fora
    expect(sectors(h(41, 28)).sort((a, b) => +a.inside - +b.inside)).toEqual([
      { span: 1, inside: false },
      { span: 1, inside: true },
    ]);
    // parede do fundo: a ponta que vai para fora deixa 1/3 de piso; a que vem para dentro, 2/3
    expect(sectors(h(32, 26)).find((s) => s.inside)!.span).toBeCloseTo(2 / 3, 3);
    expect(sectors(h(33, 26)).find((s) => s.inside)!.span).toBeCloseTo(4 / 3, 3);
    // divisória: os dois lados são de dentro
    expect(sectors(h(35, 28)).every((s) => s.inside)).toBe(true);
    // pé da divisória na parede da frente: duas fatias de 1/6 (uma em cada cômodo)
    const foot = sectors(h(35, 32)).filter((s) => s.inside);
    expect(foot).toHaveLength(2);
    for (const s of foot) expect(s.span).toBeCloseTo(1 / 3, 3);
  });

  it('as quinas da frente são chanfradas: o canto de fora fica livre', () => {
    for (const corner of [h(29, 32), h(41, 32)]) {
      expect(walls.has(hexKey(corner))).toBe(false);
      expect(blockedHexes(map).has(hexKey(corner))).toBe(false);
    }
    expect(plan.links.get('29,31')!.map(hexKey)).toContain('30,32');
    expect(plan.links.get('41,31')!.map(hexKey)).toContain('40,32');
  });

  it('as janelas ficam entre dois hexágonos de parede da mesma parede', () => {
    const house = map.structures!.find((s) => s.kind === 'house')!;
    expect(house.windows?.length).toBe(2);
    for (const [a, b] of house.windows!) {
      expect(walls.has(hexKey(a)) && walls.has(hexKey(b))).toBe(true);
      expect(a.col === b.col || a.row === b.row).toBe(true);
    }
  });
});
