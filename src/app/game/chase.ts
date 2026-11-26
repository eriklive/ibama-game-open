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
 *    abordou; se hesitar, os outros agentes no alcance do grito dele (`ArrestEscort`), do
 *    mais perto do suspeito ao mais longe, um por vez, até alguém arrancar (ou o jogador deixar fugir). Com vários fugindo, um por vez.
 * 2. **Iniciativa.** Só o agente rola: d20 + iniciativa, pelo menos `initiativeDC` (8), sem
 *    depender do garimpeiro (`initiativeCheck`). Passou: sai correndo. Falhou: hesita e o
 *    garimpeiro foge normal. O garimpeiro não rola nada novo: o teste de fuga da faixa amarela da
 *    abordagem continua como está (falhou, tropeça e se rende), e quem foge sem rolar segue assim.
 * 3. **Rota travada.** O jogo calcula a fuga dele até a saída (borda) mais próxima, sem limite
 *    de passos (`lockRoute`). Ele evita o que os agentes enxergam (`agentSight`): prefere correr
 *    por dentro das construções ou pela mata a atravessar a pista à vista. Passa só por portas
 *    que consegue usar (abertas, encostadas, trancadas e portões; bloqueada é parede). A rota
 *    vira a "pista" e não muda mais.
 * 4. **A corrida.** A perseguição sai do tabuleiro e vira o **Modo Corrida** (`runner.ts`): a
 *    distância é quanto ele está à frente. Chegou a 0: **agarra** (rende na hora e fica
 *    **abalado**, +2 no próximo interrogatório). Ele chegou ao fim: **foge**. Só há perseguição
 *    nos mapas com Modo Corrida; nos outros, quem corre só foge.
 *    - **corrida** (`resolveSprint`): o jogador pode dar um gás quantas vezes quiser. Rola
 *      teste de vigor, d20 + vigor: o total é quanto (%) o agente fica mais rápido por
 *      `sprintSeconds`. Acabou o gás, `sprintCooldownSeconds` de recarga e pode rolar outro d20.
 *      O d20 natural conta: **20** (acerto crítico) deixa o agente `sprintCritPercent` (%) mais
 *      rápido até o fim da corrida; **1** (falha crítica), `sprintFumblePercent` (%) mais lento.
 *      Acumula (`permanentPercent`).
 *      Só ele acelera; o garimpeiro segue no ritmo dele.
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
  hexDistance,
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
  /** Corrida (gás): teste de vigor, d20 + vigor; o total vira o bônus de velocidade (%). */
  sprintDie: 20,
  /** Corrida: o bônus nunca fica abaixo disto (%): dar o gás sempre ajuda um pouco. */
  sprintMin: 1,
  /** Corrida: quanto tempo (s, relógio real) a velocidade maior dura. */
  sprintSeconds: 5,
  /** Corrida: recarga (s) depois que o gás acaba, até poder rolar outro d20. */
  sprintCooldownSeconds: 3,
  /** Corrida: tirou 20 no d20 (acerto crítico), o agente fica isto (%) mais rápido até o fim da corrida (acumula). */
  sprintCritPercent: 10,
  /** Corrida: tirou 1 no d20 (falha crítica), o agente fica isto (%) mais lento até o fim da corrida (acumula). */
  sprintFumblePercent: 5,
  /** Corrida: o agente nunca fica mais lento que isto (multiplicador), por mais falhas críticas que tire. */
  minRate: 0.5,
  /** Corrida: entrada e saída suaves da velocidade (ms), antes e depois dos `sprintSeconds`. */
  sprintRampMs: 350,
  /** Agarrou: bônus nas rolagens do próximo interrogatório do suspeito abalado. */
  shakenBonus: 2,
} as const;

export type Side = 'esquerda' | 'direita';

/** Atributos de perseguição do agente (vigor: raio e gás; iniciativa: raio e arrancada). Os que faltam valem 0. */
export interface ChaseStats {
  vigor?: number;
  iniciativa?: number;
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

/** Alcance do grito de quem deu a voz de prisão (as três faixas da abordagem): só os agentes dentro dele vão de reforço. */
export interface ArrestEscort {
  /** Onde estava quem abordou. */
  from: HexCoord;
  /** Alcance total do grito dele (`ApproachZones.radius`, em hexágonos). */
  range: number;
  /** O que corta a linha de visão (parede, porta fechada); sem isto, só a distância conta. */
  walls?: ReadonlySet<string>;
}

/** O agente em `hex` está no alcance do grito de quem deu a voz de prisão. */
export const inEscort = (hex: HexCoord, e: ArrestEscort): boolean =>
  hexDistance(e.from, hex) <= e.range && (!e.walls || lineOfSight(e.from, hex, e.walls));

/**
 * Fila da voz de prisão: quem rola a iniciativa para ir atrás de um suspeito que fugiu de uma
 * abordagem, na ordem. Primeiro o agente que abordou (`leaderId`); depois os outros que estão
 * no alcance do grito dele (`escort`: até `range` hexágonos de onde ele deu a voz, com linha de
 * visão), do mais perto do suspeito ao mais longe. Quem abordou não tem limite: basta ter
 * caminho andando até o suspeito. Sem `escort`, todos entram. Quem está em `alreadyChased`
 * fica de fora.
 */
export function arrestQueue(
  target: HexCoord,
  leaderId: string,
  agents: readonly ChaseAgent[],
  area: HexArea,
  blocked: ReadonlySet<string>,
  alreadyChased: ReadonlySet<string> = new Set(),
  escort?: ArrestEscort,
): ChaseCandidate[] {
  const targetKey = hexKey(target);
  const free = new Set(blocked);
  free.delete(targetKey);
  const out: ChaseCandidate[] = [];
  for (const a of agents) {
    if (alreadyChased.has(a.id)) continue;
    if (a.id !== leaderId && escort && !inEscort(a.hex, escort)) continue;
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

export interface ChaseRoute {
  /** Fuga do garimpeiro (sem a origem), inteira até a borda. */
  flee: HexCoord[];
  /** A rota chega à borda (se ninguém pegar, ele foge). Só é falso se estiver encurralado. */
  escapes: boolean;
  /** Encurralado: não há rota até a borda. */
  cornered: boolean;
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
  if (isBorder(from, area)) return { flee: [], escapes: true, cornered: false };
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
  if (!best) return { flee: [], escapes: false, cornered: true };
  const flee = pathTo(reach, best.coord);
  return { flee, escapes: true, cornered: false };
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

// ---------- corrida ----------

export type SprintCrit = 'critico' | 'falha';

export interface SprintResult {
  /** d20 + vigor. */
  total: number;
  /** Quanto mais rápido o agente fica (%): o total, pelo menos `sprintMin`. */
  percent: number;
  /** d20 natural 20: acerto crítico; 1: falha crítica. */
  crit?: SprintCrit;
  /** Quanto a velocidade dele muda (%) até o fim da corrida: +`sprintCritPercent`, −`sprintFumblePercent` ou 0. */
  permanent: number;
}

/**
 * Corrida: teste de vigor. d20 + vigor, e o total é o bônus de velocidade em % (pelo menos
 * `sprintMin`). O d20 natural 20 é acerto crítico (+`sprintCritPercent`% até o fim da corrida);
 * o 1, falha crítica (−`sprintFumblePercent`%). O gás sai do mesmo jeito.
 */
export function resolveSprint(roll: number, agent: ChaseStats): SprintResult {
  const total = roll + (agent.vigor ?? 0);
  const percent = Math.max(CHASE_RULES.sprintMin, total);
  if (roll >= CHASE_RULES.sprintDie) return { total, percent, crit: 'critico', permanent: CHASE_RULES.sprintCritPercent };
  if (roll <= 1) return { total, percent, crit: 'falha', permanent: -CHASE_RULES.sprintFumblePercent };
  return { total, percent, permanent: 0 };
}

/**
 * Corrida: o multiplicador de velocidade do agente com o gás (`sprintRate`) e o que os críticos
 * já somaram (`permanentPercent`, em %). Nunca abaixo de `minRate`.
 */
export function agentRate(sprint: number, permanentPercent: number): number {
  return Math.max(CHASE_RULES.minRate, sprint + permanentPercent / 100);
}

/**
 * Corrida: o multiplicador de velocidade `ms` depois de começar, com `percent` de bônus. Entra
 * suave (`sprintRampMs`), segura `sprintSeconds` e sai suave; fora disso, 1.
 */
export function sprintRate(percent: number, ms: number): number {
  const ramp = CHASE_RULES.sprintRampMs;
  const end = CHASE_RULES.sprintSeconds * 1000 + 2 * ramp;
  if (percent <= 0 || ms <= 0 || ms >= end) return 1;
  return 1 + (percent / 100) * Math.min(1, ms / ramp, (end - ms) / ramp);
}

/** Corrida: quanto dura tudo (ms), com a entrada e a saída. */
export const sprintTotalMs = (): number => CHASE_RULES.sprintSeconds * 1000 + 2 * CHASE_RULES.sprintRampMs;
