import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { METER } from './character-model';

/**
 * Móveis que se examinam de perto (zoom no objeto): o **quadro de chaves** do hangar e o
 * **armário do caseiro**. Ficam na escala real dos personagens (medidas em metros, ver `METER`).
 *
 * Cada móvel sai com **duas malhas** só, para gastar poucas chamadas de desenho:
 * - o corpo, com tudo o que não se mexe (tábuas, ganchos, as outras chaves, potes, roupas…)
 *   juntado numa geometria única com a cor em cada vértice (um material);
 * - a peça destacável (a chave do avião, a arma), que se toca no zoom e some quando é pega.
 *
 * O grupo devolvido leva em `userData.prop` (`PropInfo`) o que o tabuleiro precisa para o zoom.
 */

/** Uma medida em metros, em unidades do mundo. */
const m = (meters: number): number => meters * METER;

/** O que o tabuleiro precisa saber de um móvel com zoom (fica em `userData.prop` do grupo). */
export interface PropInfo {
  /** Para onde a frente do móvel olha (no espaço do grupo, no chão). */
  facing: THREE.Vector3;
  /** Caixa a enquadrar no zoom (no espaço do grupo). */
  focus: THREE.Box3;
  /** A peça destacável (a chave do avião, a arma). */
  item: THREE.Mesh;
  /** Área de toque da peça, um pouco maior que ela (invisível). */
  hit: THREE.Mesh;
  /** Casca do destaque da peça (aparece quando a percepção passa). */
  glow: THREE.Mesh;
}

/** Material único dos corpos: a cor vem de cada vértice. */
let bodyMaterial: THREE.MeshStandardMaterial | undefined;
const bodyMat = (): THREE.MeshStandardMaterial =>
  (bodyMaterial ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.05 }));

/** Área de toque: não é desenhada, mas o raio do toque acerta. */
let hitMaterial: THREE.MeshBasicMaterial | undefined;
const hitMat = (): THREE.MeshBasicMaterial => (hitMaterial ??= new THREE.MeshBasicMaterial({ visible: false }));

interface Part {
  geo: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
  /** Entra na silhueta do contorno do alvo (ver `outlineParts`). */
  outline: boolean;
}

/**
 * Junta peças simples (caixas, cilindros…) numa geometria só, com a cor de cada uma nos
 * vértices. As medidas e posições são em metros.
 */
class Parts {
  private readonly list: Part[] = [];
  private readonly color = new THREE.Color();

  /** Peça em `(x, y, z)` metros, girada por `rot` (radianos, ordem XYZ). */
  add(
    geo: THREE.BufferGeometry,
    color: number,
    x: number,
    y: number,
    z: number,
    rot: [number, number, number] = [0, 0, 0],
    opts: { outline?: boolean } = {},
  ): this {
    const g = geo;
    this.color.setHex(color);
    const n = g.attributes['position'].count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      c[i * 3] = this.color.r;
      c[i * 3 + 1] = this.color.g;
      c[i * 3 + 2] = this.color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(m(x), m(y), m(z)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(1, 1, 1),
    );
    this.list.push({ geo: g, matrix, outline: !!opts.outline });
    return this;
  }

  /** Caixa de `w × h × d` metros centrada em `(x, y, z)`. */
  box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, rot?: [number, number, number], opts?: { outline?: boolean }): this {
    return this.add(new THREE.BoxGeometry(m(w), m(h), m(d)), color, x, y, z, rot, opts);
  }

  /** Cilindro de pé (raio em cima, raio embaixo, altura em metros). */
  cyl(rt: number, rb: number, h: number, color: number, x: number, y: number, z: number, rot?: [number, number, number], seg = 10): this {
    return this.add(new THREE.CylinderGeometry(m(rt), m(rb), m(h), seg), color, x, y, z, rot);
  }

  /** Argola (raio, espessura do aro em metros), em pé no plano XY. */
  ring(r: number, t: number, color: number, x: number, y: number, z: number, rot?: [number, number, number]): this {
    return this.add(new THREE.TorusGeometry(m(r), m(t), 5, 12), color, x, y, z, rot);
  }

  /** Meia esfera (cúpula para cima). */
  dome(r: number, color: number, x: number, y: number, z: number, rot?: [number, number, number]): this {
    return this.add(new THREE.SphereGeometry(m(r), 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), color, x, y, z, rot);
  }

  /** Tudo numa geometria só (no espaço do grupo). */
  geometry(): THREE.BufferGeometry {
    const geos = this.list.map((p) => p.geo.clone().applyMatrix4(p.matrix));
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) throw new Error('Peças sem atributos compatíveis');
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    return merged;
  }

  /** As peças marcadas como silhueta, cada uma numa geometria (para o contorno do alvo). */
  outlineParts(): THREE.BufferGeometry[] {
    return this.list.filter((p) => p.outline).map((p) => p.geo.clone().applyMatrix4(p.matrix));
  }

  /**
   * Casca do destaque: cada peça crescida `grow` metros para cada lado, em volta do próprio
   * centro (as peças finas, como a lâmina da chave, ganham borda inteira), tudo numa geometria.
   */
  shell(grow: number): THREE.BufferGeometry {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    const geos = this.list.map((p) => {
      const g = p.geo.clone();
      g.computeBoundingBox();
      g.boundingBox!.getSize(size);
      g.boundingBox!.getCenter(center);
      const s = (len: number) => 1 + (2 * m(grow)) / Math.max(len, 1e-4);
      g.translate(-center.x, -center.y, -center.z);
      g.scale(s(size.x), s(size.y), s(size.z));
      g.translate(center.x, center.y, center.z);
      return g.applyMatrix4(p.matrix);
    });
    const merged = mergeGeometries(geos, false)!;
    for (const g of geos) g.dispose();
    return merged;
  }

  dispose(): void {
    for (const p of this.list) p.geo.dispose();
  }
}

/** Corpo do móvel: uma malha só (com a silhueta para o contorno do alvo). */
function body(parts: Parts): THREE.Mesh {
  const mesh = new THREE.Mesh(parts.geometry(), bodyMat());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData['outlineParts'] = parts.outlineParts();
  return mesh;
}

/**
 * A peça destacável: uma malha (com material próprio, para brilhar no destaque), a área de
 * toque e a casca do destaque (escondida até a percepção passar).
 */
function detachable(parts: Parts, grow: number, hitPad: number): Pick<PropInfo, 'item' | 'hit' | 'glow'> {
  const geo = parts.geometry();
  const item = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2, emissive: 0x000000 }),
  );
  item.castShadow = true;
  item.receiveShadow = true;
  item.userData['noOutline'] = true;
  const glow = new THREE.Mesh(
    parts.shell(grow),
    new THREE.MeshBasicMaterial({ color: 0xffd23a, side: THREE.BackSide, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 }),
  );
  glow.visible = false;
  glow.renderOrder = -1;
  glow.userData['noOutline'] = true;
  item.add(glow);
  const box = geo.boundingBox!;
  const size = box.getSize(new THREE.Vector3()).addScalar(2 * m(hitPad));
  const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), hitMat());
  box.getCenter(hit.position);
  hit.userData['noOutline'] = true;
  item.add(hit);
  parts.dispose();
  return { item, hit, glow };
}

// ---------- cores ----------

const C = {
  plank: 0x9a6b3e,
  plankDark: 0x6e4a26,
  plankLight: 0xb98a4e,
  ply: 0xc4a06a,
  steel: 0x9aa3a8,
  steelDark: 0x4d5559,
  brass: 0xc9a440,
  red: 0xb3302a,
  toolRed: 0xc23a2e,
  black: 0x24272a,
  rag: 0x7d2f2a,
  cloth: 0x3f5a3a,
  coat: 0x2f4a3a,
  denim: 0x34507a,
  jar: 0xd8c27a,
  glass: 0x6f8f5a,
  tin: 0x9aa3a8,
  label: 0xe9e2c9,
  straw: 0xd9be7c,
  boot: 0x3a2a1c,
  stock: 0x96602f,
  gunMetal: 0x2b2f33,
} as const;

// ---------- quadro de chaves ----------

/**
 * Quadro de chaves pendurado na parede do fundo do hangar (norte, −Z), sobre uma bancada de
 * ferramentas. `back` é a distância do centro do hexágono até a face da parede (unidades do
 * mundo). Medidas reais: quadro de 70 × 50 cm a 1,15 m do chão, bancada de 90 cm de altura.
 *
 * Duas fileiras de ganchos com chaves de cadeado, gaveta e cadeados, várias com etiqueta
 * colorida; a chave do avião é uma delas, com etiqueta vermelha como outras (só a percepção a
 * destaca). Ela é a única peça separada.
 */
export function buildKeyBoard(back: number): THREE.Group {
  const g = new THREE.Group();
  // eixo do móvel: a parede em z = −back; tudo em metros a partir dela
  const wall = -back / METER;
  const p = new Parts();

  // bancada: tampo grosso, pés, travessa e prateleira de baixo
  const benchW = 1.3;
  const benchD = 0.55;
  const benchH = 0.9;
  const bz = wall + benchD / 2;
  p.box(benchW, 0.05, benchD, C.plankLight, 0, benchH - 0.025, bz, undefined, { outline: true });
  for (const x of [-1, 1]) for (const z of [-1, 1]) p.box(0.06, benchH - 0.05, 0.06, C.plankDark, x * (benchW / 2 - 0.05), (benchH - 0.05) / 2, bz + z * (benchD / 2 - 0.05));
  p.box(benchW - 0.1, 0.03, benchD - 0.1, C.plank, 0, 0.18, bz);
  p.box(benchW - 0.1, 0.08, 0.03, C.plankDark, 0, benchH - 0.1, bz + benchD / 2 - 0.05);
  // em cima da bancada: caixa de ferramentas, morsa, lata de óleo e um pano
  const top = benchH;
  p.box(0.42, 0.18, 0.2, C.toolRed, -0.38, top + 0.09, bz + 0.05);
  p.box(0.3, 0.02, 0.04, C.black, -0.38, top + 0.2, bz + 0.05);
  p.box(0.36, 0.015, 0.16, C.steelDark, -0.38, top + 0.185, bz + 0.05);
  p.box(0.12, 0.08, 0.1, C.steelDark, 0.45, top + 0.04, bz + 0.12);
  p.box(0.05, 0.06, 0.16, C.steelDark, 0.45, top + 0.11, bz + 0.12);
  p.cyl(0.006, 0.006, 0.18, C.steel, 0.45, top + 0.1, bz + 0.22, [Math.PI / 2, 0, 0], 6);
  p.cyl(0.04, 0.04, 0.12, C.brass, 0.18, top + 0.06, bz - 0.08);
  p.cyl(0.006, 0.01, 0.08, C.brass, 0.18, top + 0.15, bz - 0.08, [0, 0, 0.6], 6);
  p.box(0.22, 0.01, 0.16, C.rag, 0.02, top + 0.005, bz + 0.1, [0, 0.5, 0]);
  // ferramentas penduradas na parede, acima da bancada, ao lado do quadro
  p.box(0.03, 0.22, 0.012, C.steel, 0.5, 1.35, wall + 0.02);
  p.box(0.08, 0.05, 0.02, C.black, 0.5, 1.2, wall + 0.02);
  p.box(0.025, 0.2, 0.012, C.steel, 0.58, 1.33, wall + 0.02, [0, 0, 0.15]);
  p.box(0.06, 0.06, 0.02, C.toolRed, 0.6, 1.2, wall + 0.02);

  // o quadro: placa de compensado com moldura
  const bw = 0.7;
  const bh = 0.5;
  const by = 1.4;
  const pz = wall + 0.012;
  p.box(bw, bh, 0.018, C.ply, 0, by, pz, undefined, { outline: true });
  for (const y of [-1, 1]) p.box(bw + 0.03, 0.035, 0.03, C.plankDark, 0, by + y * (bh / 2), pz + 0.006);
  for (const x of [-1, 1]) p.box(0.035, bh + 0.03, 0.03, C.plankDark, x * (bw / 2), by, pz + 0.006);
  // placa de cima, com faixa escura ("CHAVES" pintado à mão)
  p.box(0.3, 0.06, 0.006, C.label, 0, by + 0.19, pz + 0.012);
  p.box(0.22, 0.012, 0.007, C.black, 0, by + 0.19, pz + 0.013);

  // ganchos e chaves: 2 fileiras de 6 ganchos
  const tags = [0x2f8f4e, 0x2f6fb0, C.red, 0xe0b12c, -1, 0x2f6fb0, -1, C.red, 0x9b5bd6, -1, 0xe0b12c, 0x2f8f4e];
  const rows = [by + 0.11, by - 0.1];
  const cols = 6;
  const span = bw - 0.14;
  const planeHook = { row: 1, col: 3 };
  const hookPos = (row: number, col: number) => ({ x: -span / 2 + (col * span) / (cols - 1), y: rows[row] });
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < cols; col++) {
      const { x, y } = hookPos(row, col);
      // gancho: haste saindo do quadro e a ponta virada para cima
      p.cyl(0.004, 0.004, 0.035, C.brass, x, y, pz + 0.025, [Math.PI / 2, 0, 0], 5);
      p.cyl(0.004, 0.004, 0.015, C.brass, x, y + 0.006, pz + 0.042, undefined, 5);
      if (row === planeHook.row && col === planeHook.col) continue; // a do avião é separada
      const i = row * cols + col;
      if (i === 4) continue; // gancho vazio
      if (i === 9) {
        // um cadeado pendurado
        p.ring(0.014, 0.003, C.steel, x, y - 0.02, pz + 0.04);
        p.box(0.04, 0.035, 0.016, C.brass, x, y - 0.05, pz + 0.04);
        continue;
      }
      keyParts(p, x, y, pz + 0.04, tags[i], (i * 0.37) % 0.3 - 0.15, i % 3 === 0 ? 2 : 1);
    }
  }
  g.add(body(p));

  // a chave do avião: argola, duas chaves e a etiqueta vermelha, num gancho como os outros
  const k = new Parts();
  const { x, y } = hookPos(planeHook.row, planeHook.col);
  keyParts(k, x, y, pz + 0.04, C.red, 0.05, 2);
  const key = detachable(k, 0.006, 0.035);
  g.add(key.item);

  const focus = new THREE.Box3(
    new THREE.Vector3(m(-bw / 2 - 0.05), m(by - bh / 2 - 0.08), m(wall)),
    new THREE.Vector3(m(bw / 2 + 0.05), m(by + bh / 2 + 0.03), m(wall + 0.08)),
  );
  g.userData['prop'] = { facing: new THREE.Vector3(0, 0, 1), focus, ...key } satisfies PropInfo;
  return g;
}

/**
 * Molho de chaves pendurado num gancho em `(x, y, z)` metros: argola, `n` chaves e, com
 * `tag >= 0`, uma etiqueta de plástico dessa cor. `tilt` balança o molho de lado.
 */
function keyParts(p: Parts, x: number, y: number, z: number, tag: number, tilt: number, n: 1 | 2): void {
  const rot: [number, number, number] = [0, 0, tilt];
  const at = (dy: number, dx = 0) => ({ x: x + dx * Math.cos(tilt) + dy * Math.sin(tilt), y: y + dy * Math.cos(tilt) - dx * Math.sin(tilt) });
  const r = at(-0.014);
  p.ring(0.012, 0.0025, C.steel, r.x, r.y, z, rot);
  for (let i = 0; i < n; i++) {
    const dx = n === 2 ? (i ? 0.008 : -0.008) : 0;
    const kr: [number, number, number] = [0, 0, tilt + (n === 2 ? (i ? -0.18 : 0.18) : 0)];
    const bow = at(-0.035, dx);
    p.box(0.022, 0.02, 0.003, i ? C.brass : C.steel, bow.x, bow.y, z + 0.002, kr);
    const blade = at(-0.068, dx * 1.6);
    p.box(0.008, 0.05, 0.0025, i ? C.brass : C.steel, blade.x, blade.y, z + 0.002, kr);
  }
  if (tag >= 0) {
    const t = at(-0.04, n === 2 ? 0.028 : 0.02);
    p.box(0.026, 0.045, 0.004, tag, t.x, t.y, z + 0.004, rot);
  }
}

// ---------- armário do caseiro ----------

/**
 * Armário de madeira do caseiro, sem portas (a frente fica aberta), com o fundo em +X.
 * `back` é a distância do centro do hexágono até a face da parede (unidades do mundo); quem
 * encosta na parede do fundo da casa gira o grupo (ver `buildCover`).
 * Medidas reais: 1,0 m de largura, 45 cm de fundo e 1,85 m de altura (um pouco mais alto que
 * os agentes de ombro).
 *
 * À esquerda de quem olha, prateleiras com potes, latas, roupa dobrada, uma garrafa e um
 * lampião; em cima, um chapéu de palha; embaixo, um par de botas. À direita, o vão de
 * pendurar: uma capa de chuva e, encostada no canto atrás dela, a espingarda — a única peça
 * separada.
 */
export function buildCabinet(back: number): THREE.Group {
  const g = new THREE.Group();
  const p = new Parts();
  const W = 1.0;
  const D = 0.45;
  const H = 1.85;
  const t = 0.022; // espessura das tábuas
  // frente para −X; a largura corre em Z (+Z fica à direita de quem olha de frente)
  const backX = back / METER;
  const cx = backX - D / 2;
  const front = backX - D;

  // caixa: fundo, laterais, tampo, base e o rodapé
  p.box(t, H, W, C.plankDark, backX - t / 2, H / 2, 0, undefined, { outline: true });
  for (const z of [-1, 1]) p.box(D, H, t, C.plank, cx, H / 2, z * (W / 2 - t / 2));
  p.box(D + 0.03, 0.04, W + 0.04, C.plankDark, cx - 0.015, H + 0.02, 0);
  p.box(D, 0.08, W, C.plankDark, cx, 0.04, 0);
  p.box(0.015, 0.06, W, C.plank, front + 0.008, 0.03, 0);
  // divisória: prateleiras à esquerda (−Z), vão de pendurar à direita (+Z)
  const split = 0.08;
  p.box(D - 0.02, H - 0.1, t, C.plank, cx + 0.01, H / 2 + 0.02, split);
  const shelfW = W / 2 + split - t * 1.5;
  const shelfZ = -W / 2 + t + shelfW / 2;
  const shelves = [0.08, 0.48, 0.88, 1.28];
  for (const y of shelves.slice(1)) p.box(D - 0.03, t, shelfW, C.plankLight, cx + 0.005, y, shelfZ);
  // prateleira de baixo (no chão do armário): botas
  const sx = cx + 0.02;
  p.box(0.12, 0.28, 0.1, C.boot, sx, 0.08 + 0.14, shelfZ - 0.12);
  p.box(0.12, 0.28, 0.1, C.boot, sx, 0.08 + 0.14, shelfZ + 0.0);
  p.box(0.24, 0.08, 0.1, C.boot, sx - 0.06, 0.12, shelfZ - 0.12);
  p.box(0.24, 0.08, 0.1, C.boot, sx - 0.06, 0.12, shelfZ + 0.0);
  p.box(0.22, 0.14, 0.14, 0x8c6a3a, sx, 0.08 + 0.07, shelfZ + 0.18);
  // 2ª: potes de vidro, latas e um vidro de conserva
  let y = shelves[1] + t / 2;
  p.cyl(0.05, 0.05, 0.16, C.jar, sx, y + 0.08, shelfZ - 0.17);
  p.cyl(0.052, 0.052, 0.02, C.red, sx, y + 0.17, shelfZ - 0.17);
  p.cyl(0.045, 0.045, 0.12, C.tin, sx, y + 0.06, shelfZ - 0.04);
  p.cyl(0.046, 0.046, 0.05, C.label, sx - 0.002, y + 0.06, shelfZ - 0.04);
  p.cyl(0.045, 0.045, 0.12, C.tin, sx + 0.06, y + 0.06, shelfZ + 0.06);
  p.cyl(0.05, 0.05, 0.14, C.glass, sx - 0.04, y + 0.07, shelfZ + 0.16);
  // 3ª: roupa dobrada (duas pilhas) e um rádio de pilha
  y = shelves[2] + t / 2;
  p.box(0.3, 0.06, 0.26, C.denim, sx, y + 0.03, shelfZ - 0.12);
  p.box(0.3, 0.05, 0.26, C.rag, sx, y + 0.085, shelfZ - 0.12);
  p.box(0.3, 0.05, 0.26, C.cloth, sx, y + 0.135, shelfZ - 0.12);
  p.box(0.12, 0.1, 0.2, C.black, sx, y + 0.05, shelfZ + 0.14);
  p.box(0.005, 0.06, 0.1, C.steel, sx - 0.062, y + 0.05, shelfZ + 0.11);
  p.cyl(0.003, 0.003, 0.2, C.steel, sx + 0.03, y + 0.2, shelfZ + 0.2, [0.3, 0, 0], 4);
  // 4ª: garrafa de cachaça, caixa de fósforos e um lampião
  y = shelves[3] + t / 2;
  p.cyl(0.035, 0.035, 0.2, 0xc9a15a, sx, y + 0.1, shelfZ - 0.18);
  p.cyl(0.012, 0.03, 0.08, 0xc9a15a, sx, y + 0.24, shelfZ - 0.18);
  p.box(0.05, 0.02, 0.07, C.toolRed, sx - 0.04, y + 0.01, shelfZ - 0.05);
  p.cyl(0.05, 0.06, 0.05, C.steelDark, sx, y + 0.025, shelfZ + 0.12);
  p.cyl(0.035, 0.045, 0.12, 0xe8e2c6, sx, y + 0.11, shelfZ + 0.12);
  p.cyl(0.03, 0.03, 0.03, C.steelDark, sx, y + 0.185, shelfZ + 0.12);
  // em cima do armário: chapéu de palha e uma caixa de papelão
  p.cyl(0.18, 0.18, 0.012, C.straw, cx - 0.02, H + 0.05, -0.18);
  p.cyl(0.08, 0.095, 0.09, C.straw, cx - 0.02, H + 0.1, -0.18);
  p.box(0.3, 0.18, 0.3, 0xc79b62, cx + 0.04, H + 0.13, 0.22, [0, 0.2, 0]);

  // vão de pendurar: varão, cabide e a capa de chuva (puxada para o lado da divisória)
  const hangZ = split + (W / 2 - split) / 2;
  const coatZ = hangZ - 0.06;
  p.cyl(0.01, 0.01, W / 2 - split - t, C.steel, cx, 1.62, hangZ, [Math.PI / 2, 0, 0], 6);
  p.box(0.02, 0.04, 0.26, C.plankDark, cx - 0.02, 1.58, coatZ);
  p.box(0.1, 0.78, 0.24, C.coat, cx - 0.06, 1.17, coatZ);
  p.box(0.1, 0.14, 0.16, C.coat, cx - 0.06, 1.5, coatZ);
  p.box(0.105, 0.02, 0.24, 0x22382c, cx - 0.06, 0.78, coatZ);
  p.box(0.012, 0.5, 0.012, 0x22382c, cx - 0.112, 1.15, coatZ + 0.02);
  g.add(body(p));

  // a espingarda: de pé no canto de trás do vão, coronha no chão, a ponta do cano encostada
  // no fundo e na lateral (atrás da capa, só a coronha fica bem à vista)
  const gun = new Parts();
  const lean: [number, number, number] = [0.04, 0, -0.1];
  // direção do cano com esse giro (Euler XYZ: primeiro o giro em Z, depois em X)
  const up = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(...lean));
  const base = new THREE.Vector3(backX - t - 0.15, 0.08, W / 2 - t - 0.075);
  const along = (h: number) => base.clone().addScaledVector(up, h);
  const at = (h: number, w: number, d: number, depth: number, color: number) => {
    const q = along(h);
    gun.box(depth, w, d, color, q.x, q.y, q.z, lean);
  };
  // coronha, punho, caixa da culatra com o guarda-mato, telha e cano
  at(0.17, 0.32, 0.11, 0.04, C.stock);
  at(0.37, 0.1, 0.06, 0.034, C.stock);
  at(0.47, 0.12, 0.05, 0.032, C.gunMetal);
  at(0.42, 0.06, 0.012, 0.012, C.gunMetal);
  at(0.64, 0.2, 0.04, 0.03, C.stock);
  const q = along(0.86);
  gun.cyl(0.011, 0.011, 0.66, C.gunMetal, q.x, q.y, q.z, lean, 8);
  const sight = along(1.18);
  gun.box(0.006, 0.012, 0.006, C.steel, sight.x, sight.y, sight.z - 0.012, lean);
  const shotgun = detachable(gun, 0.008, 0.05);
  g.add(shotgun.item);

  const focus = new THREE.Box3(new THREE.Vector3(m(front - 0.05), 0, m(-W / 2 - 0.05)), new THREE.Vector3(m(backX), m(H + 0.1), m(W / 2 + 0.05)));
  g.userData['prop'] = { facing: new THREE.Vector3(-1, 0, 0), focus, ...shotgun } satisfies PropInfo;
  return g;
}

/**
 * Distância do centro de um hexágono (coluna `col`) até a face da parede do fundo (norte) da
 * estrutura, na fileira logo acima (ver `rowZ` em `buildHangar`).
 */
export const northWallGap = (col: number, wallThickness: number): number =>
  Math.sqrt(3) * (0.75 + 0.5 * (col & 1)) - wallThickness / 2;

/**
 * Distância do centro de um hexágono (coluna `col`) da última fileira de dentro até a face da
 * parede da frente (sul) da estrutura, na fileira logo abaixo (o espelho de `northWallGap`).
 */
export const southWallGap = (col: number, wallThickness: number): number =>
  Math.sqrt(3) * (1.25 - 0.5 * (col & 1)) - wallThickness / 2;

// ---------- móveis da casa (sala e quarto) ----------

/** Material do vidro do abajur (acende de leve). */
let shadeMaterial: THREE.MeshStandardMaterial | undefined;
const shadeMat = (): THREE.MeshStandardMaterial =>
  (shadeMaterial ??= new THREE.MeshStandardMaterial({ color: 0xf1e2b8, emissive: 0xffc768, emissiveIntensity: 0.55, roughness: 0.7 }));

/**
 * Mesa comprida da sala, de tábuas grossas: `L` × 0,85 m (comprimento em metros, no sentido
 * norte–sul, +Z), 76 cm de altura, com um banco comprido do outro lado (leste). O almoço do
 * caseiro (prato esmaltado com arroz, feijão e um pedaço de carne, garfo e caneca) fica no lado
 * oeste (−X), na altura `seat` (metros a partir do meio da mesa, em Z), de quem come olhando
 * para o leste; perto dele, uma panela tampada e a garrafa térmica. Nas pontas, um pano de
 * prato dobrado e, na mesa comprida, uma pilha de pratos e um rádio de pilha.
 */
export function buildDiningTable(L = 1.25, seat = 0): THREE.Group {
  const g = new THREE.Group();
  const p = new Parts();
  const D = 0.85;
  const H = 0.76;
  const t = 0.045;
  // tampo: quatro tábuas no comprimento, de tons um pouco diferentes
  const tones = [C.plankLight, C.plank, 0xab7c48, C.plankLight];
  tones.forEach((tone, i) => p.box(D / 4 - 0.006, t, L, tone, -D / 2 + D / 8 + (i * D) / 4, H - t / 2, 0, undefined, { outline: true }));
  // saia embaixo do tampo e as pernas, levemente afinadas (a mesa comprida tem um par no meio)
  for (const x of [-1, 1]) p.box(0.025, 0.1, L - 0.16, C.plankDark, x * (D / 2 - 0.07), H - t - 0.05, 0);
  for (const z of [-1, 1]) p.box(D - 0.16, 0.1, 0.025, C.plankDark, 0, H - t - 0.05, z * (L / 2 - 0.08));
  const legs = L > 1.8 ? [-1, 0, 1] : [-1, 1];
  for (const z of legs) {
    const lz = z * (L / 2 - 0.08);
    for (const x of [-1, 1]) p.add(new THREE.CylinderGeometry(m(0.03), m(0.025), m(H - t), 4, 1), C.plankDark, x * (D / 2 - 0.07), (H - t) / 2, lz, [0, Math.PI / 4, 0]);
    // travessa baixa entre as pernas de cada par
    p.box(D - 0.16, 0.04, 0.03, C.plankDark, 0, 0.16, lz);
  }
  p.box(0.03, 0.04, L - 0.16, C.plankDark, 0, 0.16, 0);
  // banco comprido do outro lado (leste): assento de tábua e pés de cavalete
  const bx = D / 2 + 0.3;
  const bl = L - 0.3;
  p.box(0.3, 0.04, bl, C.plank, bx, 0.45, 0, undefined, { outline: true });
  for (const z of legs) p.box(0.26, 0.43, 0.04, C.plankDark, bx, 0.215, z * (bl / 2 - 0.12));
  p.box(0.04, 0.05, bl - 0.24, C.plankDark, bx, 0.12, 0);

  const y = H;
  // prato esmaltado (branco de borda azul) com a comida, na frente de quem come
  const px = -0.22;
  const pz = seat;
  p.cyl(0.13, 0.1, 0.025, 0xf2f0e8, px, y + 0.0125, pz, undefined, 16);
  p.cyl(0.131, 0.131, 0.006, 0x2f5fa0, px, y + 0.024, pz, undefined, 16);
  p.dome(0.075, 0xf4efe2, px - 0.03, y + 0.022, pz - 0.03); // arroz
  p.dome(0.055, 0x4a2a1c, px + 0.03, y + 0.022, pz + 0.05); // feijão
  p.box(0.05, 0.025, 0.07, 0x7a3b22, px + 0.07, y + 0.035, pz, [0, 0.4, 0]); // carne
  p.box(0.012, 0.006, 0.17, C.steel, px - 0.02, y + 0.003, pz + 0.18); // garfo
  // caneca de alumínio com asa
  p.cyl(0.04, 0.038, 0.09, 0xb9c0c4, -0.24, y + 0.045, pz - 0.26, undefined, 12);
  p.ring(0.025, 0.006, 0xb9c0c4, -0.29, y + 0.05, pz - 0.26);
  // panela de alumínio tampada, com os cabos
  const nz = pz - 0.55;
  p.cyl(0.13, 0.12, 0.12, 0xa9b0b4, 0.05, y + 0.06, nz, undefined, 16);
  p.cyl(0.135, 0.135, 0.015, 0x9aa1a5, 0.05, y + 0.128, nz, undefined, 16);
  p.cyl(0.02, 0.02, 0.025, C.black, 0.05, y + 0.145, nz, undefined, 8);
  for (const s of [-1, 1]) p.box(0.03, 0.015, 0.06, C.black, 0.05, y + 0.1, nz + s * 0.16);
  // garrafa térmica vermelha
  p.cyl(0.055, 0.055, 0.26, C.toolRed, 0.2, y + 0.13, pz + 0.4, undefined, 12);
  p.cyl(0.045, 0.05, 0.06, 0xe9e2c9, 0.2, y + 0.29, pz + 0.4, undefined, 12);
  // pano de prato dobrado numa ponta
  const ez = L / 2 - 0.2;
  p.box(0.16, 0.012, 0.22, C.rag, 0.18, y + 0.006, -ez, [0, 0.25, 0]);
  p.box(0.025, 0.004, 0.22, 0xe9e2c9, 0.18, y + 0.013, -ez, [0, 0.25, 0]);
  // na outra ponta, uma pilha de pratos e um rádio de pilha
  if (L > 1.8) {
    for (let i = 0; i < 3; i++) p.cyl(0.11, 0.09, 0.02, 0xf2f0e8, -0.15, y + 0.01 + i * 0.022, ez - 0.05, undefined, 14);
    p.box(0.2, 0.12, 0.08, C.black, 0.15, y + 0.06, ez - 0.02, [0, 0.3, 0]);
    p.cyl(0.003, 0.003, 0.25, C.steel, 0.2, y + 0.24, ez, [0, 0, 0.4], 4);
  }
  g.add(body(p));
  return g;
}

/**
 * Prateleiras abertas de tábua encostadas na parede do fundo (norte, −Z), com a frente para
 * +Z: 90 cm de largura, 32 cm de fundo, 1,7 m de altura, quatro andares. `back` é a distância
 * do centro do hexágono até a face da parede (unidades do mundo). `seed` varia a ordem do que
 * fica em cada andar (livros e revistas, latas, caixas, corda e botas), para que duas
 * prateleiras não fiquem iguais.
 */
export function buildShelves(back: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const p = new Parts();
  const W = 0.9;
  const D = 0.32;
  const H = 1.7;
  const t = 0.025;
  const bz = -back / METER;
  const cz = bz + D / 2;
  // laterais (sem fundo: um X de sarrafo atrás segura o móvel) e os andares
  for (const x of [-1, 1]) p.box(t, H, D, C.plank, x * (W / 2 - t / 2), H / 2, cz, undefined, { outline: true });
  for (const a of [-1, 1]) p.box(0.02, Math.hypot(W, H) - 0.15, 0.02, C.plankDark, 0, H / 2, bz + 0.012, [0, 0, a * Math.atan2(W, H)]);
  const levels = [0.08, 0.5, 0.92, 1.34, H - t / 2];
  for (const y of levels) p.box(W - 2 * t, t, D, C.plankLight, 0, y, cz, undefined, { outline: true });
  // sorteio fixo pela semente
  let r = Math.abs(Math.floor(seed)) % 233280;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const fill = [
    // livros e revistas em pé, de cores diferentes, e uma pilha deitada
    (y: number) => {
      let x = -W / 2 + t + 0.03;
      for (const color of [0x7d2f2a, 0x34507a, 0xd9be7c, 0x3f5a3a, 0x9a6b3e, 0xb3302a]) {
        const h = 0.18 + rnd() * 0.08;
        p.box(0.035, h, 0.2, color, x, y + h / 2, cz + 0.02);
        x += 0.045;
      }
      p.box(0.24, 0.03, 0.2, 0xe9e2c9, x + 0.14, y + 0.015, cz + 0.02, [0, 0.15, 0]);
    },
    // latas e potes
    (y: number) => {
      for (const [x, color] of [[-0.3, C.tin], [-0.2, C.jar], [-0.08, C.tin], [0.1, C.glass], [0.22, C.tin]] as const) {
        p.cyl(0.045, 0.045, 0.13, color, x, y + 0.065, cz + (rnd() - 0.5) * 0.08, undefined, 10);
      }
    },
    // caixa de papelão e uma caixa de ferramentas vermelha
    (y: number) => {
      p.box(0.34, 0.22, 0.26, 0xc79b62, -0.2, y + 0.11, cz, [0, (rnd() - 0.5) * 0.2, 0]);
      p.box(0.3, 0.14, 0.18, C.toolRed, 0.2, y + 0.07, cz + 0.02);
      p.box(0.12, 0.02, 0.03, C.black, 0.2, y + 0.15, cz + 0.02);
    },
    // rolo de corda, um galão azul e um par de botas de borracha
    (y: number) => {
      p.ring(0.09, 0.03, 0xd9be7c, -0.25, y + 0.03, cz, [Math.PI / 2, 0, 0]);
      p.box(0.16, 0.24, 0.12, 0x2f6fb0, 0.02, y + 0.12, cz);
      p.cyl(0.02, 0.02, 0.04, C.black, 0.06, y + 0.26, cz, undefined, 8);
      for (const x of [0.22, 0.32]) p.box(0.09, 0.26, 0.2, C.black, x, y + 0.13, cz);
    },
  ];
  const order = fill.map((f) => ({ f, k: rnd() })).sort((a, b) => a.k - b.k);
  order.forEach(({ f }, i) => f(levels[i] + t / 2));
  g.add(body(p));
  return g;
}

/**
 * Rack baixo da TV encostado numa divisória a leste (+X), com a frente para −X (para a sala):
 * 1 m de largura, 50 cm de fundo, 55 cm de altura. Em cima, uma TV de tubo com antena de
 * "chifre", virada `turn` radianos (em volta do eixo vertical) para quem come na mesa, e um
 * aviãozinho de brinquedo num pezinho; na parede, acima, um quadro de avião. `back` é a
 * distância do centro do hexágono até a face da parede (unidades do mundo).
 */
export function buildTvRack(back: number, turn = 0): THREE.Group {
  const g = new THREE.Group();
  const p = new Parts();
  const W = 1.0;
  const D = 0.5;
  const H = 0.55;
  const t = 0.025;
  const bx = back / METER;
  const cx = bx - D / 2;
  // rack: tampo, base, laterais e, embaixo, um aparelho de vídeo e umas fitas
  p.box(D, t, W, C.plankLight, cx, H - t / 2, 0, undefined, { outline: true });
  p.box(D, t, W, C.plank, cx, 0.06, 0);
  for (const z of [-1, 1]) p.box(D, H, t, C.plankDark, cx, H / 2, z * (W / 2 - t / 2), undefined, { outline: true });
  p.box(0.32, 0.08, 0.4, C.black, cx, 0.12, -0.2);
  [0x24272a, 0x7d2f2a, 0x24272a, 0x34507a].forEach((color, i) => p.box(0.18, 0.1, 0.025, color, cx, 0.125, 0.12 + i * 0.04));
  // TV de tubo: caixa funda, tela escura com reflexo, botões e a antena (tudo girado junto)
  const spin = new THREE.Euler(0, turn, 0);
  const tvc = new THREE.Vector3(bx - 0.27, 0, -0.12);
  /** Peça da TV: `x` para a frente (−X é a tela), `z` de lado, no espaço da TV. */
  const tvBox = (d: number, h: number, w: number, color: number, x: number, y: number, z: number) => {
    const q = new THREE.Vector3(x, 0, z).applyEuler(spin).add(tvc);
    p.box(d, h, w, color, q.x, y, q.z, [0, turn, 0], { outline: true });
  };
  tvBox(0.32, 0.4, 0.5, 0x3a3d40, 0, H + 0.2, 0);
  tvBox(0.02, 0.3, 0.38, 0x1d2a33, -0.16, H + 0.22, -0.03);
  tvBox(0.01, 0.07, 0.12, 0x5d7a8a, -0.17, H + 0.3, -0.1);
  tvBox(0.02, 0.03, 0.03, C.steel, -0.16, H + 0.14, 0.2);
  tvBox(0.02, 0.03, 0.03, C.red, -0.16, H + 0.07, 0.2);
  const top = new THREE.Vector3(0.05, 0, 0).applyEuler(spin).add(tvc);
  p.dome(0.04, C.black, top.x, H + 0.4, top.z);
  for (const s of [-1, 1]) p.cyl(0.005, 0.005, 0.4, C.steel, top.x, H + 0.58, top.z + s * 0.09, [s * 0.5, 0, 0], 4);
  // aviãozinho de brinquedo (monomotor branco de faixa vermelha, nariz para a sala) num pezinho
  const ax = cx - 0.02;
  const az = 0.33;
  const ay = H + 0.16;
  p.cyl(0.008, 0.03, 0.14, C.black, ax, H + 0.07, az, undefined, 8);
  p.cyl(0.025, 0.018, 0.26, 0xf2f0e8, ax, ay, az, [0, 0, Math.PI / 2 - 0.12], 10);
  p.box(0.07, 0.01, 0.28, 0xf2f0e8, ax + 0.01, ay + 0.012, az);
  p.box(0.05, 0.012, 0.275, C.red, ax + 0.012, ay + 0.016, az);
  p.box(0.04, 0.008, 0.12, 0xf2f0e8, ax + 0.12, ay + 0.03, az);
  p.box(0.05, 0.07, 0.008, C.red, ax + 0.12, ay + 0.06, az);
  p.box(0.005, 0.08, 0.012, C.black, ax - 0.135, ay - 0.01, az);
  // quadro de avião na parede: moldura, céu, nuvem e um bimotor branco visto de lado
  const wx = bx - 0.012;
  const fy = 1.55;
  const fz = -0.05;
  p.box(0.02, 0.44, 0.64, C.plankDark, wx, fy, fz, undefined, { outline: true });
  p.box(0.022, 0.36, 0.56, 0x7fb3d9, wx - 0.002, fy, fz);
  p.box(0.024, 0.06, 0.18, 0xf3efe4, wx - 0.003, fy - 0.11, fz + 0.15);
  p.box(0.024, 0.05, 0.3, 0xf2f0e8, wx - 0.004, fy + 0.02, fz);
  p.box(0.025, 0.018, 0.34, C.red, wx - 0.005, fy + 0.01, fz);
  p.box(0.024, 0.1, 0.05, 0xf2f0e8, wx - 0.004, fy + 0.09, fz - 0.13);
  p.box(0.025, 0.025, 0.2, 0xd7d9cf, wx - 0.005, fy + 0.0, fz + 0.02);
  p.box(0.025, 0.04, 0.03, 0x34507a, wx - 0.005, fy + 0.03, fz + 0.14);
  g.add(body(p));
  return g;
}

/**
 * Cama de solteiro (0,95 × 1,9 m) com a cabeceira em +Z, a `head` (unidades do mundo) do
 * centro do hexágono, encostada na parede. Lençol, travesseiro e uma colcha listrada meio
 * dobrada nos pés; um par de chinelos no chão.
 */
export function buildBed(head: number): THREE.Group {
  const g = new THREE.Group();
  const p = new Parts();
  const W = 0.95;
  const Lb = 1.9;
  const hz = head / METER;
  const cz = hz - Lb / 2;
  // estrado: laterais, pés e as duas cabeceiras de tábua
  for (const x of [-1, 1]) p.box(0.04, 0.16, Lb, C.plank, x * (W / 2 - 0.02), 0.3, cz, undefined, { outline: true });
  for (const x of [-1, 1]) {
    for (const z of [hz - 0.03, hz - Lb + 0.03]) p.box(0.06, z > cz ? 0.9 : 0.55, 0.06, C.plankDark, x * (W / 2 - 0.03), (z > cz ? 0.9 : 0.55) / 2, z);
  }
  for (const [z, h] of [[hz - 0.03, 0.9], [hz - Lb + 0.03, 0.55]] as const) {
    for (let i = 0; i < 3; i++) p.box(W - 0.1, 0.12, 0.025, i % 2 ? C.plank : C.plankLight, 0, h - 0.1 - i * 0.16, z, undefined, { outline: true });
  }
  // colchão e lençol
  p.box(W - 0.08, 0.16, Lb - 0.1, 0xe8e1cf, 0, 0.44, cz);
  p.box(W - 0.06, 0.02, Lb - 0.5, 0xd7d9cf, 0, 0.525, cz - 0.15);
  // travesseiro
  p.box(0.6, 0.1, 0.36, 0xf3efe4, 0, 0.57, hz - 0.28, [0.12, 0, 0]);
  // colcha listrada dobrada nos pés (faixas alternadas)
  const quiltZ = hz - Lb + 0.45;
  for (let i = 0; i < 5; i++) {
    const color = [0x7d2f2a, 0xd9be7c, 0x2f5a3a, 0xd9be7c, 0x7d2f2a][i];
    p.box(W - 0.02, 0.06, 0.12, color, 0, 0.56, quiltZ - 0.24 + i * 0.12);
  }
  for (const x of [-1, 1]) p.box(0.03, 0.2, 0.6, 0x7d2f2a, x * (W / 2 - 0.01), 0.47, quiltZ);
  // chinelos ao lado da cama
  for (const dx of [0, 0.11]) p.box(0.09, 0.02, 0.24, 0x2f6fb0, -W / 2 - 0.12 - dx, 0.01, cz + 0.3, [0, 0.15, 0]);
  g.add(body(p));
  return g;
}

/**
 * Mesinha de cabeceira com uma gaveta e, em cima, o abajur (cúpula que acende de leve), um
 * copo d'água e um despertador. `x`, `z` (unidades do mundo): onde fica, em relação ao centro
 * do hexágono (encostada na cabeceira da cama ao lado).
 */
export function buildNightstand(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const p = new Parts();
  const W = 0.45;
  const D = 0.38;
  const H = 0.55;
  const cx = x / METER;
  const cz = z / METER;
  p.box(W, 0.03, D, C.plankLight, cx, H - 0.015, cz, undefined, { outline: true });
  for (const sx of [-1, 1]) p.box(0.025, H - 0.03, D, C.plank, cx + sx * (W / 2 - 0.0125), (H - 0.03) / 2, cz);
  p.box(W - 0.05, H - 0.03, 0.02, C.plankDark, cx, (H - 0.03) / 2, cz + D / 2 - 0.01);
  p.box(W - 0.05, 0.02, D - 0.02, C.plank, cx, 0.08, cz);
  // gaveta (frente para −Z, para dentro do quarto) com puxador
  p.box(W - 0.06, 0.14, 0.02, C.plankLight, cx, H - 0.12, cz - D / 2 + 0.01);
  p.cyl(0.015, 0.015, 0.02, C.brass, cx, H - 0.12, cz - D / 2 - 0.005, [Math.PI / 2, 0, 0], 8);
  // abajur: pé de cerâmica e haste
  const lx = cx + 0.08;
  const lz = cz + 0.04;
  p.cyl(0.07, 0.08, 0.03, 0x3f5a3a, lx, H + 0.015, lz, undefined, 12);
  p.cyl(0.05, 0.065, 0.12, 0x4f7048, lx, H + 0.09, lz, undefined, 12);
  p.cyl(0.008, 0.008, 0.16, C.brass, lx, H + 0.23, lz, undefined, 6);
  // copo d'água e despertador
  p.cyl(0.03, 0.026, 0.09, 0xbfd7dc, cx - 0.13, H + 0.045, cz - 0.08, undefined, 10);
  p.cyl(0.045, 0.045, 0.03, 0xb3302a, cx - 0.1, H + 0.05, cz + 0.08, [Math.PI / 2, 0, 0], 12);
  p.box(0.06, 0.02, 0.02, C.black, cx - 0.1, H + 0.01, cz + 0.08);
  g.add(body(p));
  // cúpula do abajur (material próprio, que acende)
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(m(0.09), m(0.15), m(0.17), 16, 1, true), shadeMat());
  shade.material.side = THREE.DoubleSide;
  shade.position.set(m(lx), m(H + 0.33), m(lz));
  shade.castShadow = true;
  g.add(shade);
  return g;
}
