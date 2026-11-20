import { describe, expect, it } from 'vitest';
import {
  CHARACTERS,
  MAPS,
  blockedHexes,
  findMap,
  inStructure,
  lowCoverHexes,
  playArea,
  vaultHexes,
} from './maps';
import { agentSight, agentVaults, arrestQueue, lockRoute } from './chase';
import { isOpen, spawnDoors } from './door';
import { HexCoord, hexKey } from './hex';
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

  /**
   * A perseguição do caso como o jogo monta (ver `chaseSteps`): a rota travada dele (os outros
   * inimigos, na posição do caso ou no começo da patrulha, bloqueiam), a distância inicial e os
   * pulos de caixote da pista do agente.
   */
  const chaseOf = (id: string) => {
    const c = findTestCase(id)!;
    const map = MAPS.find((m) => m.id === c.mapId)!;
    const area = playArea(map);
    const fixed = blockedHexes(map);
    const doors = spawnDoors(map.doors ?? [], map.doorStates);
    const closed = [...doors].filter(([, d]) => !isOpen(d)).map(([k]) => k);
    const positions = map.starts.map((h, i) => c.agents?.[CHARACTERS[i].id] ?? h);
    const agent = c.agents![c.start.agent];
    const others = positions.filter((h) => h !== agent);
    const sight = agentSight(positions, area, new Set([...fixed, ...closed]));
    const enemyAt = (e: { id: string; patrol: HexCoord[] }) => c.enemies?.[e.id]?.hex ?? e.patrol[0];
    const runner = enemyAt(map.enemies.find((e) => e.id === c.start.enemy)!);
    const blocked = new Set([
      ...fixed,
      ...lowCoverHexes(map),
      ...map.enemies.filter((e) => e.id !== c.start.enemy).map((e) => hexKey(enemyAt(e))),
    ]);
    const route = lockRoute(runner, area, blocked, doors, others, sight);
    // acabou de abordar: começa colada nele (distância = passos até ele − 1)
    const [first] = arrestQueue(runner, c.start.agent, [{ id: c.start.agent, hex: agent, stats: {} }], area, fixed);
    const track = [agent, ...first.path, ...route.flee];
    const vaults = agentVaults(track, vaultHexes(map), area, blocked);
    const hangar = map.structures!.find((s) => s.kind === 'hangar')!.rect;
    const inHangar = route.flee.filter((h) => inStructure(h, hangar)).length;
    return { route, distance: first.path.length - 1, vaults, inHangar };
  };

  it('fuga pelo aeroporto: o vigia sobe a pista, cruza o hangar e sai pelos fundos, pela esquerda', () => {
    const { route, distance, vaults, inHangar } = chaseOf('fuga-aeroporto');
    expect(route.escapes).toBe(true);
    expect(distance).toBeLessThanOrEqual(2);
    // corrida longa: sobe a pista antes de entrar no hangar
    expect(route.flee.length).toBeGreaterThanOrEqual(30);
    // sai do mapa pelo norte (fundos), do lado esquerdo
    const end = route.flee.at(-1)!;
    expect(end.row).toBeLessThan(0);
    expect(end.col).toBeLessThanOrEqual(16);
    // corre por dentro do hangar e passa pela porta dos fundos do oeste
    expect(inHangar).toBeGreaterThanOrEqual(10);
    expect(route.flee.some((h) => h.col === 14 && h.row === 4)).toBe(true);
    expect(route.stops.some((s) => s.kind === 'porta')).toBe(true);
    // na frente da porta ele contorna o caixote de meia altura: a escolha de pular aparece, com
    // um atalho que não passa à frente dele (o piloto, longe dali, não fecha o caminho)
    expect(vaults.map((v) => hexKey(v.over))).toEqual(['14,7']);
    expect(vaults[0].saves).toBeLessThanOrEqual(distance);
  });

  it('fuga pela direita: o vigia cruza a pista e some na mata do leste, sem entrar no hangar', () => {
    const { route, distance, vaults, inHangar } = chaseOf('fuga-aeroporto-direita');
    expect(route.escapes).toBe(true);
    expect(distance).toBeLessThanOrEqual(2);
    expect(route.flee.length).toBeGreaterThanOrEqual(25);
    // sai pela borda do leste
    const start = route.flee[0];
    const end = route.flee.at(-1)!;
    expect(end.col).toBeGreaterThan(start.col + 25);
    expect(inHangar).toBe(0);
    expect(route.stops).toEqual([]);
    expect(vaults).toEqual([]);
  });

  it('fuga pelos fundos do hangar: o garimpeiro do portão cruza o fundo do hangar e sai pela porta do oeste', () => {
    const c = findTestCase('fuga-aeroporto-fundos')!;
    // começa no posto de sempre
    expect(c.enemies!['garimpeiro'].hex).toEqual(findMap('aeroporto')!.enemies.find((e) => e.id === 'garimpeiro')!.patrol[0]);
    const { route, distance, inHangar } = chaseOf('fuga-aeroporto-fundos');
    expect(route.escapes).toBe(true);
    expect(distance).toBeLessThanOrEqual(2);
    expect(inHangar).toBeGreaterThanOrEqual(20);
    // corre pelo fundo do hangar (fileiras de cima), de leste a oeste, até a porta dos fundos
    const back = route.flee.filter((h) => inStructure(h, findMap('aeroporto')!.structures![0].rect) && h.row <= 7);
    expect(back.length).toBeGreaterThanOrEqual(8);
    expect(route.flee.some((h) => h.col === 14 && h.row === 4)).toBe(true);
    expect(route.stops.some((s) => s.kind === 'porta')).toBe(true);
    const end = route.flee.at(-1)!;
    expect(end.row).toBeLessThan(0);
  });
});
