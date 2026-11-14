import { describe, expect, it } from 'vitest';
import { hexKey, reachableHexes } from './hex';
import { MAPS, blockedHexes, parseLayout } from './maps';

describe('parseLayout', () => {
  it('separa paredes, árvores e chão', () => {
    const m = parseLayout(['.T#', '=:D']);
    expect([m.cols, m.rows]).toEqual([3, 2]);
    expect(m.trees).toEqual([{ col: 1, row: 0 }]);
    expect(m.walls).toEqual([{ col: 2, row: 0 }]);
    expect(m.ground?.get('0,1')).toBe('runway');
    expect(m.ground?.get('2,1')).toBe('floor');
  });

  it('recusa linhas de tamanhos diferentes', () => {
    expect(() => parseLayout(['...', '..'])).toThrow();
  });
});

describe('mapas', () => {
  for (const map of MAPS.filter((m) => m.available)) {
    it(`${map.id}: pontos de partida e rotas ficam em hexágonos livres e alcançáveis`, () => {
      const blocked = blockedHexes(map);
      const reach = reachableHexes(map.starts[0], map.cols * map.rows, map.cols, map.rows, blocked);
      const points = [...map.starts.slice(1), ...map.enemies.flatMap((e) => e.patrol)];
      for (const p of points) {
        expect(blocked.has(hexKey(p)), hexKey(p)).toBe(false);
        expect(reach.has(hexKey(p)), hexKey(p)).toBe(true);
      }
    });
  }

  it('aeroporto: só se entra no hangar pelo portão e pelas duas portas dos fundos', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    const inside = { col: 15, row: 9 };
    const doors = [{ col: 14, row: 4 }, { col: 29, row: 4 }, ...[19, 20, 21, 22, 23, 24].map((col) => ({ col, row: 14 }))];
    const open = reachableHexes(map.starts[0], 999, map.cols, map.rows, blockedHexes(map));
    expect(open.has(hexKey(inside))).toBe(true);
    const sealed = new Set([...blockedHexes(map), ...doors.map(hexKey)]);
    expect(reachableHexes(map.starts[0], 999, map.cols, map.rows, sealed).has(hexKey(inside))).toBe(false);
  });

  it('aeroporto: o hangar comporta duas fileiras de quatro aviões e tem um no meio', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    const [c0, c1] = map.hangar!.cols;
    const [r0, r1] = map.hangar!.rows;
    // por dentro das paredes: 4 vagas de 4 colunas e 2 fileiras de 3, com um corredor no meio
    expect(c1 - c0 - 1).toBeGreaterThanOrEqual(4 * 4);
    expect(r1 - r0 - 1).toBeGreaterThanOrEqual(2 * 3 + 1);
    const cols = map.plane!.map((h) => h.col);
    const rows = map.plane!.map((h) => h.row);
    expect(map.plane!.length).toBe(12);
    expect(Math.min(...cols) - c0).toBe(c1 - Math.max(...cols));
    expect(Math.min(...rows) - r0).toBe(r1 - Math.max(...rows));
  });

  it('aeroporto: todo hexágono livre é alcançável (nenhuma clareira isolada)', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    const blocked = blockedHexes(map);
    const reach = reachableHexes(map.starts[0], 9999, map.cols, map.rows, blocked);
    expect(reach.size + 1).toBe(map.cols * map.rows - blocked.size);
  });
});
