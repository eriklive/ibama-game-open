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

  it('aeroporto: só se entra no terminal pelas três portas', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    const inside = { col: 11, row: 4 };
    const doors = [{ col: 9, row: 2 }, { col: 14, row: 2 }, { col: 11, row: 6 }, { col: 12, row: 6 }];
    const open = reachableHexes(map.starts[0], 999, map.cols, map.rows, blockedHexes(map));
    expect(open.has(hexKey(inside))).toBe(true);
    const sealed = new Set([...blockedHexes(map), ...doors.map(hexKey)]);
    expect(reachableHexes(map.starts[0], 999, map.cols, map.rows, sealed).has(hexKey(inside))).toBe(false);
  });
});
