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
 * Armário de madeira do caseiro, encostado na parede do leste (+X), com as duas portas
 * abertas. `back` é a distância do centro do hexágono até a face da parede (unidades do mundo).
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
  // portas abertas, viradas 100° para fora em volta das dobradiças (nas laterais da frente)
  const doorW = W / 2 - 0.005;
  const open = THREE.MathUtils.degToRad(100);
  for (const side of [-1, 1] as const) {
    const hz = side * (W / 2);
    // direção da dobradiça para a ponta solta (fechada: para o meio; aberta: para fora e para trás)
    const dx = -Math.sin(open);
    const dz = -side * Math.cos(open);
    const yaw = Math.atan2(dx, dz);
    p.box(0.02, H - 0.12, doorW, C.plank, front + (dx * doorW) / 2, H / 2 + 0.02, hz + (dz * doorW) / 2, [0, yaw, 0], { outline: true });
    // puxador, perto da ponta solta, na face de dentro
    p.box(0.03, 0.12, 0.02, C.black, front + dx * (doorW - 0.05) + 0.02, 1.0, hz + dz * (doorW - 0.05), [0, yaw, 0]);
  }

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

/** Distância do centro de um hexágono até a face da parede do leste, na coluna ao lado. */
export const eastWallGap = (wallThickness: number): number => 1.5 - wallThickness / 2;
