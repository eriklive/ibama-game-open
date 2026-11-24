/**
 * Modo Corrida — o caminho da corrida: trechos retos ligados por **esquinas** de 90° (como no
 * Temple Run). Medido em **fileiras** (1 fileira = √3 do mundo, o passo de uma fileira de
 * hexágonos), a mesma unidade das regras (`runner.ts`).
 *
 * - Cada trecho tem as **3 faixas** (0 esquerda, 1 meio, 2 direita de quem corre), a `LANE_WIDTH`
 *   uma da outra.
 * - Em cada esquina o caminho vira para a **esquerda** ou para a **direita** (`pathTurns`).
 * - `pathPose` dá o ponto do mundo e a direção de quem está a `at` fileiras do começo, numa faixa;
 *   perto da esquina a direção gira num arco curto (`CORNER_RADIUS`), sem pulo.
 */
export const S3 = Math.sqrt(3);
/** Distância (mundo) entre o meio de duas faixas vizinhas: 2 colunas de hexágono. */
export const LANE_WIDTH = 3;
/** Meia largura da pista (mundo): as 3 faixas e uma folga. */
export const TRACK_HALF = 4.6;
/** Raio (mundo) em que a direção gira na esquina. */
export const CORNER_RADIUS = 2.4;

export interface Point {
  x: number;
  z: number;
}

/** Um trecho reto: começa em `x, z`, anda na direção `dx, dz` (unitária) por `len` (mundo). */
export interface Segment {
  x: number;
  z: number;
  dx: number;
  dz: number;
  len: number;
  /** Onde começa, em fileiras desde o começo do caminho. */
  at: number;
}

export type Side = 'esquerda' | 'direita';

export interface PathTurn {
  /** Fileiras do começo até a esquina. */
  at: number;
  side: Side;
  /** A esquina (mundo). */
  x: number;
  z: number;
}

/** Monta os trechos ligando os pontos (cada par vizinho é um trecho reto). */
export function buildPath(points: readonly Point[]): Segment[] {
  const segs: Segment[] = [];
  let at = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1e-6) continue;
    segs.push({ x: a.x, z: a.z, dx: (b.x - a.x) / len, dz: (b.z - a.z) / len, len, at });
    at += len / S3;
  }
  return segs;
}

/** Comprimento do caminho, em fileiras. */
export const pathLength = (segs: readonly Segment[]): number => {
  const last = segs.at(-1);
  return last ? last.at + last.len / S3 : 0;
};

/** Lado da curva de `a` para `b` (produto vetorial no chão; o norte é −z). */
export function turnSide(a: Pick<Segment, 'dx' | 'dz'>, b: Pick<Segment, 'dx' | 'dz'>): Side {
  return a.dx * b.dz - a.dz * b.dx < 0 ? 'esquerda' : 'direita';
}

/** As esquinas do caminho, em ordem. */
export function pathTurns(segs: readonly Segment[]): PathTurn[] {
  const out: PathTurn[] = [];
  for (let i = 0; i + 1 < segs.length; i++) {
    const a = segs[i];
    const b = segs[i + 1];
    out.push({ at: b.at, side: turnSide(a, b), x: b.x, z: b.z });
  }
  return out;
}

/** Trecho em que fica `at` (fileiras). */
export function segmentAt(segs: readonly Segment[], at: number): number {
  for (let i = segs.length - 1; i >= 0; i--) if (at >= segs[i].at) return i;
  return 0;
}

/** Direita de quem anda na direção `dx, dz` (no chão). */
const rightOf = (dx: number, dz: number): Point => ({ x: -dz, z: dx });

/**
 * Reto no trecho `seg`, mesmo passando do fim dele: quem ainda não virou segue em frente até
 * a esquina (e um pouco além, até bater). Ponto e direção como em `pathPose`.
 */
export function straightPose(segs: readonly Segment[], seg: number, at: number, lane = 1): Point & { yaw: number } {
  const s = segs[Math.max(0, Math.min(segs.length - 1, seg))];
  const d = (at - s.at) * S3;
  const r = rightOf(s.dx, s.dz);
  const off = (lane - 1) * LANE_WIDTH;
  return { x: s.x + s.dx * d + r.x * off, z: s.z + s.dz * d + r.z * off, yaw: Math.atan2(s.dx, s.dz) };
}

/** Ponto e direção (yaw: `atan2(dx, dz)`) a `at` fileiras do começo, na faixa contínua `lane`. */
export function pathPose(segs: readonly Segment[], at: number, lane = 1): Point & { yaw: number } {
  const i = segmentAt(segs, at);
  const s = segs[i];
  const off = (lane - 1) * LANE_WIDTH;
  const onSeg = (seg: Segment, a: number) => {
    const d = (a - seg.at) * S3;
    const r = rightOf(seg.dx, seg.dz);
    return { x: seg.x + seg.dx * d + r.x * off, z: seg.z + seg.dz * d + r.z * off };
  };
  const yawOf = (seg: Segment) => Math.atan2(seg.dx, seg.dz);
  const rr = CORNER_RADIUS / S3;
  // perto da esquina (antes ou depois): gira a direção e mistura as duas posições
  const next = segs[i + 1];
  const prev = segs[i - 1];
  let a: Segment | undefined;
  let b: Segment | undefined;
  if (next && next.at - at < rr) [a, b] = [s, next];
  else if (prev && at - s.at < rr) [a, b] = [prev, s];
  if (a && b) {
    const t = Math.max(0, Math.min(1, (at - (b.at - rr)) / (2 * rr)));
    const k = t * t * (3 - 2 * t);
    const pa = onSeg(a, at);
    const pb = onSeg(b, at);
    const ya = yawOf(a);
    let yb = yawOf(b);
    if (yb - ya > Math.PI) yb -= 2 * Math.PI;
    if (ya - yb > Math.PI) yb += 2 * Math.PI;
    return { x: pa.x + (pb.x - pa.x) * k, z: pa.z + (pb.z - pa.z) * k, yaw: ya + (yb - ya) * k };
  }
  return { ...onSeg(s, at), yaw: yawOf(s) };
}

/**
 * O ponto do caminho mais perto de `(x, z)`: a distância (mundo) até a linha do meio, quanto
 * para o lado (positivo à direita de quem corre) e em que fileira do caminho.
 */
export function nearestOnPath(segs: readonly Segment[], x: number, z: number): { dist: number; side: number; at: number; seg: number } {
  let best = { dist: Infinity, side: 0, at: 0, seg: 0 };
  segs.forEach((s, i) => {
    const px = x - s.x;
    const pz = z - s.z;
    const along = Math.max(0, Math.min(s.len, px * s.dx + pz * s.dz));
    const cx = s.x + s.dx * along;
    const cz = s.z + s.dz * along;
    const dist = Math.hypot(x - cx, z - cz);
    if (dist < best.dist) {
      const r = rightOf(s.dx, s.dz);
      best = { dist, side: (x - cx) * r.x + (z - cz) * r.z, at: s.at + along / S3, seg: i };
    }
  });
  return best;
}
