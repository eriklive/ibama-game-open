import { describe, expect, it } from 'vitest';
import { FrameCamera, FrameOptions, GROUP_FRAME, frameGroup } from './group-frame';

// a câmera de jogo em paisagem (ver `HexBoard.placePerspective`)
const cam: FrameCamera = { fovDeg: 40, aspect: 16 / 9, pitchDeg: 55, distPerZoom: 11.5, lead: 0.3 };
const loose: FrameOptions = { ...GROUP_FRAME, minZoom: 0.01, maxZoom: 100 };

describe('frameGroup', () => {
  it('sem pontos, não enquadra', () => {
    expect(frameGroup([], cam)).toBeNull();
  });

  it('mira o meio da caixa do agente e do alvo', () => {
    const f = frameGroup([{ x: 0, z: 0 }, { x: 4, z: -2 }, { x: 3, z: 1 }], cam, loose)!;
    expect(f.x).toBeCloseTo(2);
    expect(f.z).toBeCloseTo(-0.5);
  });

  it('a ordem dos pontos não muda nada', () => {
    const a = frameGroup([{ x: 1, z: 2 }, { x: -3, z: 0 }], cam, loose);
    const b = frameGroup([{ x: -3, z: 0 }, { x: 1, z: 2 }], cam, loose);
    expect(a).toEqual(b);
  });

  it('grupo mais espalhado afasta a câmera', () => {
    const near = frameGroup([{ x: 0, z: 0 }, { x: 1.7, z: 0 }], cam, loose)!;
    const wide = frameGroup([{ x: 0, z: 0 }, { x: 8, z: 0 }], cam, loose)!;
    const deep = frameGroup([{ x: 0, z: 0 }, { x: 0, z: 8 }], cam, loose)!;
    expect(wide.zoom).toBeGreaterThan(near.zoom);
    expect(deep.zoom).toBeGreaterThan(near.zoom);
  });

  it('mais folga ou menos tela para o grupo afastam a câmera', () => {
    const pts = [{ x: 0, z: 0 }, { x: 2, z: 1 }];
    const base = frameGroup(pts, cam, loose)!;
    expect(frameGroup(pts, cam, { ...loose, padding: loose.padding * 2 })!.zoom).toBeGreaterThan(base.zoom);
    expect(frameGroup(pts, cam, { ...loose, fill: 0.4 })!.zoom).toBeGreaterThan(base.zoom);
  });

  it('em retrato (tela estreita) precisa afastar mais para caber na largura', () => {
    const pts = [{ x: 0, z: 0 }, { x: 6, z: 0 }];
    const land = frameGroup(pts, cam, loose)!;
    const port = frameGroup(pts, { ...cam, aspect: 9 / 16 }, loose)!;
    expect(port.zoom).toBeGreaterThan(land.zoom);
  });

  it('o grupo inteiro cabe na tela com a câmera que sai da conta', () => {
    const pts = [{ x: -1, z: 0.5 }, { x: 2.5, z: -1 }];
    const f = frameGroup(pts, cam, loose)!;
    const dist = f.zoom * cam.distPerZoom;
    const pitch = (cam.pitchDeg * Math.PI) / 180;
    const half = ((cam.fovDeg * Math.PI) / 180) / 2;
    // câmera como em `placePerspective`: mira `lead` à frente (+Z) do alvo, olhando de +Z
    const look = { x: f.x, z: f.z + cam.lead };
    const pos = { x: look.x, y: Math.sin(pitch) * dist, z: look.z + Math.cos(pitch) * dist };
    for (const p of pts) {
      // ângulo vertical do ponto em relação ao eixo da câmera
      const dz = pos.z - p.z;
      const below = Math.atan2(pos.y, dz);
      expect(Math.abs(below - pitch)).toBeLessThan(half);
      // ângulo horizontal (distância ao longo do eixo da câmera)
      const along = dz * Math.cos(pitch) + pos.y * Math.sin(pitch);
      expect(Math.abs(p.x - pos.x) / along).toBeLessThan(Math.tan(half) * cam.aspect);
    }
  });

  it('respeita os limites de zoom', () => {
    const close = frameGroup([{ x: 0, z: 0 }], cam, { ...GROUP_FRAME, padding: 0.1 })!;
    expect(close.zoom).toBe(GROUP_FRAME.minZoom);
    const far = frameGroup([{ x: -50, z: 0 }, { x: 50, z: 0 }], cam)!;
    expect(far.zoom).toBe(GROUP_FRAME.maxZoom);
  });

  it('agente colado nos suprimentos aproxima em relação à câmera de jogo (zoom 1)', () => {
    // dois hexágonos vizinhos (≈ 1,73 de distância) e a pilha ao lado
    const f = frameGroup([{ x: 0, z: 0 }, { x: 1.73, z: 0 }, { x: 2.6, z: -1.5 }], cam)!;
    expect(f.zoom).toBeLessThan(1);
  });
});
