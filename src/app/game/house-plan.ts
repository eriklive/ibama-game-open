import { HexCoord, hexToWorld } from './hex';

/**
 * Piso dos hexágonos de parede da casa. As paredes são retas (ver `buildHouse`): as laterais e
 * as divisórias passam pelo centro da coluna; a do fundo e a da frente, na média das fileiras
 * par e ímpar (as colunas ímpares ficam meio hexágono abaixo), a 1/4 do hexágono do centro.
 * Cada hexágono que a parede corta fica com o chão do entorno e, por cima, a parte de dentro
 * com o piso da casa: o hexágono recortado pelo retângulo de dentro da casa.
 *
 * Saem poucos padrões, que se repetem girados/espelhados em cada parede: meio a meio
 * (laterais), as faixas de 1/4 e 3/4 (fundo e frente, colunas pares e ímpares) e as quinas
 * (cantos da casa).
 */

/** Retângulo de uma estrutura (colunas e fileiras das paredes, inclusive). */
export interface PlanRect {
  cols: [number, number];
  rows: [number, number];
}

export interface Point {
  x: number;
  z: number;
}

/** Retângulo do lado de dentro das paredes, no mundo (as linhas por onde as paredes passam). */
export function houseInterior(
  rect: PlanRect,
  size = 1,
): { x0: number; x1: number; z0: number; z1: number } {
  const quarter = (Math.sqrt(3) * size) / 4;
  return {
    x0: hexToWorld({ col: rect.cols[0], row: 0 }, size).x,
    x1: hexToWorld({ col: rect.cols[1], row: 0 }, size).x,
    z0: hexToWorld({ col: 0, row: rect.rows[0] }, size).z + quarter,
    z1: hexToWorld({ col: 0, row: rect.rows[1] }, size).z + quarter,
  };
}

/** Recorta um polígono convexo pelo semiplano `n · p <= c` (Sutherland–Hodgman). */
function clip(poly: Point[], nx: number, nz: number, c: number): Point[] {
  const out: Point[] = [];
  const d = (p: Point) => nx * p.x + nz * p.z - c;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = d(a);
    const db = d(b);
    if (da <= 0) out.push(a);
    if (da * db < 0) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return out;
}

/** Área de um polígono (fórmula do laço; sinal pelo sentido). */
const area = (poly: Point[]): number =>
  Math.abs(
    poly.reduce(
      (s, p, i) => s + p.x * poly[(i + 1) % poly.length].z - poly[(i + 1) % poly.length].x * p.z,
      0,
    ),
  ) / 2;

/**
 * Parte de dentro da casa num hexágono de raio `radius` (em volta do centro dele): o contorno
 * relativo ao centro e que fração do hexágono ela cobre (0 = todo fora, 1 = todo dentro).
 */
export function wallFloorShape(
  h: HexCoord,
  rect: PlanRect,
  size = 1,
  radius = size,
): { shape: Point[]; fraction: number } {
  const c = hexToWorld(h, size);
  const { x0, x1, z0, z1 } = houseInterior(rect, size);
  const hex: Point[] = Array.from({ length: 6 }, (_, i) => ({
    x: Math.cos((i * Math.PI) / 3) * radius,
    z: Math.sin((i * Math.PI) / 3) * radius,
  }));
  let shape = hex;
  shape = clip(shape, -1, 0, -(x0 - c.x));
  shape = clip(shape, 1, 0, x1 - c.x);
  shape = clip(shape, 0, -1, -(z0 - c.z));
  shape = clip(shape, 0, 1, z1 - c.z);
  const fraction = shape.length >= 3 ? area(shape) / area(hex) : 0;
  return { shape: fraction > 0 ? shape : [], fraction };
}
