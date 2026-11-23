/**
 * Ação "Agrupar": os agentes se encontram num ponto em comum e passam a andar juntos.
 * Aqui ficam só funções puras (testadas); a tela decide quando usá-las.
 */
import { HexArea, HexCoord, hexKey, hexNeighbors, pathTo, reachableHexes, sameHex } from './hex';

export const GROUP_RULES = {
  /** Movimento extra de cada agente enquanto o grupo anda junto (o Capitão soma mais 1). */
  moveBonus: 1,
  /** Intimidação extra (alcance da abordagem) enquanto o grupo anda junto (o Capitão soma mais 1; ver `stats.ts`). */
  approachBonus: 1,
};

export interface RallyPlan {
  /** Ponto de encontro: onde o líder (o agente da vez) para. */
  point: HexCoord;
  /** Caminho de cada agente (sem a origem; vazio para quem já está no lugar). */
  paths: Map<string, HexCoord[]>;
  /** Passos até todos chegarem (o caminho mais longo): é o movimento gasto. */
  cost: number;
}

type Reach = ReturnType<typeof reachableHexes>;

/** Custo de `from` até `to` usando o alcance já calculado (0 se já está lá). */
function costTo(from: HexCoord, reach: Reach, to: HexCoord): number | undefined {
  return sameHex(from, to) ? 0 : reach.get(hexKey(to))?.cost;
}

function routeTo(from: HexCoord, reach: Reach, to: HexCoord): HexCoord[] {
  return sameHex(from, to) ? [] : pathTo(reach, to);
}

/** Os vizinhos estão em volta do hexágono, em ordem: dois índices seguidos são vizinhos entre si. */
const ringContiguous = (indices: number[]): boolean => {
  if (indices.length < 2) return true;
  const set = new Set(indices);
  // conta quantos "começos de arco" existem: um só significa que formam um arco contínuo
  let starts = 0;
  for (const i of set) if (!set.has((i + 5) % 6)) starts++;
  return starts <= 1;
};

/**
 * Pontos de encontro possíveis para o grupo, com o plano de cada um.
 *
 * O líder vai até o ponto e os outros ocupam hexágonos vizinhos a ele, todos em até `steps`
 * passos. Os agentes não bloqueiam uns aos outros (andam juntos), mas nenhum ponto pode
 * cair num hexágono já ocupado por um agente. `blocked` são paredes e inimigos.
 */
export function rallyPoints(
  leaderId: string,
  units: ReadonlyMap<string, HexCoord>,
  steps: number,
  area: HexArea,
  blocked: ReadonlySet<string>,
): Map<string, RallyPlan> {
  const out = new Map<string, RallyPlan>();
  const leaderFrom = units.get(leaderId);
  if (!leaderFrom || steps <= 0) return out;
  const reaches = new Map([...units].map(([id, h]) => [id, reachableHexes(h, steps, area, blocked)]));
  const occupied = new Set([...units.values()].map(hexKey));
  const followers = [...units.keys()].filter((id) => id !== leaderId);
  const leaderReach = reaches.get(leaderId)!;

  for (const [key, { coord: point, cost: leaderCost }] of leaderReach) {
    if (occupied.has(key)) continue;
    const ring = hexNeighbors(point);
    const free = ring
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => area.has(h) && !blocked.has(hexKey(h)));
    const best = assignSlots(followers, free, units, reaches);
    if (!best) continue;
    const paths = new Map<string, HexCoord[]>([[leaderId, pathTo(leaderReach, point)]]);
    for (const [id, slot] of best) paths.set(id, routeTo(units.get(id)!, reaches.get(id)!, slot));
    const cost = Math.max(leaderCost, ...[...paths.values()].map((p) => p.length));
    out.set(key, { point, paths, cost });
  }
  return out;
}

/**
 * Distribui os seguidores pelos vizinhos livres do ponto. Prefere um arco contínuo (o grupo
 * fica compacto), depois o menor caminho mais longo e, por fim, a menor soma de passos.
 */
function assignSlots(
  followers: string[],
  free: { h: HexCoord; i: number }[],
  units: ReadonlyMap<string, HexCoord>,
  reaches: ReadonlyMap<string, Reach>,
): Map<string, HexCoord> | null {
  let best: { score: [number, number, number]; pick: Map<string, HexCoord> } | null = null;
  const used: number[] = [];
  const pick = new Map<string, HexCoord>();
  const costs: number[] = [];

  const visit = (n: number): void => {
    if (n === followers.length) {
      const score: [number, number, number] = [
        ringContiguous(used.map((u) => free[u].i)) ? 0 : 1,
        Math.max(0, ...costs),
        costs.reduce((a, b) => a + b, 0),
      ];
      if (!best || lexLess(score, best.score)) best = { score, pick: new Map(pick) };
      return;
    }
    const id = followers[n];
    for (let s = 0; s < free.length; s++) {
      if (used.includes(s)) continue;
      const c = costTo(units.get(id)!, reaches.get(id)!, free[s].h);
      if (c === undefined) continue;
      used.push(s);
      costs.push(c);
      pick.set(id, free[s].h);
      visit(n + 1);
      used.pop();
      costs.pop();
      pick.delete(id);
    }
  };
  visit(0);
  return best ? (best as { pick: Map<string, HexCoord> }).pick : null;
}

/** Comparação lexicográfica: decide pelo primeiro valor diferente. */
function lexLess(a: readonly number[], b: readonly number[]): boolean {
  const i = a.findIndex((v, j) => v !== b[j]);
  return i >= 0 && a[i] < b[i];
}

/**
 * Para onde os seguidores vão quando o líder anda `leaderPath` a partir de `leaderFrom`:
 * eles seguem o rastro do líder (o mais perto ocupa o hexágono logo atrás dele, e assim
 * por diante); se o rastro for curto, completam com hexágonos em volta do destino.
 *
 * Devolve o caminho de cada seguidor e quem não conseguiu acompanhar (fica para trás).
 */
export function followLeader(
  leaderFrom: HexCoord,
  leaderPath: readonly HexCoord[],
  followers: ReadonlyMap<string, HexCoord>,
  area: HexArea,
  blocked: ReadonlySet<string>,
): { paths: Map<string, HexCoord[]>; left: string[] } {
  const paths = new Map<string, HexCoord[]>();
  const end = leaderPath.at(-1) ?? leaderFrom;
  const range = leaderPath.length + 4;
  const reaches = new Map([...followers].map(([id, h]) => [id, reachableHexes(h, range, area, blocked)]));

  // vagas: o rastro, de trás para a frente, e depois os arredores do destino
  const slots: HexCoord[] = [];
  const seen = new Set([hexKey(end)]);
  const add = (h: HexCoord) => {
    const k = hexKey(h);
    if (seen.has(k) || blocked.has(k) || !area.has(h)) return;
    seen.add(k);
    slots.push(h);
  };
  [leaderFrom, ...leaderPath].reverse().forEach(add);
  [...reachableHexes(end, 3, area, blocked).values()]
    .sort((a, b) => a.cost - b.cost)
    .forEach((n) => add(n.coord));

  const waiting = new Set(followers.keys());
  for (const slot of slots) {
    if (!waiting.size) break;
    let who: string | null = null;
    let bestCost = Infinity;
    for (const id of waiting) {
      const c = costTo(followers.get(id)!, reaches.get(id)!, slot);
      if (c !== undefined && c < bestCost) {
        bestCost = c;
        who = id;
      }
    }
    if (!who) continue;
    waiting.delete(who);
    paths.set(who, routeTo(followers.get(who)!, reaches.get(who)!, slot));
  }
  return { paths, left: [...waiting] };
}

/**
 * Ponto de encontro sugerido (já vem selecionado ao abrir o "Agrupar"): o que gasta menos
 * movimento, depois o de menos passos somados e, por fim, o mais perto do líder.
 */
export function suggestedRally(plans: ReadonlyMap<string, RallyPlan>, leaderId: string): RallyPlan | undefined {
  let best: { plan: RallyPlan; score: [number, number, number] } | undefined;
  for (const plan of plans.values()) {
    const total = [...plan.paths.values()].reduce((a, p) => a + p.length, 0);
    const score: [number, number, number] = [plan.cost, total, plan.paths.get(leaderId)?.length ?? 0];
    if (!best || lexLess(score, best.score)) best = { plan, score };
  }
  return best?.plan;
}

/**
 * **Fila do grupo** (da frente para trás). Andando junto, quem vem atrás perde passos: o
 * agente da vez **vai para a frente** quando a vez dele começa e, quando a vez acaba, **vai para
 * o fim** (os outros andam uma vaga para a frente). Os hexágonos ocupados pelo grupo não mudam:
 * só quem está em cada um.
 */

/** O agente da vez troca de lugar com o primeiro da fila (se ainda não for ele). */
export function toFront(line: readonly string[], active: string): string[] {
  const i = line.indexOf(active);
  if (i <= 0) return [...line];
  const next = [...line];
  [next[0], next[i]] = [next[i], next[0]];
  return next;
}

/** O agente da vez vai para o fim da fila; os de trás dele andam uma vaga para a frente. */
export function toBack(line: readonly string[], active: string): string[] {
  if (!line.includes(active)) return [...line];
  return [...line.filter((id) => id !== active), active];
}

/**
 * Para onde cada um vai quando a fila muda de `line` para `next`: a vaga `i` (o hexágono de
 * quem era o `i`-ésimo) passa a ser de `next[i]`. Só aparece quem muda de hexágono.
 */
export function lineMoves(
  line: readonly string[],
  next: readonly string[],
  positions: ReadonlyMap<string, HexCoord>,
): Map<string, HexCoord> {
  const out = new Map<string, HexCoord>();
  next.forEach((id, i) => {
    const slot = positions.get(line[i]);
    const from = positions.get(id);
    if (slot && from && !sameHex(slot, from)) out.set(id, slot);
  });
  return out;
}

/**
 * Caminho de cada um até a vaga nova (os agentes não se bloqueiam). Se alguém não alcança a
 * vaga em até `range` passos (o grupo está espalhado), devolve `null` e a fila fica como está.
 */
export function lineSwapPaths(
  moves: ReadonlyMap<string, HexCoord>,
  positions: ReadonlyMap<string, HexCoord>,
  area: HexArea,
  blocked: ReadonlySet<string>,
  range = 4,
): Map<string, HexCoord[]> | null {
  const paths = new Map<string, HexCoord[]>();
  for (const [id, to] of moves) {
    const from = positions.get(id);
    if (!from) return null;
    const reach = reachableHexes(from, range, area, blocked);
    if (costTo(from, reach, to) === undefined) return null;
    paths.set(id, routeTo(from, reach, to));
  }
  return paths;
}
