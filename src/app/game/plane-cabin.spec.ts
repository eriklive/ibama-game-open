import { describe, expect, it } from 'vitest';
import { hexDistance, hexKey } from './hex';
import { MAPS, blockedHexes, lowCoverHexes } from './maps';
import { INITIAL_PLANE } from './plane';
import {
  CABIN_CLUTTER,
  CABIN_GPS,
  CABIN_ITEMS,
  CABIN_RADIO,
  CabinEvent,
  INITIAL_CABIN,
  cabinBuilt,
  cabinClutter,
  cabinItem,
  cabinItemsLeft,
  cabinStep,
  cabinSummary,
  canEnterPlane,
  planeDoorSpot,
} from './plane-cabin';

const run = (...events: CabinEvent[]) => events.reduce(cabinStep, INITIAL_CABIN);

describe('entrar no avião', () => {
  it('só entra com a chave e com o avião inteiro', () => {
    expect(canEnterPlane(INITIAL_PLANE, false)).toBe(false);
    expect(canEnterPlane({ ...INITIAL_PLANE, hasKey: true }, false)).toBe(true);
    expect(canEnterPlane({ ...INITIAL_PLANE, hasKey: true }, true)).toBe(false);
  });

  it('anda até a porta, abre, fica dentro e sai', () => {
    let s = cabinStep(INITIAL_CABIN, { type: 'enter', agent: 'ana' });
    expect(s).toMatchObject({ stage: 'approaching', agent: 'ana' });
    s = cabinStep(s, { type: 'arrived' });
    expect(s.stage).toBe('opening');
    s = cabinStep(s, { type: 'opened' });
    expect(s.stage).toBe('inside');
    s = cabinStep(s, { type: 'leave' });
    expect(s.stage).toBe('leaving');
    expect(cabinStep(s, { type: 'closed' })).toEqual(INITIAL_CABIN);
  });

  it('evento fora de hora não muda nada', () => {
    expect(run({ type: 'arrived' })).toEqual(INITIAL_CABIN);
    expect(run({ type: 'leave' })).toEqual(INITIAL_CABIN);
    const inside = run({ type: 'enter', agent: 'ana' }, { type: 'arrived' }, { type: 'opened' });
    // já dentro: outro "entrar" não troca quem está lá
    expect(cabinStep(inside, { type: 'enter', agent: 'bruno' })).toBe(inside);
    // abrir de novo não pula etapas
    expect(cabinStep(run({ type: 'enter', agent: 'ana' }), { type: 'opened' }).stage).toBe('approaching');
  });

  it('o interior só é montado com alguém dentro', () => {
    expect(cabinBuilt(INITIAL_CABIN)).toBe(false);
    expect(cabinBuilt(run({ type: 'enter', agent: 'ana' }))).toBe(false);
    expect(cabinBuilt(run({ type: 'enter', agent: 'ana' }, { type: 'arrived' }))).toBe(false);
    const inside = run({ type: 'enter', agent: 'ana' }, { type: 'arrived' }, { type: 'opened' });
    expect(cabinBuilt(inside)).toBe(true);
    expect(cabinBuilt(cabinStep(inside, { type: 'leave' }))).toBe(false);
  });

  it('recomeçar zera em qualquer etapa', () => {
    expect(run({ type: 'enter', agent: 'ana' }, { type: 'reset' })).toEqual(INITIAL_CABIN);
  });
});

describe('peças da cabine', () => {
  it('GPS e rádio estão lá até serem pegos', () => {
    expect(cabinItemsLeft(new Set()).map((i) => i.id)).toEqual([CABIN_GPS, CABIN_RADIO]);
    expect(cabinItemsLeft(new Set([CABIN_GPS])).map((i) => i.id)).toEqual([CABIN_RADIO]);
    expect(cabinItemsLeft(new Set([CABIN_GPS, CABIN_RADIO]))).toEqual([]);
    expect(cabinItem(CABIN_RADIO, new Set())?.short).toBe('rádio');
    expect(cabinItem(CABIN_RADIO, new Set([CABIN_RADIO]))).toBeNull();
    expect(cabinItem('arma', new Set())).toBeNull();
  });

  it('não usam o id de outro achado do mapa', () => {
    const ids = new Set((MAPS.flatMap((m) => m.hidden ?? [])).map((h) => h.id));
    for (const i of CABIN_ITEMS) expect(ids.has(i.id)).toBe(false);
  });

  it('a ficha diz o que sobrou', () => {
    // a ficha não entrega o que tem na cabine: isso é com a percepção
    for (const found of [new Set<string>(), new Set([CABIN_GPS]), new Set([CABIN_RADIO])]) {
      expect(cabinSummary(found)).not.toContain('GPS');
      expect(cabinSummary(found)).not.toContain('rádio');
      expect(cabinSummary(found)).toContain('Deslize');
    }
    expect(cabinSummary(new Set([CABIN_GPS, CABIN_RADIO]))).toContain('vazio');
  });

  it('tocar no resto da cabine gira as frases, só com alguém dentro', () => {
    let s = run({ type: 'enter', agent: 'ana' }, { type: 'arrived' }, { type: 'opened' });
    expect(cabinClutter(s)).toBe(CABIN_CLUTTER[0]);
    s = cabinStep(s, { type: 'poke' });
    expect(cabinClutter(s)).toBe(CABIN_CLUTTER[1]);
    expect(cabinStep(INITIAL_CABIN, { type: 'poke' }).pokes).toBe(0);
  });
});

describe('porta da cabine', () => {
  const map = MAPS.find((m) => m.id === 'aeroporto')!;
  const plane = map.plane ?? [];
  const solid = new Set([...blockedHexes(map), ...lowCoverHexes(map)]);

  it('no aeroporto, fica colada no avião, do lado oeste, livre', () => {
    const spot = planeDoorSpot(plane, solid)!;
    expect(spot).not.toBeNull();
    expect(solid.has(hexKey(spot))).toBe(false);
    expect(Math.min(...plane.map((h) => hexDistance(h, spot)))).toBe(1);
    // a oeste do meio do avião (colunas 16–24)
    expect(spot.col).toBeLessThan(20);
    expect(spot).toEqual({ col: 18, row: 11 });
  });

  it('com a vaga ocupada, vai para a mais perto que sobrar', () => {
    const busy = new Set([...solid, '18,11']);
    const spot = planeDoorSpot(plane, busy)!;
    expect(spot).not.toBeNull();
    expect(hexKey(spot)).not.toBe('18,11');
    expect(busy.has(hexKey(spot))).toBe(false);
  });

  it('sem avião, sem porta', () => {
    expect(planeDoorSpot([], new Set())).toBeNull();
  });
});
