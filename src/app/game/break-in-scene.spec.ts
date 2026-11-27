import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BREAK_IN_SCENE, breakInVerdict, viewBlockers } from './break-in-scene';

const box = (x: number, y: number, z: number, size = 1): THREE.Mesh => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial());
  m.position.set(x, y, z);
  m.updateMatrixWorld(true);
  return m;
};

describe('BREAK_IN_SCENE', () => {
  it('a rolagem é mais lenta que a de antes (1 s) e o botão diz Confirmar', () => {
    expect(BREAK_IN_SCENE.rollMs).toBeGreaterThanOrEqual(2000);
    expect(BREAK_IN_SCENE.confirm).toBe('Confirmar');
  });
  it('a câmera fecha mais que no chute na porta', () => {
    expect(BREAK_IN_SCENE.zoom).toBeLessThan(0.66);
  });
});

describe('breakInVerdict', () => {
  const enemy = { name: 'Jô' };
  it('rendeu', () => {
    expect(breakInVerdict({ enemy, test: 'resist', outcome: 'surrender' })).toBe('Jô se rendeu!');
  });
  it('resistiu ou teve atitude: vai correr', () => {
    expect(breakInVerdict({ enemy, test: 'resist', outcome: 'flee' })).toContain('não se rendeu');
    expect(breakInVerdict({ enemy, test: 'attitude', outcome: 'flee' })).toContain('vai correr');
  });
  it('ficou parado', () => {
    expect(breakInVerdict({ enemy, test: 'attitude', outcome: 'stay' })).toContain('ficou parado');
  });
});

describe('viewBlockers', () => {
  const origin = new THREE.Vector3(0, 0, 10);
  const npc = [new THREE.Vector3(0, 0, 0)];

  it('pega o que está entre a câmera e o garimpeiro', () => {
    const wall = box(0, 0, 5);
    const aside = box(5, 0, 5);
    const behind = box(0, 0, -3);
    const hit = viewBlockers(origin, npc, [wall, aside, behind]);
    expect([...hit]).toEqual([wall]);
  });

  it('o que está colado nele não conta', () => {
    const chair = box(0, 0, 0.9, 0.4);
    expect(viewBlockers(origin, npc, [chair], { clearance: 1.2 }).size).toBe(0);
    expect(viewBlockers(origin, npc, [chair], { clearance: 0.1 }).has(chair)).toBe(true);
  });

  it('acerta peças dentro de grupos (o candidato é o grupo inteiro)', () => {
    const group = new THREE.Group();
    group.add(box(0, 0, 4));
    group.updateMatrixWorld(true);
    expect(viewBlockers(origin, npc, [group]).has(group)).toBe(true);
  });

  it('respeita o filtro do que está à mostra', () => {
    const roof = box(0, 0, 5);
    roof.visible = false;
    const shown = (o: THREE.Object3D) => o.visible;
    expect(viewBlockers(origin, npc, [roof], { shown }).size).toBe(0);
  });

  it('confere vários pontos do corpo', () => {
    const low = box(0, -2, 5);
    const points = [new THREE.Vector3(0, -2, 0), new THREE.Vector3(0, 2, 0)];
    expect(viewBlockers(new THREE.Vector3(0, 0, 10).setY(-2), points, [low]).has(low)).toBe(true);
  });
});
