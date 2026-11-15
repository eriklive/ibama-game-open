// Sombra de contato (oclusão ambiente gravada), como nas naturezas-mortas pintadas à mão:
// escurece onde uma peça encosta na outra ou no corpo.
//
// Em vez de lançar raios, mede a "densidade" de matéria em volta de cada ponto: as superfícies
// são espalhadas numa grade 3D e borradas. Num lugar aberto a densidade é baixa; numa dobra
// (axila, sob a aba do chapéu, na borda do colete) é alta. Tudo na pose de repouso, em metros.
import sharp from 'sharp';

const VOX = 0.008; // 8 mm

export class Density {
  constructor(min, max) {
    this.min = min.map((v) => v - 0.08);
    this.n = max.map((v, k) => Math.ceil((v + 0.08 - this.min[k]) / VOX) + 1);
    this.g = new Float32Array(this.n[0] * this.n[1] * this.n[2]);
  }

  idx(x, y, z) {
    const i = Math.floor((x - this.min[0]) / VOX), j = Math.floor((y - this.min[1]) / VOX), k = Math.floor((z - this.min[2]) / VOX);
    if (i < 0 || j < 0 || k < 0 || i >= this.n[0] || j >= this.n[1] || k >= this.n[2]) return -1;
    return (k * this.n[1] + j) * this.n[0] + i;
  }

  /** Marca a superfície de triângulos (pontos espalhados a cada meio voxel). */
  splat(pos, idx) {
    const step = VOX * 0.5;
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const ab = Math.hypot(pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]);
      const ac = Math.hypot(pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]);
      const nu = Math.max(1, Math.ceil(ab / step)), nv = Math.max(1, Math.ceil(ac / step));
      for (let u = 0; u <= nu; u++) for (let v = 0; v <= nv - (u * nv) / nu; v++) {
        const s = u / nu, r = v / nv;
        const x = pos[a] + (pos[b] - pos[a]) * s + (pos[c] - pos[a]) * r;
        const y = pos[a + 1] + (pos[b + 1] - pos[a + 1]) * s + (pos[c + 1] - pos[a + 1]) * r;
        const z = pos[a + 2] + (pos[b + 2] - pos[a + 2]) * s + (pos[c + 2] - pos[a + 2]) * r;
        const i = this.idx(x, y, z);
        if (i >= 0) this.g[i] = 1;
      }
    }
    return this;
  }

  /** Borrão de caixa separável, `passes` vezes (aproxima uma gaussiana). */
  blur(radius = 3, passes = 2) {
    const [nx, ny, nz] = this.n;
    const stride = [1, nx, nx * ny], len = [nx, ny, nz];
    let src = this.g, dst = new Float32Array(src.length);
    for (let p = 0; p < passes; p++) for (let ax = 0; ax < 3; ax++) {
      const s = stride[ax], L = len[ax];
      // percorre todas as linhas ao longo do eixo `ax`
      for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const c = [i, j, k][ax];
        if (c !== 0) continue;
        const base = (k * ny + j) * nx + i;
        let acc = 0;
        for (let q = -radius; q <= radius; q++) if (q >= 0 && q < L) acc += src[base + q * s];
        for (let q = 0; q < L; q++) {
          dst[base + q * s] = acc / (2 * radius + 1);
          const add = q + radius + 1, sub = q - radius;
          if (add < L) acc += src[base + add * s];
          if (sub >= 0) acc -= src[base + sub * s];
        }
      }
      [src, dst] = [dst, src];
    }
    this.g = src;
    return this;
  }

  /** Densidade no ponto (trilinear). */
  at(x, y, z) {
    const fx = (x - this.min[0]) / VOX - 0.5, fy = (y - this.min[1]) / VOX - 0.5, fz = (z - this.min[2]) / VOX - 0.5;
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
    const u = fx - i, v = fy - j, w = fz - k;
    const [nx, ny, nz] = this.n;
    let r = 0;
    for (let c = 0; c < 8; c++) {
      const di = c & 1, dj = (c >> 1) & 1, dk = (c >> 2) & 1;
      const ii = i + di, jj = j + dj, kk = k + dk;
      if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
      r += this.g[(kk * ny + jj) * nx + ii] * (di ? u : 1 - u) * (dj ? v : 1 - v) * (dk ? w : 1 - w);
    }
    return r;
  }
}

const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * Escurece as cores por vértice do kit. Cada vértice olha um pouco à frente da própria normal:
 * se ali ainda há matéria (corpo ou outra peça), está numa dobra.
 */
export function shadeKit(kit, all, { strength = 0.55, tint = [0.82, 0.9, 0.92] } = {}) {
  for (let i = 0; i < kit.pos.length / 3; i++) {
    const p = [kit.pos[i * 3], kit.pos[i * 3 + 1], kit.pos[i * 3 + 2]], n = [kit.nor[i * 3], kit.nor[i * 3 + 1], kit.nor[i * 3 + 2]];
    const d = all.at(p[0] + n[0] * 0.018, p[1] + n[1] * 0.018, p[2] + n[2] * 0.018);
    const occ = sstep(0.04, 0.3, d) * strength;
    // a sombra puxa um pouco para o frio, como tinta
    for (let k = 0; k < 3; k++) kit.col[i * 3 + k] *= 1 - occ + occ * 0.35 * tint[k];
  }
}

/**
 * Escurece a textura do corpo em volta do equipamento (borda do colete, sob a aba, cinto,
 * cano da bota). `texels` vem de `rasterize` (posição 3D de cada texel).
 */
export async function shadeBodyTexture(image, texels, gear, { strength = 0.5 } = {}) {
  const { attr, hit, A, N } = texels;
  const img = await sharp(Buffer.from(image)).resize(N, N).removeAlpha().raw().toBuffer();
  for (let i = 0; i < N * N; i++) {
    if (!hit[i]) continue;
    const o = i * A;
    const d = gear.at(attr[o], attr[o + 1], attr[o + 2]);
    const occ = sstep(0.03, 0.32, d) * strength;
    if (occ <= 0.002) continue;
    img[i * 3] *= 1 - occ; img[i * 3 + 1] *= 1 - occ * 0.92; img[i * 3 + 2] *= 1 - occ * 0.85;
  }
  return sharp(img, { raw: { width: N, height: N, channels: 3 } }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}
