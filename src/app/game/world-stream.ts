import * as THREE from 'three';
import { HEX_STEP, HexCoord, hexToWorld } from './hex';
import { hashHex, Terrain } from './world';

/** Lado de um bloco, em hexágonos (colunas × fileiras do offset). */
const CHUNK = 12;

export interface StreamOptions {
  hexSize: number;
  /** Prisma do chão (topo em y = 0), o mesmo dos hexágonos da missão. */
  prism: THREE.BufferGeometry;
  outline: THREE.LineBasicMaterial;
  /** O que há em cada hexágono do mundo; `null` = fora do mundo (nada é desenhado). */
  terrain(h: HexCoord): Terrain | null;
  /** Hexágono jogável: o chão dele é da missão (malha própria); aqui entram só as árvores. */
  isMission(h: HexCoord): boolean;
  /** Retângulo (em colunas e fileiras) que contém o mundo inteiro. */
  box: { minCol: number; maxCol: number; minRow: number; maxRow: number };
  /** Cor do chão de um hexágono de cenário. */
  groundColor(h: HexCoord, t: Terrain): number;
  /** Posições x dos sulcos de pneu da pista de terra (vazio = sem sulcos). */
  ruts: number[];
}

interface Chunk {
  key: string;
  cx: number;
  cy: number;
  group: THREE.Group;
  /** Montado com todos os hexágonos (inteiro dentro do raio) ou recortado na borda do raio. */
  full: boolean;
  /** Centro de carregamento para o qual foi montado. */
  center: { x: number; z: number };
}

/**
 * Renderização por raio: só existe na cena o que está a até `loadRadius` passos do
 * centro de carregamento. O mundo é dividido em blocos de 12 × 12 hexágonos; cada bloco
 * vira poucas malhas instanciadas (chão, contornos, troncos, copas, pinheiros, sulcos).
 *
 * Quando o centro da tela se afasta mais que `loadRadius - viewRadius` do centro de
 * carregamento, o centro muda para onde a câmera está: blocos que saíram do raio são
 * descartados e os que entraram vão para uma fila, montados alguns por quadro (com um
 * orçamento de milissegundos), do mais perto para o mais longe. Os blocos da borda do
 * raio são recortados hexágono a hexágono e remontados quando o centro muda; enquanto o
 * novo não fica pronto, o antigo continua na tela (sem buracos).
 */
export class WorldStream {
  private readonly chunks = new Map<string, Chunk>();
  private queue: { cx: number; cy: number; d: number }[] = [];
  private loadRadius = 65;
  private viewRadius = 40;
  readonly center = { x: 0, z: 0 };
  private hasCenter = false;
  private readonly forest = new Forest();
  private readonly groundMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  private readonly rutMat = new THREE.MeshStandardMaterial({ color: 0x6b4c2c, roughness: 1 });
  private readonly rutGeo = new THREE.BoxGeometry(1, 0.02, 1);
  /** Segmentos do contorno de cima de um hexágono (x, y, z por vértice). */
  private readonly outlineSegments: Float32Array;
  readonly root = new THREE.Group();
  /** Avisa quem desenha a missão que o centro mudou (para mostrar ou esconder hexágonos). */
  onRecenter?: () => void;

  constructor(private readonly opts: StreamOptions) {
    const edges = new THREE.EdgesGeometry(opts.prism);
    const pos = edges.getAttribute('position');
    const top: number[] = [];
    for (let i = 0; i < pos.count; i += 2) {
      // só as arestas de cima: as de baixo e as verticais quase não aparecem
      if (Math.abs(pos.getY(i)) < 1e-3 && Math.abs(pos.getY(i + 1)) < 1e-3) {
        top.push(pos.getX(i), 0.002, pos.getZ(i), pos.getX(i + 1), 0.002, pos.getZ(i + 1));
      }
    }
    edges.dispose();
    this.outlineSegments = new Float32Array(top);
    this.root.name = 'world-stream';
  }

  /** Raio pré-renderizado e raio de visão, em passos. Recalcula tudo. */
  setRadii(loadRadius: number, viewRadius: number): void {
    this.loadRadius = loadRadius;
    this.viewRadius = viewRadius;
    if (this.hasCenter) this.recenter(this.center.x, this.center.z);
  }

  /** Hexágono (pelo centro) dentro do raio pré-renderizado. */
  inLoadRadius(x: number, z: number, slack = 0): boolean {
    return Math.hypot(x - this.center.x, z - this.center.z) <= (this.loadRadius + slack) * HEX_STEP * this.opts.hexSize;
  }

  /**
   * Chamado a cada quadro com o ponto que a câmera mira. Muda o centro se precisar e
   * monta blocos da fila até gastar `budgetMs`.
   */
  update(focusX: number, focusZ: number, budgetMs: number): void {
    const limit = (this.loadRadius - this.viewRadius) * HEX_STEP * this.opts.hexSize;
    if (!this.hasCenter || Math.hypot(focusX - this.center.x, focusZ - this.center.z) > limit) {
      this.recenter(focusX, focusZ);
    }
    this.pump(budgetMs);
  }

  /** Monta já tudo o que a câmera vê (usado na abertura, antes do primeiro quadro). */
  warmUp(): void {
    const view = this.viewRadius * HEX_STEP * this.opts.hexSize + CHUNK * 2;
    const near = this.queue.filter((q) => q.d <= view);
    this.queue = this.queue.filter((q) => q.d > view);
    for (const q of near) this.build(q.cx, q.cy);
  }

  stats(): { chunks: number; pending: number; loadRadius: number; viewRadius: number } {
    return { chunks: this.chunks.size, pending: this.queue.length, loadRadius: this.loadRadius, viewRadius: this.viewRadius };
  }

  dispose(): void {
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    this.queue = [];
    this.forest.dispose();
    this.groundMat.dispose();
    this.rutMat.dispose();
    this.rutGeo.dispose();
    this.root.removeFromParent();
  }

  // ---------- centro e fila ----------

  private recenter(x: number, z: number): void {
    this.center.x = x;
    this.center.z = z;
    this.hasCenter = true;
    const wanted = new Map<string, { cx: number; cy: number; d: number; full: boolean }>();
    const r = this.loadRadius * HEX_STEP * this.opts.hexSize;
    const { box } = this.opts;
    const s = this.opts.hexSize;
    const colMin = Math.max(box.minCol, Math.floor((x - r) / (1.5 * s)) - 1);
    const colMax = Math.min(box.maxCol, Math.ceil((x + r) / (1.5 * s)) + 1);
    const rowMin = Math.max(box.minRow, Math.floor((z - r) / (HEX_STEP * s)) - 1);
    const rowMax = Math.min(box.maxRow, Math.ceil((z + r) / (HEX_STEP * s)) + 1);
    for (let cx = Math.floor(colMin / CHUNK); cx <= Math.floor(colMax / CHUNK); cx++) {
      for (let cy = Math.floor(rowMin / CHUNK); cy <= Math.floor(rowMax / CHUNK); cy++) {
        const b = this.chunkBounds(cx, cy);
        const nx = Math.min(Math.max(x, b.minX), b.maxX);
        const nz = Math.min(Math.max(z, b.minZ), b.maxZ);
        const d = Math.hypot(nx - x, nz - z);
        if (d > r) continue;
        const far = Math.max(Math.hypot(b.minX - x, b.minZ - z), Math.hypot(b.maxX - x, b.minZ - z),
          Math.hypot(b.minX - x, b.maxZ - z), Math.hypot(b.maxX - x, b.maxZ - z));
        wanted.set(`${cx},${cy}`, { cx, cy, d, full: far <= r });
      }
    }
    // sai o que deixou o raio; quem continua inteiro dentro fica como está
    for (const [key, c] of this.chunks) {
      if (!wanted.has(key)) {
        this.disposeChunk(c);
        this.chunks.delete(key);
      }
    }
    this.queue = [...wanted.entries()]
      .filter(([key, w]) => {
        const have = this.chunks.get(key);
        return !have || !(have.full && w.full);
      })
      .map(([, w]) => ({ cx: w.cx, cy: w.cy, d: w.d }))
      .sort((a, b) => a.d - b.d);
    this.onRecenter?.();
  }

  private pump(budgetMs: number): void {
    if (!this.queue.length) return;
    const start = performance.now();
    do {
      const next = this.queue.shift()!;
      this.build(next.cx, next.cy);
    } while (this.queue.length && performance.now() - start < budgetMs);
  }

  private chunkBounds(cx: number, cy: number) {
    const s = this.opts.hexSize;
    const c0 = cx * CHUNK;
    const r0 = cy * CHUNK;
    return {
      minX: 1.5 * s * c0 - s,
      maxX: 1.5 * s * (c0 + CHUNK - 1) + s,
      minZ: HEX_STEP * s * r0 - s,
      maxZ: HEX_STEP * s * (r0 + CHUNK - 0.5) + s,
    };
  }

  // ---------- montagem de um bloco ----------

  private build(cx: number, cy: number): void {
    const key = `${cx},${cy}`;
    const { opts } = this;
    const s = opts.hexSize;
    const r = this.loadRadius * HEX_STEP * s;
    let full = true;
    const groundHexes: { h: HexCoord; t: Terrain; x: number; z: number }[] = [];
    const treeHexes: HexCoord[] = [];
    for (let col = cx * CHUNK; col < (cx + 1) * CHUNK; col++) {
      for (let row = cy * CHUNK; row < (cy + 1) * CHUNK; row++) {
        const h = { col, row };
        const p = hexToWorld(h, s);
        if (Math.hypot(p.x - this.center.x, p.z - this.center.z) > r) {
          full = false;
          continue;
        }
        const t = opts.terrain(h);
        if (!t) continue;
        if (t.tree) treeHexes.push(h);
        if (!opts.isMission(h)) groundHexes.push({ h, t, x: p.x, z: p.z });
      }
    }

    const group = new THREE.Group();
    group.name = `chunk ${key}`;
    if (groundHexes.length) {
      const ground = new THREE.InstancedMesh(opts.prism, this.groundMat, groundHexes.length);
      const m = new THREE.Matrix4();
      const color = new THREE.Color();
      const lines = new Float32Array(this.outlineSegments.length * groundHexes.length);
      const seg = this.outlineSegments;
      const ruts: THREE.Matrix4[] = [];
      groundHexes.forEach(({ h, t, x, z }, i) => {
        ground.setMatrixAt(i, m.makeTranslation(x, 0, z));
        ground.setColorAt(i, color.set(opts.groundColor(h, t)));
        for (let k = 0; k < seg.length; k += 3) {
          lines[i * seg.length + k] = seg[k] + x;
          lines[i * seg.length + k + 1] = seg[k + 1];
          lines[i * seg.length + k + 2] = seg[k + 2] + z;
        }
        if (t.ground === 'dirt') ruts.push(...rutPieces(opts.ruts, x, z, s * 0.94));
      });
      ground.receiveShadow = true;
      ground.computeBoundingSphere();
      group.add(ground);
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(lines, 3));
      lineGeo.computeBoundingSphere();
      group.add(new THREE.LineSegments(lineGeo, opts.outline));
      if (ruts.length) {
        const rutMesh = new THREE.InstancedMesh(this.rutGeo, this.rutMat, ruts.length);
        ruts.forEach((mm, i) => rutMesh.setMatrixAt(i, mm));
        rutMesh.receiveShadow = true;
        rutMesh.computeBoundingSphere();
        group.add(rutMesh);
      }
    }
    for (const mesh of this.forest.build(treeHexes, s)) group.add(mesh);

    const old = this.chunks.get(key);
    if (old) this.disposeChunk(old);
    this.root.add(group);
    this.chunks.set(key, { key, cx, cy, group, full, center: { ...this.center } });
  }

  private disposeChunk(c: Chunk): void {
    c.group.removeFromParent();
    c.group.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) o.dispose();
      else if (o instanceof THREE.LineSegments) o.geometry.dispose();
    });
  }
}

/** Pedaços de sulco (caixas achatadas) que cruzam um hexágono de terra centrado em (x, z). */
export function rutPieces(ruts: number[], x: number, z: number, r: number): THREE.Matrix4[] {
  const out: THREE.Matrix4[] = [];
  for (const rx of ruts) {
    const dx = Math.abs(rx - x);
    if (dx >= r) continue;
    // corda vertical do hexágono "flat-top" na distância dx do centro
    const half = dx <= r / 2 ? (Math.sqrt(3) / 2) * r : Math.sqrt(3) * (r - dx);
    out.push(new THREE.Matrix4().compose(
      new THREE.Vector3(rx, 0.011, z),
      new THREE.Quaternion(),
      new THREE.Vector3(0.24, 1, half * 2),
    ));
  }
  return out;
}

type Kind = 'round' | 'pine' | 'tall' | 'bush';
const ARRANGEMENTS: { kind: Kind; r: number; a: number; s: number }[][] = [
  [{ kind: 'round', r: 0.1, a: 0, s: 1.25 }, { kind: 'bush', r: 0.55, a: 2.6, s: 1 }],
  [{ kind: 'round', r: 0.35, a: 0.4, s: 0.95 }, { kind: 'round', r: 0.38, a: 3.4, s: 0.8 }],
  [{ kind: 'pine', r: 0.2, a: 1, s: 1.2 }, { kind: 'pine', r: 0.5, a: 4, s: 0.75 }],
  [{ kind: 'tall', r: 0.15, a: 5, s: 1.1 }, { kind: 'round', r: 0.5, a: 2, s: 0.7 }, { kind: 'bush', r: 0.5, a: 3.8, s: 0.9 }],
  [{ kind: 'pine', r: 0.4, a: 0, s: 0.85 }, { kind: 'round', r: 0.42, a: 2.1, s: 0.75 }, { kind: 'tall', r: 0.4, a: 4.2, s: 0.8 }],
  [{ kind: 'tall', r: 0.3, a: 0.8, s: 1 }, { kind: 'tall', r: 0.35, a: 3.6, s: 0.8 }],
  [{ kind: 'round', r: 0, a: 0, s: 1.05 }],
];
const LEAVES = [0x2f6d3a, 0x3c7a42, 0x27603a, 0x4d8246, 0x5a8a4a, 0x356b55, 0x6b8f4a];
const NEEDLES = [0x1f5238, 0x285a40, 0x2f6648];
/** Tons do chão sob a mata. */
export const FOREST_FLOOR = [0x33683a, 0x2e6035, 0x386f3e];

const rnd = (h: HexCoord, i: number): number => hashHex(h.col, h.row, i);

/** Cor do chão de um hexágono com árvores (estável pela posição). */
export const forestFloor = (h: HexCoord): number => FOREST_FLOOR[Math.floor(rnd(h, 0) * 3)];

/**
 * Mata: cada hexágono sorteia (pela posição) um arranjo de árvores — copa redonda,
 * pinheiro, árvore alta e fina, arbusto — com tamanhos e tons diferentes. Cada bloco vira
 * só três malhas instanciadas (troncos, copas e pinheiros), com geometria e materiais
 * compartilhados entre os blocos.
 */
class Forest {
  private readonly trunkGeo = new THREE.CylinderGeometry(0.07, 0.11, 1, 6).translate(0, 0.5, 0);
  private readonly blobGeo = new THREE.IcosahedronGeometry(0.5, 1);
  private readonly coneGeo = new THREE.ConeGeometry(0.42, 1, 7).translate(0, 0.5, 0);
  private readonly trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 });
  private readonly blobMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  private readonly coneMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });

  build(trees: HexCoord[], size: number): THREE.InstancedMesh[] {
    if (!trees.length) return [];
    const trunks: { m: THREE.Matrix4 }[] = [];
    const blobs: { m: THREE.Matrix4; color: number }[] = [];
    const cones: { m: THREE.Matrix4; color: number }[] = [];
    const dummy = new THREE.Object3D();
    const place = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rot = 0): THREE.Matrix4 => {
      dummy.position.set(x, y, z);
      dummy.scale.set(sx, sy, sz);
      dummy.rotation.set(0, rot, 0);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    };
    for (const h of trees) {
      const c = hexToWorld(h, size);
      const turn = Math.floor(rnd(h, 1) * 6) * (Math.PI / 3);
      const arrangement = ARRANGEMENTS[Math.floor(rnd(h, 2) * ARRANGEMENTS.length)];
      arrangement.forEach(({ kind, r, a, s: base }, i) => {
        const s = base * (0.88 + rnd(h, 10 + i) * 0.24);
        const x = c.x + Math.cos(a + turn) * r;
        const z = c.z + Math.sin(a + turn) * r;
        const rot = rnd(h, 20 + i) * Math.PI * 2;
        const leaf = LEAVES[Math.floor(rnd(h, 30 + i) * LEAVES.length)];
        if (kind === 'bush') {
          blobs.push({ m: place(x, 0.16 * s, z, 0.55 * s, 0.4 * s, 0.55 * s, rot), color: leaf });
        } else if (kind === 'round') {
          trunks.push({ m: place(x, 0, z, s, 0.6 * s, s) });
          blobs.push({ m: place(x, 0.9 * s, z, s, 0.85 * s, s, rot), color: leaf });
        } else if (kind === 'tall') {
          trunks.push({ m: place(x, 0, z, 0.7 * s, 1.25 * s, 0.7 * s) });
          blobs.push({ m: place(x, 1.4 * s, z, 0.72 * s, 0.5 * s, 0.72 * s, rot), color: leaf });
        } else {
          trunks.push({ m: place(x, 0, z, 0.8 * s, 0.35 * s, 0.8 * s) });
          const color = NEEDLES[Math.floor(rnd(h, 30 + i) * NEEDLES.length)];
          cones.push({ m: place(x, 0.3 * s, z, s, s, s, rot), color });
          cones.push({ m: place(x, 0.85 * s, z, 0.7 * s, 0.75 * s, 0.7 * s, rot), color });
        }
      });
    }
    const out: THREE.InstancedMesh[] = [];
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, items: { m: THREE.Matrix4; color?: number }[]): void => {
      if (!items.length) return;
      const mesh = new THREE.InstancedMesh(geo, mat, items.length);
      const color = new THREE.Color();
      items.forEach((it, i) => {
        mesh.setMatrixAt(i, it.m);
        if (it.color !== undefined) mesh.setColorAt(i, color.set(it.color));
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // cada bloco é pequeno: a câmera descarta o que está fora da tela
      mesh.computeBoundingSphere();
      out.push(mesh);
    };
    add(this.trunkGeo, this.trunkMat, trunks);
    add(this.blobGeo, this.blobMat, blobs);
    add(this.coneGeo, this.coneMat, cones);
    return out;
  }

  dispose(): void {
    for (const g of [this.trunkGeo, this.blobGeo, this.coneGeo]) g.dispose();
    for (const m of [this.trunkMat, this.blobMat, this.coneMat]) m.dispose();
  }
}
