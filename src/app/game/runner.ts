/**
 * Modo Corrida — regras puras (testadas em `runner.spec.ts`). A perseguição sai do tabuleiro
 * tático: as peças viram e, no verso, está um **mapa de corrida** (ver `runner-maps.ts`): um
 * caminho com obstáculos e **esquinas** (`runner-path.ts`), como no Temple Run. Os dois correm
 * sempre **no meio da pista** (não há troca de faixa); o jogador só pula, desliza e vira nas
 * curvas.
 *
 * - **Posição** é a distância percorrida no caminho (`at`, em fileiras desde o começo dele). Os
 *   dois correm na mesma velocidade (`RUNNER_RULES.rowsPerSecond`); a corrida (o gás) acelera só
 *   o agente.
 * - **Obstáculos** ficam num ponto do caminho, no meio da pista, e pedem um gesto: `pular` (tora,
 *   sacos, gaiolas, caixote baixo) ou `deslizar` (lona, galho, a asa do avião). Quem passa sem o
 *   gesto certo **bate**: tropeça e perde `hitRows`.
 * - **Curvas**: ← e → só **viram** (fora da janela de uma curva não fazem nada). A `turnWindow`
 *   fileiras da esquina, virou para o lado certo: segue. Para o lado errado, ou não virou até
 *   `turnGrace` depois da esquina: **bate na curva** (`curveRows`, mais caro que um obstáculo) e o
 *   caminho segue assim mesmo.
 * - **O garimpeiro** vira sempre e faz o gesto certo, mas rola **d20 + agilidade** em cada
 *   obstáculo (`enemyDC`): abaixo, tropeça e o agente ganha a mesma distância.
 * - **Distância** (no placar, em hexágonos): `(ele − agente − catchRows) / rowsPerHex`. Chegou a 0:
 *   **agarrou**. Ele chegou ao fim do caminho: **fugiu**.
 */
import type { PathTurn, Side } from './runner-path';

export const RUNNER_RULES = {
  /** Velocidade dos dois (fileiras do caminho por segundo). */
  rowsPerSecond: 8.25,
  /** Fileiras do caminho por hexágono do placar (o mapa é esticado ~2,5× na corrida). */
  rowsPerHex: 2,
  /** Encostou: a esta distância (fileiras) ele está agarrado. */
  catchRows: 1,
  /** Bater num obstáculo custa isto (fileiras); o tropeço dura o tempo de correr essa distância. */
  hitRows: 2,
  /** Bater na curva custa isto (fileiras): 2 hexágonos. */
  curveRows: 4,
  /** Pulo e deslize (s): o gesto cobre o obstáculo se estiver no ar (ou no chão) ao passar. */
  jumpSeconds: 0.6,
  slideSeconds: 0.7,
  /** Curva: a quantas fileiras da esquina ← e → passam a virar (~0,85 s de corrida). */
  turnWindow: 7,
  /** Curva: até quantas fileiras depois da esquina ainda dá para virar. */
  turnGrace: 0.9,
  /** Garimpeiro: d20 + agilidade, pelo menos isto, em cada obstáculo de pular ou deslizar. */
  enemyDC: 8,
  /** Ele some antes do fim do caminho (fileiras). */
  endMargin: 2,
} as const;

export type RunnerMove = 'pular' | 'deslizar';

/** Um obstáculo no meio da pista, a `at` fileiras do começo do caminho; pede `move`. */
export interface TrackObstacle {
  at: number;
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
  action: RunnerAction;
  /** De 0 a 1 dentro da ação (pulo, deslize, tropeço). */
  t: number;
  /** Tropeçando: num obstáculo ou na parede de uma curva (para escolher a animação). */
  fall?: RunnerFall;
}

export type RunnerFall = 'obstaculo' | 'curva';

export type RunnerEvent =
  | { type: 'pulo' | 'deslize'; who: RunnerWho }
  | { type: 'passou'; who: RunnerWho; obstacle: TrackObstacle }
  | { type: 'bateu'; obstacle: TrackObstacle }
  | { type: 'tropecou'; obstacle: TrackObstacle; roll: number; need: number }
  | { type: 'curva-perto'; side: Side }
  | { type: 'virou'; side: Side }
  | { type: 'bateu-curva'; side: Side; wrong: boolean }
  | { type: 'agarrou' }
  | { type: 'fugiu' };

export type RunnerEnd = 'agarrou' | 'fugiu';

export interface RunnerSetup {
  /** Obstáculos do caminho (qualquer ordem). */
  obstacles: readonly TrackObstacle[];
  /** Esquinas do caminho (ver `pathTurns`). */
  turns?: readonly Pick<PathTurn, 'at' | 'side'>[];
  /** Onde o agente nasce (fileiras desde o começo do caminho). */
  startAt: number;
  /** Comprimento do caminho (fileiras). */
  length: number;
  /** Distância inicial em hexágonos (a do tabuleiro tático). */
  hexes: number;
  /** Agilidade do garimpeiro. */
  agilidade?: number;
  /** O d20 dele em cada obstáculo. */
  rollEnemy: () => number;
}

interface Runner {
  at: number;
  action: RunnerAction;
  /** Tempo restante da ação (s) e a duração dela. */
  left: number;
  span: number;
  /** Por que tropeçou (só vale com `action === 'tropeca'`). */
  fall?: RunnerFall;
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

/** O gesto certo cobre o obstáculo? */
export function clears(move: RunnerMove, action: RunnerAction): boolean {
  return move === 'pular' ? action === 'pula' : action === 'desliza';
}

/** Fileiras entre os dois no placar (hexágonos, arredondado para cima, nunca negativo). */
export function shownDistance(gapRows: number): number {
  return Math.max(0, Math.ceil((gapRows - RUNNER_RULES.catchRows) / RUNNER_RULES.rowsPerHex - 1e-6));
}

/**
 * A corrida. `step(dt, agentRate)` anda o relógio e devolve o que aconteceu; `turn`, `jump` e
 * `slide` são o jogador. O garimpeiro se vira sozinho.
 */
export class RunnerRace {
  readonly obstacles: readonly TrackObstacle[];
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
    const mk = (at: number): Runner => ({ at, action: 'corre', left: 0, span: 0, done: new Set() });
    this.agent = mk(setup.startAt);
    this.enemy = mk(Math.min(setup.startAt + gap, this.end - 0.5));
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
    const t = r.span ? 1 - r.left / r.span : 0;
    return r.action === 'tropeca' ? { at: r.at, action: r.action, t, fall: r.fall } : { at: r.at, action: r.action, t };
  }

  /**
   * A esquina que o agente ainda não pegou (não virou para o lado certo, nem bateu nela): até
   * ela, ele corre **reto**, sem virar sozinho. `-1`: nenhuma.
   */
  heldTurn(): number {
    return this.turns.findIndex((t, i) => !this.turnState[i].done && this.turnState[i].chose !== t.side);
  }

  /** A próxima curva do agente, se ele está na janela dela. */
  private turnWindow(): number {
    const at = this.agent.at;
    return this.turns.findIndex(
      (t, i) => !this.turnState[i].done && at >= t.at - RUNNER_RULES.turnWindow && at <= t.at + RUNNER_RULES.turnGrace,
    );
  }

  // ---------- o jogador ----------

  /**
   * Vira (−1 esquerda, +1 direita). Só vale na janela de uma curva, uma vez por curva; longe dela
   * (ou tropeçando) não faz nada: ninguém troca de faixa.
   */
  turn(dir: -1 | 1): boolean {
    if (this.over || this.agent.action === 'tropeca') return false;
    const w = this.turnWindow();
    if (w < 0) return false;
    const st = this.turnState[w];
    if (st.chose) return false;
    st.chose = dir < 0 ? 'esquerda' : 'direita';
    if (st.chose === this.turns[w].side) this.pending.push({ type: 'virou', side: st.chose });
    return true;
  }

  jump(): boolean {
    return this.act(this.agent, 'agente', 'pula');
  }

  /** O agente tropeça sozinho (o tropeço do gás) e perde `seconds` caído. Já tropeçando, não soma. */
  trip(seconds: number): boolean {
    if (this.over || seconds <= 0 || this.agent.action === 'tropeca') return false;
    this.stumble(this.agent, seconds * RUNNER_RULES.rowsPerSecond, 'obstaculo');
    return true;
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
        this.stumble(this.agent, RUNNER_RULES.curveRows, 'curva');
        out.push({ type: 'bateu-curva', side: t.side, wrong });
      }
    });
  }

  /** O garimpeiro faz o gesto do próximo obstáculo a menos de meio pulo dele. */
  private steer(out: RunnerEvent[]): void {
    const e = this.enemy;
    if (e.action !== 'corre') return;
    const reach = (RUNNER_RULES.rowsPerSecond * RUNNER_RULES.jumpSeconds) / 2;
    const next = this.obstacles.find((o, i) => !e.done.has(i) && o.at > e.at && o.at - e.at <= reach);
    if (next) this.act(e, 'garimpeiro', next.move === 'pular' ? 'pula' : 'desliza');
    out.push(...this.pending.splice(0));
  }

  private advance(r: Runner, who: RunnerWho, dt: number, rate: number, out: RunnerEvent[]): void {
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
      if (who === 'agente') {
        if (clears(o.move, acting)) out.push({ type: 'passou', who, obstacle: o });
        else {
          this.stumble(r, RUNNER_RULES.hitRows, 'obstaculo');
          out.push({ type: 'bateu', obstacle: o });
        }
        return;
      }
      // ele: o gesto sai sempre, mas rola para não tropeçar
      const roll = this.rollEnemy();
      if (roll + this.agilidade >= RUNNER_RULES.enemyDC) out.push({ type: 'passou', who, obstacle: o });
      else {
        this.stumble(r, RUNNER_RULES.hitRows, 'obstaculo');
        out.push({ type: 'tropecou', obstacle: o, roll, need: RUNNER_RULES.enemyDC - this.agilidade });
      }
    });
  }

  private stumble(r: Runner, rows: number, fall: RunnerFall): void {
    r.action = 'tropeca';
    r.fall = fall;
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
