import { describe, expect, it } from 'vitest';
import { hexKey, reachableHexes } from './hex';
import { COVER_HEIGHT, MAPS, blockedHexes, lowCoverHexes, parseLayout, playArea } from './maps';

describe('parseLayout', () => {
  it('separa paredes, árvores e chão', () => {
    const m = parseLayout(['.T#', '=:D']);
    expect([m.cols, m.rows]).toEqual([3, 2]);
    expect(m.trees).toEqual([{ col: 1, row: 0 }]);
    expect(m.walls).toEqual([{ col: 2, row: 0 }]);
    expect(m.ground?.get('0,1')).toBe('runway');
    expect(m.ground?.get('2,1')).toBe('floor');
  });

  it('lê a carga: alta bloqueia como parede, baixa fica à parte, decoração não bloqueia', () => {
    const m = parseLayout(['BMSGf_']);
    expect(m.cover?.map((c) => c.kind)).toEqual(['crates', 'boxes', 'sacks', 'cages']);
    expect(m.cover?.map((c) => COVER_HEIGHT[c.kind])).toEqual(['high', 'high', 'low', 'low']);
    expect(m.props).toEqual([{ col: 4, row: 0 }]);
    const map = { ...m, id: 'x', name: 'x', subtitle: '', available: true, starts: [], enemies: [] };
    expect([...blockedHexes(map)].sort()).toEqual(['0,0', '1,0']);
    expect([...lowCoverHexes(map)].sort()).toEqual(['2,0', '3,0']);
    expect(m.ground?.get('4,0')).toBe('floor');
  });

  it('recusa linhas de tamanhos diferentes', () => {
    expect(() => parseLayout(['...', '..'])).toThrow();
  });
});

describe('mapas', () => {
  for (const map of MAPS.filter((m) => m.available)) {
    it(`${map.id}: pontos de partida e rotas ficam em hexágonos livres e alcançáveis`, () => {
      const blocked = new Set([...blockedHexes(map), ...lowCoverHexes(map)]);
      const reach = reachableHexes(map.starts[0], playArea(map).hexes.length, playArea(map), blocked);
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
    const doors = [{ col: 14, row: 4 }, { col: 29, row: 4 }, ...Array.from({ length: 12 }, (_, i) => ({ col: 16 + i, row: 18 }))];
    const open = reachableHexes(map.starts[0], 999, playArea(map), blockedHexes(map));
    expect(open.has(hexKey(inside))).toBe(true);
    // o portão tem 12 hexágonos de largura
    for (const d of doors.slice(2)) expect(blockedHexes(map).has(hexKey(d))).toBe(false);
    // a pista é um rastro de terra de 6 hexágonos, do meio do portão até a borda de baixo
    for (let row = 19; row < map.rows; row++) {
      const dirt = Array.from({ length: map.cols }, (_, col) => col).filter((col) => map.ground?.get(hexKey({ col, row })) === 'dirt');
      expect(dirt, `fileira ${row}`).toEqual([19, 20, 21, 22, 23, 24]);
    }
    const sealed = new Set([...blockedHexes(map), ...doors.map(hexKey)]);
    expect(reachableHexes(map.starts[0], 999, playArea(map), sealed).has(hexKey(inside))).toBe(false);
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

  it('aeroporto: todo hexágono livre é alcançável (nenhuma clareira isolada, nem atrás da carga)', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    const blocked = new Set([...blockedHexes(map), ...lowCoverHexes(map)]);
    const area = playArea(map);
    const reach = reachableHexes(map.starts[0], 9999, area, blocked);
    expect(reach.size + 1).toBe(area.hexes.filter((h) => !blocked.has(hexKey(h))).length);
  });
});

describe('aeroporto: mundo semiaberto', () => {
  const map = MAPS.find((m) => m.id === 'aeroporto')!;
  const area = playArea(map);

  it('a missão é um círculo que contém o hangar inteiro, a equipe e as rotas', () => {
    expect(map.mission).toBeDefined();
    const [c0, c1] = map.hangar!.cols;
    const [r0, r1] = map.hangar!.rows;
    for (let col = c0; col <= c1; col++) for (let row = r0; row <= r1; row++) expect(area.has({ col, row })).toBe(true);
    for (const p of [...map.starts, ...map.enemies.flatMap((e) => e.patrol)]) expect(area.has(p), hexKey(p)).toBe(true);
  });

  it('o círculo passa do desenho: os hexágonos de fora ganham chão e mata', () => {
    const outside = area.hexes.filter((h) => h.col < 0 || h.row < 0 || h.col >= map.cols || h.row >= map.rows);
    expect(outside.length).toBeGreaterThan(0);
    for (const h of outside) expect(map.ground?.has(hexKey(h)), hexKey(h)).toBe(true);
  });

  it('a pista de terra continua para fora da missão, pelo mundo', () => {
    const south = map.mission!.center.row + map.mission!.radius + 10;
    for (let col = 19; col <= 24; col++) expect(map.world!.terrain({ col, row: south })).toEqual({ ground: 'dirt', tree: false });
  });

  it('o mundo de fora é determinístico e tem mata e clareiras', () => {
    const t = map.world!.terrain;
    const sample = Array.from({ length: 400 }, (_, i) => ({ col: 80 + (i % 20), row: -40 + Math.floor(i / 20) }));
    expect(sample.map(t)).toEqual(sample.map(t));
    const trees = sample.filter((h) => t(h).tree).length;
    expect(trees).toBeGreaterThan(200);
    expect(trees).toBeLessThan(400);
  });

  it('aeroporto: o hangar tem carga alta e baixa, toda por dentro das paredes', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    const [c0, c1] = map.hangar!.cols;
    const [r0, r1] = map.hangar!.rows;
    const cover = map.cover ?? [];
    expect(cover.some((c) => COVER_HEIGHT[c.kind] === 'high')).toBe(true);
    expect(cover.some((c) => COVER_HEIGHT[c.kind] === 'low')).toBe(true);
    for (const c of [...cover, ...(map.props ?? [])]) {
      expect(c.col > c0 && c.col < c1 && c.row > r0 && c.row < r1, hexKey(c)).toBe(true);
    }
  });
});
