/**
 * A corrida da perseguição em **tempo e distância** (regras puras, testadas em
 * `chase-race.spec.ts`). Cada um corre no seu próprio relógio: o dado ou a parada de um nunca
 * segura o outro. O garimpeiro parado 1 s tentando arrombar uma porta não para o agente; o
 * agente tropeçando no caixote não para o garimpeiro.
 *
 * - Os dois correm pela mesma **pista** (`track`: do agente até ele e, dali, a rota de fuga
 *   travada), na velocidade padrão (`CHASE_RULES.hexSeconds` por hexágono).
 * - **Porta** fechada na rota dele: ele para na frente dela e tenta arrombar, `doorTrySeconds` por
 *   tentativa (d20 + animação no mesmo segundo). Passou: segue correndo. Falhou: tenta de novo,
 *   mais um segundo parado. O agente continua correndo o tempo todo.
 * - **Caixote** que a pista contorna: a volta leva sempre `aroundSeconds`, para quem der a volta
 *   (ele sempre dá; o agente escolhe). Pular por cima leva `jumpSeconds`. Tropeçou no pulo: fica
 *   `stumbleSeconds` no chão do outro lado.
 * - Só o **congelamento** (a escolha no caixote, ver `pending`) e o slow mexem no relógio, e nos
 *   dois juntos: quem chama `step` é quem decide o `dt` (com o slow) e não chama durante a escolha.
 * - **Distância**: quanto da pista ele está à frente do agente, menos o hexágono de encostar.
 *   Chegou a 0: agarrou. Ele chegou ao fim da pista: fugiu.
 */
import { CHASE_RULES, ChaseStop, VaultSpot, fleeDoorNeed } from './chase';
import { HexCoord, hexKey } from './hex';

export type RaceWho = 'agente' | 'garimpeiro';

/** O que o corredor está fazendo no trecho. */
export type LegKind = 'corre' | 'volta' | 'pulo' | 'porta' | 'tropeco';

/** Um trecho de um corredor: um caminho (com a origem) percorrido em `seconds`, por igual. */
export interface Leg {
  kind: LegKind;
  /** Hexágonos do trecho, com a origem; parado (porta, tropeço): um só. */
  path: HexCoord[];
  /** Onde o trecho começa e acaba na pista (índices de `track`; o pulo corta caminho). */
  from: number;
  to: number;
  seconds: number;
  /** Porta que ele tenta arrombar (`porta`) e o d20 desta tentativa. */
  stop?: ChaseStop;
  roll?: number;
  /** Caixote do trecho (`volta`, `pulo`, `tropeco`). */
  spot?: VaultSpot;
  /** Pulo em que o d20 falhou: cai do outro lado (vem um `tropeco`). */
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
  | { type: 'porta-tenta'; stop: ChaseStop; roll: number; need: number; attempt: number }
  | { type: 'porta-abre'; stop: ChaseStop; attempt: number }
  | { type: 'porta-falha'; stop: ChaseStop; attempt: number }
  | { type: 'caixote'; spot: VaultSpot }
  | { type: 'agarrou' }
  | { type: 'fugiu' };

export interface RaceSetup {
  /** A pista: do agente (índice 0) até ele (`n`) e a rota de fuga até o fim. */
  track: readonly HexCoord[];
  /** Onde ele começa na pista (o caminho do agente até ele tem `n` passos). */
  n: number;
  /** Portas fechadas da rota (índices de `[origem dele, ...fuga]`, ver `routeStops`). */
  doors?: readonly ChaseStop[];
  /** Caixotes que a pista contorna (ver `agentVaults`). */
  vaults?: readonly VaultSpot[];
  /** O d20 de cada tentativa na porta. */
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

export class ChaseRace {
  readonly hexSeconds: number;
  private readonly track: readonly HexCoord[];
  private readonly n: number;
  private readonly end: number;
  private readonly agent: Runner;
  private readonly enemy: Runner;
  /** Portas: onde ele para (índice da pista) e quantas tentativas já fez. */
  private readonly doors: { stop: ChaseStop; at: number; tries: number; open: boolean }[];
  /** Caixotes: os que o agente ainda vai decidir, e os que ele (garimpeiro) contorna. */
  private readonly agentVaults: VaultSpot[];
  private readonly enemyVaults: VaultSpot[];
  /** O agente chegou num caixote: tudo congela até `decide`. */
  pending: VaultSpot | null = null;
  over: 'agarrou' | 'fugiu' | null = null;

  constructor(private readonly setup: RaceSetup) {
    this.hexSeconds = setup.hexSeconds ?? CHASE_RULES.hexSeconds;
    this.track = setup.track;
    this.n = setup.n;
    this.end = setup.track.length - 1;
    this.agent = new Runner(0);
    this.enemy = new Runner(setup.n);
    this.doors = (setup.doors ?? []).map((stop) => ({ stop, at: setup.n + stop.index - 1, tries: 0, open: false }));
    const vaults = [...(setup.vaults ?? [])].filter((v) => v.land <= this.end).sort((a, b) => a.index - b.index);
    this.agentVaults = vaults;
    // ele contorna os caixotes da rota dele, menos onde a volta passaria por uma porta
    this.enemyVaults = vaults.filter(
      (v) => v.index >= setup.n && !this.doors.some((d) => d.at >= v.index && d.at < v.land),
    );
  }

  /** Distância (hexágonos): quanto ele está à frente, menos o hexágono de encostar. */
  distance(): number {
    return this.enemy.trackPos() - this.agent.trackPos() - 1;
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
    if (this.distance() <= 0) return this.finish('agarrou', ev);
    this.nextLeg('garimpeiro', ev);
    this.nextLeg('agente', ev);
    return ev;
  }

  /**
   * Avança o relógio `dt` segundos (já com o slow). `agentRate` é a corrida do agente (1 =
   * normal): só ele fica mais rápido. Não anda enquanto a escolha do caixote está aberta.
   */
  step(dt: number, agentRate = 1): RaceEvent[] {
    const ev: RaceEvent[] = [];
    if (this.over || this.pending || dt <= 0) return ev;
    this.advance('garimpeiro', dt, ev);
    if (!this.over) this.advance('agente', dt * agentRate, ev);
    if (!this.over && this.distance() <= 0) this.finish('agarrou', ev);
    return ev;
  }

  /** A escolha no caixote: pular (`pass`: o d20 do pulo passou) ou dar a volta. */
  decide(jump: boolean, pass = true): RaceEvent[] {
    const v = this.pending;
    const ev: RaceEvent[] = [];
    if (!v || this.over) return ev;
    this.pending = null;
    this.agentVaults.shift();
    if (jump) {
      const path = [this.track[v.index], ...v.path];
      this.begin('agente', { kind: 'pulo', path, from: v.index, to: v.land, seconds: CHASE_RULES.jumpSeconds, spot: v, failed: !pass }, ev);
    } else this.begin('agente', this.around(v), ev);
    return ev;
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
      const room = l.seconds - r.t;
      const used = Math.min(room, left);
      r.t += used;
      left -= used;
      this.tellSteps(who, r, ev);
      // agarrou no meio do trecho: os dois param ali
      if (this.distance() <= 0) {
        this.finish('agarrou', ev);
        return;
      }
      if (r.t < l.seconds) return;
      r.pos = l.to;
      r.leg = null;
      this.endLeg(who, l, ev);
      this.nextLeg(who, ev);
      if (this.pending || this.over) return;
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

  private endLeg(who: RaceWho, l: Leg, ev: RaceEvent[]): void {
    if (l.kind === 'porta') {
      const d = this.doors.find((x) => x.stop === l.stop)!;
      const need = this.need(d.stop);
      if ((l.roll ?? 0) >= need) {
        d.open = true;
        ev.push({ type: 'porta-abre', stop: d.stop, attempt: d.tries });
      } else ev.push({ type: 'porta-falha', stop: d.stop, attempt: d.tries });
    } else if (who === 'agente' && l.kind === 'pulo' && l.failed) {
      // tropeçou: cai do outro lado e levanta antes de seguir
      this.queued = { kind: 'tropeco', path: [this.track[l.to]], from: l.to, to: l.to, seconds: CHASE_RULES.stumbleSeconds, spot: l.spot };
    }
  }

  /** O próximo trecho do agente, já decidido (o tropeço depois do pulo que falhou). */
  private queued?: Leg;

  private need(stop: ChaseStop): number {
    return (this.setup.doorNeed ?? ((s: ChaseStop) => fleeDoorNeed(s.door)))(stop);
  }

  private nextLeg(who: RaceWho, ev: RaceEvent[]): void {
    const r = this.runner(who);
    const p = r.pos;
    if (who === 'agente') {
      if (this.queued) {
        const q = this.queued;
        this.queued = undefined;
        this.begin(who, q, ev);
        return;
      }
      // os caixotes que ficaram para trás (o pulo ou a volta já passou deles) saem da lista
      while (this.agentVaults.length && this.agentVaults[0].index < p) this.agentVaults.shift();
      const v = this.agentVaults[0];
      if (v && v.index === p) {
        this.pending = v;
        ev.push({ type: 'caixote', spot: v });
        return;
      }
      const to = Math.min(v ? v.index : this.end, this.end);
      if (to > p) this.begin(who, this.run(p, to), ev);
      return;
    }
    if (p >= this.end) {
      if (!this.setup.cornered) this.finish('fugiu', ev);
      return;
    }
    const door = this.doors.find((d) => !d.open && d.at >= p);
    if (door && door.at === p) {
      if (this.need(door.stop) <= 0) door.open = true;
      else {
        door.tries++;
        const roll = this.setup.rollDoor();
        this.begin(who, { kind: 'porta', path: [this.track[p]], from: p, to: p, seconds: CHASE_RULES.doorTrySeconds, stop: door.stop, roll }, ev);
        ev.push({ type: 'porta-tenta', stop: door.stop, roll, need: this.need(door.stop), attempt: door.tries });
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
    this.pending = null;
    ev.push({ type: how });
    return ev;
  }
}
