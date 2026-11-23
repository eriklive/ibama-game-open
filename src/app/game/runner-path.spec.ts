import { describe, expect, it } from 'vitest';
import { LANE_WIDTH, S3, buildPath, nearestOnPath, pathLength, pathPose, pathTurns, turnSide } from './runner-path';

// norte é −z: sobe 10√3, vira à esquerda (oeste) 12, vira à direita (norte) 6√3
const path = buildPath([
  { x: 0, z: 0 },
  { x: 0, z: -10 * S3 },
  { x: -12, z: -10 * S3 },
  { x: -12, z: -16 * S3 },
]);

describe('runner-path', () => {
  it('mede em fileiras e acha as esquinas com o lado de cada uma', () => {
    expect(path.length).toBe(3);
    expect(pathLength(path)).toBeCloseTo(10 + 12 / S3 + 6);
    expect(pathTurns(path).map((t) => [Math.round(t.at * 100) / 100, t.side])).toEqual([
      [10, 'esquerda'],
      [Math.round((10 + 12 / S3) * 100) / 100, 'direita'],
    ]);
    expect(turnSide({ dx: 0, dz: -1 }, { dx: 1, dz: 0 })).toBe('direita');
  });

  it('a faixa da esquerda fica à esquerda de quem corre, em qualquer trecho', () => {
    // subindo para o norte, esquerda é oeste (−x)
    expect(pathPose(path, 5, 0)).toMatchObject({ x: -LANE_WIDTH });
    // indo para o oeste, esquerda é o sul (+z)
    const p = pathPose(path, 10 + 6 / S3, 0);
    expect(p.z).toBeCloseTo(-10 * S3 + LANE_WIDTH);
    expect(p.yaw).toBeCloseTo(-Math.PI / 2);
  });

  it('na esquina a direção gira sem pular', () => {
    const before = pathPose(path, 9.9);
    const after = pathPose(path, 10.1);
    expect(Math.abs(before.yaw - after.yaw)).toBeLessThan(0.5);
    expect(Math.hypot(before.x - after.x, before.z - after.z)).toBeLessThan(1);
  });

  it('o ponto mais perto do caminho dá a distância e o lado', () => {
    const n = nearestOnPath(path, 2, -5 * S3);
    expect(n.dist).toBeCloseTo(2);
    expect(n.side).toBeCloseTo(2);
    expect(n.at).toBeCloseTo(5);
  });
});
