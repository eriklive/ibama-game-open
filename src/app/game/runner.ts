/**
 * Modo Corrida — regras puras (testadas em `runner.spec.ts`). A perseguição sai do tabuleiro
 * tático: as peças viram e, no verso, está um **mapa de corrida** (ver `runner-maps.ts`), uma pista
 * reta de **três faixas** com obstáculos. O agente corre sozinho; o jogador só troca de faixa,
 * pula e desliza.
 *
 * - **Posição** é a fileira percorrida desde onde o agente nasceu (`p`, em fileiras do mapa de
 *   corrida; o mapa corre para o norte, então a fileira é `largada − p`). Os dois correm na mesma
 *   velocidade (`RUNNER_RULES.rowsPerSecond`); a corrida (o gás) acelera só o agente.
 * - **Obstáculos** ocupam faixas numa fileira e pedem um gesto: `pular` (tora, sacos, gaiolas,
 *   caixote baixo), `deslizar` (lona, galho, porta de enrolar, a asa do avião) ou `desviar` (carga
 *   alta, o corpo do avião, parede: só trocando de faixa). Quem passa pela fileira na faixa dele
 *   sem o gesto certo **bate**: tropeça e fica parado `stumbleSeconds`.
 * - **O agente** bate e perde distância (`hitRows`, 1 hexágono no placar).
 * - **O garimpeiro** escolhe a faixa sozinho (sai antes de carga alta) e faz o gesto certo, mas
 *   rola **d20 + agilidade** em cada obstáculo de pular ou deslizar (`enemyDC`): abaixo, tropeça
 *   e o agente ganha a mesma distância.
 * - **Distância** (no placar, em hexágonos): `(ele − agente − catchRows) / rowsPerHex`. Chegou a 0:
 *   **agarrou**. Ele chegou ao fim do mapa: **fugiu**.
 */
export const RUNNER_RULES = {
  /** Velocidade dos dois (fileiras do mapa de corrida por segundo). */
  rowsPerSecond: 4,
  /** Fileiras do mapa de corrida por hexágono do placar (o mapa é esticado ~2,5× na corrida). */
  rowsPerHex: 2,
  /** Encostou: a esta distância (fileiras) ele está agarrado. */
  catchRows: 1,
  /** Bater custa isto (fileiras); o tropeço dura o tempo de correr essa distância. */
  hitRows: 2,
  /** Pulo e deslize (s): o gesto cobre o obstáculo se estiver no ar (ou no chão) ao passar. */
  jumpSeconds: 0.7,
  slideSeconds: 0.8,
  /** Troca de faixa (s, de uma faixa para a vizinha). */
  laneSeconds: 0.16,
  /** Garimpeiro: d20 + agilidade, pelo menos isto, em cada obstáculo de pular ou deslizar. */
  enemyDC: 8,
  /** Garimpeiro: a quantas fileiras de um obstáculo ele já está na faixa certa. */
  enemyLookahead: 5,
  /** Ele some depois do fim do mapa (fileiras antes da última). */
  endMargin: 2,
} as const;

export type Lane = 0 | 1 | 2;
export type RunnerMove = 'pular' | 'deslizar' | 'desviar';

/** Um obstáculo numa faixa: na fileira `row` do mapa de corrida, pede `move`. */
export interface LaneObstacle {
  row: number;
  lane: Lane;
  move: RunnerMove;
  /** O que é (para o som e o texto): tora, avião, lona… */
  kind: string;
}

export type RunnerWho = 'agente' | 'garimpeiro';
export type RunnerAction = 'corre' | 'pula' | 'desliza' | 'tropeca';

/** Estado de um corredor (para desenhar). */
export interface RunnerPose {
  /** Fileira (contínua) do mapa de corrida. */
  row: number;
  /** Faixa contínua (0 esquerda, 1 meio, 2 direita), já com a troca em andamento. */
  lane: number;
  action: RunnerAction;
  /** De 0 a 1 dentro da ação (pulo, deslize, tropeço). */
  t: number;
}

export type RunnerEvent =
  | { type: 'faixa'; who: RunnerWho; lane: Lane }
  | { type: 'pulo' | 'deslize'; who: RunnerWho }
  | { type: 'passou'; who: RunnerWho; obstacle: LaneObstacle }
  | { type: 'bateu'; obstacle: LaneObstacle }
  | { type: 'tropecou'; obstacle: LaneObstacle; roll: number; need: number }
  | { type: 'agarrou' }
  | { type: 'fugiu' };

export type RunnerEnd = 'agarrou' | 'fugiu';

export interface RunnerSetup {
  /** Obstáculos do mapa (qualquer ordem). */
  obstacles: readonly LaneObstacle[];
  /** Fileira em que o agente nasce. */
  startRow: number;
  /** Fileira do fim do mapa (o norte; normalmente 0). */
  endRow?: number;
  /** Distância inicial em hexágonos (a do tabuleiro tático). */
  hexes: number;
  /** Faixa de cada um na largada (padrão: meio). */
  agentLane?: Lane;
  enemyLane?: Lane;
  /** Agilidade do garimpeiro. */
  agilidade?: number;
  /** O d20 dele em cada obstáculo. */
  rollEnemy: () => number;
}

interface Runner {
  p: number;
  lane: Lane;
  /** Faixa contínua (anda até `lane` em `laneSeconds` por faixa). */
  x: number;
  action: RunnerAction;
  /** Tempo restante da ação (s) e a duração dela. */
  left: number;
  span: number;
  /** Obstáculos já resolvidos (índice em `obstacles`). */
  done: Set<number>;
}

const clampLane = (n: number): Lane => Math.max(0, Math.min(2, n)) as Lane;

/** O gesto certo cobre o obstáculo? */
export function clears(move: RunnerMove, action: RunnerAction): boolean {
  if (move === 'pular') return action === 'pula';
  if (move === 'deslizar') return action === 'desliza';
  return false;
}

/** Fileiras entre os dois no placar (hexágonos, arredondado para cima, nunca negativo). */
export function shownDistance(gapRows: number): number {
  return Math.max(0, Math.ceil((gapRows - RUNNER_RULES.catchRows) / RUNNER_RULES.rowsPerHex - 1e-6));
}

/**
 * A corrida. `step(dt, agentRate)` anda o relógio e devolve o que aconteceu; `move`, `jump` e
 * `slide` são o jogador. O garimpeiro se vira sozinho.
 */
export class RunnerRace {
  readonly obstacles: readonly LaneObstacle[];
  readonly startRow: number;
  readonly endRow: number;
  private readonly agent: Runner;
  private readonly enemy: Runner;
  private readonly agilidade: number;
  private readonly rollEnemy: () => number;
  private readonly pending: RunnerEvent[] = [];
  over: RunnerEnd | null = null;

  constructor(setup: RunnerSetup) {
    this.obstacles = [...setup.obstacles].sort((a, b) => b.row - a.row);
    this.startRow = setup.startRow;
    this.endRow = setup.endRow ?? 0;
    this.agilidade = setup.agilidade ?? 0;
    this.rollEnemy = setup.rollEnemy;
    const gap = Math.max(0, setup.hexes) * RUNNER_RULES.rowsPerHex + RUNNER_RULES.catchRows;
    const mk = (p: number, lane: Lane): Runner => ({ p, lane, x: lane, action: 'corre', left: 0, span: 0, done: new Set() });
    this.agent = mk(0, setup.agentLane ?? 1);
    this.enemy = mk(gap, setup.enemyLane ?? 1);
    // o que já ficou para trás de cada um na largada não conta
    this.obstacles.forEach((o, i) => {
      if (this.rowOf(this.agent.p) <= o.row) this.agent.done.add(i);
      if (this.rowOf(this.enemy.p) <= o.row) this.enemy.done.add(i);
    });
  }

  private rowOf(p: number): number {
    return this.startRow - p;
  }

  /** Comprimento total (fileiras) até ele escapar. */
  get length(): number {
    return this.startRow - this.endRow - RUNNER_RULES.endMargin;
  }

  /** Fileiras entre os dois (ele à frente). */
  gap(): number {
    return this.enemy.p - this.agent.p;
  }

  distance(): number {
    return shownDistance(this.gap());
  }

  /** Quanto cada um já correu (fileiras desde a largada do agente). */
  progress(who: RunnerWho): number {
    return (who === 'agente' ? this.agent : this.enemy).p;
  }

  pose(who: RunnerWho): RunnerPose {
    const r = who === 'agente' ? this.agent : this.enemy;
    return { row: this.rowOf(r.p), lane: r.x, action: r.action, t: r.span ? 1 - r.left / r.span : 0 };
  }

  lane(who: RunnerWho): Lane {
    return (who === 'agente' ? this.agent : this.enemy).lane;
  }

  // ---------- o jogador ----------

  /** Troca de faixa (−1 esquerda, +1 direita). Tropeçando, não troca. */
  move(dir: -1 | 1): boolean {
    const a = this.agent;
    if (this.over || a.action === 'tropeca') return false;
    const lane = clampLane(a.lane + dir);
    if (lane === a.lane) return false;
    a.lane = lane;
    this.pending.push({ type: 'faixa', who: 'agente', lane });
    return true;
  }

  jump(): boolean {
    return this.act(this.agent, 'agente', 'pula');
  }

  slide(): boolean {
    return this.act(this.agent, 'agente', 'desliza');
  }

  private act(r: Runner, who: RunnerWho, action: 'pula' | 'desliza'): boolean {
    if (this.over || r.action === 'tropeca' || r.action === action) return false;
    r.action = action;
    r.span = r.left = action === 'pula' ? RUNNER_RULES.jumpSeconds : RUNNER_RULES.slideSeconds;
    this.pending.push({ type: action === 'pula' ? 'pulo' : 'deslize', who });
    return true;
  }

  // ---------- o relógio ----------

  /** Anda `dt` segundos. `agentRate` é a corrida (o gás) do agente. */
  step(dt: number, agentRate = 1): RunnerEvent[] {
    const out = this.pending.splice(0);
    if (this.over || dt <= 0) return out;
    this.steer(out);
    this.advance(this.agent, 'agente', dt, agentRate, out);
    if (!this.over) this.advance(this.enemy, 'garimpeiro', dt, 1, out);
    if (!this.over && this.gap() <= RUNNER_RULES.catchRows + 1e-9) {
      this.over = 'agarrou';
      out.push({ type: 'agarrou' });
    }
    if (!this.over && this.rowOf(this.enemy.p) <= this.endRow + RUNNER_RULES.endMargin) {
      this.over = 'fugiu';
      out.push({ type: 'fugiu' });
    }
    return out;
  }

  /**
   * O garimpeiro olha `enemyLookahead` fileiras à frente: se a faixa dele tem carga alta (ou
   * qualquer coisa que pede desvio), vai para a faixa livre mais perto; se o obstáculo pede pulo
   * ou deslize, faz o gesto na hora certa.
   */
  private steer(out: RunnerEvent[]): void {
    const e = this.enemy;
    if (e.action === 'tropeca') return;
    const row = this.rowOf(e.p);
    const ahead = this.obstacles.filter(
      (o, i) => !e.done.has(i) && o.row < row + 0.5 && o.row >= row - RUNNER_RULES.enemyLookahead,
    );
    const blockedAt = (lane: Lane) => ahead.some((o) => o.lane === lane && o.move === 'desviar');
    if (blockedAt(e.lane)) {
      const options = ([0, 1, 2] as Lane[])
        .filter((l) => !blockedAt(l))
        .sort((a, b) => Math.abs(a - e.lane) - Math.abs(b - e.lane) || (a === 1 ? -1 : b === 1 ? 1 : 0));
      if (options.length) {
        e.lane = options[0];
        out.push({ type: 'faixa', who: 'garimpeiro', lane: e.lane });
      }
    }
    // gesto: a menos de meio pulo do obstáculo da faixa dele
    const reach = (RUNNER_RULES.rowsPerSecond * RUNNER_RULES.jumpSeconds) / 2;
    const next = ahead.find((o) => o.lane === e.lane && o.move !== 'desviar' && row - o.row <= reach);
    if (next && e.action === 'corre') this.act(e, 'garimpeiro', next.move === 'pular' ? 'pula' : 'desliza');
    out.push(...this.pending.splice(0));
  }

  private advance(r: Runner, who: RunnerWho, dt: number, rate: number, out: RunnerEvent[]): void {
    // troca de faixa suave
    const lanesPerSecond = 1 / RUNNER_RULES.laneSeconds;
    const dx = r.lane - r.x;
    r.x = Math.abs(dx) <= lanesPerSecond * dt ? r.lane : r.x + Math.sign(dx) * lanesPerSecond * dt;
    let left = dt;
    if (r.action === 'tropeca') {
      const used = Math.min(left, r.left);
      r.left -= used;
      left -= used;
      if (r.left <= 1e-9) r.action = 'corre';
      if (left <= 0) return;
    }
    const from = r.p;
    // o gesto vale o que ele fazia neste quadro (o pulo pode acabar no meio dele)
    const acting = r.action;
    r.p += left * RUNNER_RULES.rowsPerSecond * rate;
    if (r.action === 'pula' || r.action === 'desliza') {
      r.left -= left;
      if (r.left <= 1e-9) {
        r.action = 'corre';
        r.left = r.span = 0;
      }
    }
    // a fileira do obstáculo ficou para trás neste quadro: resolve
    const rowFrom = this.rowOf(from);
    const rowTo = this.rowOf(r.p);
    this.obstacles.forEach((o, i) => {
      if (r.done.has(i) || o.row > rowFrom || o.row <= rowTo) return;
      r.done.add(i);
      const lane = Math.round(r.x) as Lane;
      if (o.lane !== lane) return;
      if (who === 'agente') {
        if (clears(o.move, acting)) out.push({ type: 'passou', who, obstacle: o });
        else this.stumble(r, o, out);
        return;
      }
      // ele: carga alta já desviou (se deu); pulo e deslize rolam
      // (sem faixa livre: bate como o agente)
      if (o.move === 'desviar') return this.stumbleEnemy(r, o, out, 0, 0);
      const roll = this.rollEnemy();
      if (roll + this.agilidade >= RUNNER_RULES.enemyDC) out.push({ type: 'passou', who, obstacle: o });
      else this.stumbleEnemy(r, o, out, roll, RUNNER_RULES.enemyDC - this.agilidade);
    });
  }

  private stumble(r: Runner, o: LaneObstacle, out: RunnerEvent[]): void {
    r.action = 'tropeca';
    r.span = r.left = RUNNER_RULES.hitRows / RUNNER_RULES.rowsPerSecond;
    out.push({ type: 'bateu', obstacle: o });
  }

  private stumbleEnemy(r: Runner, o: LaneObstacle, out: RunnerEvent[], roll: number, need: number): void {
    r.action = 'tropeca';
    r.span = r.left = RUNNER_RULES.hitRows / RUNNER_RULES.rowsPerSecond;
    out.push({ type: 'tropecou', obstacle: o, roll, need });
  }
}

// ---------------------------------------------------------------------------
// Volta ao tabuleiro tático
// ---------------------------------------------------------------------------

/**
 * Índice na pista tática (`[agente, ...caminho até ele, ...fuga]`, com `n` passos até ele e
 * `total` passos ao todo) de quem correu `p` fileiras na corrida. Até onde ele nasceu (`gap0`),
 * o caminho do agente; dali ao fim da corrida (`length`), a rota de fuga.
 */
export function tacticalIndex(p: number, gap0: number, length: number, n: number, total: number): number {
  if (total <= 0) return 0;
  let idx: number;
  if (p <= gap0) idx = gap0 > 0 ? (p / gap0) * n : n;
  else idx = n + ((p - gap0) / Math.max(1e-6, length - gap0)) * (total - n);
  return Math.max(0, Math.min(total, Math.round(idx)));
}
