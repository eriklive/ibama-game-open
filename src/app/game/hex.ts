/**
 * Grid hexagonal "flat-top" com coordenadas offset "odd-q"
 * (colunas ímpares deslocadas meio hexágono para baixo), o mesmo
 * layout usado nos esboços de tabuleiro do canvas de referências.
 */
export interface HexCoord {
  col: number;
  row: number;
}

interface Cube {
  x: number;
  y: number;
  z: number;
}

export const hexKey = (h: HexCoord): string => `${h.col},${h.row}`;

export const sameHex = (a: HexCoord | null, b: HexCoord | null): boolean =>
  !!a && !!b && a.col === b.col && a.row === b.row;

function toCube(h: HexCoord): Cube {
  const x = h.col;
  const z = h.row - (h.col - (h.col & 1)) / 2;
  return { x, y: -x - z, z };
}

function fromCube(c: Cube): HexCoord {
  const col = c.x;
  const row = c.z + (c.x - (c.x & 1)) / 2;
  return { col, row };
}

function roundCube(x: number, y: number, z: number): Cube {
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { x: rx, y: ry, z: rz };
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ca = toCube(a);
  const cb = toCube(b);
  return Math.max(Math.abs(ca.x - cb.x), Math.abs(ca.y - cb.y), Math.abs(ca.z - cb.z));
}

/** Hexágonos atingíveis a partir de `from` (sem incluir a origem). */
export function hexesInRange(from: HexCoord, range: number, cols: number, rows: number): HexCoord[] {
  const out: HexCoord[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const h = { col, row };
      const d = hexDistance(from, h);
      if (d > 0 && d <= range) out.push(h);
    }
  }
  return out;
}

/** Caminho em linha reta de `a` até `b`, incluindo as duas pontas. */
export function hexLine(a: HexCoord, b: HexCoord): HexCoord[] {
  const n = hexDistance(a, b);
  const ca = toCube(a);
  const cb = toCube(b);
  const path: HexCoord[] = [];
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    // pequeno deslocamento evita empates exatamente na aresta
    path.push(
      fromCube(
        roundCube(
          ca.x + (cb.x - ca.x) * t + 1e-6,
          ca.y + (cb.y - ca.y) * t + 1e-6,
          ca.z + (cb.z - ca.z) * t - 2e-6,
        ),
      ),
    );
  }
  return path;
}

/** Centro do hexágono no plano XZ do mundo 3D. */
export function hexToWorld(h: HexCoord, size: number): { x: number; z: number } {
  return {
    x: size * 1.5 * h.col,
    z: size * Math.sqrt(3) * (h.row + 0.5 * (h.col & 1)),
  };
}

/** Os 6 vizinhos de um hexágono (podem cair fora do mapa). */
export function hexNeighbors(h: HexCoord): HexCoord[] {
  const c = toCube(h);
  const dirs: [number, number, number][] = [
    [1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1],
  ];
  return dirs.map(([dx, dy, dz]) => fromCube({ x: c.x + dx, y: c.y + dy, z: c.z + dz }));
}

const inside = (h: HexCoord, cols: number, rows: number): boolean =>
  h.col >= 0 && h.row >= 0 && h.col < cols && h.row < rows;

/**
 * Busca em largura a partir de `from`, sem atravessar hexágonos bloqueados.
 * Devolve, para cada hexágono atingível em até `steps` passos (exceto a origem),
 * o custo e o hexágono anterior no caminho mais curto.
 */
export function reachableHexes(
  from: HexCoord,
  steps: number,
  cols: number,
  rows: number,
  blocked: ReadonlySet<string> = new Set(),
): Map<string, { coord: HexCoord; cost: number; prev: string }> {
  const out = new Map<string, { coord: HexCoord; cost: number; prev: string }>();
  const startKey = hexKey(from);
  const seen = new Set([startKey]);
  let frontier = [from];
  for (let cost = 1; cost <= steps && frontier.length; cost++) {
    const next: HexCoord[] = [];
    for (const h of frontier) {
      for (const n of hexNeighbors(h)) {
        const k = hexKey(n);
        if (seen.has(k) || !inside(n, cols, rows) || blocked.has(k)) continue;
        seen.add(k);
        out.set(k, { coord: n, cost, prev: hexKey(h) });
        next.push(n);
      }
    }
    frontier = next;
  }
  return out;
}

/** Reconstrói o caminho (sem a origem) até `to` a partir do resultado de `reachableHexes`. */
export function pathTo(
  reach: ReadonlyMap<string, { coord: HexCoord; prev: string }>,
  to: HexCoord,
): HexCoord[] {
  const path: HexCoord[] = [];
  let node = reach.get(hexKey(to));
  while (node) {
    path.unshift(node.coord);
    node = reach.get(node.prev);
  }
  return path;
}

/** Hexágono que contém o ponto (x, z) do plano do mundo — inverso de `hexToWorld`. */
export function worldToHex(x: number, z: number, size: number): HexCoord {
  const q = x / (1.5 * size);
  const r = z / (Math.sqrt(3) * size) - q / 2;
  const h = fromCube(roundCube(q, -q - r, r));
  return { col: h.col + 0, row: h.row + 0 }; // + 0 troca -0 por 0
}
