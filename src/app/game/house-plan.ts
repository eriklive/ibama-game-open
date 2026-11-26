import { HexCoord, hexKey, hexNeighbors, hexToWorld } from './hex';

/**
 * Planta das paredes da casa: as paredes passam **pelo meio** dos hexágonos de parede, de
 * centro a centro. Nas laterais (colunas) a parede é reta; nas paredes compridas (fileiras),
 * como as colunas ímpares ficam meio hexágono abaixo, ela anda em zigue-zague, sempre de um
 * centro ao outro. Assim cada hexágono de parede fica dividido por ela e o piso segue
 * poucos padrões (ver `floorSectors`): meio a meio (parede reta) e as quinas (1/3, 1/6…).
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

export interface HousePlan {
  /** Hexágonos de parede e de porta dentro do retângulo. */
  nodes: Map<string, HexCoord>;
  /** Para cada hexágono, os vizinhos ligados a ele pela parede. */
  links: Map<string, HexCoord[]>;
  /** Ligações (cada par uma vez). */
  edges: [HexCoord, HexCoord][];
  /** Contorno de fora da casa (centros dos hexágonos do perímetro, em ordem). */
  outline: Point[];
}

const onPerimeter = (h: HexCoord, { cols: [c0, c1], rows: [r0, r1] }: PlanRect): boolean =>
  h.col === c0 || h.col === c1 || h.row === r0 || h.row === r1;

/**
 * Liga os hexágonos de parede e de porta vizinhos. Onde três se tocam (um triângulo, como no
 * pé de uma divisória), a ligação "na diagonal" (coluna e fileira diferentes) sai: a parede
 * segue a fileira e a coluna, sem atalho.
 */
export function housePlan(
  rect: PlanRect,
  walls: ReadonlySet<string>,
  doors: ReadonlySet<string> = new Set(),
  size = 1,
): HousePlan {
  const nodes = new Map<string, HexCoord>();
  const [c0, c1] = rect.cols;
  const [r0, r1] = rect.rows;
  for (let col = c0; col <= c1; col++) {
    for (let row = r0; row <= r1; row++) {
      const k = hexKey({ col, row });
      if (walls.has(k) || doors.has(k)) nodes.set(k, { col, row });
    }
  }
  const linked = new Map<string, Set<string>>();
  for (const [k, h] of nodes) {
    linked.set(
      k,
      new Set(
        hexNeighbors(h)
          .map(hexKey)
          .filter((n) => nodes.has(n)),
      ),
    );
  }
  const diagonal = (a: HexCoord, b: HexCoord) => a.col !== b.col && a.row !== b.row;
  const drop: [string, string][] = [];
  for (const [a, na] of linked) {
    for (const b of na) {
      for (const c of na) {
        if (b >= c || !linked.get(b)!.has(c)) continue;
        // triângulo a–b–c: tira as ligações diagonais dele
        for (const [p, q] of [
          [a, b],
          [a, c],
          [b, c],
        ] as const) {
          if (diagonal(nodes.get(p)!, nodes.get(q)!)) drop.push([p, q]);
        }
      }
    }
  }
  for (const [p, q] of drop) {
    linked.get(p)!.delete(q);
    linked.get(q)!.delete(p);
  }
  const links = new Map<string, HexCoord[]>();
  const edges: [HexCoord, HexCoord][] = [];
  for (const [k, set] of linked) {
    links.set(
      k,
      [...set].map((n) => nodes.get(n)!),
    );
    for (const n of set) if (k < n) edges.push([nodes.get(k)!, nodes.get(n)!]);
  }

  // contorno: o ciclo pelos hexágonos do perímetro (as divisórias ficam de fora)
  const outline: Point[] = [];
  const ring = [...nodes.values()].filter((h) => onPerimeter(h, rect));
  const onRing = new Set(ring.map(hexKey));
  if (ring.length) {
    const seen = new Set<string>();
    let cur: HexCoord | undefined = ring[0];
    while (cur && !seen.has(hexKey(cur))) {
      seen.add(hexKey(cur));
      outline.push(hexToWorld(cur, size));
      cur = links.get(hexKey(cur))!.find((n) => onRing.has(hexKey(n)) && !seen.has(hexKey(n)));
    }
  }
  return { nodes, links, edges, outline };
}

/** O ponto fica dentro do polígono (regra par–ímpar). */
export function insidePolygon(p: Point, poly: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x)
      inside = !inside;
  }
  return inside;
}

/** Fatia do piso de um hexágono de parede: de `start` (radianos, no plano XZ) por `span`. */
export interface FloorSector {
  start: number;
  span: number;
  /** Do lado de dentro da casa (piso) ou de fora (o chão do entorno). */
  inside: boolean;
}

/**
 * Como a parede divide o piso de um hexágono: as fatias entre as direções em que ela sai
 * do centro (para os vizinhos ligados). Parede reta: duas metades (`span` = π); quina:
 * 1/3 e 2/3 (2π/3 e 4π/3); pé de divisória: 1/6. Os ângulos são os de `Math.atan2(dz, dx)`.
 */
export function floorSectors(plan: HousePlan, h: HexCoord, size = 1): FloorSector[] {
  const c = hexToWorld(h, size);
  const rays = (plan.links.get(hexKey(h)) ?? [])
    .map((n) => {
      const p = hexToWorld(n, size);
      return Math.atan2(p.z - c.z, p.x - c.x);
    })
    .sort((a, b) => a - b);
  if (!rays.length) return [];
  return rays.map((start, i) => {
    const end = i + 1 < rays.length ? rays[i + 1] : rays[0] + 2 * Math.PI;
    const span = end - start;
    const mid = start + span / 2;
    const sample = { x: c.x + Math.cos(mid) * 0.35 * size, z: c.z + Math.sin(mid) * 0.35 * size };
    return { start, span, inside: insidePolygon(sample, plan.outline) };
  });
}
