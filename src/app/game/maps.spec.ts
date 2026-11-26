import { describe, expect, it } from 'vitest';
import { commonDoors } from './door';
import { HexCoord, hexDistance, hexKey, reachableHexes } from './hex';
import {
  COVER_HEIGHT, DOOR_REVEAL, HexRect, MAPS, STRUCTURE_SIGHT, doorsOf, structureRect, blockedHexes, lowCoverHexes, parseLayout, playArea, stepsToStructure, structureView,
} from './maps';

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
    expect(parseLayout(['R']).cover).toEqual([{ col: 0, row: 0, kind: 'supplies' }]);
    // `b`: caixote de meia altura (cobertura baixa)
    expect(parseLayout(['b']).cover).toEqual([{ col: 0, row: 0, kind: 'lowCrate' }]);
    expect(COVER_HEIGHT.lowCrate).toBe('low');
    expect(COVER_HEIGHT.supplies).toBe('high');
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

  it('aeroporto: o avião é grande (cabe em 8 × 6 hexágonos) e fica dentro do hangar, sem pegar carga', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    const [c0, c1] = structureRect(map, 'hangar')!.cols;
    const [r0, r1] = structureRect(map, 'hangar')!.rows;
    const cols = map.plane!.map((h) => h.col);
    const rows = map.plane!.map((h) => h.row);
    // só os hexágonos debaixo do avião (fuselagem, asa, empenagem) bloqueiam
    expect(map.plane!.length).toBe(25);
    expect([Math.max(...cols) - Math.min(...cols) + 1, Math.max(...rows) - Math.min(...rows) + 1]).toEqual([8, 6]);
    // por dentro das paredes
    expect(Math.min(...cols)).toBeGreaterThan(c0);
    expect(Math.max(...cols)).toBeLessThan(c1);
    expect(Math.min(...rows)).toBeGreaterThan(r0);
    expect(Math.max(...rows)).toBeLessThan(r1);
    const plane = new Set(map.plane!.map(hexKey));
    expect((map.cover ?? []).some((c) => plane.has(hexKey(c)))).toBe(false);
  });

  it('aeroporto: os cantos do retângulo do avião (ao lado do nariz) são piso livre e colados nele', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    const plane = new Set(map.plane!.map(hexKey));
    const blocked = blockedHexes(map);
    for (const h of [{ col: 17, row: 13 }, { col: 21, row: 13 }, { col: 22, row: 14 }]) {
      expect(blocked.has(hexKey(h))).toBe(false);
      expect(map.plane!.some((p) => hexDistance(p, h) === 1)).toBe(true);
    }
    expect(plane.has('19,14') && plane.has('20,14')).toBe(true);
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
    const [c0, c1] = structureRect(map, 'hangar')!.cols;
    const [r0, r1] = structureRect(map, 'hangar')!.rows;
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

  it('aeroporto: a carga e os móveis ficam dentro das estruturas ou ao ar livre, nunca nas paredes', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    const cover = map.cover ?? [];
    expect(cover.some((c) => COVER_HEIGHT[c.kind] === 'high')).toBe(true);
    expect(cover.some((c) => COVER_HEIGHT[c.kind] === 'low')).toBe(true);
    const inside = (h: HexCoord, { cols: [c0, c1], rows: [r0, r1] }: HexRect) => h.col > c0 && h.col < c1 && h.row > r0 && h.row < r1;
    const onRect = (h: HexCoord, { cols: [c0, c1], rows: [r0, r1] }: HexRect) => h.col >= c0 && h.col <= c1 && h.row >= r0 && h.row <= r1;
    const rects = (map.structures ?? []).map((s) => s.rect);
    for (const c of [...cover, ...(map.props ?? [])]) {
      const ok = rects.some((r) => inside(c, r)) || rects.every((r) => !onRect(c, r));
      expect(ok, hexKey(c)).toBe(true);
    }
    // caixotes soltos do lado de fora servem de cobertura na fuga
    expect(cover.some((c) => rects.every((r) => !onRect(c, r)))).toBe(true);
    // na casa só há móveis: a mesa do Jô e o armário
    expect(cover.filter((c) => inside(c, structureRect(map, 'house')!)).map((c) => c.kind).sort()).toEqual(['shelf', 'table']);
  });

  it('estrutura: o teto some com um agente dentro e o interior só aparece a até 6 hexágonos', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    const hangar = structureRect(map, 'hangar')!;
    expect(STRUCTURE_SIGHT).toBe(6);
    // a equipe começa longe: teto no lugar, nada de dentro desenhado
    expect(structureView(hangar, map.starts)).toEqual({ roof: true, interior: false });
    // descendo a pista a partir do portão (fileira 18)
    expect(stepsToStructure({ col: 22, row: 24 }, hangar)).toBe(6);
    expect(stepsToStructure({ col: 22, row: 25 }, hangar)).toBe(7);
    expect(structureView(hangar, [{ col: 22, row: 25 }])).toEqual({ roof: true, interior: false });
    // perto, mas do lado de fora: o teto fica e o interior já é desenhado
    expect(structureView(hangar, [{ col: 22, row: 24 }])).toEqual({ roof: true, interior: true });
    expect(structureView(hangar, [{ col: 22, row: 21 }], doorsOf(map, hangar))).toEqual({ roof: true, interior: true });
    // basta um agente entrar (o vão do portão já conta) para o teto sumir
    expect(structureView(hangar, [...map.starts, { col: 22, row: 18 }])).toEqual({ roof: false, interior: true });
    expect(structureView(hangar, [{ col: 15, row: 9 }])).toEqual({ roof: false, interior: true });
  });

  it('estrutura: o teto some com um agente a até 2 hexágonos de uma porta e volta quando ele se afasta', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    expect(DOOR_REVEAL).toBe(2);
    const hangar = structureRect(map, 'hangar')!;
    const house = structureRect(map, 'house')!;
    const hangarDoors = doorsOf(map, hangar);
    const houseDoors = doorsOf(map, house);
    expect(hangarDoors.length).toBe(14);
    expect(houseDoors.map(hexKey)).toContain(hexKey({ col: 29, row: 29 }));
    // diante do portão (fileira 18): a 1 e a 2 fileiras some o teto; a 3 ele volta
    expect(structureView(hangar, [{ col: 22, row: 19 }], hangarDoors).roof).toBe(false);
    expect(structureView(hangar, [{ col: 22, row: 20 }], hangarDoors).roof).toBe(false);
    expect(structureView(hangar, [{ col: 22, row: 21 }], hangarDoors).roof).toBe(true);
    // porta dos fundos, ao norte
    expect(structureView(hangar, [{ col: 14, row: 2 }], hangarDoors).roof).toBe(false);
    expect(structureView(hangar, [{ col: 14, row: 1 }], hangarDoors).roof).toBe(true);
    // porta da casa, a oeste
    expect(structureView(house, [{ col: 27, row: 29 }], houseDoors).roof).toBe(false);
    expect(structureView(house, [{ col: 26, row: 29 }], houseDoors).roof).toBe(true);
  });

  it('aeroporto: os estados de porta do mapa são de portas comuns (o portão do hangar fica de fora)', () => {
    const map = MAPS.find((m) => m.id === 'aeroporto')!;
    const common = new Set(commonDoors(map.doors ?? []).map(hexKey));
    expect([...common].sort()).toEqual(['14,4', '29,29', '29,4', '35,29']);
    for (const key of Object.keys(map.doorStates ?? {})) expect(common.has(key), key).toBe(true);
  });
});

describe('aeroporto: avião trancado e quadro de chaves', () => {
  const map = MAPS.find((m) => m.id === 'aeroporto')!;
  const hangar = map.structures!.find((st) => st.kind === 'hangar')!.rect;

  it('o quadro de chaves é carga alta colada na parede do fundo do hangar', () => {
    const panel = map.keyPanel!;
    expect(map.cover!.find((c) => c.col === panel.spot.col && c.row === panel.spot.row)?.kind).toBe('keys');
    expect(panel.spot.row).toBe(hangar.rows[0] + 1);
    expect(map.walls.some((w) => w.col === panel.spot.col && w.row === hangar.rows[0])).toBe(true);
    expect(blockedHexes(map).has(hexKey(panel.spot))).toBe(true);
  });

  it('o avião não se queima direto: tem menu de inspecionar', () => {
    expect(map.burnables!.find((b) => b.id === 'aviao')?.inspect).toBe(true);
    expect(map.burnables!.find((b) => b.id === 'suprimentos')?.inspect).toBeUndefined();
  });
});
