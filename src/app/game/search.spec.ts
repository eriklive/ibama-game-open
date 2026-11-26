import { describe, expect, it } from 'vitest';
import { spawnEnemy, stationary, visionHexes } from './enemies';
import { hexKey, hexNeighbors, reachableHexes } from './hex';
import { MAPS, blockedHexes, lowCoverHexes, playArea, structureRect } from './maps';
import { SEARCH_RULES, beats, canReach, chance, entersRoom, needsNoticeRoll } from './search';

describe('testes de d20', () => {
  it('passa só quem tira mais que o alvo', () => {
    expect(beats(7, SEARCH_RULES.notice)).toBe(true);
    expect(beats(6, SEARCH_RULES.notice)).toBe(false);
  });

  it('chance de percepção: 70%', () => {
    expect(chance(SEARCH_RULES.notice)).toBeCloseTo(0.7);
  });

  it('percepção ao entrar no cômodo: uma vez por agente, e não rola se o móvel já foi percebido', () => {
    const item = { id: 'chave-aviao', room: { cols: [12, 31], rows: [5, 8] } as { cols: [number, number]; rows: [number, number] } };
    const path = [{ col: 21, row: 9 }, { col: 21, row: 8 }];
    expect(needsNoticeRoll(item, 'ana', path, new Set(), new Set())).toBe(true);
    expect(needsNoticeRoll(item, 'ana', path, new Set(), new Set(['chave-aviao:ana']))).toBe(false);
    expect(needsNoticeRoll(item, 'bruno', path, new Set(), new Set(['chave-aviao:ana']))).toBe(true);
    expect(needsNoticeRoll(item, 'bruno', path, new Set(['chave-aviao']), new Set())).toBe(false);
    // andando só fora do fundo do hangar, não rola
    expect(needsNoticeRoll(item, 'ana', [{ col: 21, row: 10 }, { col: 21, row: 9 }], new Set(), new Set())).toBe(false);
  });

  it('entrar no cômodo: algum passo do caminho dentro do retângulo', () => {
    const room = { cols: [36, 40], rows: [27, 31] } as { cols: [number, number]; rows: [number, number] };
    expect(entersRoom([{ col: 35, row: 29 }], room)).toBe(false);
    expect(entersRoom([{ col: 35, row: 29 }, { col: 36, row: 29 }], room)).toBe(true);
  });

  it('examina só colado no móvel', () => {
    expect(canReach({ col: 39, row: 29 }, { col: 40, row: 29 })).toBe(true);
    expect(canReach({ col: 38, row: 29 }, { col: 40, row: 29 })).toBe(false);
  });
});

describe('aeroporto: casa do Caseiro Jô', () => {
  const map = MAPS.find((m) => m.id === 'aeroporto')!;
  const area = playArea(map);
  const solid = new Set([...blockedHexes(map), ...lowCoverHexes(map)]);
  const house = structureRect(map, 'house')!;
  const item = map.hidden!.find((h) => h.id === 'arma')!;
  const jo = map.enemies.find((e) => e.id === 'jo')!;

  it('cabe inteira na missão', () => {
    for (let col = house.cols[0] - 1; col <= house.cols[1] + 1; col++) {
      for (let row = house.rows[0] - 1; row <= house.rows[1] + 1; row++) expect(area.has({ col, row }), `${col},${row}`).toBe(true);
    }
  });

  it('dois cômodos de 5 × 5', () => {
    const floor = (cols: [number, number]) => {
      let n = 0;
      for (let col = cols[0]; col <= cols[1]; col++) for (let row = 27; row <= 31; row++) if (map.ground?.get(hexKey({ col, row })) === 'floor') n++;
      return n;
    };
    expect(floor([30, 34])).toBe(25);
    expect(floor(item.room.cols)).toBe(25);
  });

  it('só se chega ao cômodo 2 passando pelo cômodo 1', () => {
    const start = map.starts[0];
    const room2 = { col: 38, row: 29 };
    expect(reachableHexes(start, 999, area, solid).has(hexKey(room2))).toBe(true);
    const doorShut = new Set([...solid, hexKey({ col: 29, row: 29 })]);
    expect(reachableHexes(start, 999, area, doorShut).has(hexKey(room2))).toBe(false);
  });

  it('Jô fica parado, de costas para a porta, e vê a porta do cômodo 2', () => {
    const state = spawnEnemy(jo);
    expect(stationary(state)).toBe(true);
    const seen = new Set(visionHexes(state, area, blockedHexes(map), undefined, undefined, lowCoverHexes(map)).map(hexKey));
    // de costas para a entrada: nada entre a porta do oeste e ele
    for (const h of [{ col: 29, row: 29 }, { col: 30, row: 29 }, { col: 31, row: 29 }]) expect(seen.has(hexKey(h))).toBe(false);
    // mas quem passa pela porta do meio sem rendê-lo é visto
    expect(seen.has('35,29')).toBe(true);
  });

  it('o armário fica no cômodo 2, encostado na parede do fundo, e dá para chegar ao lado dele', () => {
    expect(solid.has(hexKey(item.spot))).toBe(true);
    const house = structureRect(map, 'house')!;
    expect(item.spot.row).toBe(house.rows[0] + 1);
    expect(map.walls.some((w) => w.col === item.spot.col && w.row === house.rows[0])).toBe(true);
    const reach = reachableHexes(map.starts[0], 999, area, solid);
    const sides = hexNeighbors(item.spot).filter((h) => reach.has(hexKey(h)));
    expect(sides.length).toBeGreaterThan(0);
    for (const h of sides) expect(canReach(h, item.spot)).toBe(true);
  });
});
