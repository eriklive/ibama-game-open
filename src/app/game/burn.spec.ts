import { describe, expect, it } from 'vitest';
import { BURN_RULES, Burnable, burnTarget, canBurn, distanceTo, inSnap, seeFire, sideSpot } from './burn';
import { spawnEnemy } from './enemies';
import { HexCoord, hexKey, hexNeighbors, reachableHexes } from './hex';
import { MAPS, blockedHexes, lowCoverHexes, playArea } from './maps';

const plane: Burnable = {
  id: 'aviao',
  name: 'o avião',
  short: 'avião',
  hexes: [{ col: 5, row: 5 }, { col: 6, row: 5 }],
};

describe('queimar', () => {
  it('só colado em algum hexágono do alvo', () => {
    expect(canBurn({ col: 7, row: 5 }, plane)).toBe(true);
    expect(canBurn({ col: 4, row: 5 }, plane)).toBe(true);
    expect(canBurn({ col: 8, row: 5 }, plane)).toBe(false);
    expect(distanceTo({ col: 8, row: 5 }, plane)).toBe(2);
  });

  it('o alvo já queimado não aparece de novo', () => {
    const at = { col: 7, row: 5 };
    expect(burnTarget(at, [plane], new Set())?.id).toBe('aviao');
    expect(burnTarget(at, [plane], new Set(['aviao']))).toBeNull();
  });

  it('quem vigia perto vê o fogo; rendidos e quem está longe, não', () => {
    const spawn = (id: string, col: number) => spawnEnemy({ id, name: id, patrol: [{ col, row: 5 }] });
    const near = spawn('perto', 6 + BURN_RULES.alertRadius);
    const far = spawn('longe', 7 + BURN_RULES.alertRadius);
    const quiet = { ...spawn('rendido', 7), status: 'surrendered' as const };
    expect(seeFire(plane, [near, far, quiet]).map((e) => e.id)).toEqual(['perto']);
  });
});

describe('tocar no entorno do avião', () => {
  it(`vale até ${BURN_RULES.snap} hexágonos do avião`, () => {
    expect(inSnap({ col: 5, row: 5 }, plane)).toBe(true);
    expect(inSnap({ col: 8, row: 5 }, plane)).toBe(true);
    expect(inSnap({ col: 9, row: 5 }, plane)).toBe(false);
  });

  const options = [
    { hex: { col: 7, row: 5 }, cost: 3 }, // colado à direita
    { hex: { col: 4, row: 5 }, cost: 1 }, // colado à esquerda
    { hex: { col: 8, row: 5 }, cost: 4 }, // não colado
  ];
  const far = { col: 0, row: 5 };

  it('sem toque no entorno, vai pelo caminho mais barato', () => {
    expect(sideSpot(plane, far, options)).toEqual({ col: 4, row: 5 });
  });

  it('tocando no entorno, vai para o lado do avião mais perto do toque', () => {
    expect(sideSpot(plane, far, options, { col: 8, row: 5 })).toEqual({ col: 7, row: 5 });
  });

  it('já colado e tocando do seu lado, fica (abre a ação)', () => {
    const here = { col: 4, row: 5 };
    expect(sideSpot(plane, here, options.slice(0, 1))).toEqual(here);
    expect(sideSpot(plane, here, options.slice(0, 1), { col: 3, row: 5 })).toEqual(here);
  });

  it('sem lado alcançável, não vai', () => {
    expect(sideSpot(plane, far, options.slice(2))).toBeNull();
  });
});

describe('alvos do Aeroporto', () => {
  const map = MAPS.find((m) => m.id === 'aeroporto')!;
  const blocked = new Set([...blockedHexes(map), ...lowCoverHexes(map)]);
  const area = playArea(map);
  const reach = reachableHexes(map.starts[0], area.hexes.length, area, blocked);

  it('o avião e a pilha de suprimentos ficam no hangar e bloqueiam a passagem', () => {
    const ids = (map.burnables ?? []).map((b) => b.id);
    expect(ids).toEqual(['aviao', 'suprimentos']);
    for (const b of map.burnables ?? []) {
      expect(b.hexes.length, b.id).toBeGreaterThan(0);
      for (const h of b.hexes) expect(blocked.has(hexKey(h)), hexKey(h)).toBe(true);
    }
  });

  it('dá para chegar colado em cada alvo saindo da clareira da equipe', () => {
    for (const b of map.burnables ?? []) {
      const spots = b.hexes.flatMap((h: HexCoord) => hexNeighbors(h)).filter((n) => reach.has(hexKey(n)));
      expect(spots.length, b.id).toBeGreaterThan(0);
    }
  });

  it('queimar o avião é principal e libera o fim; os suprimentos são principais', () => {
    const objectives = map.objectives ?? [];
    const plane = objectives.find((o) => 'burn' in o && o.burn === 'aviao');
    const supplies = objectives.find((o) => 'burn' in o && o.burn === 'suprimentos');
    expect(plane?.primary && plane.unlocksEnd).toBe(true);
    expect(supplies?.primary).toBe(true);
    expect(supplies?.unlocksEnd).toBeFalsy();
  });
});
