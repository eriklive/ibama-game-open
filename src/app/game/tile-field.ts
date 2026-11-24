import * as THREE from 'three';
import { HexCoord, hexKey, hexToWorld } from './hex';

/** Um hexágono jogável: estado de pintura e de flutuação, escrito nas instâncias por `flush`. */
export interface HexTile {
  coord: HexCoord;
  index: number;
  x: number;
  z: number;
  /** Cor de repouso (chão, mata, parede…). */
  baseColor: THREE.Color;
  /** Cor mostrada agora e brilho (emissivo) próprio. */
  color: THREE.Color;
  emissive: THREE.Color;
  /** Altura-alvo (a animação aproxima `y` dela). */
  lift: number;
  y: number;
  /** Dentro do raio carregado. */
  visible: boolean;
  /** Objetos presos ao hexágono (paredes): acompanham a altura e a visibilidade. */
  attached: { object: THREE.Object3D; y: number }[];
  /**
   * Giro da virada do Modo Corrida (radianos, em volta de `TileField.tiltAxis`): 0 assentado,
   * π/2 de pé; a partir de `TILT_HIDDEN` o hexágono some (virou: o verso é outro mapa).
   */
  tilt: number;
}

/** Giro a partir do qual o hexágono virado some. */
export const TILT_HIDDEN = Math.PI / 2 + 0.6;
/** Quanto o hexágono sobe no meio do giro (de pé). */
const TILT_LIFT = 0.9;

interface Decal {
  mesh: THREE.InstancedMesh;
  local: THREE.Matrix4[];
  byTile: Map<number, number[]>;
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Chão da missão em poucas malhas instanciadas: os prismas (cor e brilho por hexágono),
 * os contornos (um só desenho de linhas) e os enfeites presos ao chão (sulcos, faixas).
 * Mudar a cor, o brilho ou a altura de um hexágono só marca o hexágono; `flush` envia à
 * placa de vídeo apenas os trechos que mudaram.
 */
export class TileField {
  readonly root = new THREE.Group();
  readonly tiles = new Map<string, HexTile>();
  readonly list: HexTile[] = [];
  readonly mesh: THREE.InstancedMesh;
  private readonly emissive: THREE.InstancedBufferAttribute;
  private readonly lines: THREE.LineSegments;
  private readonly linePos: THREE.BufferAttribute;
  /** Contorno de cima de um hexágono, relativo ao centro (x, y, z por vértice). */
  private readonly segment: Float32Array;
  private readonly decals: Decal[] = [];
  private readonly dirty = new Set<number>();
  private readonly m = new THREE.Matrix4();
  private readonly lift = new THREE.Matrix4();
  private readonly turn = new THREE.Matrix4();
  /** Eixo (no chão) em volta do qual os hexágonos giram na virada. */
  readonly tiltAxis = new THREE.Vector3(1, 0, 0);

  constructor(
    hexes: readonly HexCoord[],
    readonly prism: THREE.BufferGeometry,
    size: number,
    baseColor: (h: HexCoord) => number,
    outline: THREE.LineBasicMaterial,
  ) {
    const n = hexes.length;
    const material = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
    // brilho por instância: soma um atributo ao emissivo do material
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 instanceEmissive;\nvarying vec3 vInstanceEmissive;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInstanceEmissive = instanceEmissive;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vInstanceEmissive;')
        .replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive + vInstanceEmissive;');
    };
    this.mesh = new THREE.InstancedMesh(prism, material, Math.max(1, n));
    this.mesh.count = n;
    this.mesh.receiveShadow = true;
    this.emissive = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, n) * 3), 3);
    this.emissive.setUsage(THREE.DynamicDrawUsage);
    this.mesh.geometry = prism.clone();
    this.mesh.geometry.setAttribute('instanceEmissive', this.emissive);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color());
    this.mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);

    const edges = new THREE.EdgesGeometry(prism);
    const pos = edges.getAttribute('position');
    const top: number[] = [];
    for (let i = 0; i < pos.count; i += 2) {
      if (Math.abs(pos.getY(i)) < 1e-3 && Math.abs(pos.getY(i + 1)) < 1e-3) {
        top.push(pos.getX(i), 0.002, pos.getZ(i), pos.getX(i + 1), 0.002, pos.getZ(i + 1));
      }
    }
    edges.dispose();
    this.segment = new Float32Array(top);
    this.linePos = new THREE.BufferAttribute(new Float32Array(this.segment.length * n), 3);
    this.linePos.setUsage(THREE.DynamicDrawUsage);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', this.linePos);
    this.lines = new THREE.LineSegments(lineGeo, outline);
    this.lines.frustumCulled = false;

    hexes.forEach((coord, index) => {
      const p = hexToWorld(coord, size);
      const color = new THREE.Color(baseColor(coord));
      const tile: HexTile = {
        coord, index, x: p.x, z: p.z, baseColor: color, color: color.clone(), emissive: new THREE.Color(0),
        lift: 0, y: 0, visible: true, attached: [], tilt: 0,
      };
      this.tiles.set(hexKey(coord), tile);
      this.list.push(tile);
    });
    this.root.add(this.mesh, this.lines);
    this.markAll();
    this.flush();
    this.mesh.computeBoundingSphere();
    // margem para os hexágonos que flutuam
    if (this.mesh.boundingSphere) this.mesh.boundingSphere.radius += 1;
    lineGeo.computeBoundingSphere();
  }

  get(h: HexCoord): HexTile | undefined {
    return this.tiles.get(hexKey(h));
  }

  mark(tile: HexTile): void {
    this.dirty.add(tile.index);
  }

  markAll(): void {
    for (const t of this.list) this.dirty.add(t.index);
  }

  setVisible(tile: HexTile, visible: boolean): void {
    if (tile.visible === visible) return;
    tile.visible = visible;
    for (const a of tile.attached) a.object.visible = visible;
    this.mark(tile);
  }

  /** Prende um objeto ao hexágono (posicionado no centro dele, na altura `y` de repouso). */
  attach(tile: HexTile, object: THREE.Object3D, y = 0): void {
    object.position.set(tile.x, y + tile.y, tile.z);
    object.visible = tile.visible;
    tile.attached.push({ object, y });
    this.root.add(object);
  }

  /**
   * Enfeites presos ao chão (uma malha instanciada por tipo). `items` traz, para cada
   * peça, o hexágono e a matriz relativa ao centro dele.
   */
  addDecals(geometry: THREE.BufferGeometry, material: THREE.Material, items: { tile: HexTile; local: THREE.Matrix4 }[]): void {
    if (!items.length) return;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const decal: Decal = { mesh, local: [], byTile: new Map() };
    items.forEach(({ tile, local }, i) => {
      decal.local.push(local);
      const list = decal.byTile.get(tile.index) ?? [];
      list.push(i);
      decal.byTile.set(tile.index, list);
      this.writeDecal(decal, i, tile);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    if (mesh.boundingSphere) mesh.boundingSphere.radius += 1;
    this.decals.push(decal);
    this.root.add(mesh);
  }

  /** Hexágono atingido pelo raio (ou `undefined`). */
  pick(raycaster: THREE.Raycaster): HexCoord | undefined {
    const hit = raycaster.intersectObject(this.mesh, false)[0];
    return hit?.instanceId !== undefined ? this.list[hit.instanceId]?.coord : undefined;
  }

  /** Escreve nas instâncias o que mudou desde o último quadro. */
  flush(): void {
    if (!this.dirty.size) return;
    const full = this.dirty.size > 256;
    const matrix = this.mesh.instanceMatrix;
    const color = this.mesh.instanceColor!;
    const emissive = this.emissive;
    const seg = this.segment;
    const lines = this.linePos.array as Float32Array;
    for (const i of this.dirty) {
      const t = this.list[i];
      this.mesh.setMatrixAt(i, this.tileMatrix(t));
      this.mesh.setColorAt(i, t.color);
      emissive.setXYZ(i, t.emissive.r, t.emissive.g, t.emissive.b);
      const o = i * seg.length;
      // virando, o contorno some (ele é desenhado chapado)
      const shown = t.visible && t.tilt <= 0;
      for (let k = 0; k < seg.length; k += 3) {
        lines[o + k] = shown ? seg[k] + t.x : 0;
        lines[o + k + 1] = shown ? seg[k + 1] + t.y : -1000;
        lines[o + k + 2] = shown ? seg[k + 2] + t.z : 0;
      }
      for (const a of t.attached) a.object.position.y = a.y + t.y;
      for (const d of this.decals) {
        const pieces = d.byTile.get(i);
        if (!pieces) continue;
        for (const p of pieces) this.writeDecal(d, p, t);
        if (!full) for (const p of pieces) d.mesh.instanceMatrix.addUpdateRange(p * 16, 16);
        d.mesh.instanceMatrix.needsUpdate = true;
      }
      if (!full) {
        matrix.addUpdateRange(i * 16, 16);
        color.addUpdateRange(i * 3, 3);
        emissive.addUpdateRange(i * 3, 3);
        this.linePos.addUpdateRange(o, seg.length);
      }
    }
    if (full) {
      for (const attr of [matrix, color, emissive, this.linePos, ...this.decals.map((d) => d.mesh.instanceMatrix)]) {
        attr.clearUpdateRanges();
      }
    }
    matrix.needsUpdate = color.needsUpdate = emissive.needsUpdate = this.linePos.needsUpdate = true;
    this.dirty.clear();
  }

  /** Matriz do hexágono: no lugar, girando na virada ou escondido. */
  private tileMatrix(t: HexTile): THREE.Matrix4 {
    if (!t.visible || t.tilt >= TILT_HIDDEN) return ZERO;
    this.m.makeTranslation(t.x, t.y, t.z);
    if (t.tilt <= 0) return this.m;
    this.m.makeTranslation(t.x, t.y + Math.sin(Math.min(t.tilt, Math.PI / 2)) * TILT_LIFT, t.z);
    return this.m.multiply(this.turn.makeRotationAxis(this.tiltAxis, -t.tilt));
  }

  /** Gira um hexágono (virada do Modo Corrida); marca só se mudou. */
  setTilt(tile: HexTile, tilt: number): void {
    if (Math.abs(tile.tilt - tilt) < 1e-4) return;
    tile.tilt = tilt;
    this.mark(tile);
  }

  private writeDecal(d: Decal, i: number, tile: HexTile): void {
    if (!tile.visible || tile.tilt > 0) {
      d.mesh.setMatrixAt(i, ZERO);
      return;
    }
    this.lift.makeTranslation(tile.x, tile.y, tile.z);
    d.mesh.setMatrixAt(i, this.m.multiplyMatrices(this.lift, d.local[i]));
  }
}
