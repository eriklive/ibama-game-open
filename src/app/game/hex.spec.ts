import { describe, expect, it } from 'vitest';
import { hexDistance, hexLine, hexesInRange } from './hex';
import { MAPS, MOVE_RANGE, MOVES_PER_TEST } from './maps';

describe('regras do teste de movimentação', () => {
  it('anda até 2 hexágonos por movimento, 3 movimentos', () => {
    expect(MOVE_RANGE).toBe(2);
    expect(MOVES_PER_TEST).toBe(3);
  });

  it('o mapa de teste é 12x12 e é o único disponível', () => {
    const available = MAPS.filter((m) => m.available);
    expect(available.length).toBe(1);
    expect(available[0].cols).toBe(12);
    expect(available[0].rows).toBe(12);
  });

  it('no meio do mapa, alcance 2 = 18 hexágonos (6 vizinhos + 12 a dois passos)', () => {
    const reach = hexesInRange({ col: 5, row: 6 }, 2, 12, 12);
    expect(reach.length).toBe(18);
    expect(reach.filter((h) => hexDistance({ col: 5, row: 6 }, h) === 1).length).toBe(6);
  });

  it('não inclui hexágonos a 3 de distância nem fora do mapa', () => {
    const reach = hexesInRange({ col: 0, row: 0 }, 2, 12, 12);
    expect(reach.every((h) => h.col >= 0 && h.row >= 0)).toBe(true);
    expect(reach.some((h) => hexDistance({ col: 0, row: 0 }, h) === 3)).toBe(false);
  });

  it('o caminho de um movimento passa por hexágonos vizinhos', () => {
    const path = hexLine({ col: 5, row: 6 }, { col: 7, row: 5 });
    expect(path.length).toBe(3);
    for (let i = 1; i < path.length; i++) expect(hexDistance(path[i - 1], path[i])).toBe(1);
  });
});
