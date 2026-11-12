import { describe, expect, it } from 'vitest';
import { rollDice, rollDie, sum } from './dice';
import { hexDistance, hexKey, hexLine, hexNeighbors, hexesInRange, pathTo, reachableHexes } from './hex';
import { CHARACTERS, MAPS, MOVE_DICE } from './maps';

describe('mapas e personagens', () => {
  it('o mapa de teste é 12x12 e é o único disponível', () => {
    const available = MAPS.filter((m) => m.available);
    expect(available.length).toBe(1);
    expect(available[0].cols).toBe(12);
    expect(available[0].rows).toBe(12);
  });

  it('há 3 personagens e cada mapa tem uma posição inicial distinta para cada um', () => {
    expect(CHARACTERS.length).toBe(3);
    for (const map of MAPS) {
      expect(map.starts.length).toBe(CHARACTERS.length);
      expect(new Set(map.starts.map(hexKey)).size).toBe(CHARACTERS.length);
      for (const s of map.starts) {
        expect(s.col).toBeLessThan(map.cols);
        expect(s.row).toBeLessThan(map.rows);
      }
    }
  });
});

describe('dados', () => {
  it('a movimentação do turno é 2d4', () => {
    expect(MOVE_DICE).toEqual({ count: 2, sides: 4 });
  });

  it('um d4 sempre dá de 1 a 4, inclusive nas pontas do gerador', () => {
    expect(rollDie(4, () => 0)).toBe(1);
    expect(rollDie(4, () => 0.999999)).toBe(4);
    for (let i = 0; i < 500; i++) {
      const v = rollDie(4);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(4);
    }
  });

  it('2d4 soma de 2 a 8', () => {
    const seq = [0.1, 0.8];
    let i = 0;
    const r = rollDice(2, 4, () => seq[i++]);
    expect(r).toEqual([1, 4]);
    expect(sum(r)).toBe(5);
  });
});

describe('movimentação', () => {
  it('no meio do mapa há 6 vizinhos', () => {
    expect(hexNeighbors({ col: 5, row: 6 }).every((n) => hexDistance({ col: 5, row: 6 }, n) === 1)).toBe(true);
  });

  it('sem obstáculos, o alcance por passos é igual ao alcance em linha reta', () => {
    const from = { col: 5, row: 6 };
    for (const steps of [1, 2, 5, 8]) {
      expect(reachableHexes(from, steps, 12, 12).size).toBe(hexesInRange(from, steps, 12, 12).length);
    }
  });

  it('não entra em hexágonos ocupados por outro personagem nem sai do mapa', () => {
    const from = { col: 0, row: 0 };
    const blocked = new Set([hexKey({ col: 1, row: 0 })]);
    const reach = reachableHexes(from, 3, 12, 12, blocked);
    expect(reach.has(hexKey({ col: 1, row: 0 }))).toBe(false);
    for (const { coord } of reach.values()) {
      expect(coord.col).toBeGreaterThanOrEqual(0);
      expect(coord.row).toBeGreaterThanOrEqual(0);
    }
  });

  it('contorna obstáculos: o custo pode ser maior que a distância', () => {
    const from = { col: 5, row: 6 };
    // cerca todos os vizinhos menos um
    const ns = hexNeighbors(from);
    const blocked = new Set(ns.slice(1).map(hexKey));
    const reach = reachableHexes(from, 8, 12, 12, blocked);
    const behind = ns[3]; // vizinho oposto à saída, mas bloqueado; pega um hex além dele
    const target = hexNeighbors(behind).find((n) => !blocked.has(hexKey(n)) && hexDistance(from, n) === 2)!;
    const path = pathTo(reach, target);
    expect(path.at(-1)).toEqual(target);
    expect(path.length).toBe(reach.get(hexKey(target))!.cost);
    expect(path.length).toBeGreaterThan(hexDistance(from, target));
    expect(hexDistance(from, path[0])).toBe(1);
    for (let i = 1; i < path.length; i++) {
      expect(hexDistance(path[i - 1], path[i])).toBe(1);
      expect(blocked.has(hexKey(path[i]))).toBe(false);
    }
  });

  it('o caminho em linha reta passa por hexágonos vizinhos', () => {
    const path = hexLine({ col: 5, row: 6 }, { col: 7, row: 5 });
    expect(path.length).toBe(3);
    for (let i = 1; i < path.length; i++) expect(hexDistance(path[i - 1], path[i])).toBe(1);
  });
});
