/**
 * Modo Corrida — regras puras (testadas em `runner.spec.ts`). A perseguição sai do tabuleiro
 * tático: as peças viram e, no verso, está um **mapa de corrida** (ver `runner-maps.ts`): um
 * caminho de **três faixas** com obstáculos e **esquinas** (`runner-path.ts`). O agente corre
 * sozinho; o jogador só troca de faixa, pula, desliza e vira nas curvas.
 *
 * - **Posição** é a distância percorrida no caminho (`at`, em fileiras desde o começo dele). Os
 *   dois correm na mesma velocidade (`RUNNER_RULES.rowsPerSecond`); a corrida (o gás) acelera só
 *   o agente.
 * - **Obstáculos** ocupam uma faixa num ponto do caminho e pedem um gesto: `pular` (tora, sacos,
 *   gaiolas, caixote baixo), `deslizar` (lona, galho, a asa do avião) ou `desviar` (carga alta,
 *   parede: só trocando de faixa). Quem passa sem o gesto certo **bate**: tropeça e fica parado
 *   `stumbleSeconds`.
 * - **Curvas**: a `turnWindow` fileiras da esquina, ← ou → **vira** (não troca de faixa). Virou
 *   para o lado certo: segue. Para o lado errado, ou não virou até `turnGrace` depois da esquina:
 *   **bate na curva** (`curveRows`, mais caro que um obstáculo) e o caminho segue assim mesmo.
 * - **O garimpeiro** vira sempre, escolhe a faixa sozinho (sai antes de carga alta) e faz o gesto
 *   certo, mas rola **d20 + agilidade** em cada obstáculo de pular ou deslizar (`enemyDC`): abaixo,
 *   tropeça e o agente ganha a mesma distância.
 * - **Distância** (no placar, em hexágonos): `(ele − agente − catchRows) / rowsPerHex`. Chegou a 0:
 *   **agarrou**. Ele chegou ao fim do caminho: **fugiu**.
 */
import type { PathTurn, Side } from './runner-path';

export const RUNNER_RULES = {
  /** Velocidade dos dois (fileiras do caminho por segundo). */
  rowsPerSecond: 4,
  /** Fileiras do caminho por hexágono do placar (o mapa é esticado ~2,5× na corrida). */
  rowsPerHex: 2,
  /** Encostou: a esta distância (fileiras) ele está agarrado. */
  catchRows: 1,
  /** Bater num obstáculo custa isto (fileiras); o tropeço dura o tempo de correr essa distância. */
  hitRows: 2,
  /** Bater na curva custa isto (fileiras): 2 hexágonos. */
  curveRows: 4,
  /** Pulo e deslize (s): o gesto cobre o obstáculo se estiver no ar (ou no chão) ao passar. */
  jumpSeconds: 0.7,
  slideSeconds: 0.8,
  /** Troca de faixa (s, de uma faixa para a vizinha). */
  laneSeconds: 0.16,
  /** Curva: a quantas fileiras da esquina ← e → passam a virar (1 s de corrida). */
  turnWindow: 4,
  /** Curva: até quantas fileiras depois da esquina ainda dá para virar. */
  turnGrace: 0.6,
  /** Garimpeiro: d20 + agilidade, pelo menos isto, em cada obstáculo de pular ou deslizar. */
  enemyDC: 8,
  /** Garimpeiro: a quantas fileiras de um obstáculo ele já está na faixa certa. */
  enemyLookahead: 5,
  /** Ele some antes do fim do caminho (fileiras). */
  endMargin: 2,
} as const;

export type Lane = 0 | 1 | 2;
export type RunnerMove = 'pular' | 'deslizar' | 'desviar';

/** Um obstáculo numa faixa, a `at` fileiras do começo do caminho; pede `move`. */
export interface LaneObstacle {
  at: number;
  lane: Lane;
  move: RunnerMove;
  /** O que é (para o som e o texto): tora, avião, lona… */
  kind: string;
}

export type RunnerWho = 'agente' | 'garimpeiro';
export type RunnerAction = 'corre' | 'pula' | 'desliza' | 'tropeca';

/** Estado de um corredor (para desenhar). */
export interface RunnerPose {
  /** Fileiras desde o começo do caminho. */
  at: number;
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
  | { type: 'curva-perto'; side: Side }
  | { type: 'virou'; side: Side }
  | { type: 'bateu-curva'; side: Side; wrong: boolean }
  | { type: 'agarrou' }
  | { type: 'fugiu' };

export type RunnerEnd = 'agarrou' | 'fugiu';

export interface RunnerSetup {
  /** Obstáculos do caminho (qualquer ordem). */
  obstacles: readonly LaneObstacle[];
  /** Esquinas do caminho (ver `pathTurns`). */
  turns?: readonly Pick<PathTurn, 'at' | 'side'>[];
  /** Onde o agente nasce (fileiras desde o começo do caminho). */
  startAt: number;
  /** Comprimento do caminho (fileiras). */
  length: number;
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
  at: number;
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

/** Curva do agente: o que ele fez na janela dela. */
interface TurnState {
  warned: boolean;
  /** Lado escolhido (nada: ainda não virou). */
  chose?: Side;
  done: boolean;
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
 * `slide` são o jogador (perto de uma esquina, `move` vira). O garimpeiro se vira sozinho.
 */
export class RunnerRace {
  readonly obstacles: readonly LaneObstacle[];
  readonly turns: readonly Pick<PathTurn, 'at' | 'side'>[];
  readonly length: number;
  private readonly agent: Runner;
  private readonly enemy: Runner;
  private readonly turnState: TurnState[];
  private readonly agilidade: number;
  private readonly rollEnemy: () => number;
  private readonly pending: RunnerEvent[] = [];
  readonly startAt: number;
  over: RunnerEnd | null = null;

  constructor(setup: RunnerSetup) {
    this.obstacles = [...setup.obstacles].sort((a, b) => a.at - b.at);
    this.turns = [...(setup.turns ?? [])].sort((a, b) => a.at - b.at);
    this.turnState = this.turns.map((t) => ({ warned: false, done: t.at <= setup.startAt }));
    this.length = setup.length;
    this.startAt = setup.startAt;
    this.agilidade = setup.agilidade ?? 0;
    this.rollEnemy = setup.rollEnemy;
    const gap = Math.max(0, setup.hexes) * RUNNER_RULES.rowsPerHex + RUNNER_RULES.catchRows;
    const mk = (at: number, lane: Lane): Runner => ({ at, lane, x: lane, action: 'corre', left: 0, span: 0, done: new Set() });
    this.agent = mk(setup.startAt, setup.agentLane ?? 1);
    this.enemy = mk(Math.min(setup.startAt + gap, this.end - 0.5), setup.enemyLane ?? 1);
    // o que já ficou para trás de cada um na largada não conta
    this.obstacles.forEach((o, i) => {
      if (o.at <= this.agent.at) this.agent.done.add(i);
      if (o.at <= this.enemy.at) this.enemy.done.add(i);
    });
  }

  /** Onde ele escapa (fileiras). */
  get end(): number {
    return this.length - RUNNER_RULES.endMargin;
  }

  /** Fileiras entre os dois (ele à frente). */
  gap(): number {
    return this.enemy.at - this.agent.at;
  }

  distance(): number {
    return shownDistance(this.gap());
  }

  /** Quanto cada um já correu desde a largada do agente (fileiras). */
  progress(who: RunnerWho): number {
    return (who === 'agente' ? this.agent : this.enemy).at - this.startAt;
  }

  /** O trecho que ainda falta da largada do agente até o fim (fileiras). */
  get span(): number {
    return this.end - this.startAt;
  }

  pose(who: RunnerWho): RunnerPose {
    const r = who === 'agente' ? this.agent : this.enemy;
    return { at: r.at, lane: r.x, action: r.action, t: r.span ? 1 - r.left / r.span : 0 };
  }

  lane(who: RunnerWho): Lane {
    return (who === 'agente' ? this.agent : this.enemy).lane;
  }

  /** A próxima curva do agente, se ele está na janela dela. */
  private turnWindow(): number {
    const at = this.agent.at;
    return this.turns.findIndex(
      (t, i) => !this.turnState[i].done && at >= t.at - RUNNER_RULES.turnWindow && at <= t.at + RUNNER_RULES.turnGrace,
    );
  }

  // ---------- o jogador ----------

  /** Troca de faixa (−1 esquerda, +1 direita); perto de uma esquina, vira. Tropeçando, nada. */
  move(dir: -1 | 1): boolean {
    const a = this.agent;
    if (this.over || a.action === 'tropeca') return false;
    const w = this.turnWindow();
    if (w >= 0) {
      const st = this.turnState[w];
      if (st.chose) return false;
      st.chose = dir < 0 ? 'esquerda' : 'direita';
      if (st.chose === this.turns[w].side) this.pending.push({ type: 'virou', side: st.chose });
      return true;
    }
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
    this.curves(out);
    if (!this.over) this.advance(this.enemy, 'garimpeiro', dt, 1, out);
    if (!this.over && this.gap() <= RUNNER_RULES.catchRows + 1e-9) {
      this.over = 'agarrou';
      out.push({ type: 'agarrou' });
    }
    if (!this.over && this.enemy.at >= this.end) {
      this.over = 'fugiu';
      out.push({ type: 'fugiu' });
    }
    return out;
  }

  /** As curvas do agente: aviso ao entrar na janela; bate se passou sem virar (ou virou errado). */
  private curves(out: RunnerEvent[]): void {
    const at = this.agent.at;
    this.turns.forEach((t, i) => {
      const st = this.turnState[i];
      if (st.done) return;
      if (!st.warned && at >= t.at - RUNNER_RULES.turnWindow) {
        st.warned = true;
        out.push({ type: 'curva-perto', side: t.side });
      }
      const wrong = st.chose !== undefined && st.chose !== t.side;
      const late = st.chose === undefined && at > t.at + RUNNER_RULES.turnGrace;
      const passed = st.chose === t.side && at >= t.at;
      if (passed) st.done = true;
      else if ((wrong && at >= t.at) || late) {
        st.done = true;
        this.stumble(this.agent, RUNNER_RULES.curveRows);
        out.push({ type: 'bateu-curva', side: t.side, wrong });
      }
    });
  }

  /**
   * O garimpeiro olha `enemyLookahead` fileiras à frente: se a faixa dele tem carga alta (ou
   * qualquer coisa que pede desvio), vai para a faixa livre mais perto; se o obstáculo pede pulo
   * ou deslize, faz o gesto na hora certa.
   */
  private steer(out: RunnerEvent[]): void {
    const e = this.enemy;
    if (e.action === 'tropeca') return;
    const ahead = this.obstacles.filter(
      (o, i) => !e.done.has(i) && o.at > e.at - 0.5 && o.at <= e.at + RUNNER_RULES.enemyLookahead,
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
    const next = ahead.find((o) => o.lane === e.lane && o.move !== 'desviar' && o.at - e.at <= reach);
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
    const from = r.at;
    // o gesto vale o que ele fazia neste quadro (o pulo pode acabar no meio dele)
    const acting = r.action;
    r.at += left * RUNNER_RULES.rowsPerSecond * rate;
    if (r.action === 'pula' || r.action === 'desliza') {
      r.left -= left;
      if (r.left <= 1e-9) {
        r.action = 'corre';
        r.left = r.span = 0;
      }
    }
    // o obstáculo ficou para trás neste quadro: resolve
    this.obstacles.forEach((o, i) => {
      if (r.done.has(i) || o.at <= from || o.at > r.at) return;
      r.done.add(i);
      const lane = Math.round(r.x) as Lane;
      if (o.lane !== lane) return;
      if (who === 'agente') {
        if (clears(o.move, acting)) out.push({ type: 'passou', who, obstacle: o });
        else {
          this.stumble(r, RUNNER_RULES.hitRows);
          out.push({ type: 'bateu', obstacle: o });
        }
        return;
      }
      // ele: carga alta já desviou (se deu; sem faixa livre, bate como o agente); pulo e deslize rolam
      if (o.move === 'desviar') {
        this.stumble(r, RUNNER_RULES.hitRows);
        out.push({ type: 'tropecou', obstacle: o, roll: 0, need: 0 });
        return;
      }
      const roll = this.rollEnemy();
      if (roll + this.agilidade >= RUNNER_RULES.enemyDC) out.push({ type: 'passou', who, obstacle: o });
      else {
        this.stumble(r, RUNNER_RULES.hitRows);
        out.push({ type: 'tropecou', obstacle: o, roll, need: RUNNER_RULES.enemyDC - this.agilidade });
      }
    });
  }

  private stumble(r: Runner, rows: number): void {
    r.action = 'tropeca';
    r.span = r.left = rows / RUNNER_RULES.rowsPerSecond;
  }
}

// ---------------------------------------------------------------------------
// Volta ao tabuleiro tático
// ---------------------------------------------------------------------------

/**
 * Índice na pista tática (`[agente, ...caminho até ele, ...fuga]`, com `n` passos até ele e
 * `total` passos ao todo) de quem correu `p` fileiras desde a largada do agente. Até onde ele
 * nasceu (`gap0`), o caminho do agente; dali ao fim da corrida (`length`), a rota de fuga.
 */
export function tacticalIndex(p: number, gap0: number, length: number, n: number, total: number): number {
  if (total <= 0) return 0;
  let idx: number;
  if (p <= gap0) idx = gap0 > 0 ? (p / gap0) * n : n;
  else idx = n + ((p - gap0) / Math.max(1e-6, length - gap0)) * (total - n);
  return Math.max(0, Math.min(total, Math.round(idx)));
}
