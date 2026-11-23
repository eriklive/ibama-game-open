import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AuraLayer, auraOutline, splitHot } from './aura-layer';
import { HexCoord, hexKey, hexNeighbors } from './hex';

const key = (col: number, row: number) => hexKey({ col, row });
const ring = (h: HexCoord) => hexNeighbors(h).map(hexKey);

describe('contorno da aura', () => {
  it('um hexágono sozinho tem os 6 lados na fronteira', () => {
    const sides = auraOutline([key(4, 4)]);
    expect(sides).toHaveLength(6);
    // um lado para cada vizinho, sem repetir direção
    const angles = new Set(sides.map((s) => Math.round((s.angle * 180) / Math.PI)));
    expect(angles.size).toBe(6);
  });

  it('dois vizinhos dividem um lado e ele some do contorno', () => {
    const [n] = hexNeighbors({ col: 4, row: 4 });
    expect(auraOutline([key(4, 4), hexKey(n)])).toHaveLength(10);
  });

  it('o anel em volta de um aliado não abre buraco quando ele conta como dentro', () => {
    const center = { col: 5, row: 5 };
    const around = ring(center);
    // sem o aliado: 6 lados de dentro viram fronteira
    const open = auraOutline(around);
    const closed = auraOutline(around, [hexKey(center)]);
    expect(open.length - closed.length).toBe(6);
    expect(closed.every((s) => !(s.hex.col === center.col && s.hex.row === center.row))).toBe(true);
  });

  it('hexágonos que só contam como dentro não ganham lados próprios', () => {
    const sides = auraOutline([key(2, 2)], [key(9, 9)]);
    expect(sides.every((s) => hexKey(s.hex) === key(2, 2))).toBe(true);
  });
});

describe('aura acesa (agente dentro)', () => {
  it('acende só a parte ligada ao hexágono do agente', () => {
    const plane = ring({ col: 3, row: 3 });
    const supplies = ring({ col: 12, row: 12 });
    const { hot, cold } = splitHot([...plane, ...supplies], [plane[0]]);
    expect(new Set(hot)).toEqual(new Set(plane));
    expect(new Set(cold)).toEqual(new Set(supplies));
  });

  it('sem agente dentro, nada acende', () => {
    const plane = ring({ col: 3, row: 3 });
    expect(splitHot(plane, [key(20, 20)])).toEqual({ hot: [], cold: plane });
  });
});

describe('hexágono menor por cima (alcance dentro de uma aura de ação)', () => {
  const textures = { fill: new THREE.Texture(), fade: new THREE.Texture() };
  const style = { color: 0xa9e4ff, edge: 0xffffff, fill: 0.7, rim: 1 };
  const meshes = (layer: AuraLayer) => layer.root.children as THREE.Mesh[];
  const sideCount = (layer: AuraLayer) => (meshes(layer)[1].geometry.index?.count ?? 0) / 6;
  /** Maior distância do véu ao centro do hexágono (0,0), que fica na origem do mundo. */
  const maxRadius = (layer: AuraLayer) => {
    const pos = meshes(layer)[0].geometry.getAttribute('position');
    const c = new THREE.Vector3();
    let max = 0;
    for (let i = 0; i < pos.count; i++)
      max = Math.max(max, c.fromBufferAttribute(pos, i).setY(0).length());
    return max;
  };
  const [n] = hexNeighbors({ col: 0, row: 0 });

  it('cada hexágono tem o próprio contorno (os vizinhos não se juntam)', () => {
    const normal = new AuraLayer(style, textures, 0);
    const inset = new AuraLayer({ ...style, inset: 0.5 }, textures, 0);
    normal.set([key(0, 0), hexKey(n)]);
    inset.set([key(0, 0), hexKey(n)]);
    expect(sideCount(normal)).toBe(10);
    expect(sideCount(inset)).toBe(12);
  });

  it('o véu fica menor que o hexágono', () => {
    const normal = new AuraLayer(style, textures, 0);
    const inset = new AuraLayer({ ...style, inset: 0.5 }, textures, 0);
    normal.set([key(0, 0)]);
    inset.set([key(0, 0)]);
    expect(maxRadius(inset)).toBeCloseTo(maxRadius(normal) * 0.5, 3);
  });
});
