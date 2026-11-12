// Acessórios gerados por código (boné, capacete, mochila, motosserra...): geometria simples
// do three.js, colorida por vértice e presa a um único osso. Tudo vai numa malha só, com um
// material só, para custar um draw call por personagem.
import * as THREE from 'three';

const lin = (v) => Math.pow(v / 255, 2.2);
const rgb = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
};
const shade = (h, k) => '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * k))).toString(16).padStart(2, '0')).join('');

export class Gear {
  constructor(jointNames) {
    this.joints = jointNames;
    this.pos = []; this.nor = []; this.col = []; this.jnt = []; this.idx = [];
  }

  /** Adiciona uma geometria já no espaço do modelo (pose de repouso), presa a `bone`. */
  add(geo, color, bone, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], matrix } = {}) {
    const m = matrix ?? new THREE.Matrix4().compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot, 'YXZ')),
      new THREE.Vector3(...scale),
    );
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    g.computeVertexNormals();
    const base = this.pos.length / 3;
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    const c = typeof color === 'function' ? null : rgb(color);
    const j = this.joints.indexOf(bone);
    if (j < 0) throw new Error(`osso ${bone} não existe`);
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      this.nor.push(n.getX(i), n.getY(i), n.getZ(i));
      this.col.push(...(c ?? rgb(color(p.getX(i), p.getY(i), p.getZ(i)))));
      this.jnt.push(j, 0, 0, 0);
      this.idx.push(base + i);
    }
    return this;
  }

  get empty() { return this.pos.length === 0; }

  toPrimitive(doc, material) {
    const buffer = doc.getRoot().listBuffers()[0];
    const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buffer);
    const n = this.pos.length / 3;
    const w = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) w[i * 4] = 1;
    return doc.createPrimitive()
      .setAttribute('POSITION', acc('VEC3', new Float32Array(this.pos)))
      .setAttribute('NORMAL', acc('VEC3', new Float32Array(this.nor)))
      .setAttribute('COLOR_0', acc('VEC3', new Float32Array(this.col)))
      .setAttribute('JOINTS_0', acc('VEC4', new Uint8Array(this.jnt)))
      .setAttribute('WEIGHTS_0', acc('VEC4', w))
      .setIndices(acc('SCALAR', new Uint32Array(this.idx)))
      .setMaterial(material);
  }
}

/** Medidas da cabeça e do tronco tiradas da malha do corpo (já com a roupa). */
export function measure(pos, headWeight, torsoWeight, M, browY) {
  const nv = pos.length / 3;
  const brimY = browY + 0.022;
  let top = -1, minZ = 9, maxZ = -9, maxX = 0;
  for (let i = 0; i < nv; i++) {
    if (headWeight[i] < 0.9) continue;
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    top = Math.max(top, y);
    if (Math.abs(y - brimY) < 0.02) { minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); maxX = Math.max(maxX, Math.abs(x)); }
  }
  // superfície do tronco: z das costas e do peito numa faixa central, por altura
  const surf = (y0, half, xMax, sign) => {
    let best = sign > 0 ? -9 : 9;
    for (let i = 0; i < nv; i++) {
      if (torsoWeight[i] < 0.5) continue;
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if (Math.abs(x) > xMax || Math.abs(y - y0) > half) continue;
      best = sign > 0 ? Math.max(best, z) : Math.min(best, z);
    }
    return best;
  };
  return {
    brimY, top, zc: (minZ + maxZ) / 2, rx: maxX, rz: (maxZ - minZ) / 2,
    backZ: (y, half = 0.08, xMax = 0.1) => surf(y, half, xMax, -1),
    chestZ: (y, half = 0.05, xMax = 0.12) => surf(y, half, xMax, 1),
  };
}

const dome = (seg = 20, rings = 8) => new THREE.SphereGeometry(1, seg, rings, 0, Math.PI * 2, 0, Math.PI / 2);
/** Aba: anel entre os raios r0 e r1 (em volta de Y), caindo `drop` na borda. */
const brimRing = (r0, r1, drop, seg = 24) =>
  new THREE.LatheGeometry([new THREE.Vector2(r0, 0), new THREE.Vector2(r1, -drop)], seg);

export const PIECES = {
  /** Boné com aba reta e um distintivo na frente. */
  cap(g, H, M, { color = '#27331f', patch } = {}) {
    const rx = H.rx * 1.07 + 0.006, rz = H.rz * 1.06 + 0.006, ry = H.top - H.brimY + 0.014;
    g.add(dome(), color, 'Head', { pos: [0, H.brimY, H.zc], scale: [rx, ry, rz] });
    g.add(new THREE.CylinderGeometry(rx, rx, 0.022, 20, 1, true), shade(color, 0.85), 'Head', { pos: [0, H.brimY - 0.009, H.zc], scale: [1, 1, rz / rx] });
    g.add(new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, -Math.PI / 2, Math.PI), shade(color, 0.8), 'Head',
      { pos: [0, H.brimY - 0.006, H.zc + rz * 0.78], rot: [0.16, 0, 0], scale: [rx * 0.88, 0.008, 0.105] });
    g.add(new THREE.SphereGeometry(0.011, 8, 6), shade(color, 0.8), 'Head', { pos: [0, H.brimY + ry, H.zc] });
    if (patch) g.add(new THREE.BoxGeometry(0.06, 0.028, 0.006), patch, 'Head', { pos: [0, H.brimY + ry * 0.42, H.zc + rz * 0.93], rot: [-0.42, 0, 0] });
    return H.brimY - 0.012;
  },

  /** Chapéu de aba inteira: de selva (pano, aba caída) ou de palha (copa alta, aba larga). */
  hat(g, H, M, { color = '#6f6a45', band, brim = 0.085, drop = 0.018, crown = 0.03, flat = 0.75 } = {}) {
    const rx = H.rx * 1.07 + 0.006, rz = H.rz * 1.06 + 0.006, ry = H.top - H.brimY + 0.012 + crown;
    const k = rz / rx;
    // copa: lados quase retos e topo achatado
    g.add(new THREE.CylinderGeometry(rx * flat, rx, ry, 20, 1, false), color, 'Head', { pos: [0, H.brimY + ry / 2, H.zc], scale: [1, 1, k] });
    if (band) g.add(new THREE.CylinderGeometry(rx * 1.015, rx * 1.02, 0.02, 20, 1, true), band, 'Head', { pos: [0, H.brimY + 0.012, H.zc], scale: [1, 1, k] });
    g.add(brimRing(rx * 0.98, rx + brim, drop), shade(color, 0.9), 'Head', { pos: [0, H.brimY, H.zc], scale: [1, 1, (rz + brim) / (rx + brim)] });
    return H.brimY - drop - 0.006;
  },

  /** Capacete de obra, com aba curta e nervura no topo. */
  hardHat(g, H, M, { color = '#e9b216' } = {}) {
    const rx = H.rx * 1.1 + 0.01, rz = H.rz * 1.08 + 0.01, ry = H.top - H.brimY + 0.03;
    g.add(dome(20, 8), color, 'Head', { pos: [0, H.brimY, H.zc], scale: [rx, ry, rz] });
    g.add(brimRing(rx * 0.98, rx + 0.022, 0.006), shade(color, 0.88), 'Head', { pos: [0, H.brimY + 0.002, H.zc], scale: [1, 1, rz / rx] });
    g.add(new THREE.CylinderGeometry(1, 1, 1, 14, 1, false, -Math.PI / 2, Math.PI), shade(color, 0.88), 'Head',
      { pos: [0, H.brimY, H.zc + rz * 0.8], rot: [0.1, 0, 0], scale: [rx * 0.8, 0.008, 0.07] });
    g.add(new THREE.BoxGeometry(0.03, 0.02, rz * 0.9), shade(color, 0.92), 'Head', { pos: [0, H.brimY + ry * 0.93, H.zc] });
    return H.brimY - 0.004;
  },

  /** Mochila de campo com rolo em cima. */
  backpack(g, H, M, { color = '#4b5a3a', roll = '#8a8f96' } = {}) {
    const y = M.chestY - 0.03, z = H.backZ(y, 0.14) - 0.04;
    g.add(new THREE.BoxGeometry(0.25, 0.33, 0.12, 2, 2, 2), color, 'spine_03', { pos: [0, y, z] });
    g.add(new THREE.BoxGeometry(0.2, 0.13, 0.05), shade(color, 0.8), 'spine_03', { pos: [0, y - 0.07, z - 0.075] });
    g.add(new THREE.BoxGeometry(0.255, 0.05, 0.125), shade(color, 1.2), 'spine_03', { pos: [0, y + 0.145, z] });
    if (roll) g.add(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 12), roll, 'spine_03', { pos: [0, y + 0.21, z + 0.005], rot: [0, 0, Math.PI / 2] });
  },

  /** Rádio HT preso no ombro esquerdo do colete. */
  radio(g, H, M, { color = '#101214' } = {}) {
    const x = 0.105, y = M.chestY + 0.105, z = H.chestZ(y, 0.03, 0.14) + 0.012;
    g.add(new THREE.BoxGeometry(0.034, 0.066, 0.024), color, 'spine_03', { pos: [x, y, z], rot: [-0.25, 0, 0] });
    g.add(new THREE.CylinderGeometry(0.004, 0.004, 0.075, 6), color, 'spine_03', { pos: [x + 0.01, y + 0.065, z - 0.012], rot: [-0.25, 0, 0] });
    g.add(new THREE.BoxGeometry(0.02, 0.012, 0.004), '#f2c200', 'spine_03', { pos: [x, y + 0.012, z + 0.011], rot: [-0.25, 0, 0] });
  },

  /** Colar de miçangas assentado na base do pescoço. */
  necklace(g, H, M, { colors = ['#c8281e', '#f4efe2', '#1a1a1a', '#f4efe2'], surface } = {}) {
    // só a metade da frente e os ombros: atrás o cabelo cobre
    const n = 34, R = 0.1, tilt = 0.62;
    const c = [0, M.neckY - 0.012, M.B.neck_01[2] + 0.012];
    for (let i = 0; i <= n; i++) {
      const t = -0.35 + (i / n) * (Math.PI + 0.7);
      const s = Math.sin(t);
      const want = [c[0] + R * Math.cos(t), c[1] - R * s * Math.sin(tilt) - 0.035 * Math.max(0, s) ** 2, c[2] + R * s * Math.cos(tilt) * 0.9];
      g.add(new THREE.SphereGeometry(0.0075, 6, 4), colors[i % colors.length], 'spine_03', { pos: surface(want) });
    }
  },

  /** Motosserra carregada pela alça, na mão direita (braço em T: "para baixo" é −x). */
  chainsaw(g, H, M, { color = '#e8641b' } = {}) {
    const B = M.B.hand_r;
    const px = B[0] - 0.085, y = B[1] - 0.012, z = B[2] + 0.01;
    const bx = px - 0.085; // centro do corpo da serra, pendurado abaixo da mão
    g.add(new THREE.BoxGeometry(0.12, 0.1, 0.21), color, 'hand_r', { pos: [bx, y, z] });
    g.add(new THREE.BoxGeometry(0.06, 0.104, 0.07), '#2a2c2e', 'hand_r', { pos: [bx - 0.02, y, z - 0.03] });
    // alça de cima (em arco) e punho de trás
    g.add(new THREE.TorusGeometry(0.05, 0.011, 6, 12, Math.PI), '#1f2123', 'hand_r', { pos: [bx + 0.06, y, z + 0.03], rot: [0, Math.PI / 2, -Math.PI / 2] });
    g.add(new THREE.BoxGeometry(0.05, 0.035, 0.1), '#1f2123', 'hand_r', { pos: [bx + 0.01, y, z - 0.15] });
    // sabre e corrente
    g.add(new THREE.BoxGeometry(0.066, 0.016, 0.4), '#33363a', 'hand_r', { pos: [bx - 0.015, y, z + 0.29] });
    g.add(new THREE.BoxGeometry(0.046, 0.018, 0.37), '#c5c9cf', 'hand_r', { pos: [bx - 0.015, y, z + 0.285] });
    g.add(new THREE.CylinderGeometry(0.033, 0.033, 0.0165, 10, 1, false), '#33363a', 'hand_r', { pos: [bx - 0.015, y, z + 0.49] });
  },

  /** Bateia de garimpo pendurada na mão esquerda. */
  bateia(g, H, M, { color = '#6d7278' } = {}) {
    const B = M.B.hand_l;
    const R = 0.17;
    const pts = [new THREE.Vector2(0.001, -0.07), new THREE.Vector2(R * 0.35, -0.055), new THREE.Vector2(R, 0), new THREE.Vector2(R + 0.012, 0.002)];
    g.add(new THREE.LatheGeometry(pts, 20), (x, y) => (y > B[1] - 0.012 ? shade(color, 0.75) : color), 'hand_l',
      { pos: [B[0] + 0.085 + R * 0.92, B[1] - 0.012, B[2] + 0.01] });
  },

  /** Espingarda atravessada nas costas. */
  shotgun(g, H, M, { wood = '#6b4326', metal = '#24262a' } = {}) {
    const y = M.chestY - 0.02, z = H.backZ(y, 0.12, 0.14) - 0.035;
    const m = (py, extra = 0) => new THREE.Matrix4()
      .makeTranslation(0, y, z)
      .multiply(new THREE.Matrix4().makeRotationZ(0.62))
      .multiply(new THREE.Matrix4().makeTranslation(0, py, 0))
      .multiply(new THREE.Matrix4().makeRotationX(extra));
    g.add(new THREE.CylinderGeometry(0.011, 0.011, 0.52, 8), metal, 'spine_03', { matrix: m(0.3) });
    g.add(new THREE.CylinderGeometry(0.009, 0.009, 0.3, 8), wood, 'spine_03', { matrix: m(0.2).multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.02)) });
    g.add(new THREE.BoxGeometry(0.036, 0.15, 0.05), metal, 'spine_03', { matrix: m(-0.02) });
    g.add(new THREE.BoxGeometry(0.03, 0.3, 0.075), wood, 'spine_03', { matrix: m(-0.22, 0.12) });
  },
};
