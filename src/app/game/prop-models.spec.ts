import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { METER, heightOf } from './character-model';
import {
  PropInfo,
  buildBed,
  buildCabinet,
  buildDiningTable,
  buildKeyBoard,
  buildNightstand,
  buildShelves,
  buildTvRack,
  northWallGap,
  southWallGap,
} from './prop-models';

/** Malhas que vão para a placa de vídeo (material visível), sem contar as escondidas. */
const drawn = (g: THREE.Object3D): THREE.Mesh[] => {
  const out: THREE.Mesh[] = [];
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.visible && (m.material as THREE.Material).visible) out.push(m);
  });
  return out;
};

const sizeOf = (o: THREE.Object3D): THREE.Vector3 => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
const meters = (units: number): number => units / METER;
/** Caixa só da peça (sem a área de toque e o destaque, que são filhos dela). */
const itemBox = (info: PropInfo): THREE.Box3 => info.item.geometry.boundingBox!.clone();

describe('móveis com zoom', () => {
  const agent = heightOf(1.7);

  it('quadro de chaves: duas malhas (o corpo e a chave do avião), na escala dos agentes', () => {
    const g = buildKeyBoard(northWallGap(20, 0.18));
    const info = g.userData['prop'] as PropInfo;
    expect(drawn(g)).toHaveLength(2);
    expect(drawn(g)).toContain(info.item);
    // a bancada na altura da cintura, o quadro na altura do peito: tudo abaixo da cabeça do agente
    const top = new THREE.Box3().setFromObject(g.children[0]).max.y;
    expect(meters(top)).toBeGreaterThan(1.5);
    expect(top).toBeLessThan(agent);
    // a chave é pequena (menos de 15 cm), e fica dentro do que o zoom enquadra
    const key = itemBox(info);
    expect(meters(Math.max(...key.getSize(new THREE.Vector3()).toArray()))).toBeLessThan(0.15);
    expect(info.focus.containsBox(key)).toBe(true);
  });

  it('armário do caseiro: duas malhas (o corpo e a arma), um pouco mais alto que os agentes, sem portas', () => {
    const g = buildCabinet(northWallGap(38, 0.18));
    const info = g.userData['prop'] as PropInfo;
    expect(drawn(g)).toHaveLength(2);
    expect(drawn(g)).toContain(info.item);
    const h = meters(sizeOf(g.children[0]).y);
    expect(h).toBeGreaterThan(1.8);
    expect(h).toBeLessThan(2.2);
    // a espingarda tem perto de 1,1 m e cabe dentro do armário
    const gun = itemBox(info);
    expect(meters(gun.getSize(new THREE.Vector3()).y)).toBeGreaterThan(1);
    expect(meters(gun.getSize(new THREE.Vector3()).y)).toBeLessThan(1.3);
    expect(info.focus.containsBox(gun)).toBe(true);
  });

  it('a área de toque e o destaque ficam presos à peça (somem junto quando ela é pega)', () => {
    for (const g of [buildKeyBoard(1.2), buildCabinet(1.4)]) {
      const info = g.userData['prop'] as PropInfo;
      expect(info.hit.parent).toBe(info.item);
      expect(info.glow.parent).toBe(info.item);
      expect(info.glow.visible).toBe(false);
      // a área de toque é maior que a peça
      expect(sizeOf(info.hit).x).toBeGreaterThan(itemBox(info).getSize(new THREE.Vector3()).x);
    }
  });

  it('encostados na parede: a frente olha para dentro do cômodo', () => {
    const keys = buildKeyBoard(northWallGap(20, 0.18)).userData['prop'] as PropInfo;
    const cab = buildCabinet(northWallGap(38, 0.18)).userData['prop'] as PropInfo;
    expect(keys.facing.z).toBe(1);
    expect(cab.facing.x).toBe(-1);
    expect(northWallGap(21, 0.18)).toBeGreaterThan(northWallGap(20, 0.18));
  });
});

describe('móveis da casa', () => {
  it('mesa da sala: uma malha só, na altura de mesa de verdade (abaixo da cintura do agente)', () => {
    const g = buildDiningTable();
    expect(drawn(g)).toHaveLength(1);
    const size = sizeOf(g);
    expect(meters(size.y)).toBeGreaterThan(0.75);
    expect(meters(size.y)).toBeLessThan(1.1);
    // passa de 1,2 m no comprimento (norte–sul) e, com o banco, cabe no hexágono na largura
    expect(meters(size.z)).toBeGreaterThan(1.2);
    expect(size.x).toBeLessThan(2.2);
  });

  it('mesa comprida: o comprimento pedido, no sentido norte–sul (+Z)', () => {
    const size = sizeOf(buildDiningTable(2.9, 0.65));
    expect(meters(size.z)).toBeCloseTo(2.9, 1);
    expect(size.x).toBeLessThan(2.2);
  });

  it('prateleiras: encostadas na parede do fundo (−Z), altas, e variam com a semente', () => {
    const back = northWallGap(36, 0.18) - 0.02;
    const g = buildShelves(back, 1);
    expect(drawn(g)).toHaveLength(1);
    const box = new THREE.Box3().setFromObject(g);
    expect(box.min.z).toBeGreaterThanOrEqual(-back - 1e-6);
    expect(box.min.z).toBeLessThan(-back + 0.1);
    expect(meters(box.max.y)).toBeGreaterThan(1.5);
    // a semente muda a arrumação dos andares
    const positions = (seed: number) => (drawn(buildShelves(back, seed))[0].geometry.getAttribute('position').array as Float32Array).join();
    expect(positions(1)).not.toBe(positions(2));
  });

  it('rack da TV: baixo, encostado na divisória (+X), com o quadro de avião na parede acima', () => {
    const back = 1.5 - 0.09 - 0.02;
    const g = buildTvRack(back, 0.4);
    expect(drawn(g)).toHaveLength(1);
    const box = new THREE.Box3().setFromObject(g);
    expect(box.max.x).toBeLessThanOrEqual(back + 1e-6);
    // o quadro fica bem acima do rack (que é baixo)
    expect(meters(box.max.y)).toBeGreaterThan(1.6);
  });

  it('cama de solteiro: cabeceira encostada na parede (+Z), baixa e do tamanho de uma cama', () => {
    const head = southWallGap(38, 0.18) - 0.02;
    const g = buildBed(head);
    const box = new THREE.Box3().setFromObject(g);
    expect(box.max.z).toBeLessThanOrEqual(head + 1e-6);
    expect(box.max.z).toBeGreaterThan(head - 0.1);
    expect(meters(box.max.y)).toBeLessThan(1);
    expect(meters(box.getSize(new THREE.Vector3()).z)).toBeGreaterThan(1.85);
  });

  it('mesinha com abajur: o corpo e a cúpula (que acende)', () => {
    const g = buildNightstand(0, 0);
    expect(drawn(g)).toHaveLength(2);
    const shade = drawn(g).find((m) => (m.material as THREE.MeshStandardMaterial).emissiveIntensity > 0)!;
    expect(shade).toBeDefined();
    expect(meters(sizeOf(g).y)).toBeLessThan(1.1);
  });
});
