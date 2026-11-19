import { describe, expect, it } from 'vitest';
import { CHARACTERS, MAPS, blockedHexes, findMap, lowCoverHexes, playArea } from './maps';
import { agentSight, arrestQueue, lockRoute } from './chase';
import { isOpen, spawnDoors } from './door';
import { hexKey } from './hex';
import { TEST_CASES, findTestCase } from './test-cases';

describe('casos de teste', () => {
  it('cada caso aponta para mapa, agentes e inimigos que existem', () => {
    for (const c of TEST_CASES) {
      const map = findMap(c.mapId);
      expect(map, c.id).toBeDefined();
      const agents = CHARACTERS.map((ch) => ch.id);
      expect(agents).toContain(c.active);
      expect(agents).toContain(c.start.agent);
      for (const id of Object.keys(c.agents ?? {})) expect(agents).toContain(id);
      const enemies = map!.enemies.map((e) => e.id);
      expect(enemies).toContain(c.start.enemy);
      for (const id of Object.keys(c.enemies ?? {})) expect(enemies).toContain(id);
      // ninguém começa dentro de parede
      const walls = blockedHexes(map!);
      for (const h of [
        ...Object.values(c.agents ?? {}),
        ...Object.values(c.enemies ?? {}).map((e) => e.hex),
      ]) {
        expect(walls.has(hexKey(h)), `${c.id} ${hexKey(h)}`).toBe(false);
      }
    }
  });

  it('fuga pelo aeroporto: o vigia corre para os fundos (norte, pela trilha atrás do hangar)', () => {
    const c = findTestCase('fuga-aeroporto')!;
    const map = MAPS.find((m) => m.id === c.mapId)!;
    const area = playArea(map);
    const fixed = blockedHexes(map);
    const doors = spawnDoors(map.doors ?? [], map.doorStates);
    const closed = [...doors].filter(([, d]) => !isOpen(d)).map(([k]) => k);
    const positions = map.starts.map((h, i) => c.agents?.[CHARACTERS[i].id] ?? h);
    const clara = c.agents!['clara'];
    const others = positions.filter((h) => h !== clara);
    const sight = agentSight(positions, area, new Set([...fixed, ...closed]));
    const vigia = c.enemies!['vigia-pista'].hex;
    const route = lockRoute(
      vigia,
      area,
      new Set([...fixed, ...lowCoverHexes(map)]),
      doors,
      others,
      sight,
    );
    expect(route.escapes).toBe(true);
    expect(route.flee.at(-1)!.row).toBeLessThan(0);
    expect(route.stops.length).toBeGreaterThan(0);
    // acabou de abordar: começa colada nele (distância = passos até ele − 1)
    const chase = arrestQueue(
      vigia,
      'clara',
      [{ id: 'clara', hex: clara, stats: {} }],
      area,
      fixed,
    );
    expect(chase[0].path.length - 1).toBeLessThanOrEqual(2);
  });
});
