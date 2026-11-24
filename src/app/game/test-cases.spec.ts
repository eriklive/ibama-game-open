import { describe, expect, it } from 'vitest';
import {
  CHARACTERS,
  MAPS,
  blockedHexes,
  findMap,
  inStructure,
  lowCoverHexes,
  playArea,
} from './maps';
import { agentSight, arrestQueue, chaseCandidates, lockRoute, targetChoices } from './chase';
import { isOpen, spawnDoors } from './door';
import { HexCoord, hexKey } from './hex';
import { TEST_CASES, findTestCase } from './test-cases';
import { runnerStart } from './runner-maps';

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
      const runners = c.start.kind === 'chase' ? [c.start.enemy] : c.start.enemies;
      for (const id of runners) expect(enemies).toContain(id);
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
   * inimigos, na posição do caso ou no começo da patrulha, bloqueiam), a distância inicial e o
   * mapa de corrida que ela abre (Modo Corrida).
   */
  const chaseOf = (id: string) => {
    const c = findTestCase(id)!;
    if (c.start.kind !== 'chase') throw new Error(`${id} não começa numa perseguição`);
    const start = c.start;
    const map = MAPS.find((m) => m.id === c.mapId)!;
    const area = playArea(map);
    const fixed = blockedHexes(map);
    const doors = spawnDoors(map.doors ?? [], map.doorStates);
    const closed = [...doors].filter(([, d]) => !isOpen(d)).map(([k]) => k);
    const positions = map.starts.map((h, i) => c.agents?.[CHARACTERS[i].id] ?? h);
    const agent = c.agents![start.agent];
    const others = positions.filter((h) => h !== agent);
    const sight = agentSight(positions, area, new Set([...fixed, ...closed]));
    const enemyAt = (e: { id: string; patrol: HexCoord[] }) => c.enemies?.[e.id]?.hex ?? e.patrol[0];
    const runner = enemyAt(map.enemies.find((e) => e.id === start.enemy)!);
    const blocked = new Set([
      ...fixed,
      ...lowCoverHexes(map),
      ...map.enemies.filter((e) => e.id !== start.enemy).map((e) => hexKey(enemyAt(e))),
    ]);
    const route = lockRoute(runner, area, blocked, doors, others, sight);
    // acabou de abordar: começa colada nele (distância = passos até ele − 1)
    const [first] = arrestQueue(runner, start.agent, [{ id: start.agent, hex: agent, stats: {} }], area, fixed);
    const hangar = map.structures!.find((s) => s.kind === 'hangar')!.rect;
    const inHangar = route.flee.filter((h) => inStructure(h, hangar)).length;
    // passa por alguma porta fechada no caminho (ele arromba sem parar, na corrida)
    const throughDoor = route.flee.some((h) => doors.has(hexKey(h)) && !isOpen(doors.get(hexKey(h))!));
    const race = runnerStart(runner, route.flee, map);
    return { route, distance: first.path.length - 1, inHangar, throughDoor, race };
  };

  it('fuga pelo aeroporto: o vigia sobe a pista, cruza o hangar e sai pelos fundos, pela esquerda', () => {
    const { route, distance, inHangar, throughDoor, race } = chaseOf('fuga-aeroporto');
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
    expect(throughDoor).toBe(true);
    // na corrida: o mapa A (por dentro do hangar), largando na pista
    expect(race).toMatchObject({ id: 'A', zone: { id: 'pista' } });
  });

  it('fuga pela direita: o vigia cruza a pista e some na mata do leste, sem entrar no hangar', () => {
    const { route, distance, inHangar, throughDoor, race } = chaseOf('fuga-aeroporto-direita');
    expect(route.escapes).toBe(true);
    expect(distance).toBeLessThanOrEqual(2);
    expect(route.flee.length).toBeGreaterThanOrEqual(25);
    // sai pela borda do leste
    const start = route.flee[0];
    const end = route.flee.at(-1)!;
    expect(end.col).toBeGreaterThan(start.col + 25);
    expect(inHangar).toBe(0);
    expect(throughDoor).toBe(false);
    // na corrida: o mapa B (pela lateral do hangar)
    expect(race.id).toBe('B');
  });

  it('fuga pelos fundos do hangar: o garimpeiro do portão cruza o fundo do hangar e sai pela porta do oeste', () => {
    const c = findTestCase('fuga-aeroporto-fundos')!;
    // começa no posto de sempre
    expect(c.enemies!['garimpeiro'].hex).toEqual(findMap('aeroporto')!.enemies.find((e) => e.id === 'garimpeiro')!.patrol[0]);
    const { route, distance, inHangar, throughDoor, race } = chaseOf('fuga-aeroporto-fundos');
    expect(route.escapes).toBe(true);
    expect(distance).toBeLessThanOrEqual(2);
    expect(inHangar).toBeGreaterThanOrEqual(20);
    // corre pelo fundo do hangar (fileiras de cima), de leste a oeste, até a porta dos fundos
    const back = route.flee.filter((h) => inStructure(h, findMap('aeroporto')!.structures![0].rect) && h.row <= 7);
    expect(back.length).toBeGreaterThanOrEqual(8);
    expect(route.flee.some((h) => h.col === 14 && h.row === 4)).toBe(true);
    expect(throughDoor).toBe(true);
    expect(race.id).toBe('A');
    const end = route.flee.at(-1)!;
    expect(end.row).toBeLessThan(0);
  });

  it('dois fugindo: só Clara alcança os dois garimpeiros, e eles fogem para lados diferentes', () => {
    const c = findTestCase('dois-fugindo-aeroporto')!;
    if (c.start.kind !== 'targets') throw new Error('o caso abre a escolha de alvo');
    const map = MAPS.find((m) => m.id === c.mapId)!;
    const area = playArea(map);
    const fixed = blockedHexes(map);
    const doors = spawnDoors(map.doors ?? [], map.doorStates);
    const closed = [...doors].filter(([, d]) => !isOpen(d)).map(([k]) => k);
    const positions = map.starts.map((h, i) => c.agents?.[CHARACTERS[i].id] ?? h);
    const enemyAt = (e: { id: string; patrol: HexCoord[] }) => c.enemies?.[e.id]?.hex ?? e.patrol[0];
    const all = map.enemies.map((e) => ({ id: e.id, hex: enemyAt(e) }));
    // como o jogo: carga, portas fechadas e os outros inimigos fecham o caminho (raio sem atributos)
    const walls = new Set([...fixed, ...lowCoverHexes(map), ...closed, ...all.map((e) => hexKey(e.hex))]);
    const agents = positions.map((hex, i) => ({ id: CHARACTERS[i].id, hex, stats: {} }));
    const hexOf = (id: string) => all.find((e) => e.id === id)!.hex;
    const offers = new Map(c.start.enemies.map((id) => [id, chaseCandidates(hexOf(id), agents, area, walls)]));
    const choices = targetChoices(offers);
    expect([...choices.keys()]).toEqual(['clara']);
    expect([...choices.get('clara')!].sort()).toEqual([...c.start.enemies].sort());
    // cada um tem a sua rota de fuga, para lados diferentes
    const sight = agentSight(positions, area, new Set([...fixed, ...closed]));
    const others = positions.filter((h) => h !== c.agents!['clara']);
    const ends = c.start.enemies.map((id) => {
      const me = hexOf(id);
      const blocked = new Set([...fixed, ...lowCoverHexes(map), ...all.filter((e) => e.id !== id).map((e) => hexKey(e.hex))]);
      const route = lockRoute(me, area, blocked, doors, others, sight);
      expect(route.escapes, id).toBe(true);
      return route.flee.at(-1)!;
    });
    expect(hexKey(ends[0])).not.toBe(hexKey(ends[1]));
  });
});
