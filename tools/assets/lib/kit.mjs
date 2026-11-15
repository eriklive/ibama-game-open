// Kit de equipamento com volume (colete de placas, joelheiras, luvas, botas, coldre...).
//
// A roupa pintada em lib/bake.mjs dá a cor, mas não a silhueta: de cima, o agente parecia um
// boneco liso. Aqui o equipamento é geometria de verdade, em dois tipos:
//
// - Faixas (`Contour` + `band`): o corte transversal do corpo (tronco, coxa, canela, braço) é
//   medido em vários níveis, alisado (some o músculo) e vira uma casca com espessura em volta
//   dele. Serve para placas, faixa lateral, joelheira, punho de luva, cano de bota. Cada vértice
//   copia os pesos do vértice do corpo mais próximo, então a peça acompanha a animação.
// - Peças rígidas (bolsos, rádio, coldre, distintivos): caixas arredondadas presas a um osso.
//
// Luvas e botas usam uma terceira técnica (`shell`): copiam a própria malha da mão ou do pé,
// alisada e empurrada para fora, com os pesos originais (os dedos da luva dobram junto).
//
// Estilo "cartoon caprichado": formas gordinhas e arredondadas, bordas acolchoadas e cor por
// vértice com luz pintada (topo mais claro, base mais escura, quinas realçadas), como nas
// texturas pintadas à mão. Tudo numa malha e num material só (um draw call por personagem).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { partOf, FONT } from './bake.mjs';

const lin = (v) => Math.pow(v / 255, 2.2);
export const rgb = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
};
export const shade = (h, k) => '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * k))).toString(16).padStart(2, '0')).join('');
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------------------------
// Corpo: posições, normais soldadas, pesos e partes de cada vértice
// ---------------------------------------------------------------------------------------------
export class BodyShape {
  constructor(prim, jointNames) {
    this.names = jointNames;
    this.pos = prim.getAttribute('POSITION').getArray();
    this.J = prim.getAttribute('JOINTS_0').getArray();
    this.W = prim.getAttribute('WEIGHTS_0').getArray();
    this.idx = prim.getIndices().getArray();
    const nv = (this.nv = this.pos.length / 3);
    const partIdx = jointNames.map(partOf);
    this.parts = new Float32Array(nv * 8);
    for (let i = 0; i < nv; i++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) { const w = this.W[i * 4 + k]; this.parts[i * 8 + partIdx[this.J[i * 4 + k]]] += w; sum += w; }
      if (sum > 0) for (let k = 0; k < 8; k++) this.parts[i * 8 + k] /= sum;
    }
    // vértices repetidos na costura do UV: um id por posição
    this.weld = new Int32Array(nv);
    const keyOf = new Map();
    for (let i = 0; i < nv; i++) {
      const k = `${Math.round(this.pos[i * 3] * 1e4)},${Math.round(this.pos[i * 3 + 1] * 1e4)},${Math.round(this.pos[i * 3 + 2] * 1e4)}`;
      if (!keyOf.has(k)) keyOf.set(k, keyOf.size);
      this.weld[i] = keyOf.get(k);
    }
    // normais por posição soldada (sem quebra na costura)
    const nw = keyOf.size, Nw = new Float32Array(nw * 3), P = this.pos, I = this.idx;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      for (const v of [I[t], I[t + 1], I[t + 2]]) for (let k = 0; k < 3; k++) Nw[this.weld[v] * 3 + k] += n[k];
    }
    this.nor = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      const j = this.weld[i] * 3, l = Math.hypot(Nw[j], Nw[j + 1], Nw[j + 2]) || 1;
      for (let k = 0; k < 3; k++) this.nor[i * 3 + k] = Nw[j + k] / l;
    }
  }

  part(i, name) {
    const k = { head: 0, torso: 1, uarm: 2, larm: 3, hand: 4, thigh: 5, calf: 6, foot: 7 }[name];
    return this.parts[i * 8 + k];
  }
  leg(i) { return this.parts[i * 8 + 5] + this.parts[i * 8 + 6] + this.parts[i * 8 + 7]; }
  arm(i) { return this.parts[i * 8 + 2] + this.parts[i * 8 + 3] + this.parts[i * 8 + 4]; }

  /** Lista de índices de vértice que passam no filtro. */
  select(filter) {
    const out = [];
    for (let i = 0; i < this.nv; i++) if (filter(i, this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2])) out.push(i);
    return out;
  }

  /** Vértice mais próximo de p dentro de `set`. */
  nearest(p, set) {
    let best = -1, bd = Infinity;
    for (const i of set) {
      const dx = this.pos[i * 3] - p[0], dy = this.pos[i * 3 + 1] - p[1], dz = this.pos[i * 3 + 2] - p[2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /** Ossos e pesos do vértice i (já normalizados). */
  skinOf(i) {
    const j = [0, 0, 0, 0], w = [0, 0, 0, 0];
    let s = 0;
    for (let k = 0; k < 4; k++) { j[k] = this.J[i * 4 + k]; w[k] = this.W[i * 4 + k]; s += w[k]; }
    return { j, w: w.map((v) => v / (s || 1)) };
  }

  /** Maior y do tronco perto de (x, z): topo do ombro para a alça do colete. */
  topAt(x, half = 0.02) {
    let top = -9;
    for (let i = 0; i < this.nv; i++) {
      if (this.part(i, 'torso') < 0.5 || Math.abs(this.pos[i * 3] - x) > half) continue;
      top = Math.max(top, this.pos[i * 3 + 1]);
    }
    return top;
  }
}

// ---------------------------------------------------------------------------------------------
// Corte transversal de um segmento do corpo (tronco, perna, braço), alisado
// ---------------------------------------------------------------------------------------------
/**
 * Eixo 'y' (tronco, pernas): θ = 0 aponta para a frente (+z), θ = π/2 para +x.
 * Eixo 'x' (braços em T): θ = 0 aponta para cima (+y), θ = π/2 para a frente (+z).
 */
export class Contour {
  constructor(body, { axis = 'y', filter, l0, l1, nL = 10, nA = 48, half, smoothA = 3 }) {
    Object.assign(this, { body, axis, l0, l1, nL, nA });
    const set = (this.set = body.select(filter));
    half ??= Math.abs(l1 - l0) / nL * 0.75 + 0.008;
    const P = body.pos, ax = axis === 'y' ? 1 : 0, cu = axis === 'y' ? 0 : 1;
    this.centers = []; this.r = [];
    for (let j = 0; j <= nL; j++) {
      const L = lerp(l0, l1, j / nL);
      let h = half, win = [];
      while (win.length < 8 && h < 0.2) { win = set.filter((i) => Math.abs(P[i * 3 + ax] - L) < h); h *= 1.6; }
      let minU = 9, maxU = -9, minV = 9, maxV = -9;
      for (const i of win) { const u = P[i * 3 + cu], v = P[i * 3 + 2]; minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v); }
      const c = [(minU + maxU) / 2, (minV + maxV) / 2];
      const r = new Float32Array(nA).fill(-1);
      for (const i of win) {
        const du = P[i * 3 + cu] - c[0], dv = P[i * 3 + 2] - c[1];
        const th = axis === 'y' ? Math.atan2(du, dv) : Math.atan2(dv, du);
        const rr = Math.hypot(du, dv);
        const b = ((Math.round((th / (2 * Math.PI)) * nA) % nA) + nA) % nA;
        for (const bb of [b - 1, b, b + 1]) { const q = (bb + nA) % nA; r[q] = Math.max(r[q], rr * (bb === b ? 1 : 0.985)); }
      }
      // buracos: interpola entre vizinhos com valor
      for (let a = 0; a < nA; a++) if (r[a] < 0) {
        let p = 1, n = 1;
        while (r[(a - p + nA) % nA] < 0 && p < nA) p++;
        while (r[(a + n) % nA] < 0 && n < nA) n++;
        r[a] = lerp(r[(a - p + nA) % nA], r[(a + n) % nA], p / (p + n));
      }
      for (let s = 0; s < smoothA; s++) {
        const q = r.slice();
        for (let a = 0; a < nA; a++) r[a] = 0.25 * q[(a - 1 + nA) % nA] + 0.5 * q[a] + 0.25 * q[(a + 1) % nA];
      }
      this.centers.push(c); this.r.push(r);
    }
    // alisa entre níveis
    for (let s = 0; s < 2; s++) {
      const old = this.r.map((r) => r.slice()), oc = this.centers.map((c) => c.slice());
      for (let j = 1; j < nL; j++) for (let a = 0; a < nA; a++) this.r[j][a] = 0.25 * old[j - 1][a] + 0.5 * old[j][a] + 0.25 * old[j + 1][a];
      for (let j = 1; j < nL; j++) for (let k = 0; k < 2; k++) this.centers[j][k] = 0.25 * oc[j - 1][k] + 0.5 * oc[j][k] + 0.25 * oc[j + 1][k];
    }
  }

  /** Raio do corpo no ângulo θ e na fração t ∈ [0,1] entre l0 e l1. */
  R(th, t) {
    const f = clamp01(t) * this.nL, j = Math.min(this.nL - 1, Math.floor(f)), fj = f - j;
    const g = ((th / (2 * Math.PI)) * this.nA % this.nA + this.nA) % this.nA, a = Math.floor(g) % this.nA, fa = g - Math.floor(g), a1 = (a + 1) % this.nA;
    const v = (jj) => lerp(this.r[jj][a], this.r[jj][a1], fa);
    return lerp(v(j), v(j + 1), fj);
  }

  center(t) {
    const f = clamp01(t) * this.nL, j = Math.min(this.nL - 1, Math.floor(f)), fj = f - j;
    return [lerp(this.centers[j][0], this.centers[j + 1][0], fj), lerp(this.centers[j][1], this.centers[j + 1][1], fj)];
  }

  /** Ponto no ângulo θ, fração t, a `r` do centro (r padrão: a superfície do corpo). */
  point(th, t, r = this.R(th, t)) {
    const c = this.center(t), L = lerp(this.l0, this.l1, t);
    return this.axis === 'y'
      ? [c[0] + r * Math.sin(th), L, c[1] + r * Math.cos(th)]
      : [L, c[0] + r * Math.cos(th), c[1] + r * Math.sin(th)];
  }

  /** Direção para fora no ângulo θ. */
  out(th) {
    return this.axis === 'y' ? [Math.sin(th), 0, Math.cos(th)] : [0, Math.cos(th), Math.sin(th)];
  }

  /** t de um nível absoluto (y ou x). */
  tOf(L) { return (L - this.l0) / (this.l1 - this.l0); }
}

// ---------------------------------------------------------------------------------------------
// Malha do kit: acumula peças com pesos de pele por vértice
// ---------------------------------------------------------------------------------------------
export class Kit {
  constructor(body) {
    this.body = body;
    this.joints = body.names;
    this.pos = []; this.nor = []; this.col = []; this.jnt = []; this.wgt = []; this.idx = [];
  }

  get empty() { return this.pos.length === 0; }

  /**
   * Luz pintada: cada peça escurece para baixo e clareia no topo, e as quinas (onde a normal
   * não está alinhada aos eixos da peça) ganham um brilho de desgaste.
   */
  static paint(base, { n, y, y0, y1, edge = 0, grad = 0.22, edgeLift = 0.22 }) {
    const t = y1 > y0 ? clamp01((y - y0) / (y1 - y0)) : 0.5;
    let k = 1 - grad + grad * 1.35 * t;
    k *= 1 + 0.1 * Math.max(0, n[1]);
    k *= 1 + edgeLift * edge;
    // realce somado (não multiplicado): quina de peça preta também brilha, como pintura à mão
    const lift = 0.035 * edgeLift * 4 * edge;
    return [base[0] * k + lift, base[1] * k + lift, base[2] * k + lift];
  }

  /** Geometria presa a um osso, em espaço do modelo. `color` é hex ou (x, y, z) → hex. */
  add(geo, color, bone, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], matrix, grad = 0.22, edgeLift = 0.25 } = {}) {
    const m = matrix ?? new THREE.Matrix4().compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot, 'YXZ')),
      new THREE.Vector3(...scale),
    );
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.computeVertexNormals();
    // quina: medida nas normais da peça antes de girar
    const ln = g.getAttribute('normal');
    const edge = new Float32Array(ln.count);
    for (let i = 0; i < ln.count; i++) edge[i] = sstep(0.06, 0.3, 1 - Math.max(Math.abs(ln.getX(i)), Math.abs(ln.getY(i)), Math.abs(ln.getZ(i))));
    g.applyMatrix4(m);
    g.computeVertexNormals();
    g.computeBoundingBox();
    const { min, max } = g.boundingBox;
    const j = this.joints.indexOf(bone);
    if (j < 0) throw new Error(`osso ${bone} não existe`);
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    const base = this.pos.length / 3;
    const fixed = typeof color === 'function' ? null : rgb(color);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nn = [n.getX(i), n.getY(i), n.getZ(i)];
      const c = fixed ?? rgb(color(x, y, z));
      this.pos.push(x, y, z); this.nor.push(...nn);
      this.col.push(...Kit.paint(c, { n: nn, y, y0: min.y, y1: max.y, edge: edge[i], grad, edgeLift }));
      this.jnt.push(j, 0, 0, 0); this.wgt.push(1, 0, 0, 0);
      this.idx.push(base + i);
    }
    return this;
  }

  /** Malha já pronta, com pesos por vértice. */
  addSkinned({ pos, nor, col, skin, idx }) {
    const base = this.pos.length / 3;
    for (let i = 0; i < pos.length / 3; i++) {
      this.pos.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      this.nor.push(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]);
      this.col.push(col[i * 3], col[i * 3 + 1], col[i * 3 + 2]);
      this.jnt.push(...skin[i].j); this.wgt.push(...skin[i].w);
    }
    for (const i of idx) this.idx.push(base + i);
  }

  toPrimitive(doc, material) {
    const buffer = doc.getRoot().listBuffers()[0];
    const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buffer);
    return doc.createPrimitive()
      .setAttribute('POSITION', acc('VEC3', new Float32Array(this.pos)))
      .setAttribute('NORMAL', acc('VEC3', new Float32Array(this.nor)))
      .setAttribute('COLOR_0', acc('VEC3', new Float32Array(this.col)))
      .setAttribute('JOINTS_0', acc('VEC4', new Uint8Array(this.jnt)))
      .setAttribute('WEIGHTS_0', acc('VEC4', new Float32Array(this.wgt)))
      .setIndices(acc('SCALAR', new Uint32Array(this.idx)))
      .setMaterial(material);
  }
}

// ---------------------------------------------------------------------------------------------
// Faixa com espessura em volta de um Contour
// ---------------------------------------------------------------------------------------------
/** Ajusta a ordem dos triângulos para a normal apontar para `expect(i)`. */
function orient(pos, idx, expect) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const n = g.getAttribute('normal');
  let s = 0;
  for (let i = 0; i < n.count; i++) { const e = expect(i); s += n.getX(i) * e[0] + n.getY(i) * e[1] + n.getZ(i) * e[2]; }
  if (s < 0) {
    for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return Array.from(g.getAttribute('normal').array);
}

/**
 * Casca em volta do corpo: entre `off` e `off + th` da superfície alisada, de t0 a t1 ao longo
 * do eixo, nos ângulos `angles(t) → [a0, a1]` (ou a volta inteira com `full`). `pillow` afina a
 * espessura perto das bordas (acolchoado). `color(θ, t, face)` → hex, face = 'out' | 'edge'.
 */
export function band(kit, C, { t0 = 0, t1 = 1, angles = () => [-Math.PI, Math.PI], full = false, off = 0.005, th = 0.012, pillow = 0, nA = 28, nL = 6, color = '#333333', skinSet, grad = 0.2, bulge, inner = false }) {
  const body = kit.body;
  const set = skinSet ?? C.set;
  const P = [], I = [], cols = [], skins = [];
  const faces = [];
  const ring = (i, j) => {
    const t = lerp(t0, t1, j / nL);
    const [a0, a1] = angles(t);
    return { th: lerp(a0, a1, i / nA), t, u: i / nA, v: j / nL };
  };
  const thick = (u, v) => {
    if (!pillow) return th;
    const du = full ? 1 : Math.min(u, 1 - u) * 2, dv = Math.min(v, 1 - v) * 2;
    const e = Math.min(du / pillow, dv / pillow, 1);
    return th * (0.35 + 0.65 * Math.sqrt(e));
  };
  const surface = (s, which) => {
    const R = C.R(s.th, s.t);
    const extra = bulge ? bulge(s.u, s.v) : 0;
    return C.point(s.th, s.t, R + off + (which === 'out' ? thick(s.u, s.v) + extra : 0));
  };
  // grade externa e interna
  const grid = (which) => {
    const start = P.length / 3, ids = [];
    for (let j = 0; j <= nL; j++) for (let i = 0; i <= nA; i++) {
      const s = ring(i, j);
      P.push(...surface(s, which));
      ids.push({ s, which });
    }
    const idx = [];
    for (let j = 0; j < nL; j++) for (let i = 0; i < nA; i++) {
      const a = start + j * (nA + 1) + i, b = a + 1, c = a + nA + 1, d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
    faces.push({ start, count: ids.length, idx, which, meta: ids });
  };
  grid('out');
  // o lado de dentro encosta no corpo e nunca aparece: só as tampas fecham a espessura
  if (inner) grid('in');
  // tampas: ligam a borda externa à interna
  const strip = (list, name) => {
    const start = P.length / 3, meta = [];
    for (const s of list) { P.push(...surface(s, 'out')); meta.push({ s, which: 'edge' }); P.push(...surface(s, 'in')); meta.push({ s, which: 'edge' }); }
    const idx = [];
    for (let k = 0; k < list.length - 1; k++) { const a = start + k * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); }
    faces.push({ start, count: meta.length, idx, which: 'edge', meta, name });
  };
  strip(Array.from({ length: nA + 1 }, (_, i) => ring(i, 0)), 'bottom');
  strip(Array.from({ length: nA + 1 }, (_, i) => ring(i, nL)), 'top');
  if (!full) {
    strip(Array.from({ length: nL + 1 }, (_, j) => ring(0, j)), 'start');
    strip(Array.from({ length: nL + 1 }, (_, j) => ring(nA, j)), 'end');
  }
  const N = new Array(P.length).fill(0);
  const axisDir = C.axis === 'y' ? [0, 1, 0] : [1, 0, 0];
  const sgn = C.l1 > C.l0 ? 1 : -1;
  for (const f of faces) {
    const local = f.idx.map((v) => v - f.start);
    const pos = P.slice(f.start * 3, (f.start + f.count) * 3);
    const expect = (i) => {
      const s = f.meta[i].s, o = C.out(s.th);
      if (f.which === 'out') return o;
      if (f.which === 'in') return o.map((v) => -v);
      if (f.name === 'bottom') return axisDir.map((v) => -v * sgn);
      if (f.name === 'top') return axisDir.map((v) => v * sgn);
      // pontas: tangente
      const t2 = C.out(s.th + 0.01), d = t2.map((v, k) => v - o[k]);
      return f.name === 'start' ? d.map((v) => -v) : d;
    };
    const nn = orient(pos, local, expect);
    for (let k = 0; k < nn.length; k++) N[f.start * 3 + k] = nn[k];
    f.idx = local.map((v) => v + f.start);
    I.push(...f.idx);
  }
  // cor e pesos
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 1; i < P.length; i += 3) { y0 = Math.min(y0, P[i]); y1 = Math.max(y1, P[i]); }
  for (const f of faces) for (let k = 0; k < f.count; k++) {
    const v = f.start + k, m = f.meta[k];
    const hex = typeof color === 'function' ? color(m.s.th, m.s.t, m.which, m.s) : color;
    const p = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], n = [N[v * 3], N[v * 3 + 1], N[v * 3 + 2]];
    const rim = f.which === 'edge' ? 1 : 0;
    cols.push(...Kit.paint(rgb(hex), { n, y: p[1], y0, y1, edge: rim, grad, edgeLift: 0.28 }));
    const inner = C.point(m.s.th, m.s.t);
    skins.push(body.skinOf(body.nearest(inner, set)));
  }
  kit.addSkinned({ pos: P, nor: N, col: cols, skin: skins, idx: I });
}

/** Ponto e base (frente, cima, lado) na superfície de uma faixa, para encostar peças rígidas. */
export function frameOn(C, th, t, r) {
  const p = C.point(th, t, C.R(th, t) + r);
  const out = new THREE.Vector3(...C.out(th));
  const up = C.axis === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  // inclinação da superfície ao longo do eixo (a placa do peito não é vertical)
  const dt = 0.04;
  const pa = new THREE.Vector3(...C.point(th, t - dt, C.R(th, t - dt) + r)), pb = new THREE.Vector3(...C.point(th, t + dt, C.R(th, t + dt) + r));
  const along = pb.sub(pa).normalize();
  if (C.l1 < C.l0) along.negate();
  const side = new THREE.Vector3().crossVectors(along, out).normalize();
  const fwd = new THREE.Vector3().crossVectors(side, along).normalize();
  return { p: new THREE.Vector3(...p), out: fwd, up: along, side, upAxis: up };
}

/** Matriz que põe uma peça (frente local +z, cima local +y) no quadro `f`, `lift` para fora. */
export function placeOn(f, lift = 0, { spin = 0, tilt = 0 } = {}) {
  const basis = new THREE.Matrix4().makeBasis(f.side, f.up, f.out);
  const q = new THREE.Quaternion().setFromRotationMatrix(basis);
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spin));
  if (tilt) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt));
  const p = f.p.clone().addScaledVector(f.out, lift);
  return new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
}

/**
 * Fita de seção retangular ao longo de uma curva, com a largura sempre no eixo x do mundo
 * (alças que passam por cima do ombro, no plano yz). Bordas levemente chanfradas.
 */
function ribbon(curve, width, thick, steps = 16) {
  const X = new THREE.Vector3(1, 0, 0);
  const pos = [], idx = [];
  const sec = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  for (let k = 0; k <= steps; k++) {
    const u = k / steps, p = curve.getPointAt(u), T = curve.getTangentAt(u);
    const D = new THREE.Vector3().crossVectors(T, X).normalize();
    for (const [a, b] of sec) { const q = p.clone().addScaledVector(X, a * width).addScaledVector(D, b * thick); pos.push(q.x, q.y, q.z); }
  }
  for (let k = 0; k < steps; k++) for (let e = 0; e < 4; e++) {
    const a = k * 4 + e, b = k * 4 + (e + 1) % 4, c = a + 4, d = b + 4;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

const rbox = (w, h, d, r = 0.006, seg = 1) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));

// ---------------------------------------------------------------------------------------------
// Casca copiada da malha do corpo (luvas, botas)
// ---------------------------------------------------------------------------------------------
/**
 * Copia os triângulos do corpo cujos vértices passam em `filter`, empurra `offset` para fora e
 * alisa (Taubin, bordas presas). `post(p, i)` pode mexer na posição final; `color(p)` → hex.
 */
export function shell(kit, { filter, offset = 0.006, iters = 10, post, color, grad = 0.25 }) {
  const B = kit.body, W = B.weld, I = B.idx, P0 = B.pos;
  const tris = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    if (filter(a) && filter(b) && filter(c)) tris.push(W[a], W[b], W[c]);
  }
  const used = new Map(); // id soldado → índice local
  const rep = []; // vértice do corpo que representa cada vértice da casca
  const firstOf = new Map();
  for (let i = 0; i < B.nv; i++) if (!firstOf.has(W[i])) firstOf.set(W[i], i);
  const idx = tris.map((w) => { if (!used.has(w)) { used.set(w, rep.length); rep.push(firstOf.get(w)); } return used.get(w); });
  const n = rep.length;
  let P = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) for (let c = 0; c < 3; c++) P[k * 3 + c] = P0[rep[k] * 3 + c] + B.nor[rep[k] * 3 + c] * offset;
  // vizinhos e borda
  const nbr = Array.from({ length: n }, () => new Set());
  const edgeCount = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = idx[t + e], b = idx[t + (e + 1) % 3];
      nbr[a].add(b); nbr[b].add(a);
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
    }
  }
  const border = new Uint8Array(n);
  for (const [key, c] of edgeCount) if (c === 1) { const [a, b] = key.split(',').map(Number); border[a] = border[b] = 1; }
  for (let it = 0; it < iters * 2; it++) {
    const f = it % 2 === 0 ? 0.55 : -0.57;
    const Q = new Float32Array(P);
    for (let k = 0; k < n; k++) {
      if (border[k] || !nbr[k].size) continue;
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (const m of nbr[k]) s += P[m * 3 + c];
        Q[k * 3 + c] += f * (s / nbr[k].size - P[k * 3 + c]);
      }
    }
    P = Q;
  }
  if (post) for (let k = 0; k < n; k++) { const p = post([P[k * 3], P[k * 3 + 1], P[k * 3 + 2]], rep[k]); P.set(p, k * 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const N = g.getAttribute('normal').array;
  let y0 = Infinity, y1 = -Infinity;
  for (let k = 0; k < n; k++) { y0 = Math.min(y0, P[k * 3 + 1]); y1 = Math.max(y1, P[k * 3 + 1]); }
  const col = [], skin = [];
  for (let k = 0; k < n; k++) {
    const p = [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]], nn = [N[k * 3], N[k * 3 + 1], N[k * 3 + 2]];
    col.push(...Kit.paint(rgb(typeof color === 'function' ? color(p, rep[k]) : color), { n: nn, y: p[1], y0, y1, grad }));
    skin.push(B.skinOf(rep[k]));
  }
  kit.addSkinned({ pos: Array.from(P), nor: Array.from(N), col, skin, idx });
}

// ---------------------------------------------------------------------------------------------
// Letras em blocos (IBAMA nas costas)
// ---------------------------------------------------------------------------------------------
/** Uma caixa por trecho horizontal aceso da fonte 5×7, encostada na superfície. */
function blockText(kit, text, place, { width, depth = 0.004, color, bone }) {
  const cols = text.length * 6 - 1, px = width / cols;
  for (let row = 0; row < 7; row++) {
    let run = -1;
    for (let cx = 0; cx <= cols; cx++) {
      const g = cx < cols && cx % 6 !== 5 ? FONT[text[Math.floor(cx / 6)]] : null;
      const on = g && g[row][cx % 6] === '1';
      if (on && run < 0) run = cx;
      if (!on && run >= 0) {
        const u = ((run + cx) / 2 / cols) - 0.5, v = 0.5 - (row + 0.5) / 7;
        kit.add(new THREE.BoxGeometry((cx - run) * px * 0.98, px * 0.98, depth), color, bone, { matrix: place(u * width, v * px * 7), grad: 0.08, edgeLift: 0.1 });
        run = -1;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Peças
// ---------------------------------------------------------------------------------------------
/** Contorno do tronco, de baixo do umbigo até o alto do peito. */
function torsoContour(body, M) {
  const yA = M.waistY - 0.1, yB = M.chestY + 0.16;
  return new Contour(body, {
    axis: 'y', l0: yA, l1: yB, nL: 14, nA: 64, smoothA: 4,
    filter: (i) => body.part(i, 'torso') > 0.55 && body.arm(i) < 0.2,
  });
}

function legContour(body, M, side, y0, y1) {
  const s = side === 'l' ? 1 : -1;
  return new Contour(body, {
    axis: 'y', l0: y0, l1: y1, nL: 8, nA: 40, smoothA: 3,
    filter: (i, x) => body.leg(i) > 0.6 && Math.sign(x) === s,
  });
}

function armContour(body, M, side, x0, x1) {
  const s = side === 'l' ? 1 : -1;
  return new Contour(body, {
    axis: 'x', l0: s * x0, l1: s * x1, nL: 6, nA: 32, smoothA: 3,
    filter: (i, x) => (body.arm(i) > 0.6) && Math.sign(x) === s,
  });
}

export const KIT = {
  /**
   * Colete de placas (plate carrier): placas acolchoadas na frente e nas costas, faixa
   * lateral, alças nos ombros, fileiras de MOLLE, porta-carregadores, nome nas costas.
   * `style: 'vest'` faz um colete de campo mais leve (sem placas grossas, com bolsos).
   */
  plateCarrier(kit, ctx, { color = '#1d2023', webbing, text = 'IBAMA', textColor = '#f5c400', pouches = 3, pouchColor, style = 'plates', tape = true } = {}) {
    const { body, M } = ctx;
    const C = (ctx.torso ??= torsoContour(body, M));
    const plates = style === 'plates';
    const web = webbing ?? shade(color, 0.72);
    const pc = pouchColor ?? shade(color, 1.12);
    const tTop = C.tOf(M.chestY + 0.1), tBot = C.tOf(M.waistY - 0.005), tCum = C.tOf(M.waistY + 0.1);
    const off = 0.004, th = plates ? 0.026 : 0.012;
    const half = plates ? 0.98 : 1.05;
    // recorte do ombro: a placa estreita no alto
    const cut = (t) => { const k = sstep(tTop - 0.18, tTop, t); return half * (1 - 0.32 * k); };
    const front = (t) => [-cut(t), cut(t)];
    const back = (t) => [Math.PI - cut(t), Math.PI + cut(t)];
    band(kit, C, { t0: tBot, t1: tTop, angles: front, off, th, pillow: plates ? 0.35 : 0.2, color, nA: 20, nL: 8 });
    band(kit, C, { t0: tBot, t1: tTop + 0.02, angles: back, off, th, pillow: plates ? 0.35 : 0.2, color, nA: 20, nL: 8 });
    // faixa lateral (cummerbund)
    for (const s of [1, -1]) {
      const a = s > 0 ? [half - 0.12, Math.PI - half + 0.12] : [-(Math.PI - half + 0.12), -(half - 0.12)];
      band(kit, C, { t0: tBot + 0.01, t1: tCum, angles: () => a, off: off + 0.002, th: 0.013, pillow: 0.25, color: web, nA: 12, nL: 4 });
    }
    // MOLLE: tiras horizontais na frente (embaixo) e nas costas
    const rOut = off + th;
    const rows = plates ? 3 : 2;
    for (let k = 0; k < rows; k++) {
      const tc = lerp(tBot + 0.06, tBot + (tTop - tBot) * 0.42, k / Math.max(1, rows - 1));
      band(kit, C, { t0: tc - 0.012, t1: tc + 0.012, angles: () => [-half * 0.86, half * 0.86], off: rOut - 0.002, th: 0.004, color: web, nA: 22, nL: 1, grad: 0.05 });
      band(kit, C, { t0: tc - 0.012, t1: tc + 0.012, angles: () => [Math.PI - half * 0.86, Math.PI + half * 0.86], off: rOut - 0.002, th: 0.004, color: web, nA: 22, nL: 1, grad: 0.05 });
    }
    // alças dos ombros: arco por cima do ombro, da placa da frente à de trás
    for (const s of [1, -1]) {
      const x = s * 0.1;
      const pf = C.point(s * 0.5, tTop, C.R(s * 0.5, tTop) + off + th * 0.6);
      const pb = C.point(Math.PI - s * 0.5, tTop + 0.02, C.R(Math.PI - s * 0.5, tTop + 0.02) + off + th * 0.6);
      const top = body.topAt(x) + 0.016;
      const mid = [x * 1.06, top, (pf[2] + pb[2]) / 2 - 0.005];
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(pf[0], pf[1] - 0.01, pf[2]),
        new THREE.Vector3(lerp(pf[0], mid[0], 0.6), lerp(pf[1], top, 0.8), lerp(pf[2], mid[2], 0.55)),
        new THREE.Vector3(...mid),
        new THREE.Vector3(lerp(pb[0], mid[0], 0.6), lerp(pb[1], top, 0.8), lerp(pb[2], mid[2], 0.55)),
        new THREE.Vector3(pb[0], pb[1] - 0.01, pb[2]),
      ]);
      kit.add(ribbon(curve, 0.05, 0.012, 18), shade(color, 1.05), 'spine_03', { grad: 0.1, edgeLift: 0.2 });
    }
    // porta-carregadores na frente (com os carregadores aparecendo)
    if (pouches) {
      const tp = C.tOf(M.waistY + 0.05) - 0.07;
      const gap = plates ? 0.36 : 0.42;
      for (let k = 0; k < pouches; k++) {
        const a = (k - (pouches - 1) / 2) * gap;
        const f = frameOn(C, a, tp + 0.07, rOut);
        const h = 0.085, w = 0.058, d = 0.032;
        kit.add(rbox(w, h, d, 0.009), pc, 'spine_03', { matrix: placeOn(f, d / 2 - 0.002).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0)) });
        kit.add(rbox(w * 1.04, 0.026, d + 0.006, 0.006), shade(pc, 1.08), 'spine_03', { matrix: placeOn(f, d / 2 - 0.002).multiply(new THREE.Matrix4().makeTranslation(0, h / 2 - 0.006, 0.002)) });
        // carregador espiando por cima da aba
        kit.add(rbox(w * 0.5, 0.03, d * 0.55, 0.004), '#2a2c2f', 'spine_03', { matrix: placeOn(f, d / 2 - 0.004).multiply(new THREE.Matrix4().makeTranslation(0, h / 2 + 0.008, -0.002)) });
        // fivela clara na aba
        kit.add(rbox(0.016, 0.01, 0.004, 0.002), '#8f949a', 'spine_03', { matrix: placeOn(f, d + 0.002).multiply(new THREE.Matrix4().makeTranslation(0, h / 2 - 0.01, 0)) });
      }
    }
    // bolso administrativo no peito e a tarja com o nome
    const fa = frameOn(C, 0, tTop - 0.17, rOut);
    kit.add(rbox(0.12, 0.07, 0.016, 0.007), pc, 'spine_03', { matrix: placeOn(fa, 0.006) });
    if (tape && text) {
      const ft = frameOn(C, 0, tTop - 0.17, rOut);
      kit.add(rbox(0.1, 0.03, 0.005, 0.0025), textColor, 'spine_03', { matrix: placeOn(ft, 0.016).multiply(new THREE.Matrix4().makeTranslation(0, 0.012, 0)), grad: 0.08 });
      blockText(kit, text, (u, v) => placeOn(ft, 0.0185).multiply(new THREE.Matrix4().makeTranslation(u, 0.012 + v, 0)), { width: 0.078, depth: 0.003, color: shade(color, 0.8), bone: 'spine_03' });
    }
    // costas: nome grande em blocos
    if (text) {
      blockText(kit, text, (u, v) => {
        // cada bloco acompanha a curva das costas
        const a = Math.PI + u / (C.R(Math.PI, tTop - 0.12) + rOut);
        const f = frameOn(C, a, tTop - 0.12 + v / (C.l1 - C.l0), rOut);
        return placeOn(f, 0.0015);
      }, { width: 0.2, depth: 0.0045, color: textColor, bone: 'spine_03' });
    }
    ctx.carrier = { C, rOut, tTop, tBot };
  },

  /** Rádio HT preso no alto do colete, com antena e cabo do PTT até o ombro. */
  radio(kit, ctx, { color = '#141618', side = 'l' } = {}) {
    const { body, M } = ctx;
    const C = (ctx.torso ??= torsoContour(body, M));
    const s = side === 'l' ? 1 : -1;
    const rOut = ctx.carrier?.rOut ?? 0.012;
    const t = (ctx.carrier?.tTop ?? C.tOf(M.chestY + 0.1)) - 0.09;
    const f = frameOn(C, s * 0.62, t, rOut);
    const m = placeOn(f, 0.014);
    kit.add(rbox(0.036, 0.07, 0.026, 0.006), color, 'spine_03', { matrix: m });
    kit.add(rbox(0.026, 0.02, 0.004, 0.002), '#3a4048', 'spine_03', { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.01, 0.013)) });
    kit.add(new THREE.CylinderGeometry(0.0045, 0.0045, 0.008, 8), '#e2a400', 'spine_03', { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(-0.009, 0.039, 0)) });
    kit.add(new THREE.CylinderGeometry(0.0035, 0.005, 0.085, 8), color, 'spine_03', { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0.009, 0.077, -0.002)) });
    kit.add(new THREE.SphereGeometry(0.0055, 8, 6), color, 'spine_03', { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0.009, 0.12, -0.002)) });
    // PTT no alto da alça
    const fp = frameOn(C, s * 0.42, ctx.carrier?.tTop ?? t + 0.1, rOut + 0.004);
    kit.add(rbox(0.024, 0.03, 0.014, 0.006), '#202326', 'spine_03', { matrix: placeOn(fp, 0.008) });
    const a = new THREE.Vector3().setFromMatrixPosition(m).add(new THREE.Vector3(0, -0.035, 0.005));
    const b = new THREE.Vector3().setFromMatrixPosition(placeOn(fp, 0.008));
    const mid = a.clone().lerp(b, 0.5).addScaledVector(f.out, 0.02).add(new THREE.Vector3(s * 0.01, -0.03, 0));
    kit.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, b]), 12, 0.003, 5), '#101112', 'spine_03', { grad: 0 });
  },

  /** Joelheiras acolchoadas com tira atrás do joelho. */
  kneePads(kit, ctx, { color = '#25282b', strap } = {}) {
    const { body, M } = ctx;
    for (const side of ['l', 'r']) {
      const C = legContour(body, M, side, M.kneeY - 0.075, M.kneeY + 0.075);
      const oval = (t) => { const k = Math.sqrt(Math.max(0.05, 1 - Math.pow((t - 0.5) * 2, 2) * 0.75)); return [-1.15 * k, 1.15 * k]; };
      band(kit, C, { t0: 0.05, t1: 0.95, angles: oval, off: 0.006, th: 0.024, pillow: 0.45, color, nA: 14, nL: 6,
        bulge: (u, v) => 0.006 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) });
      // placa dura no meio
      band(kit, C, { t0: 0.3, t1: 0.7, angles: () => [-0.55, 0.55], off: 0.006 + 0.024, th: 0.006, pillow: 0.5, color: shade(color, 1.25), nA: 10, nL: 4 });
      band(kit, C, { t0: 0.62, t1: 0.74, full: true, off: 0.004, th: 0.006, color: strap ?? shade(color, 0.85), nA: 20, nL: 1 });
      band(kit, C, { t0: 0.24, t1: 0.34, full: true, off: 0.004, th: 0.006, color: strap ?? shade(color, 0.85), nA: 20, nL: 1 });
    }
  },

  /** Botas de cano: casca do pé alisada, solado grosso e borda acolchoada no cano. */
  boots(kit, ctx, { color = '#2a2422', sole = '#141210', top = 0.25, cuff, laces = true } = {}) {
    const { body, M } = ctx;
    const bootTop = top;
    shell(kit, {
      filter: (i) => body.leg(i) > 0.5 && body.pos[i * 3 + 1] < bootTop + 0.012,
      offset: 0.011, iters: 14,
      post: (p) => {
        // solado: achata a base e alarga um pouco
        if (p[1] < 0.035) {
          const k = 1 - sstep(0.0, 0.035, p[1]);
          const cx = Math.sign(p[0]) * M.B.foot_l[0];
          p[0] += (p[0] - cx) * 0.12 * k;
          p[2] += (p[2] - (M.B.foot_l[2] + 0.05)) * 0.05 * k;
          p[1] = Math.max(-0.008, p[1] - 0.008 * k);
        }
        return p;
      },
      color: (p) => (p[1] < 0.022 ? sole : p[1] < 0.03 ? shade(color, 0.8) : color),
    });
    for (const side of ['l', 'r']) {
      const C = legContour(body, M, side, bootTop - 0.045, bootTop + 0.004);
      band(kit, C, { t0: 0, t1: 1, full: true, off: 0.01, th: 0.012, pillow: 0.5, color: cuff ?? shade(color, 1.1), nA: 28, nL: 3 });
      if (laces) {
        // cadarço: pequenas barras na frente do cano
        const L = legContour(body, M, side, 0.08, bootTop - 0.045);
        for (let k = 0; k < 4; k++) {
          const t = 0.15 + k * 0.24;
          const f = frameOn(L, 0, t, 0.022);
          kit.add(rbox(0.03, 0.006, 0.006, 0.0025), shade(color, 0.6), side === 'l' ? 'calf_l' : 'calf_r', { matrix: placeOn(f, 0), grad: 0 });
        }
      }
    }
  },

  /** Luvas: casca da mão (dedos dobram junto) e punho acolchoado. */
  gloves(kit, ctx, { color = '#1f2124', cuff, knuckles = true } = {}) {
    const { body, M } = ctx;
    const wx = M.wristX;
    shell(kit, {
      filter: (i) => body.part(i, 'hand') > 0.5 || (body.arm(i) > 0.5 && Math.abs(body.pos[i * 3]) > wx - 0.012),
      offset: 0.0045, iters: 3, color,
    });
    for (const side of ['l', 'r']) {
      const C = armContour(body, M, side, wx - 0.05, wx + 0.005);
      band(kit, C, { t0: 0, t1: 1, full: true, off: 0.004, th: 0.009, pillow: 0.5, color: cuff ?? shade(color, 1.15), nA: 24, nL: 3 });
      if (knuckles) {
        const s = side === 'l' ? 1 : -1;
        const k = M.B[`middle_01_${side}`] ?? [s * (wx + 0.08), M.B.hand_l[1], M.B.hand_l[2]];
        // dorso da mão: em T com a palma para baixo, o dorso olha para +y
        const handSet = body.select((i, x) => body.part(i, 'hand') > 0.5 && Math.sign(x) === s && Math.abs(x - (k[0] - s * 0.035)) < 0.015);
        let topY = -9; for (const i of handSet) topY = Math.max(topY, body.pos[i * 3 + 1]);
        kit.add(rbox(0.045, 0.012, 0.06, 0.005), shade(color, 1.3), `hand_${side}`, { pos: [k[0] - s * 0.035, topY + 0.006, k[2] + 0.004] });
      }
    }
  },

  /** Coldre de perna (drop leg) com a pistola, preso na coxa direita. */
  holster(kit, ctx, { color = '#1c1e20', side = 'r', gun = '#2b2e31' } = {}) {
    const { body, M } = ctx;
    const s = side === 'l' ? 1 : -1;
    const bone = `thigh_${side}`;
    const C = legContour(body, M, side, M.kneeY + 0.14, M.waistY - 0.03);
    const th = s * Math.PI / 2 - s * 0.12;
    // tiras em volta da coxa
    for (const t of [0.2, 0.55]) band(kit, C, { t0: t - 0.05, t1: t + 0.05, full: true, off: 0.004, th: 0.006, color: shade(color, 0.9), nA: 28, nL: 1 });
    const f = frameOn(C, th, 0.4, 0.012);
    const m = placeOn(f, 0.0);
    // plataforma
    kit.add(rbox(0.075, 0.16, 0.01, 0.005), shade(color, 0.85), bone, { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.004)) });
    // corpo do coldre (cano para baixo) e trava
    kit.add(rbox(0.05, 0.13, 0.04, 0.012), color, bone, { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(-s * 0.004, -0.015, 0.03)) });
    kit.add(rbox(0.054, 0.02, 0.046, 0.006), shade(color, 1.2), bone, { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(-s * 0.004, 0.045, 0.03)) });
    // empunhadura saindo por cima, inclinada para trás
    const grip = m.clone().multiply(new THREE.Matrix4().makeTranslation(-s * 0.004, 0.072, 0.024)).multiply(new THREE.Matrix4().makeRotationX(0)).multiply(new THREE.Matrix4().makeRotationY(0));
    kit.add(rbox(0.026, 0.05, 0.034, 0.008), gun, bone, { matrix: grip.multiply(new THREE.Matrix4().makeRotationZ(0)).multiply(new THREE.Matrix4().makeRotationX(-0.25)) });
    // tira que sobe até o cinto
    const top = frameOn(C, th, 0.98, 0.006);
    kit.add(rbox(0.03, 0.08, 0.006, 0.003), shade(color, 0.9), bone, { matrix: placeOn(top, 0.002).multiply(new THREE.Matrix4().makeTranslation(0, -0.03, 0)) });
  },

  /** Bolsos cargo nas laterais das coxas. */
  cargoPockets(kit, ctx, { color = '#4a5436', sides = ['l', 'r'] } = {}) {
    const { body, M } = ctx;
    for (const side of sides) {
      const s = side === 'l' ? 1 : -1;
      const C = legContour(body, M, side, M.kneeY + 0.08, M.waistY - 0.05);
      const f = frameOn(C, s * Math.PI / 2, 0.42, 0.002);
      const m = placeOn(f, 0.008);
      kit.add(rbox(0.09, 0.11, 0.022, 0.009), color, `thigh_${side}`, { matrix: m });
      kit.add(rbox(0.094, 0.032, 0.026, 0.007), shade(color, 1.08), `thigh_${side}`, { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.045, 0.003)) });
    }
  },

  /** Cinto tático com fivela e bolsinhos. */
  belt(kit, ctx, { color = '#1b1b1b', buckle = '#8f949a', pouches = '#2a2d30', pouchCount = 2 } = {}) {
    const { body, M } = ctx;
    const C = new Contour(body, { axis: 'y', l0: M.waistY - 0.07, l1: M.waistY - 0.01, nL: 3, nA: 48, filter: (i) => (body.part(i, 'torso') + body.part(i, 'thigh')) > 0.6 && body.arm(i) < 0.2 });
    band(kit, C, { t0: 0.1, t1: 0.9, full: true, off: 0.004, th: 0.01, color, nA: 40, nL: 2 });
    const f = frameOn(C, 0, 0.5, 0.014);
    kit.add(rbox(0.05, 0.036, 0.01, 0.004), buckle, 'pelvis', { matrix: placeOn(f, 0.003) });
    for (let k = 0; k < pouchCount; k++) {
      const a = (k % 2 ? -1 : 1) * (2.2 + 0.35 * Math.floor(k / 2));
      const fp = frameOn(C, a, 0.5, 0.014);
      kit.add(rbox(0.05, 0.06, 0.03, 0.008), pouches, 'pelvis', { matrix: placeOn(fp, 0.014).multiply(new THREE.Matrix4().makeTranslation(0, -0.008, 0)) });
      kit.add(rbox(0.053, 0.018, 0.034, 0.005), shade(pouches, 1.12), 'pelvis', { matrix: placeOn(fp, 0.014).multiply(new THREE.Matrix4().makeTranslation(0, 0.02, 0.002)) });
    }
  },

  /** Distintivo de bandeira do Brasil no braço (de cima, aparece bem). */
  flagPatch(kit, ctx, { side = 'l' } = {}) {
    const { body, M } = ctx;
    const C = armContour(body, M, side, M.shoulderX + 0.04, M.shoulderX + 0.16);
    const f = frameOn(C, 0.35, 0.45, 0.004);
    const m = placeOn(f, 0.002, { spin: Math.PI / 2 });
    kit.add(rbox(0.06, 0.042, 0.004, 0.0018), '#1f8a3c', `upperarm_${side}`, { matrix: m, grad: 0.05, edgeLift: 0.1 });
    kit.add(rbox(0.032, 0.032, 0.002, 0.0008, 1), '#f2c81e', `upperarm_${side}`, { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.0025)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 4)).multiply(new THREE.Matrix4().makeScale(1.3, 0.75, 1)), grad: 0, edgeLift: 0 });
    kit.add(new THREE.CylinderGeometry(0.0095, 0.0095, 0.002, 16), '#21357a', `upperarm_${side}`, { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.0042)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), grad: 0, edgeLift: 0 });
  },

  /** Mochila de campo encostada atrás do colete (ou das costas). */
  backpack(kit, ctx, { color = '#3f4c30', roll = '#8a8f96' } = {}) {
    const { body, M } = ctx;
    const C = (ctx.torso ??= torsoContour(body, M));
    const rOut = ctx.carrier?.rOut ?? 0.006;
    const f = frameOn(C, Math.PI, C.tOf(M.chestY - 0.03), rOut);
    const m = placeOn(f, 0.065);
    kit.add(rbox(0.26, 0.34, 0.13, 0.03, 2), color, 'spine_03', { matrix: m });
    kit.add(rbox(0.2, 0.14, 0.05, 0.018), shade(color, 0.88), 'spine_03', { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.07, 0.075)) });
    kit.add(rbox(0.27, 0.06, 0.135, 0.02), shade(color, 1.15), 'spine_03', { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.15, 0.003)) });
    for (const sx of [-1, 1]) kit.add(rbox(0.04, 0.16, 0.05, 0.012), shade(color, 0.95), 'spine_03', { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(sx * 0.15, -0.04, 0)) });
    if (roll) kit.add(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 16), roll, 'spine_03', { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.22, 0.005)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)) });
    // alças por cima dos ombros
    for (const s of [1, -1]) {
      const x = s * 0.075, top = body.topAt(x) + 0.02 + (ctx.carrier ? 0.01 : 0);
      const pb = new THREE.Vector3().setFromMatrixPosition(m).add(new THREE.Vector3(x, 0.12, 0.05));
      const pf = new THREE.Vector3(...C.point(s * 0.55, C.tOf(M.chestY + 0.02), C.R(s * 0.55, C.tOf(M.chestY + 0.02)) + rOut + 0.01));
      const zMid = (pf.z + pb.z) / 2;
      const curve = new THREE.CatmullRomCurve3([pb, new THREE.Vector3(x, top - 0.01, lerp(zMid, pb.z, 0.5)), new THREE.Vector3(x, top, zMid), new THREE.Vector3(x * 1.05, top - 0.02, lerp(zMid, pf.z, 0.6)), pf]);
      kit.add(ribbon(curve, 0.045, 0.014, 16), shade(color, 0.85), 'spine_03', { grad: 0.1 });
    }
  },

  /** Abafador de ouvido no capacete (madeireiro). */
  earMuffs(kit, ctx, { color = '#d6411c' } = {}) {
    const { H } = ctx;
    for (const s of [1, -1]) {
      const x = s * (H.rx + 0.018);
      kit.add(new THREE.CylinderGeometry(0.034, 0.034, 0.03, 18), color, 'Head', { pos: [x, H.brimY - 0.065, H.zc - 0.005], rot: [0, 0, Math.PI / 2] });
      kit.add(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 18), '#1d1d1d', 'Head', { pos: [x - s * 0.017, H.brimY - 0.065, H.zc - 0.005], rot: [0, 0, Math.PI / 2] });
      kit.add(rbox(0.012, 0.07, 0.016, 0.005), '#2a2a2a', 'Head', { pos: [s * (H.rx + 0.026), H.brimY - 0.02, H.zc - 0.005], rot: [0, 0, -s * 0.25] });
    }
  },

  /** Bandoleira de cartuchos atravessada no peito (caçador). */
  bandolier(kit, ctx, { color = '#5a3e24', shells = '#b32a1f', brass = '#c9a24a' } = {}) {
    const { body, M } = ctx;
    const C = (ctx.torso ??= torsoContour(body, M));
    // faixa diagonal: do ombro esquerdo ao quadril direito, na frente
    const n = 9;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1);
      const t = lerp(C.tOf(M.chestY + 0.11), C.tOf(M.waistY + 0.0), u);
      const a = lerp(0.62, -0.75, u);
      const f = frameOn(C, a, t, 0.006);
      const m = placeOn(f, 0.006, { spin: -0.75 });
      kit.add(rbox(0.07, 0.045, 0.01, 0.004), color, 'spine_03', { matrix: m, grad: 0.06 });
      if (k > 0 && k < n - 1) for (const dx of [-0.018, 0, 0.018]) {
        kit.add(new THREE.CylinderGeometry(0.0055, 0.0055, 0.034, 8), shells, 'spine_03', { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(dx, 0.004, 0.009)), grad: 0.1 });
        kit.add(new THREE.CylinderGeometry(0.0058, 0.0058, 0.008, 8), brass, 'spine_03', { matrix: m.clone().multiply(new THREE.Matrix4().makeTranslation(dx, -0.016, 0.009)), grad: 0 });
      }
    }
  },
};

// ---------------------------------------------------------------------------------------------
// Calça folgada: tira o relevo de músculo das pernas
// ---------------------------------------------------------------------------------------------
/**
 * O corpo base é de super-herói: mesmo alisado no build, a calça mostra glúteo e coxa. Aqui as
 * pernas (entre y0 e y1) passam por mais um alisamento só na direção da normal (Taubin, não
 * encolhe) e engordam `puff`, com transição suave nas pontas da faixa.
 */
export function relaxLegs(prim, jointNames, { y0, y1, iters = 40, puff = 0.007 }) {
  const body = new BodyShape(prim, jointNames);
  const P0 = body.pos, nv = body.nv, W = body.weld;
  const nw = Math.max(...W) + 1;
  let P = new Float32Array(nw * 3);
  const wt = new Float32Array(nw);
  for (let i = 0; i < nv; i++) {
    const j = W[i], y = P0[i * 3 + 1];
    for (let k = 0; k < 3; k++) P[j * 3 + k] = P0[i * 3 + k];
    const legish = body.leg(i) + (y < y1 ? body.part(i, 'torso') : 0);
    wt[j] = Math.max(wt[j], Math.min(1, legish) * sstep(y0, y0 + 0.06, y) * (1 - sstep(y1 - 0.06, y1, y)));
  }
  const nbr = Array.from({ length: nw }, () => new Set());
  const I = body.idx;
  for (let t = 0; t < I.length; t += 3) {
    const a = W[I[t]], b = W[I[t + 1]], c = W[I[t + 2]];
    nbr[a].add(b).add(c); nbr[b].add(a).add(c); nbr[c].add(a).add(b);
  }
  const normals = () => {
    const N = new Float32Array(nw * 3);
    for (let t = 0; t < I.length; t += 3) {
      const a = W[I[t]] * 3, b = W[I[t + 1]] * 3, c = W[I[t + 2]] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      for (const o of [a, b, c]) for (let k = 0; k < 3; k++) N[o + k] += n[k];
    }
    for (let j = 0; j < nw; j++) { const l = Math.hypot(N[j * 3], N[j * 3 + 1], N[j * 3 + 2]) || 1; for (let k = 0; k < 3; k++) N[j * 3 + k] /= l; }
    return N;
  };
  let N = normals();
  for (let it = 0; it < iters * 2; it++) {
    if (it % 8 === 0) N = normals();
    const f = it % 2 === 0 ? 0.55 : -0.57;
    const Q = new Float32Array(P);
    for (let j = 0; j < nw; j++) {
      if (!wt[j] || !nbr[j].size) continue;
      const d = [0, 0, 0];
      for (let k = 0; k < 3; k++) { let s = 0; for (const n of nbr[j]) s += P[n * 3 + k]; d[k] = s / nbr[j].size - P[j * 3 + k]; }
      const along = d[0] * N[j * 3] + d[1] * N[j * 3 + 1] + d[2] * N[j * 3 + 2];
      for (let k = 0; k < 3; k++) Q[j * 3 + k] += wt[j] * f * along * N[j * 3 + k];
    }
    P = Q;
  }
  N = normals();
  for (let j = 0; j < nw; j++) for (let k = 0; k < 3; k++) P[j * 3 + k] += N[j * 3 + k] * puff * wt[j];
  const pos = new Float32Array(nv * 3), nor = prim.getAttribute('NORMAL').getArray().slice();
  for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) {
    pos[i * 3 + k] = P[W[i] * 3 + k];
    if (wt[W[i]] > 0) nor[i * 3 + k] = N[W[i] * 3 + k];
  }
  prim.getAttribute('POSITION').setArray(pos);
  prim.getAttribute('NORMAL').setArray(nor);
}
