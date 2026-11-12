// "Veste" o corpo base: pinta roupas na textura e engrossa a malha onde há tecido.
//
// Os corpos da Quaternius vêm só de roupa íntima. Em vez de modelar roupas, cada texel da
// textura descobre onde fica no corpo (posição 3D na pose de repouso + ossos que o movem) e
// as camadas do figurino (calça, camisa, colete...) decidem a cor dali. As mesmas camadas,
// avaliadas nos vértices, empurram a malha para fora, para a roupa ter algum volume.
import sharp from 'sharp';

export const PARTS = ['head', 'torso', 'uarm', 'larm', 'hand', 'thigh', 'calf', 'foot'];

/** Parte do corpo de cada osso (dedos contam como mão). */
function partOf(bone) {
  if (/^(Head|neck)/.test(bone)) return 0;
  if (/^(pelvis|spine|clavicle|root)/.test(bone)) return 1;
  if (/^upperarm/.test(bone)) return 2;
  if (/^lowerarm/.test(bone)) return 3;
  if (/^(thigh)/.test(bone)) return 5;
  if (/^(calf)/.test(bone)) return 6;
  if (/^(foot|ball)/.test(bone)) return 7;
  return 4; // hand_*, dedos
}

export const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 1 dentro de [a, b], com borda suave de largura e. */
export const band = (a, b, v, e = 0.004) => smooth(a - e, a + e, v) * (1 - smooth(b - e, b + e, v));

export const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

// ruído de valor 3D (determinístico), para camuflagem, lama e desgaste
function hash3(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let r = 0;
  for (let i = 0; i < 8; i++) {
    const a = i & 1, b = (i >> 1) & 1, c = (i >> 2) & 1;
    r += hash3(xi + a, yi + b, zi + c) * (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w);
  }
  return r;
}
const fbm = (x, y, z) => 0.65 * noise3(x, y, z) + 0.35 * noise3(x * 2.3 + 7, y * 2.3 + 3, z * 2.3 + 11);

// letras 5×7 para o "IBAMA" do colete
const FONT = {
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
};
/** 1 se o ponto (u, v) ∈ [0,1]² cai numa letra de `text` (u da esquerda para a direita, v de cima para baixo). */
function textMask(text, u, v) {
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return 0;
  const cols = text.length * 6 - 1;
  const cx = Math.floor(u * cols), cy = Math.floor(v * 7);
  if (cx % 6 === 5) return 0;
  const glyph = FONT[text[Math.floor(cx / 6)]];
  return glyph && glyph[cy][cx % 6] === '1' ? 1 : 0;
}

/** Medidas do corpo tiradas do esqueleto: as camadas usam isto em vez de números fixos. */
export function bodyMetrics(skin) {
  const B = {};
  for (const j of skin.listJoints()) {
    const m = j.getWorldMatrix();
    B[j.getName()] = [m[12], m[13], m[14]];
  }
  return {
    B,
    waistY: B.spine_01[1] - 0.03,
    kneeY: B.calf_l[1],
    ankleY: B.foot_l[1],
    neckY: B.neck_01[1],
    neckZ: B.neck_01[2],
    chestY: B.spine_03[1],
    shoulderX: B.upperarm_l[0],
    wristX: B.hand_l[0],
    armY: B.upperarm_l[1],
  };
}

/** Contexto de um ponto do corpo para as camadas. */
function ctxOf(M, x, y, z, w) {
  const ax = Math.abs(x);
  const arm = w[2] + w[3] + w[4];
  return {
    x, y, z, ax, w,
    head: w[0], torso: w[1], arm, hand: w[4], leg: w[5] + w[6] + w[7],
    armT: (ax - M.shoulderX) / (M.wristX - M.shoulderX),
    // braços em T: é braço o que passa do ombro e é movido pelos ossos do braço
    isArm: ax > M.shoulderX && arm > 0.5,
    M,
  };
}

/**
 * Camadas do figurino, de baixo para cima. Cada uma devolve { m: cobertura 0..1,
 * c: cor [r,g,b] 0..255, puff: espessura em metros }.
 */
function layersOf(outfit) {
  const L = [];
  const o = outfit;

  if (o.pants) {
    const col = hex(o.pants.color);
    const end = o.pants.short ? (M) => M.kneeY + (o.pants.short === true ? 0.03 : o.pants.short) : () => -1;
    L.push((c) => {
      let m = (1 - smooth(c.M.waistY - 0.004, c.M.waistY + 0.004, c.y)) * smooth(end(c.M) - 0.004, end(c.M) + 0.004, c.y);
      let cc = col;
      if (o.pants.fade) cc = mix(cc, hex(o.pants.fade), 0.55 * band(c.M.kneeY + 0.05, c.M.waistY - 0.12, c.y, 0.08) * smooth(-0.02, 0.06, c.z));
      if (o.pants.pattern === 'camo') cc = camo(c, o.pants.camo);
      // bolso cargo na lateral da coxa
      if (o.pants.cargo) {
        const py = c.M.kneeY + 0.2;
        const side = smooth(0.165, 0.18, c.ax) * band(py - 0.07, py + 0.07, c.y, 0.003) * band(-0.07, 0.05, c.z, 0.003);
        const edge = side * (1 - band(py - 0.062, py + 0.062, c.y, 0.002) * band(-0.062, 0.042, c.z, 0.002));
        cc = mix(cc, mul(cc, 0.72), edge);
        cc = mix(cc, mul(cc, 0.8), side * band(py + 0.03, py + 0.036, c.y, 0.002));
      }
      return { m, c: cc, puff: 0.02, soft: 0.8 };
    });
  }

  if (o.boots) {
    const col = hex(o.boots.color);
    const top = o.boots.top ?? 0.25;
    L.push((c) => {
      const m = 1 - smooth(top - 0.004, top + 0.004, c.y);
      let cc = mix(mul(col, 0.55), col, smooth(0.022, 0.03, c.y)); // sola
      cc = mix(cc, mul(col, 1.25), band(top - 0.03, top, c.y, 0.003) * 0.6); // cano
      return { m, c: cc, puff: 0.02, soft: 1 };
    });
  }

  if (o.mud) {
    // lama respingada nas pernas (garimpo)
    const col = hex(o.mud.color);
    const top = o.mud.top ?? 0.6;
    L.push((c) => {
      const n = fbm(c.ax * 30, c.y * 18, c.z * 30);
      const h = 1 - c.y / top; // 1 no chão, 0 no alto
      const m = smooth(0.55, 0.8, n * 0.75 + h * 0.45) * (o.mud.strength ?? 0.75);
      return { m: c.y > top ? 0 : m, c: mul(col, 0.9 + 0.2 * noise3(c.x * 60, c.y * 60, c.z * 60)), puff: 0 };
    });
  }

  if (o.shirt) {
    const s = o.shirt;
    const col = hex(s.color);
    const sleeve = s.sleeve ?? 0.32;
    const hem = (M) => M.waistY - (s.untucked ? 0.1 : 0);
    L.push((c) => {
      const M = c.M;
      let m;
      const isArm = c.isArm;
      if (isArm) {
        m = 1 - smooth(sleeve - 0.008, sleeve + 0.008, c.armT);
      } else {
        m = smooth(hem(M) - 0.004, hem(M) + 0.004, c.y);
      }
      if (s.tank) {
        // regata: alças estreitas, cava funda
        const strap = M.shoulderX - 0.075;
        const cava = smooth(M.armY - 0.16, M.armY - 0.06, c.y);
        m *= 1 - cava * smooth(strap - 0.004, strap + 0.004, c.ax);
        if (isArm) m = 0;
      }
      // gola: o pescoço fica de fora; na frente desce em V/careca
      const drop = s.tank ? 0.1 : s.vneck ? 0.085 : 0.035;
      const front = smooth(M.neckZ, M.neckZ + 0.03, c.z); // à frente do eixo do pescoço
      const collarY = M.neckY - 0.012 - front * Math.max(0, drop - c.ax * (s.tank ? 0.9 : 1.1)) + Math.min(0.09, Math.max(0, c.ax - 0.045) * 1.1);
      m *= 1 - smooth(collarY - 0.004, collarY + 0.004, c.y);
      let cc = col;
      if (s.pattern === 'plaid') cc = plaid(c, col, hex(s.plaid ?? '#1a1a1a'));
      if (s.pattern === 'camo') cc = camo(c, s.camo);
      if (s.dirt) {
        const n = fbm(c.x * 16 + 3, c.y * 16, c.z * 16);
        cc = mix(cc, hex(s.dirt), smooth(0.5, 0.8, n * 0.7 + (M.chestY - c.y) * 1.6) * 0.6);
      }
      // barra da manga e gola um pouco mais escuras, para o olho achar a borda
      const cuff = isArm ? band(sleeve - 0.035, sleeve + 0.01, c.armT, 0.004) : 0;
      const collar = isArm ? 0 : band(collarY - 0.018, collarY + 0.006, c.y, 0.003);
      cc = mix(cc, mul(cc, 0.72), Math.max(cuff, collar));
      // botões na frente
      if (s.buttons && c.z > 0 && !isArm) {
        cc = mix(cc, mul(cc, 0.8), band(-0.004, 0.004, c.x, 0.002));
      }
      return { m, c: cc, puff: 0.02, soft: 1 };
    });
  }

  if (o.belt) {
    const col = hex(o.belt);
    L.push((c) => {
      const y0 = c.M.waistY - 0.005;
      const m = band(y0 - 0.02, y0 + 0.02, c.y, 0.003);
      const buckle = c.z > 0 ? band(-0.022, 0.022, c.x, 0.002) : 0;
      return { m, c: mix(col, [150, 150, 140], buckle), puff: 0.026 };
    });
  }

  if (o.gloves) {
    const col = hex(o.gloves);
    L.push((c) => ({ m: c.isArm ? smooth(0.94, 1.0, c.armT) : 0, c: col, puff: 0.004 }));
  }

  if (o.sling) {
    // bandoleira atravessada no peito (da arma ou da bolsa)
    const col = hex(o.sling.color);
    const dir = o.sling.dir ?? 1; // 1: do ombro esquerdo (x+) ao quadril direito
    L.push((c) => {
      const M = c.M;
      if (c.isArm || c.y < M.waistY - 0.02) return { m: 0, c: col, puff: 0 };
      // linha do ombro ao quadril oposto, projetada de frente (a mesma nas costas)
      const sx = 0.11 * dir;
      const x1 = sx, y1 = M.neckY - 0.02, x2 = -sx * 1.5, y2 = M.waistY;
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      const d = Math.abs((c.x - x1) * dy - (c.y - y1) * dx) / len;
      const m = (1 - smooth(0.016, 0.021, d)) * (1 - smooth(M.neckY - 0.01, M.neckY, c.y));
      return { m, c: col, puff: 0.027 };
    });
  }

  if (o.vest) {
    const v = o.vest;
    const col = hex(v.color);
    const txt = v.text ? hex(v.textColor ?? '#f2c200') : null;
    L.push((c) => {
      const M = c.M;
      const bottom = M.waistY + 0.035;
      // cava: mais aberta que a manga
      const cavaX = M.shoulderX - 0.045 + smooth(M.armY - 0.02, M.armY - 0.16, c.y) * 0.2;
      const front = smooth(M.neckZ, M.neckZ + 0.03, c.z); // à frente do eixo do pescoço
      const collarY = M.neckY - 0.02 - front * Math.max(0, 0.13 - c.ax * 1.35) + Math.min(0.09, Math.max(0, c.ax - 0.05) * 1.0);
      let m = smooth(bottom - 0.004, bottom + 0.004, c.y) * (1 - smooth(cavaX - 0.004, cavaX + 0.004, c.ax)) * (1 - smooth(collarY - 0.004, collarY + 0.004, c.y));
      let cc = col;
      // costuras: mais claras no colete escuro, mais escuras no claro
      const lite = col[0] + col[1] + col[2] > 330 ? mul(col, 0.78) : col.map((ch) => ch + 34);
      if (c.z > 0) {
        // zíper, bolsos de carregador e faixa do peito
        cc = mix(cc, lite, band(-0.005, 0.005, c.x, 0.002));
        const py = bottom + 0.085;
        const pocket = band(0.03, 0.125, c.ax, 0.003) * band(py - 0.06, py + 0.04, c.y, 0.003);
        const inner = band(0.038, 0.117, c.ax, 0.002) * band(py - 0.052, py + 0.032, c.y, 0.002);
        cc = mix(cc, lite, pocket * (1 - inner) * 0.9);
        cc = mix(cc, lite, inner * band(py + 0.008, py + 0.014, c.y, 0.002) * 0.9);
        if (txt) {
          // tarja no peito esquerdo (x+ é a esquerda do personagem); o nome inteiro não cabe legível
          cc = mix(cc, txt, band(0.04, 0.115, c.x, 0.002) * band(M.chestY + 0.052, M.chestY + 0.072, c.y, 0.002));
        }
      } else if (txt) {
        // nome grande nas costas (visto de trás, lê-se de x+ para x−)
        const w = 0.25, h = 0.075;
        const u = (w / 2 - c.x) / w, vv = (M.chestY + 0.1 - c.y) / h;
        cc = mix(cc, txt, textMask(v.text, u, vv));
      }
      return { m, c: cc, puff: 0.04, soft: 2 * m };
    });
  }

  if (o.facePaint) {
    // pintura facial: dois traços em cada maçã do rosto
    const col = hex(o.facePaint.color);
    L.push((c) => {
      if (c.head < 0.9 || c.z < 0.02) return { m: 0, c: col, puff: 0 };
      const y0 = c.M.eyeY - 0.03;
      const m = band(0.022, 0.062, c.ax, 0.002) * Math.max(band(y0 - 0.006, y0 - 0.001, c.y, 0.0015), band(y0 - 0.017, y0 - 0.012, c.y, 0.0015));
      return { m: m * 0.9, c: col, puff: 0 };
    });
  }

  if (o.armband) {
    const col = hex(o.armband.color);
    const at = o.armband.at ?? 0.36;
    L.push((c) => ({
      m: c.isArm ? band(at - 0.018, at + 0.018, c.armT, 0.003) : 0,
      c: mix(col, hex(o.armband.accent ?? o.armband.color), band(at - 0.006, at + 0.006, c.armT, 0.002)),
      puff: 0.006,
    }));
  }
  return L;
}

function plaid(c, base, dark) {
  // xadrez: faixas em y e em x (no tronco) ou em y/z (nos braços, que estão na horizontal)
  const s = 0.055;
  const f = (v) => {
    const t = ((v / s) % 1 + 1) % 1;
    return t < 0.42 ? 1 : 0;
  };
  const a = f(c.arm > 0.5 ? c.z + 0.013 : c.y);
  const b = f(c.arm > 0.5 ? c.ax : c.x + s * 0.21);
  const k = a + b; // 0, 1 ou 2 faixas sobrepostas
  let cc = mix(base, dark, k === 2 ? 0.85 : k === 1 ? 0.42 : 0);
  const thin = (v) => (((v / s + 0.7) % 1 + 1) % 1 < 0.07 ? 1 : 0);
  if (thin(c.arm > 0.5 ? c.z : c.y) || thin(c.arm > 0.5 ? c.ax : c.x)) cc = mix(cc, [235, 220, 190], 0.5);
  return cc;
}

function camo(c, colors = ['#4d5a36', '#2e3a22', '#7a6e48', '#1f2618']) {
  const p = colors.map(hex);
  const n1 = fbm(c.x * 13, c.y * 13, c.z * 13);
  const n2 = fbm(c.x * 17 + 40, c.y * 17 + 9, c.z * 17 + 5);
  const n3 = fbm(c.x * 26 + 11, c.y * 26 + 70, c.z * 26 + 33);
  let cc = p[0];
  if (n1 > 0.55) cc = p[1];
  if (n2 > 0.6) cc = p[2];
  if (n3 > 0.68) cc = p[3];
  return cc;
}

/** Avalia o figurino num ponto: cor por cima da pele e espessura da roupa. */
function dress(layers, c) {
  let cover = 0, col = [0, 0, 0], puff = 0, soft = 0;
  for (const layer of layers) {
    const r = layer(c);
    if (r.m <= 0.001) continue;
    soft = Math.max(soft, (r.soft ?? 0) * r.m);
    const total = r.m + cover * (1 - r.m);
    col = col.map((v, i) => (r.c[i] * r.m + v * cover * (1 - r.m)) / total);
    cover = total;
    puff = Math.max(puff, r.puff * r.m);
  }
  return { cover, col, puff, soft };
}

/**
 * Pinta a textura do corpo e desloca os vértices.
 * @returns Buffer JPEG da nova textura.
 */
export async function dressBody({ prim, skin, baseImage, outfit, skinTone, size = 1024, eyeY }) {
  const M = bodyMetrics(skin);
  M.eyeY = eyeY;
  const layers = layersOf(outfit);
  const pos = prim.getAttribute('POSITION').getArray();
  const nor = prim.getAttribute('NORMAL').getArray();
  const uv = prim.getAttribute('TEXCOORD_0').getArray();
  const J = prim.getAttribute('JOINTS_0').getArray();
  const W = prim.getAttribute('WEIGHTS_0');
  const Wa = W.getArray();
  const wNorm = W.getNormalized() ? (Wa instanceof Uint8Array ? 255 : 65535) : 1;
  const idx = prim.getIndices().getArray();
  const nv = pos.length / 3;
  const partIdx = skin.listJoints().map((j) => partOf(j.getName()));

  // pesos por parte do corpo em cada vértice
  const vp = new Float32Array(nv * 8);
  for (let i = 0; i < nv; i++) {
    let sum = 0;
    for (let k = 0; k < 4; k++) {
      const w = Wa[i * 4 + k] / wNorm;
      vp[i * 8 + partIdx[J[i * 4 + k]]] += w;
      sum += w;
    }
    if (sum > 0) for (let k = 0; k < 8; k++) vp[i * 8 + k] /= sum;
  }

  // ---- textura ----
  const N = size;
  const src = await sharp(Buffer.from(baseImage)).resize(N, N).removeAlpha().raw().toBuffer();
  const A = 11; // x, y, z + 8 partes
  const attr = new Float32Array(N * N * A);
  const hit = new Uint8Array(N * N);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const ax = uv[a * 2] * N, ay = uv[a * 2 + 1] * N, bx = uv[b * 2] * N, by = uv[b * 2 + 1] * N, cx = uv[c * 2] * N, cy = uv[c * 2 + 1] * N;
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(den) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx) - 1)), x1 = Math.min(N - 1, Math.ceil(Math.max(ax, bx, cx) + 1));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy) - 1)), y1 = Math.min(N - 1, Math.ceil(Math.max(ay, by, cy) + 1));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const sx = px + 0.5, sy = py + 0.5;
        let l1 = ((by - cy) * (sx - cx) + (cx - bx) * (sy - cy)) / den;
        let l2 = ((cy - ay) * (sx - cx) + (ax - cx) * (sy - cy)) / den;
        let l3 = 1 - l1 - l2;
        const inside = l1 >= 0 && l2 >= 0 && l3 >= 0;
        // um texel de folga em volta de cada triângulo, para a costura não vazar
        if (!inside && (l1 < -0.6 || l2 < -0.6 || l3 < -0.6 || hit[py * N + px])) continue;
        if (!inside && Math.min(l1, l2, l3) * Math.sqrt(Math.abs(den)) < -1.5) continue;
        const o = (py * N + px) * A;
        for (let k = 0; k < 3; k++) attr[o + k] = pos[a * 3 + k] * l1 + pos[b * 3 + k] * l2 + pos[c * 3 + k] * l3;
        for (let k = 0; k < 8; k++) attr[o + 3 + k] = vp[a * 8 + k] * l1 + vp[b * 8 + k] * l2 + vp[c * 8 + k] * l3;
        hit[py * N + px] = inside ? 2 : 1;
      }
    }
  }

  // cor de referência da pele original: média nos braços (sempre nus na textura base)
  let ref = [0, 0, 0], refN = 0;
  for (let i = 0; i < N * N; i++) {
    if (hit[i] !== 2 || attr[i * A + 3 + 3] < 0.9) continue;
    ref[0] += src[i * 3]; ref[1] += src[i * 3 + 1]; ref[2] += src[i * 3 + 2]; refN++;
  }
  ref = ref.map((v) => v / refN);
  const refLum = 0.3 * ref[0] + 0.59 * ref[1] + 0.11 * ref[2];
  const tone = hex(skinTone);

  const out = Buffer.alloc(N * N * 3);
  const w8 = new Float32Array(8);
  for (let i = 0; i < N * N; i++) {
    if (!hit[i]) continue;
    const o = i * A;
    for (let k = 0; k < 8; k++) w8[k] = attr[o + 3 + k];
    const c = ctxOf(M, attr[o], attr[o + 1], attr[o + 2], w8);
    const r = src[i * 3], g = src[i * 3 + 1], b = src[i * 3 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const isSkin = mx - mn > 0.16 * mx; // roupa íntima da textura base é cinza
    const lum = (0.3 * r + 0.59 * g + 0.11 * b) / refLum;
    // pele: mantém o desenho original (lábios, sombra) no novo tom
    const skin = isSkin
      ? [0, 1, 2].map((k) => tone[k] * Math.pow(src[i * 3 + k] / ref[k], 0.85))
      : tone;
    const d = dress(layers, c);
    const shade = isSkin ? 1 + 0.15 * (Math.min(1.2, Math.max(0.7, lum)) - 1) : 1;
    for (let k = 0; k < 3; k++) {
      const v = skin[k] * (1 - d.cover) + d.col[k] * shade * d.cover;
      out[i * 3 + k] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  // espalha as bordas para os texels vazios (evita costura clara/escura no mipmap)
  const filled = hit.map((h) => (h ? 1 : 0));
  for (let pass = 0; pass < 6; pass++) {
    const add = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (filled[i]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= N || yy >= N || !filled[yy * N + xx]) continue;
        add.push(i, yy * N + xx);
        break;
      }
    }
    for (let k = 0; k < add.length; k += 2) {
      out.copyWithin(add[k] * 3, add[k + 1] * 3, add[k + 1] * 3 + 3);
      filled[add[k]] = 1;
    }
  }
  // o resto do atlas fica no tom da pele
  for (let i = 0; i < N * N; i++) if (!filled[i]) { out[i * 3] = tone[0]; out[i * 3 + 1] = tone[1]; out[i * 3 + 2] = tone[2]; }

  // ---- volume ----
  // O corpo base é musculoso e nu; por baixo do tecido isso vira "roupa colante". Então, onde
  // há roupa, a malha é alisada (Taubin: alisa sem encolher) e depois empurrada para fora.
  // Vértices duplicados na costura do UV andam juntos: tudo é feito por posição soldada.
  const ids = new Int32Array(nv), keyOf = new Map();
  for (let i = 0; i < nv; i++) {
    const k = `${Math.round(pos[i * 3] * 1e4)},${Math.round(pos[i * 3 + 1] * 1e4)},${Math.round(pos[i * 3 + 2] * 1e4)}`;
    if (!keyOf.has(k)) keyOf.set(k, keyOf.size);
    ids[i] = keyOf.get(k);
  }
  const nw = keyOf.size;
  let P = new Float32Array(nw * 3);
  const softW = new Float32Array(nw), puffW = new Float32Array(nw);
  for (let i = 0; i < nv; i++) {
    for (let k = 0; k < 8; k++) w8[k] = vp[i * 8 + k];
    const d = dress(layers, ctxOf(M, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], w8));
    const j = ids[i];
    for (let k = 0; k < 3; k++) P[j * 3 + k] = pos[i * 3 + k];
    softW[j] = Math.max(softW[j], d.soft); puffW[j] = Math.max(puffW[j], d.puff);
  }
  if (outfit.boots) {
    // biqueira: os dedos do pé descalço são levados para a superfície de um elipsoide
    const ball = M.B.ball_l, cz = ball[2] - 0.03, cy = 0.042;
    let tip = 0;
    for (let j = 0; j < nw; j++) if (P[j * 3 + 1] < 0.1) tip = Math.max(tip, P[j * 3 + 2]);
    const r = [0.052, 0.042, tip - cz + 0.004];
    for (let j = 0; j < nw; j++) {
      const x = P[j * 3], y = P[j * 3 + 1], z = P[j * 3 + 2];
      if (y > 0.11 || z < cz - 0.03) continue;
      const cx = Math.sign(x) * ball[0];
      const d = [(x - cx) / r[0], (y - cy) / r[1], Math.max(0, z - cz) / r[2]];
      const len = Math.hypot(...d) || 1;
      const t = smooth(cz - 0.03, cz + 0.015, z) * (1 - smooth(0.085, 0.11, y));
      const target = [cx + (d[0] / len) * r[0], Math.max(0.002, cy + (d[1] / len) * r[1]), cz + (d[2] / len) * r[2]];
      for (let k = 0; k < 3; k++) P[j * 3 + k] += (target[k] - P[j * 3 + k]) * t;
    }
  }
  const nbr = Array.from({ length: nw }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) {
    const a = ids[idx[t]], b = ids[idx[t + 1]], c = ids[idx[t + 2]];
    nbr[a].add(b).add(c); nbr[b].add(a).add(c); nbr[c].add(a).add(b);
  }
  const normals = () => {
    const Nw = new Float32Array(nw * 3);
    for (let t = 0; t < idx.length; t += 3) {
      const a = ids[idx[t]] * 3, b = ids[idx[t + 1]] * 3, c = ids[idx[t + 2]] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      for (const o of [a, b, c]) for (let k = 0; k < 3; k++) Nw[o + k] += n[k];
    }
    for (let j = 0; j < nw; j++) {
      const len = Math.hypot(Nw[j * 3], Nw[j * 3 + 1], Nw[j * 3 + 2]) || 1;
      for (let k = 0; k < 3; k++) Nw[j * 3 + k] /= len;
    }
    return Nw;
  };
  // camadas grossas (colete, botas: soft = 2) ganham passadas extras, até esconder o relevo
  // do peito e os dedos do pé. O vértice só anda ao longo da normal: se escorregasse pela
  // superfície, arrastaria a textura junto e as barras das roupas ficariam serrilhadas.
  let Ns;
  for (let it = 0; it < 64; it++) {
    if (it % 8 === 0) Ns = normals();
    const f = it >= 24 ? 0.5 : it % 2 === 0 ? 0.55 : -0.57;
    const Q = new Float32Array(P);
    const d = [0, 0, 0];
    for (let j = 0; j < nw; j++) {
      if (softW[j] <= (it < 24 ? 0 : 1) || !nbr[j].size) continue;
      for (let k = 0; k < 3; k++) {
        let s = 0;
        for (const n of nbr[j]) s += P[n * 3 + k];
        d[k] = s / nbr[j].size - P[j * 3 + k];
      }
      const along = d[0] * Ns[j * 3] + d[1] * Ns[j * 3 + 1] + d[2] * Ns[j * 3 + 2];
      for (let k = 0; k < 3; k++) Q[j * 3 + k] += Math.min(1, softW[j]) * f * along * Ns[j * 3 + k];
    }
    P = Q;
  }
  // as normais ficam as da malha alisada, antes de engrossar: assim o degrau entre colete,
  // camisa e pele dá volume na silhueta sem criar sombras serrilhadas na borda do tecido
  const Nw = normals();
  for (let j = 0; j < nw; j++) for (let k = 0; k < 3; k++) P[j * 3 + k] += Nw[j * 3 + k] * puffW[j];
  const moved = new Float32Array(nv * 3), newNor = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) {
    moved[i * 3 + k] = P[ids[i] * 3 + k];
    // onde não há roupa, fica a normal original (o rosto tem normais ajustadas à mão)
    newNor[i * 3 + k] = puffW[ids[i]] > 0 ? Nw[ids[i] * 3 + k] : nor[i * 3 + k];
  }
  prim.getAttribute('POSITION').setArray(moved);
  prim.getAttribute('NORMAL').setArray(newNor);

  return sharp(out, { raw: { width: N, height: N, channels: 3 } }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}
