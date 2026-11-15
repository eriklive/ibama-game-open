import type { GameMap, Ground } from './maps';
import { HexCoord, circleArea, hexKey } from './hex';

/** O que existe num hexágono qualquer do mundo: o chão e se há mata (que bloqueia). */
export interface Terrain {
  ground: Ground;
  tree: boolean;
}

/** Pseudoaleatório estável por posição (0..1). */
export const hashHex = (col: number, row: number, salt = 0): number => {
  const x = Math.sin(col * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Ruído suave (interpolado numa grade de `scale` hexágonos), para clareiras com cara de clareira. */
function valueNoise(col: number, row: number, scale: number, salt: number): number {
  const x = col / scale;
  const y = row / scale;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const v = (i: number, j: number) => hashHex(x0 + i, y0 + j, salt);
  const top = v(0, 0) + (v(1, 0) - v(0, 0)) * sx;
  const bottom = v(0, 1) + (v(1, 1) - v(0, 1)) * sx;
  return top + (bottom - top) * sy;
}

type LayoutParts = Pick<GameMap, 'cols' | 'rows' | 'trees' | 'ground'>;

/**
 * Fora do retângulo desenhado em texto, o mapa "continua" a partir da borda: a pista de
 * terra segue longe, as trilhas abertas avançam alguns hexágonos e somem na mata, e o
 * resto é mata fechada. Cada raio parte de um hexágono da borda e é contínuo (nunca deixa
 * uma clareira solta), então dentro da missão tudo continua alcançável. Nos cantos
 * (fora nas duas direções) é sempre mata.
 */
function continuation(parts: LayoutParts, trees: ReadonlySet<string>, h: HexCoord): Terrain | null {
  const outCol = h.col < 0 ? -h.col : h.col >= parts.cols ? h.col - parts.cols + 1 : 0;
  const outRow = h.row < 0 ? -h.row : h.row >= parts.rows ? h.row - parts.rows + 1 : 0;
  if (outCol && outRow) return null;
  const edge = {
    col: Math.min(parts.cols - 1, Math.max(0, h.col)),
    row: Math.min(parts.rows - 1, Math.max(0, h.row)),
  };
  const ground = parts.ground?.get(hexKey(edge));
  const dist = outCol || outRow;
  if (ground === 'dirt' || ground === 'runway') return dist <= 70 ? { ground: 'dirt', tree: false } : null;
  if (ground === 'grass' && !trees.has(hexKey(edge))) {
    const length = 3 + Math.floor(hashHex(edge.col, edge.row, 7) * 12);
    return dist <= length ? { ground: 'grass', tree: false } : null;
  }
  return null;
}

/** Mata do mundo de fora: fechada, com clareiras de grama e árvores soltas. */
function wilderness(h: HexCoord): Terrain {
  const n = valueNoise(h.col, h.row, 7, 3) * 0.75 + valueNoise(h.col, h.row, 2.5, 5) * 0.25;
  if (n > 0.66) return { ground: 'grass', tree: hashHex(h.col, h.row, 9) < 0.08 };
  return { ground: 'grass', tree: true };
}

/**
 * Transforma um mapa desenhado em texto num mundo semiaberto: a missão é um círculo de
 * `radius` passos em volta de `center` (só ali se joga) e, em volta, um mundo de cenário
 * até `radius + margin` passos. Os hexágonos do círculo que caem fora do desenho ganham
 * a continuação da borda (e entram nas árvores e no chão do mapa, valendo para as regras).
 */
export function openWorld<T extends LayoutParts>(
  parts: T,
  mission: { center: HexCoord; radius: number },
  margin: number,
): T & Pick<GameMap, 'trees' | 'ground' | 'mission' | 'world'> {
  const layoutTrees = new Set((parts.trees ?? []).map(hexKey));
  const ground = new Map(parts.ground ?? []);
  const trees = [...(parts.trees ?? [])];
  for (const h of circleArea(mission.center, mission.radius).hexes) {
    const key = hexKey(h);
    if (ground.has(key)) continue;
    const t = continuation(parts, layoutTrees, h) ?? { ground: 'grass', tree: true };
    ground.set(key, t.ground);
    if (t.tree) trees.push(h);
  }
  const treeKeys = new Set(trees.map(hexKey));
  const terrain = (h: HexCoord): Terrain => {
    const key = hexKey(h);
    const g = ground.get(key);
    if (g) return { ground: g, tree: treeKeys.has(key) };
    return continuation(parts, layoutTrees, h) ?? wilderness(h);
  };
  return { ...parts, trees, ground, mission, world: { radius: mission.radius + margin, terrain } };
}
