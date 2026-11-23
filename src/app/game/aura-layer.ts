import * as THREE from 'three';
import { HexCoord, hexKey, hexNeighbors, hexToWorld } from './hex';

/**
 * Auras como luz, não como tinta: o hexágono fica com a cor do chão e a aura é uma camada
 * semitransparente pousada por cima, em até três partes:
 *
 * - **véu**: um hexágono translúcido logo acima do topo, mais forte na borda que no centro;
 * - **contorno**: uma faixa clara só nos lados que dão para fora da região (diz "daqui até aqui");
 * - **cortina**: uma parede baixa de luz que some para cima, só no que é interativo.
 *
 * Cada `AuraLayer` desenha uma região com um estilo. A geometria é refeita só quando a região
 * muda; a respiração mexe apenas na opacidade dos materiais.
 */
export interface AuraStyle {
  /** Cor do véu e da cortina. */
  color: number;
  /** Cor do contorno. */
  edge: number;
  /** Opacidade do véu (o centro do hexágono recebe cerca de um terço disso). */
  fill: number;
  /** Opacidade do contorno. */
  rim: number;
  /** Altura da cortina (sem cortina quando ausente). */
  wall?: number;
  wallOpacity?: number;
  /** Respiração: velocidade (rad/s) e quanto da opacidade oscila (0..1). */
  breathe?: { speed: number; amount: number };
  /**
   * Hexágono menor, centrado (fração do tamanho normal): cada hexágono ganha o próprio contorno,
   * em vez de a região inteira ter um só. Serve para marcar um hexágono por cima de outra aura
   * (o alcance dentro da brasa do avião) sem apagar a de baixo.
   */
  inset?: number;
}

/** Lado de um hexágono na fronteira da região: o centro do hexágono e a direção (rad, plano XZ) para fora. */
export interface AuraSide {
  hex: HexCoord;
  angle: number;
}

/** Raio do véu (o prisma do chão tem 0,94). */
const FILL_RADIUS = 0.9;
/** Contorno: de dentro do hexágono até o meio da fresta entre vizinhos (vértice a 1 = lado a √3/2). */
const RIM_INNER = 0.84;
const RIM_OUTER = 1;
/** A cortina passa pelo vértice de cada lado, um pouco para dentro da fresta. */
const WALL_RADIUS = 0.95;
/** Alturas acima do topo do hexágono (y = 0): véu, contorno. */
const FILL_Y = 0.02;
const RIM_Y = 0.03;
/** Tempo (s) para a cortina subir quando a região aparece ou muda. */
const RISE_TIME = 0.35;
/** Largura do contorno de um hexágono menor (`AuraStyle.inset`), em unidades do hexágono. */
const INSET_RIM = 0.14;

/**
 * Lados de fronteira da região `keys`: os lados cujo vizinho não está na região nem em `inside`
 * (hexágonos que contam como dentro só para o contorno, como os ocupados pelos aliados).
 */
export function auraOutline(keys: Iterable<string>, inside: Iterable<string> = []): AuraSide[] {
  const region = new Set(keys);
  const solid = new Set([...region, ...inside]);
  const sides: AuraSide[] = [];
  for (const key of region) {
    const hex = parseKey(key);
    const p = hexToWorld(hex, 1);
    for (const n of hexNeighbors(hex)) {
      if (solid.has(hexKey(n))) continue;
      const q = hexToWorld(n, 1);
      sides.push({ hex, angle: Math.atan2(q.z - p.z, q.x - p.x) });
    }
  }
  return sides;
}

/**
 * Separa a região em partes ligadas: as que contêm algum hexágono de `hot` (o agente da vez
 * está dentro) e as demais. Cada queimável ou suspeito acende sozinho.
 */
export function splitHot(keys: Iterable<string>, hot: Iterable<string>): { hot: string[]; cold: string[] } {
  const region = new Set(keys);
  const warm = new Set([...hot].filter((k) => region.has(k)));
  const lit = new Set<string>();
  const queue = [...warm];
  for (const k of queue) lit.add(k);
  while (queue.length) {
    const k = queue.pop()!;
    for (const n of hexNeighbors(parseKey(k))) {
      const nk = hexKey(n);
      if (region.has(nk) && !lit.has(nk)) {
        lit.add(nk);
        queue.push(nk);
      }
    }
  }
  return { hot: [...lit], cold: [...region].filter((k) => !lit.has(k)) };
}

function parseKey(key: string): HexCoord {
  const [col, row] = key.split(',').map(Number);
  return { col, row };
}

/** Texturas compartilhadas por todas as camadas (véu radial e degradê da cortina). */
export interface AuraTextures {
  fill: THREE.Texture;
  fade: THREE.Texture;
}

export function createAuraTextures(): AuraTextures {
  const radial = document.createElement('canvas');
  radial.width = radial.height = 128;
  const g = radial.getContext('2d');
  if (g) {
    g.fillStyle = '#000';
    g.fillRect(0, 0, 128, 128);
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    // o lado do hexágono fica a ~0,87 do raio: a borda acende antes dele
    grad.addColorStop(0, '#4d4d4d');
    grad.addColorStop(0.6, '#575757');
    grad.addColorStop(0.8, '#9e9e9e');
    grad.addColorStop(0.9, '#e6e6e6');
    grad.addColorStop(1, '#e6e6e6');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  const fade = document.createElement('canvas');
  fade.width = 4;
  fade.height = 64;
  const f = fade.getContext('2d');
  if (f) {
    // a textura vira na placa (flipY): o pé do canvas é uv.y = 0, o chão da cortina, aceso
    const grad = f.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#000');
    grad.addColorStop(0.6, '#3a3a3a');
    grad.addColorStop(1, '#fff');
    f.fillStyle = grad;
    f.fillRect(0, 0, 4, 64);
  }
  return { fill: new THREE.CanvasTexture(radial), fade: new THREE.CanvasTexture(fade) };
}

export class AuraLayer {
  readonly root = new THREE.Group();
  private readonly fill: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly rim: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly wall: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null;
  private keys = new Set<string>();
  private inside = new Set<string>();
  /** Instante (relógio do tabuleiro) da última mudança: a cortina sobe a partir dele. */
  private changedAt = -Infinity;
  private needsStamp = false;

  constructor(
    readonly style: AuraStyle,
    textures: AuraTextures,
    renderOrder: number,
  ) {
    this.fill = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        color: style.color, alphaMap: textures.fill, transparent: true, opacity: style.fill, depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    // contorno e cortina somam luz; o véu mistura normal (no chão claro, somar estoura para branco)
    this.rim = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        color: style.edge, transparent: true, opacity: style.rim, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }),
    );
    this.wall = style.wall
      ? new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial({
            color: style.color, alphaMap: textures.fade, transparent: true, opacity: style.wallOpacity ?? 0.5,
            depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
          }),
        )
      : null;
    this.fill.renderOrder = renderOrder;
    this.rim.renderOrder = renderOrder + 1;
    this.root.add(this.fill, this.rim);
    if (this.wall) {
      this.wall.renderOrder = renderOrder + 2;
      this.root.add(this.wall);
    }
    for (const m of this.meshes()) m.frustumCulled = false;
    this.root.visible = false;
  }

  /**
   * Troca a região. `inside` são hexágonos que só contam como dentro para o contorno (não
   * recebem véu): os ocupados pelos aliados, ou os cobertos por outra aura.
   */
  set(keys: Iterable<string>, inside: Iterable<string> = []): void {
    const region = new Set(keys);
    const extra = new Set(inside);
    if (sameSet(region, this.keys) && sameSet(extra, this.inside)) return;
    const grew = [...region].some((k) => !this.keys.has(k));
    this.keys = region;
    this.inside = extra;
    this.rebuild();
    // a cortina sobe de novo quando aparecem hexágonos novos (não quando a região só encolhe)
    if (grew) this.needsStamp = true;
  }

  /** Respiração e subida da cortina; `t` é o relógio do tabuleiro (s). */
  update(t: number): void {
    if (!this.root.visible) return;
    if (this.needsStamp) {
      this.changedAt = t;
      this.needsStamp = false;
    }
    const { breathe } = this.style;
    const b = breathe ? 1 + Math.sin(t * breathe.speed) * breathe.amount : 1;
    this.fill.material.opacity = this.style.fill * b;
    this.rim.material.opacity = Math.min(1, this.style.rim * (0.85 + 0.15 * b));
    if (this.wall) {
      const k = Math.min(1, (t - this.changedAt) / RISE_TIME);
      const rise = 1 - (1 - k) * (1 - k) * (1 - k);
      this.wall.scale.y = Math.max(1e-3, (this.style.wall ?? 0) * rise);
      this.wall.material.opacity = (this.style.wallOpacity ?? 0.5) * b;
    }
  }

  dispose(): void {
    for (const m of this.meshes()) {
      m.geometry.dispose();
      m.material.dispose();
    }
  }

  private meshes(): THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] {
    return this.wall ? [this.fill, this.rim, this.wall] : [this.fill, this.rim];
  }

  private rebuild(): void {
    this.root.visible = this.keys.size > 0;
    const inset = this.style.inset;
    // menor: cada hexágono tem o seu contorno (os vizinhos não se encostam)
    const sides = inset ? [...this.keys].flatMap((k) => auraOutline([k])) : auraOutline(this.keys, this.inside);
    const scale = inset ?? 1;
    const rim = inset ? { outer: inset, inner: inset - INSET_RIM } : { outer: RIM_OUTER, inner: RIM_INNER };
    replace(this.fill, fillGeometry(this.keys, FILL_RADIUS * scale));
    replace(this.rim, rimGeometry(sides, rim.outer, rim.inner));
    if (this.wall) replace(this.wall, wallGeometry(sides, WALL_RADIUS * scale));
  }
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((k) => b.has(k));
}

function replace(mesh: THREE.Mesh, geometry: THREE.BufferGeometry): void {
  mesh.geometry.dispose();
  mesh.geometry = geometry;
}

/** Um leque de 6 triângulos por hexágono, com uv radial (centro em 0,5). */
function fillGeometry(keys: ReadonlySet<string>, radius: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (const key of keys) {
    const c = hexToWorld(parseKey(key), 1);
    const base = pos.length / 3;
    pos.push(c.x, FILL_Y, c.z);
    uv.push(0.5, 0.5);
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      pos.push(c.x + Math.cos(a) * radius, FILL_Y, c.z + Math.sin(a) * radius);
      uv.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
      index.push(base, base + 1 + ((k + 1) % 6), base + 1 + k);
    }
  }
  return build(pos, uv, index);
}

/** Uma faixa (trapézio) em cada lado de fronteira. */
function rimGeometry(sides: readonly AuraSide[], outer: number, inner: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (const { hex, angle } of sides) {
    const c = hexToWorld(hex, 1);
    const base = pos.length / 3;
    for (const r of [outer, inner]) {
      for (const a of [angle - Math.PI / 6, angle + Math.PI / 6]) {
        pos.push(c.x + Math.cos(a) * r, RIM_Y, c.z + Math.sin(a) * r);
        uv.push(0, 0);
      }
    }
    index.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  return build(pos, uv, index);
}

/** Uma parede de altura 1 em cada lado de fronteira (a malha é esticada pela altura do estilo). */
function wallGeometry(sides: readonly AuraSide[], radius: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (const { hex, angle } of sides) {
    const c = hexToWorld(hex, 1);
    const base = pos.length / 3;
    for (const y of [0, 1]) {
      for (const a of [angle - Math.PI / 6, angle + Math.PI / 6]) {
        pos.push(c.x + Math.cos(a) * radius, y, c.z + Math.sin(a) * radius);
        uv.push(0, y);
      }
    }
    index.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  return build(pos, uv, index);
}

function build(pos: number[], uv: number[], index: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}
