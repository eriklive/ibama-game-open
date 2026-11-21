/**
 * A corrida da perseguição em **tempo e distância** (regras puras, testadas em
 * `chase-race.spec.ts`). Cada um corre no seu próprio relógio e **ninguém para**: o dado ou a
 * escolha de um nunca segura o outro. O único que para é o garimpeiro, na porta.
 *
 * - Os dois correm pela mesma **pista** (`track`: do agente até ele e, dali, a rota de fuga
 *   travada), na velocidade padrão (`CHASE_RULES.hexSeconds` por hexágono).
 * - **Caixote** que a pista contorna: a volta leva sempre `aroundSeconds` (x). Ele sempre dá a
 *   volta. O agente decide **antes** de chegar: a `vaultLeadSeconds` de corrida do caixote sai o aviso
 *   (`caixote-perto`) e quem chama abre o slow-mo e a escolha (`decide`). Pular e passar no teste:
 *   x/2. Pular e falhar: x (pula, mas mal). Dar a volta, ou não decidir: x.
 * - **Porta** fechada na rota dele: ele emenda a corrida na animação de arrombar
 *   (`doorBreakSeconds`), com o d20 já rolado (`porta-tenta`; quem chama abre o slow-mo). Passou: a
 *   porta fica arrombada e ele sai correndo. Falhou: ele se rende ali (`rendeu`).
 * - O slow-mo não é daqui: quem chama `step` multiplica o `dt` pela velocidade do tempo, e o
 *   tempo é o mesmo para os dois.
 * - **Distância**: quanto da pista ele está à frente do agente, menos o hexágono de encostar.
 *   Chegou a 0: agarrou. Ele chegou ao fim da pista: fugiu.
 */
import { CHASE_RULES, ChaseStop, VaultSpot, fleeDoorNeed } from './chase';
import { HexCoord } from './hex';

export type RaceWho = 'agente' | 'garimpeiro';

/** O que o corredor está fazendo no trecho. */
export type LegKind = 'corre' | 'volta' | 'pulo' | 'porta';

/** Um trecho de um corredor: um caminho (com a origem) percorrido em `seconds`, por igual. */
export interface Leg {
  kind: LegKind;
  /** Hexágonos do trecho, com a origem; na porta, um só (onde ele arromba). */
  path: HexCoord[];
  /** Onde o trecho começa e acaba na pista (índices de `track`; o pulo corta caminho). */
  from: number;
  to: number;
  seconds: number;
  /** Porta que ele arromba (`porta`) e o d20 dele. */
  stop?: ChaseStop;
  roll?: number;
  /** Caixote do trecho (`volta`, `pulo`). */
  spot?: VaultSpot;
  /** Pulo em que o teste falhou: pula, mas leva o tempo da volta. */
  failed?: boolean;
}

/** Onde o corredor está no trecho: entre `a` e `b` (fração `frac`), `t` de 0 a 1 do trecho. */
export interface RacePose {
  leg: Leg;
  a: HexCoord;
  b: HexCoord;
  frac: number;
  t: number;
}

export type RaceEvent =
  | { type: 'trecho'; who: RaceWho; leg: Leg }
  | { type: 'passo'; who: RaceWho; hex: HexCoord }
  | { type: 'caixote-perto'; spot: VaultSpot }
  | { type: 'porta-tenta'; stop: ChaseStop; roll: number; need: number }
  | { type: 'porta-abre'; stop: ChaseStop }
  | { type: 'rendeu'; stop: ChaseStop }
  | { type: 'agarrou' }
  | { type: 'fugiu' };

export type RaceEnd = 'agarrou' | 'rendeu' | 'fugiu';

export interface RaceSetup {
  /** A pista: do agente (índice 0) até ele (`n`) e a rota de fuga até o fim. */
  track: readonly HexCoord[];
  /** Onde ele começa na pista (o caminho do agente até ele tem `n` passos). */
  n: number;
  /** Portas fechadas da rota (índices de `[origem dele, ...fuga]`, ver `routeStops`). */
  doors?: readonly ChaseStop[];
  /** Caixotes que a pista contorna (ver `agentVaults`). */
  vaults?: readonly VaultSpot[];
  /** O d20 dele na porta. */
  rollDoor: () => number;
  /** O que ele precisa tirar nesta porta agora (alguém pode tê-la aberto); padrão: `fleeDoorNeed`. */
  doorNeed?: (stop: ChaseStop) => number;
  /** Segundos por hexágono na velocidade padrão. */
  hexSeconds?: number;
  /** Encurralado (sem rota até a borda): ele fica parado e o agente vai até ele. */
  cornered?: boolean;
}

class Runner {
  leg: Leg | null = null;
  /** Segundos já corridos no trecho. */
  t = 0;
  /** Último hexágono do trecho já avisado (`passo`). */
  told = 0;
  constructor(public pos: number) {}

  get frac(): number {
    return this.leg ? Math.min(1, this.leg.seconds > 0 ? this.t / this.leg.seconds : 1) : 0;
  }

  /** Posição na pista agora (o pulo e a volta andam por igual de `from` a `to`). */
  trackPos(): number {
    const l = this.leg;
    return l ? l.from + (l.to - l.from) * this.frac : this.pos;
  }

  pose(): RacePose | null {
    const l = this.leg;
    if (!l) return null;
    const t = this.frac;
    const s = t * (l.path.length - 1);
    const i = Math.min(Math.floor(s), l.path.length - 1);
    return { leg: l, a: l.path[i], b: l.path[Math.min(i + 1, l.path.length - 1)], frac: s - i, t };
  }
}

interface AgentVault {
  spot: VaultSpot;
  /** O aviso (`caixote-perto`) já saiu. */
  warned: boolean;
  /** A escolha: pular (e se o teste passou); sem ela, dá a volta. */
  jump?: { pass: boolean };
}

export class ChaseRace {
  readonly hexSeconds: number;
  private readonly track: readonly HexCoord[];
  private readonly n: number;
  private readonly end: number;
  private readonly agent: Runner;
  private readonly enemy: Runner;
  /** Portas: onde ele arromba (índice da pista). */
  private readonly doors: { stop: ChaseStop; at: number; open: boolean }[];
  private readonly agentVaults: AgentVault[];
  /** Caixotes que ele contorna. */
  private readonly enemyVaults: VaultSpot[];
  over: RaceEnd | null = null;

  constructor(private readonly setup: RaceSetup) {
    this.hexSeconds = setup.hexSeconds ?? CHASE_RULES.hexSeconds;
    this.track = setup.track;
    this.n = setup.n;
    this.end = setup.track.length - 1;
    this.agent = new Runner(0);
    this.enemy = new Runner(setup.n);
    this.doors = (setup.doors ?? []).map((stop) => ({ stop, at: setup.n + stop.index - 1, open: false }));
    const vaults = [...(setup.vaults ?? [])].filter((v) => v.land <= this.end).sort((a, b) => a.index - b.index);
    this.agentVaults = vaults.map((spot) => ({ spot, warned: false }));
    // ele contorna os caixotes da rota dele, menos onde a volta passaria por uma porta
    this.enemyVaults = vaults.filter(
      (v) => v.index >= setup.n && !this.doors.some((d) => d.at >= v.index && d.at < v.land),
    );
  }

  /** Distância (hexágonos): quanto ele está à frente, menos o hexágono de encostar. */
  distance(): number {
    const d = this.enemy.trackPos() - this.agent.trackPos() - 1;
    // no ar o agente não encosta em ninguém: nunca mostra 0 antes de pousar
    return this.airborne() ? Math.max(d, 1e-3) : d;
  }

  /**
   * O agente está no meio de um pulo. O pulo corta caminho e a posição dele na pista (`trackPos`)
   * anda por igual de `from` a `to`, mas o corpo faz outro desenho (até o caixote, por cima e de
   * volta): no ar a pista diz que ele está mais adiante do que ele está de fato. Por isso só se
   * agarra quando ele pousa (aí `trackPos` e o corpo coincidem).
   */
  private airborne(): boolean {
    const l = this.agent.leg;
    return l?.kind === 'pulo' && this.agent.frac < 1;
  }

  /** Encostou: a distância chegou a 0 e o agente não está no ar. */
  private caught(): boolean {
    return !this.airborne() && this.distance() <= 0;
  }

  /** Quanto da rota dele já foi (hexágonos) e o total. */
  progress(): { step: number; total: number } {
    return { step: Math.max(0, this.enemy.trackPos() - this.n), total: this.end - this.n };
  }

  pose(who: RaceWho): RacePose | null {
    return (who === 'agente' ? this.agent : this.enemy).pose();
  }

  /** Começa a corrida: os primeiros trechos (e o agarrão na largada, se já está colado). */
  start(): RaceEvent[] {
    const ev: RaceEvent[] = [];
    if (this.caught()) return this.finish('agarrou', ev);
    this.nextLeg('garimpeiro', ev);
    this.nextLeg('agente', ev);
    this.warnVaults(ev);
    return ev;
  }

  /**
   * Avança o relógio `dt` segundos (já com o slow-mo, igual para os dois). `agentRate` é a
   * corrida do agente (1 = normal): só ele fica mais rápido.
   */
  step(dt: number, agentRate = 1): RaceEvent[] {
    const ev: RaceEvent[] = [];
    if (this.over || dt <= 0) return ev;
    this.advance('garimpeiro', dt, ev);
    if (!this.over) this.advance('agente', dt * agentRate, ev);
    if (!this.over && this.caught()) this.finish('agarrou', ev);
    if (!this.over) this.warnVaults(ev);
    return ev;
  }

  /**
   * A escolha no caixote `spot`, antes de o agente chegar nele: pular (`pass`: o teste passou)
   * ou dar a volta. Sem escolha, ele dá a volta. Depois que ele chegou no caixote, não muda mais.
   */
  decide(spot: VaultSpot, jump: boolean, pass = true): void {
    const v = this.agentVaults.find((x) => x.spot === spot);
    if (v) v.jump = jump ? { pass } : undefined;
  }

  /** O agente chegou a `vaultLeadSeconds` de um caixote: o aviso para decidir (uma vez por caixote). */
  private warnVaults(ev: RaceEvent[]): void {
    const at = this.agent.trackPos();
    for (const v of this.agentVaults) {
      if (v.warned || at < v.spot.index - CHASE_RULES.vaultLeadSeconds / this.hexSeconds) continue;
      v.warned = true;
      ev.push({ type: 'caixote-perto', spot: v.spot });
    }
  }

  private runner(who: RaceWho): Runner {
    return who === 'agente' ? this.agent : this.enemy;
  }

  private around(v: VaultSpot): Leg {
    const path = this.track.slice(v.index, v.land + 1);
    return { kind: 'volta', path, from: v.index, to: v.land, seconds: CHASE_RULES.aroundSeconds, spot: v };
  }

  private run(from: number, to: number): Leg {
    return { kind: 'corre', path: this.track.slice(from, to + 1), from, to, seconds: (to - from) * this.hexSeconds };
  }

  private begin(who: RaceWho, leg: Leg, ev: RaceEvent[]): void {
    const r = this.runner(who);
    r.leg = leg;
    r.t = 0;
    r.told = 0;
    ev.push({ type: 'trecho', who, leg });
  }

  private advance(who: RaceWho, dt: number, ev: RaceEvent[]): void {
    const r = this.runner(who);
    let left = dt;
    // vários trechos curtos podem caber num quadro só
    for (let guard = 0; guard < 64 && r.leg && left > 0; guard++) {
      const l = r.leg;
      const used = Math.min(l.seconds - r.t, left);
      r.t += used;
      left -= used;
      this.tellSteps(who, r, ev);
      // agarrou no meio do trecho
      if (this.caught()) {
        this.finish('agarrou', ev);
        return;
      }
      if (r.t < l.seconds) return;
      r.pos = l.to;
      r.leg = null;
      this.endLeg(l, ev);
      if (this.over) return;
      this.nextLeg(who, ev);
      if (this.over) return;
    }
  }

  /** Avisa cada hexágono novo alcançado no trecho (a origem não conta). */
  private tellSteps(who: RaceWho, r: Runner, ev: RaceEvent[]): void {
    const l = r.leg!;
    const reached = Math.floor(r.frac * (l.path.length - 1) + 0.5);
    while (r.told < reached) {
      r.told++;
      ev.push({ type: 'passo', who, hex: l.path[r.told] });
    }
  }

  /** Fim da animação de arrombar: passou, a porta abre; falhou, ele se rende ali. */
  private endLeg(l: Leg, ev: RaceEvent[]): void {
    if (l.kind !== 'porta') return;
    const d = this.doors.find((x) => x.stop === l.stop)!;
    if ((l.roll ?? 0) >= this.need(d.stop)) {
      d.open = true;
      ev.push({ type: 'porta-abre', stop: d.stop });
    } else {
      this.over = 'rendeu';
      ev.push({ type: 'rendeu', stop: d.stop });
    }
  }

  private need(stop: ChaseStop): number {
    return (this.setup.doorNeed ?? ((s: ChaseStop) => fleeDoorNeed(s.door)))(stop);
  }

  private nextLeg(who: RaceWho, ev: RaceEvent[]): void {
    const p = this.runner(who).pos;
    if (who === 'agente') {
      // os caixotes que ficaram para trás saem da lista
      while (this.agentVaults.length && this.agentVaults[0].spot.index < p) this.agentVaults.shift();
      const v = this.agentVaults[0];
      if (v && v.spot.index === p) {
        this.agentVaults.shift();
        const s = v.spot;
        if (!v.jump) this.begin(who, this.around(s), ev);
        else {
          // passou: metade do tempo da volta; falhou: pula mal, no tempo da volta
          const seconds = v.jump.pass ? CHASE_RULES.aroundSeconds / 2 : CHASE_RULES.aroundSeconds;
          const path = [this.track[s.index], ...s.path];
          this.begin(who, { kind: 'pulo', path, from: s.index, to: s.land, seconds, spot: s, failed: !v.jump.pass }, ev);
        }
        return;
      }
      const to = Math.min(v ? v.spot.index : this.end, this.end);
      if (to > p) this.begin(who, this.run(p, to), ev);
      return;
    }
    if (p >= this.end) {
      if (!this.setup.cornered) this.finish('fugiu', ev);
      return;
    }
    const door = this.doors.find((d) => !d.open && d.at >= p);
    if (door && door.at === p) {
      const need = this.need(door.stop);
      if (need <= 0) door.open = true;
      else {
        // emenda a corrida na animação de arrombar; o dado já sai aqui
        const roll = this.setup.rollDoor();
        const leg: Leg = { kind: 'porta', path: [this.track[p]], from: p, to: p, seconds: CHASE_RULES.doorBreakSeconds, stop: door.stop, roll };
        this.begin(who, leg, ev);
        ev.push({ type: 'porta-tenta', stop: door.stop, roll, need });
        return;
      }
    }
    while (this.enemyVaults.length && this.enemyVaults[0].index < p) this.enemyVaults.shift();
    const v = this.enemyVaults[0];
    if (v && v.index === p) {
      this.enemyVaults.shift();
      this.begin(who, this.around(v), ev);
      return;
    }
    const nextDoor = this.doors.find((d) => !d.open && d.at > p);
    const to = Math.min(nextDoor?.at ?? this.end, v?.index ?? this.end, this.end);
    this.begin(who, this.run(p, to), ev);
  }

  private finish(how: 'agarrou' | 'fugiu', ev: RaceEvent[]): RaceEvent[] {
    if (this.over) return ev;
    this.over = how;
    ev.push({ type: how });
    return ev;
  }
}
