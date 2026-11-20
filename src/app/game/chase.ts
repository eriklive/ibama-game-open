/**
 * Modo Perseguição — regras puras (testadas em `chase.spec.ts`). Nada de tela aqui: o jogo
 * decide quando chamar cada função e o que mostrar.
 *
 * Fluxo de uma perseguição:
 * 1. **Gatilho.** No turno inimigo, antes de um suspeito em alerta correr, os agentes no
 *    **raio de perseguição** dele (`chaseRadius`: base + vigor + iniciativa, com caminho livre)
 *    podem ir atrás (`chaseCandidates`). Quem já correu nesta rodada inimiga não vai de novo.
 *    **Voz de prisão:** quem foge de uma abordagem não espera o turno inimigo: foge na hora,
 *    ainda no turno de quem abordou, e a fila é outra (`arrestQueue`): primeiro rola quem
 *    abordou; se hesitar, os outros agentes, do mais perto do suspeito ao mais longe, um por
 *    vez, até alguém arrancar (ou o jogador deixar fugir). Com vários fugindo, um por vez.
 * 2. **Iniciativa.** Só o agente rola: d20 + iniciativa, pelo menos `initiativeDC` (8), sem
 *    depender do garimpeiro (`initiativeCheck`). Passou: sai correndo. Falhou: hesita e o
 *    garimpeiro foge normal. O garimpeiro não rola nada novo: o teste de fuga da faixa amarela da
 *    abordagem continua como está (falhou, tropeça e se rende), e quem foge sem rolar segue assim.
 * 3. **Rota travada.** O jogo calcula a fuga dele até a saída (borda) mais próxima, sem limite
 *    de passos (`lockRoute`). Ele evita o que os agentes enxergam (`agentSight`): prefere correr
 *    por dentro das construções ou pela mata a atravessar a pista à vista. Passa só por portas
 *    que consegue usar (abertas, encostadas, trancadas e portões; bloqueada é parede). A rota
 *    vira a "pista" e não muda mais. **Curvas não param nada nem rolam dados:** o agente vai
 *    atrás dele direto. Dados só nos testes de verdade, as **paradas**:
 *    - **porta** fechada no caminho: o garimpeiro rola d4 para escolher abrir ou arrombar e d20
 *      para conseguir (`resolveFleeDoor`). Falhou: perde tempo e tenta de novo. Passou: a porta
 *      fica aberta e o agente passa direto.
 *    - **pulo** (`agentVaults`): onde a pista do agente dá a volta num caixote de meia altura
 *      (o garimpeiro não pula, contorna), o agente tem `vaultSeconds` para pular por cima.
 *      Pulou: d20 + agilidade ≥ `vaultDC` (`resolveVault`) corta caminho (a distância cai o que
 *      a volta custaria); falhou, tropeça (+1) e dá a volta. Sem pular, dá a volta como ele,
 *      sem rolar.
 * 4. **Distância.** Começa no tamanho do trecho do agente até ele; só as paradas mexem nela.
 *    Chegou a 0: **agarra** (rende na hora e fica **abalado**, +2 no próximo interrogatório).
 *    Chegou à borda: **foge** do mapa e a perseguição acaba (`chaseEnd`).
 *    - **grito** (`resolveShout`): uma vez por trecho (entre paradas), o jogador pode gritar,
 *      sem parar a corrida. Um teste só: o agente rola d20 + intimidação ≥ `shoutDC` (16);
 *      passou, ele olha para trás e a distância cai 1.
 * 5. **Sem custo.** Perseguir não gasta movimento nem a vez do agente, e não há fôlego.
 * 6. **Vários fugindo.** Uma perseguição por vez. Com o mesmo agente no raio de dois, entra a
 *    `decisao:alvo` (escolher um). Terminada a primeira, o outro é oferecido aos agentes que
 *    ainda não correram (`chaseCandidates` com `alreadyChased`).
 */
import { ENEMY_RULES, isBorder, lineOfSight } from './enemies';
import { Door, DoorState, isOpen } from './door';
import {
  HexArea,
  HexCoord,
  hexesInRange,
  hexKey,
  hexNeighbors,
  hexToWorld,
  pathTo,
  reachableHexes,
} from './hex';

export const CHASE_RULES = {
  die: 20,
  /** Raio de perseguição sem atributos (o que ele correria num turno de fuga). */
  radiusBase: ENEMY_RULES.fleeSteps,
  /** Iniciativa do agente: d20 + iniciativa, pelo menos isto, para sair correndo. */
  initiativeDC: 8,
  /**
   * Visão dos agentes na fuga: até onde (hexágonos, em linha reta e sem parede, árvore ou
   * porta fechada no meio) um agente enxerga. A rota foge desses hexágonos.
   */
  sightRange: 20,
  /** Custo extra de cada hexágono que um agente enxerga: ele dá a volta pela mata ou por dentro. */
  seenCost: 6,
  /** Garimpeiro numa porta fechada: d4 1–2 tenta abrir, 3–4 arromba. */
  doorChoiceDie: 4,
  doorOpenMax: 2,
  /** O que ele precisa tirar no d20 em cada caso. Trancada + abrir usa a fechadura da porta. */
  doorNeed: { abrirEncostada: 3, arrombarEncostada: 3, arrombarTrancada: 12 },
  /**
   * Grito ("Parado, Ibama!"): uma vez por trecho (entre paradas). O agente rola
   * d20 + intimidação e precisa disto para ele olhar para trás.
   */
  shoutDC: 16,
  /** Caixote de meia altura: tempo (s, relógio real) para escolher pular. */
  vaultSeconds: 2,
  /** Pulo por cima do caixote: d20 + agilidade, pelo menos isto. */
  vaultDC: 8,
  /** Tropeçou no pulo: a distância abre isto. */
  vaultFailDelta: 1,
  /** Agarrou: bônus nas rolagens do próximo interrogatório do suspeito abalado. */
  shakenBonus: 2,
} as const;

export type Side = 'esquerda' | 'direita';

/** Atributos de perseguição (agente ou garimpeiro). Os que faltam valem 0. */
export interface ChaseStats {
  vigor?: number;
  iniciativa?: number;
  agilidade?: number;
  /** Só o do agente conta (no grito: d20 + intimidação). */
  intimidacao?: number;
}

// ---------- gatilho ----------

/** Raio de perseguição: base + vigor + iniciativa (nunca negativo). */
export const chaseRadius = (s: ChaseStats = {}): number =>
  Math.max(0, CHASE_RULES.radiusBase + (s.vigor ?? 0) + (s.iniciativa ?? 0));

export interface ChaseAgent {
  id: string;
  hex: HexCoord;
  stats?: ChaseStats;
}

export interface ChaseCandidate {
  id: string;
  /** Caminho do agente até o garimpeiro (sem a origem, termina no hexágono dele). */
  path: HexCoord[];
}

/**
 * Agentes que podem perseguir o garimpeiro em `target`: chegam até ele andando no máximo o
 * raio de perseguição, sem atravessar `blocked` (o hexágono dele pode estar em `blocked`; é o
 * destino). Quem está em `alreadyChased` fica de fora. Ordem: o mais perto primeiro.
 */
export function chaseCandidates(
  target: HexCoord,
  agents: readonly ChaseAgent[],
  area: HexArea,
  blocked: ReadonlySet<string>,
  alreadyChased: ReadonlySet<string> = new Set(),
): ChaseCandidate[] {
  const targetKey = hexKey(target);
  const free = new Set(blocked);
  free.delete(targetKey);
  const out: ChaseCandidate[] = [];
  for (const a of agents) {
    if (alreadyChased.has(a.id)) continue;
    const radius = chaseRadius(a.stats);
    const reach = reachableHexes(a.hex, radius, area, free);
    if (!reach.has(targetKey)) continue;
    out.push({ id: a.id, path: pathTo(reach, target) });
  }
  return out.sort((x, y) => x.path.length - y.path.length);
}

/**
 * Fila da voz de prisão: quem rola a iniciativa para ir atrás de um suspeito que fugiu de uma
 * abordagem, na ordem. Primeiro o agente que abordou (`leaderId`); depois todos os outros, do
 * mais perto do suspeito ao mais longe. Não há limite de raio: basta ter caminho andando até
 * ele. Quem está em `alreadyChased` fica de fora.
 */
export function arrestQueue(
  target: HexCoord,
  leaderId: string,
  agents: readonly ChaseAgent[],
  area: HexArea,
  blocked: ReadonlySet<string>,
  alreadyChased: ReadonlySet<string> = new Set(),
): ChaseCandidate[] {
  const targetKey = hexKey(target);
  const free = new Set(blocked);
  free.delete(targetKey);
  const out: ChaseCandidate[] = [];
  for (const a of agents) {
    if (alreadyChased.has(a.id)) continue;
    const reach = reachableHexes(a.hex, area.hexes.length, area, free);
    if (reach.has(targetKey)) out.push({ id: a.id, path: pathTo(reach, target) });
  }
  const rank = (c: ChaseCandidate) => (c.id === leaderId ? -1 : c.path.length);
  return out.sort((x, y) => rank(x) - rank(y));
}

/**
 * Agentes que estão no raio de mais de um garimpeiro: para eles, a `decisao:alvo` (escolher
 * qual perseguir). Devolve `id do agente → ids dos garimpeiros`.
 */
export function targetChoices(
  offers: ReadonlyMap<string, readonly ChaseCandidate[]>,
): Map<string, string[]> {
  const byAgent = new Map<string, string[]>();
  for (const [enemyId, cands] of offers) {
    for (const c of cands) byAgent.set(c.id, [...(byAgent.get(c.id) ?? []), enemyId]);
  }
  return new Map([...byAgent].filter(([, es]) => es.length > 1));
}

// ---------- iniciativa ----------

export interface InitiativeResult {
  total: number;
  /** O agente arrancou a tempo. */
  go: boolean;
}

/** Iniciativa do agente: d20 + iniciativa, pelo menos `initiativeDC`. */
export function initiativeCheck(roll: number, agent: ChaseStats = {}): InitiativeResult {
  const total = roll + (agent.iniciativa ?? 0);
  return { total, go: total >= CHASE_RULES.initiativeDC };
}

/** Chance (0..1) de o agente arrancar a tempo. */
export function initiativeChance(agent: ChaseStats = {}): number {
  const d = CHASE_RULES.die;
  const need = CHASE_RULES.initiativeDC - (agent.iniciativa ?? 0);
  return Math.min(1, Math.max(0, (d + 1 - need) / d));
}

// ---------- rota travada ----------

/** Parada da rota de fuga: só portas fechadas (curvas não param). */
export type ChaseStop = { kind: 'porta'; index: number; hex: HexCoord; door: Door };

export interface ChaseRoute {
  /** Fuga do garimpeiro (sem a origem), inteira até a borda. */
  flee: HexCoord[];
  /** A rota chega à borda (se ninguém pegar, ele foge). Só é falso se estiver encurralado. */
  escapes: boolean;
  /** Encurralado: não há rota até a borda. */
  cornered: boolean;
  stops: ChaseStop[];
}

/** Portas que a fuga pode atravessar (a bloqueada vira parede). */
const passableForFlee = (state: DoorState): boolean => state !== 'bloqueada';

/**
 * Hexágonos que os agentes enxergam: até `range` em linha reta, sem parede, árvore, carga alta
 * ou porta fechada (`walls`) no meio. Os agentes não têm cone: olham para todo lado.
 */
export function agentSight(
  agents: readonly HexCoord[],
  area: HexArea,
  walls: ReadonlySet<string>,
  range: number = CHASE_RULES.sightRange,
): Set<string> {
  const out = new Set<string>();
  for (const a of agents) {
    for (const h of hexesInRange(a, range, area)) {
      const k = hexKey(h);
      if (!out.has(k) && !walls.has(k) && lineOfSight(a, h, walls)) out.add(k);
    }
  }
  return out;
}

/**
 * Trava a rota de fuga: até a saída (borda) mais barata, sem limite de passos. Cada passo
 * custa 1, e mais `seenCost` se um agente enxerga aquele hexágono (`sight`): ele prefere
 * correr por dentro das construções ou pela mata a atravessar a pista à vista. Desvia de
 * `blocked` e dos agentes. Portas comuns (`doors`) que não estão bloqueadas são atravessáveis
 * mesmo fechadas (viram paradas). Entre saídas igualmente baratas, prefere a mais longe dos
 * agentes.
 */
export function lockRoute(
  from: HexCoord,
  area: HexArea,
  blocked: ReadonlySet<string>,
  doors: ReadonlyMap<string, Door> = new Map(),
  agents: readonly HexCoord[] = [],
  sight: ReadonlySet<string> = new Set(),
): ChaseRoute {
  if (isBorder(from, area)) return { flee: [], escapes: true, cornered: false, stops: [] };
  const walls = new Set(blocked);
  for (const [k, d] of doors) {
    if (d.broken || passableForFlee(d.state)) walls.delete(k);
    else walls.add(k);
  }
  for (const a of agents) walls.add(hexKey(a));
  const reach = cheapestPaths(from, area, walls, (k) => 1 + (sight.has(k) ? CHASE_RULES.seenCost : 0));
  let best: { coord: HexCoord; cost: number; safety: number } | null = null;
  for (const { coord, cost } of reach.values()) {
    if (!isBorder(coord, area)) continue;
    const safety = agents.length
      ? Math.min(...agents.map((a) => Math.hypot(...worldDelta(a, coord))))
      : 0;
    if (!best || cost < best.cost || (cost === best.cost && safety > best.safety))
      best = { coord, cost, safety };
  }
  if (!best) return { flee: [], escapes: false, cornered: true, stops: [] };
  const flee = pathTo(reach, best.coord);
  return { flee, escapes: true, cornered: false, stops: routeStops([from, ...flee], doors) };
}

/**
 * Dijkstra a partir de `from` (que fica de fora do resultado, como em `reachableHexes`):
 * `cost` de entrar em cada hexágono, pela chave. Mesmo formato de `reachableHexes`, para `pathTo`.
 */
function cheapestPaths(
  from: HexCoord,
  area: HexArea,
  walls: ReadonlySet<string>,
  cost: (key: string) => number,
): Map<string, { coord: HexCoord; cost: number; prev: string }> {
  const out = new Map<string, { coord: HexCoord; cost: number; prev: string }>();
  const startKey = hexKey(from);
  const done = new Set<string>();
  // fila de prioridade simples por baldes (custos inteiros e pequenos)
  const buckets: { coord: HexCoord; key: string }[][] = [[{ coord: from, key: startKey }]];
  const best = new Map<string, number>([[startKey, 0]]);
  for (let c = 0; c < buckets.length; c++) {
    for (const { coord, key } of buckets[c] ?? []) {
      if (done.has(key) || best.get(key) !== c) continue;
      done.add(key);
      for (const n of hexNeighbors(coord)) {
        const k = hexKey(n);
        if (done.has(k) || !area.has(n) || walls.has(k)) continue;
        const nc = c + cost(k);
        if (nc >= (best.get(k) ?? Infinity)) continue;
        best.set(k, nc);
        out.set(k, { coord: n, cost: nc, prev: key });
        (buckets[nc] ??= []).push({ coord: n, key: k });
      }
    }
  }
  return out;
}

const worldDelta = (a: HexCoord, b: HexCoord): [number, number] => {
  const p = hexToWorld(a, 1);
  const q = hexToWorld(b, 1);
  return [q.x - p.x, q.z - p.z];
};

/** Paradas da rota (`points` com a origem): as portas fechadas, em ordem. Índices são de `points`. */
export function routeStops(
  points: readonly HexCoord[],
  doors: ReadonlyMap<string, Door> = new Map(),
): ChaseStop[] {
  const stops: ChaseStop[] = [];
  points.forEach((hex, index) => {
    const door = doors.get(hexKey(hex));
    if (index > 0 && door && !isOpen(door)) stops.push({ kind: 'porta', index, hex, door });
  });
  return stops;
}

/** Atalho do agente por cima de um caixote de meia altura (índices de `track`). */
export interface VaultSpot {
  /** Onde o agente está quando decide pular. */
  index: number;
  /** O caixote (o agente passa por cima dele). */
  over: HexCoord;
  /** Onde o atalho volta para a pista. */
  land: number;
  /** O atalho, sem a origem: até o caixote, por cima dele e de volta à pista (termina em `land`). */
  path: HexCoord[];
  /** Passos que o atalho poupa em relação à volta da pista. */
  saves: number;
}

/**
 * Pulos da pista do agente: onde ela dá a volta num caixote de meia altura (`vaultable`) e um
 * atalho por cima dele (chegando a até `reach` passos do caixote, sem atravessar `walls`) volta
 * à pista mais adiante, poupando pelo menos 1 passo. Em cada caixote vale o atalho que mais
 * poupa (no empate, o que sai mais perto do caixote). Os pulos não se sobrepõem.
 */
export function agentVaults(
  track: readonly HexCoord[],
  vaultable: ReadonlySet<string>,
  area: HexArea,
  walls: ReadonlySet<string> = new Set(),
  reach = 3,
): VaultSpot[] {
  const found: VaultSpot[] = [];
  for (const key of vaultable) {
    const [col, row] = key.split(',').map(Number);
    const over = { col, row };
    // a pé, a partir do caixote: quantos passos até cada hexágono em volta
    const near = reachableHexes(over, reach, area, walls);
    const dist = (h: HexCoord) => near.get(hexKey(h))?.cost;
    let best: VaultSpot | null = null;
    let bestOut = Infinity;
    for (let i = 0; i < track.length; i++) {
      const din = dist(track[i]);
      if (din === undefined) continue;
      for (let j = i + 1; j < track.length; j++) {
        const dout = dist(track[j]);
        if (dout === undefined) continue;
        const saves = j - i - (din + dout);
        if (saves < 1) continue;
        if (best && (saves < best.saves || (saves === best.saves && din >= bestOut))) continue;
        const into = pathTo(near, track[i]).reverse().slice(1);
        const out = pathTo(near, track[j]);
        best = { index: i, over, land: j, path: [...into, over, ...out], saves };
        bestOut = din;
      }
    }
    if (best) found.push(best);
  }
  // em ordem na pista, sem sobreposição
  found.sort((a, b) => a.index - b.index);
  const out: VaultSpot[] = [];
  for (const v of found) if (!out.length || v.index >= out.at(-1)!.land) out.push(v);
  return out;
}

// ---------- paradas ----------

/**
 * Pulo do caixote (só o agente rola): d20 + agilidade ≥ `vaultDC` corta caminho (a distância cai
 * `saves`); falhou, tropeça e dá a volta (+`vaultFailDelta`).
 */
export function resolveVault(roll: number, agent: ChaseStats, saves: number): { pass: boolean; delta: number } {
  const pass = roll + (agent.agilidade ?? 0) >= CHASE_RULES.vaultDC;
  return { pass, delta: pass ? -saves : CHASE_RULES.vaultFailDelta };
}

export type FleeDoorAction = 'abrir' | 'arrombar';

/** O que o garimpeiro tenta na porta, pelo d4. */
export const fleeDoorAction = (d4: number): FleeDoorAction =>
  d4 <= CHASE_RULES.doorOpenMax ? 'abrir' : 'arrombar';

/** O que ele precisa tirar no d20 (0 = passa direto; porta aberta ou arrombada). */
export function fleeDoorNeed(action: FleeDoorAction, door: Door): number {
  if (isOpen(door)) return 0;
  const n = CHASE_RULES.doorNeed;
  if (door.state === 'encostada')
    return action === 'abrir' ? n.abrirEncostada : n.arrombarEncostada;
  if (door.state === 'trancada') return action === 'abrir' ? door.lock : n.arrombarTrancada;
  return Infinity; // bloqueada: a rota nem passa por ela
}

export interface FleeDoorResult {
  action: FleeDoorAction;
  need: number;
  pass: boolean;
  /** A porta depois da tentativa (aberta ou arrombada; igual se falhou). */
  door: Door;
  /** Falhou: perdeu tempo, a distância cai 1 e ele tenta de novo. */
  delta: number;
}

/** Uma tentativa do garimpeiro numa porta fechada da rota: d4 escolhe, d20 resolve. */
export function resolveFleeDoor(door: Door, d4: number, d20: number): FleeDoorResult {
  const action = fleeDoorAction(d4);
  const need = fleeDoorNeed(action, door);
  const pass = need !== Infinity && d20 >= need;
  const after: Door = !pass
    ? door
    : action === 'arrombar'
      ? { ...door, broken: true }
      : { ...door, state: 'aberta' };
  return { action, need, pass, door: after, delta: pass ? 0 : -1 };
}

// ---------- grito ----------

export interface ShoutResult {
  /** d20 + intimidação do agente. */
  total: number;
  /** Ele olhou para trás: a distância cai 1. */
  lookedBack: boolean;
  delta: number;
}

/**
 * Grito na perseguição: um teste só. O agente rola d20 + intimidação; pelo menos `shoutDC` (16),
 * ele olha para trás e o agente encosta (−1).
 */
export function resolveShout(roll: number, agent: ChaseStats = {}): ShoutResult {
  const total = roll + (agent.intimidacao ?? 0);
  const lookedBack = total >= CHASE_RULES.shoutDC;
  return { total, lookedBack, delta: lookedBack ? -1 : 0 };
}

// ---------- fim ----------

export type ChaseEnd = 'agarrou' | 'fugiu';

/**
 * Como termina com esta distância (null = continua). Não há fôlego nem custo: a perseguição
 * dura a rota travada inteira.
 */
export function chaseEnd(distance: number, routeDone: boolean): ChaseEnd | null {
  if (distance <= 0) return 'agarrou';
  if (routeDone) return 'fugiu';
  return null;
}
