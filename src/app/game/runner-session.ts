/**
 * Modo Corrida — uma perseguição no mapa de corrida, do começo ao fim (as regras ficam em
 * `runner.ts`; os mapas, em `runner-maps.ts`). Quem chama (a tela da partida) cuida do antes
 * (iniciativa, rota travada, a câmera descer) e do depois (render, fugir).
 *
 * 1. **Ida** (`enter`): um segundo tabuleiro, transparente, com o mapa de corrida, fica por cima
 *    do tático com a mesma câmera de perseguição. Uma onda sai dos pés do agente para a frente: no
 *    tático os hexágonos ficam de pé e somem (`setFlip` `sai`); no de corrida eles chegam virando
 *    (`entra`). Atrás da onda, corrida; à frente, ainda o tático. Pronto: o tático dorme.
 * 2. **Corrida** (`run`): o relógio anda, o jogador vira nas curvas, pula e desliza (teclado,
 *    toque ou controle) e o garimpeiro se vira sozinho. Os dois correm sempre no meio da pista.
 * 3. **Volta** (`tacticalResult` e `leave`): onde cada um parou na corrida vira um hexágono da pista
 *    tática (`tacticalIndex`); a onda volta, de longe até os pés, e o mapa de corrida some.
 */
import { HexBoard } from './hex-board';
import { GameMap } from './maps';
import { ModelDef } from './character-model';
import { HexCoord, hexToWorld, worldToHex } from './hex';
import { RENDER_PROFILES, RenderProfile, runnerProfile } from './render-settings';
import { spawnDoors } from './door';
import { RUNNER_RULES, RunnerEnd, RunnerEvent, RunnerPose, RunnerRace, tacticalIndex } from './runner';
import { RunnerStart, trackObstacles } from './runner-maps';
import { CORNER_RADIUS, S3, pathLength, pathPose, pathTurns, straightPose } from './runner-path';
import { buildRunnerProps } from './runner-props';

/** Tempos da virada (ms) e até onde a onda vai (mundo: passa do fim da névoa da câmera rasante). */
export const RUNNER_TRANSITION = { enterMs: 1000, leaveMs: 900, reach: 46, from: -3 } as const;

/** Altura do pulo (mundo) e quanto o corpo inclina no tropeço (rad). */
const JUMP_HEIGHT = 1.3;
const STUMBLE_LEAN = 0.35;
/** Quanto (s) o agente leva para sair do reto e encaixar no caminho, ao virar tarde ou bater. */
const TURN_BLEND = 0.22;
/** Velocidade da animação de corrida (1 = a do clipe): 15% mais rápida, combina com a pista. */
const RUN_ANIM = 1.15;

export interface RunnerSessionOptions {
  canvas: HTMLCanvasElement;
  tactical: HexBoard;
  start: RunnerStart;
  agent: { id: string; color: number; model?: ModelDef; hex: HexCoord };
  enemy: { id: string; model?: ModelDef; hex: HexCoord; agilidade?: number };
  /** Pista tática: `[agente, ...caminho até ele, ...fuga]`, com `n` passos até ele. */
  track: readonly HexCoord[];
  n: number;
  profile?: RenderProfile;
  /** Corrida (gás) do agente: multiplica a velocidade. */
  boost: () => number;
  alive: () => boolean;
  /** Sem animação de virada (o sistema pede menos movimento). */
  instant: boolean;
  rollEnemy: () => number;
  onEvent: (ev: RunnerEvent) => void;
  onHud: (distance: number, step: number, total: number) => void;
}

export class RunnerSession {
  readonly race: RunnerRace;
  readonly board: HexBoard;
  private readonly o: RunnerSessionOptions;
  /** Direção da corrida no tático (do agente para ele), no chão. */
  private readonly dir: { x: number; z: number };
  private readonly origin: { x: number; z: number };
  private readonly gap0: number;
  private touch: { id: number; x: number; y: number; done: boolean } | null = null;
  /** O agente seguia reto (`seg`) numa esquina e acabou de pegar o caminho: encaixa desde `t0`. */
  private release: { seg: number; t0: number } | null = null;
  private held = -1;
  private readonly unbind: (() => void)[] = [];
  private disposed = false;

  constructor(o: RunnerSessionOptions) {
    this.o = o;
    const { start } = o;
    const a = hexToWorld(o.agent.hex, 1);
    const e = hexToWorld(o.enemy.hex, 1);
    const len = Math.hypot(e.x - a.x, e.z - a.z) || 1;
    this.dir = { x: (e.x - a.x) / len, z: (e.z - a.z) / len };
    this.origin = a;
    const path = start.race.path;
    this.race = new RunnerRace({
      obstacles: trackObstacles(start.race),
      turns: pathTurns(path),
      startAt: start.zone.at,
      length: pathLength(path),
      hexes: o.n,
      agilidade: o.enemy.agilidade,
      rollEnemy: o.rollEnemy,
    });
    this.gap0 = this.race.gap();
    const map: GameMap = start.race.map;
    const hexAt = (at: number) => {
      const p = pathPose(path, at);
      return worldToHex(p.x, p.z, 1);
    };
    this.board = new HexBoard(
      o.canvas,
      map,
      [{ id: o.agent.id, color: o.agent.color, model: o.agent.model, start: hexAt(start.zone.at) }],
      { onHexTap: () => {}, onUnitTap: () => {} },
      {
        walls: map.walls,
        enemies: [{ id: o.enemy.id, start: hexAt(this.race.pose('garimpeiro').at), facing: Math.PI, model: o.enemy.model }],
        // o horizonte inteiro da pista, em qualquer modo de renderização
        profile: runnerProfile(o.profile ?? RENDER_PROFILES.normal),
        wideChase: true,
        transparent: true,
      },
    );
    const b = this.board;
    b.setInputEnabled(false);
    b.setDoors(spawnDoors(map.doors ?? [], map.doorStates), true);
    b.setBurnTargets([]);
    b.addProps(buildRunnerProps(start.race));
    if (start.race.plane) b.posePlane(start.race.plane.x, start.race.plane.z, start.race.plane.sink);
    this.pose();
    b.setActive(null);
    // a câmera olha para onde o agente corre: nas curvas o garimpeiro some atrás da esquina
    b.setChaseFollow(true);
    b.setChaseCamera(o.agent.id, o.enemy.id);
    b.snapChaseCamera();
    b.setBackdrop(false);
    // nada aparece até a onda passar
    b.setFlip({ origin: this.raceOrigin(), dir: this.raceDir(), front: RUNNER_TRANSITION.from, mode: 'entra' });
    this.bindTouch();
  }

  /** Onde o agente está no mapa de corrida (mundo). */
  private raceOrigin(): { x: number; z: number } {
    return this.agentPose();
  }

  /** Para onde o agente corre no mapa de corrida (no chão). */
  private raceDir(): { x: number; z: number } {
    const { yaw } = this.agentPose();
    return { x: Math.sin(yaw), z: Math.cos(yaw) };
  }

  /**
   * Onde o agente aparece: no caminho, menos numa esquina que ele ainda não pegou. Ali ele corre
   * **reto** (não vira sozinho): só vira quando o jogador vira; se não virar, passa da esquina e
   * bate. Ao pegar o caminho depois de já ter começado a curva, encaixa em `TURN_BLEND`.
   */
  private agentPose(now = performance.now()): { x: number; z: number; yaw: number } {
    const path = this.o.start.race.path;
    const at = this.race.pose('agente').at;
    const turns = this.race.turns;
    const held = this.race.heldTurn();
    // a curva suave do caminho começa a `CORNER_RADIUS` da esquina: antes disso, reto e caminho são iguais
    const lead = CORNER_RADIUS / S3;
    const holding = held >= 0 && at >= turns[held].at - lead;
    if (holding) {
      this.held = held;
      this.release = null;
      return straightPose(path, held, at);
    }
    if (this.held >= 0) {
      this.release = { seg: this.held, t0: now };
      this.held = -1;
    }
    const goal = pathPose(path, at);
    const r = this.release;
    if (!r) return goal;
    const t = Math.min(1, (now - r.t0) / 1000 / TURN_BLEND);
    if (t >= 1) {
      this.release = null;
      return goal;
    }
    const from = straightPose(path, r.seg, at);
    const k = t * t * (3 - 2 * t);
    let dy = goal.yaw - from.yaw;
    if (dy > Math.PI) dy -= 2 * Math.PI;
    if (dy < -Math.PI) dy += 2 * Math.PI;
    return { x: from.x + (goal.x - from.x) * k, z: from.z + (goal.z - from.z) * k, yaw: from.yaw + dy * k };
  }

  // ---------- ida e volta ----------

  /** A virada de ida: o tático vai embora, a corrida chega, da frente dos pés para longe. */
  async enter(): Promise<void> {
    const { tactical } = this.o;
    const R = RUNNER_TRANSITION;
    await this.animate(this.o.instant ? 0 : R.enterMs, (t) => {
      // os dois já correm na pose (o modelo pode ter chegado agora)
      this.pose();
      const front = R.from + (R.reach - R.from) * t;
      tactical.setFlip({ origin: this.origin, dir: this.dir, front, mode: 'sai' });
      this.board.setFlip({ origin: this.raceOrigin(), dir: this.raceDir(), front, mode: 'entra' });
    });
    this.board.setFlip(null);
    this.board.setBackdrop(true);
    tactical.setRendering(false);
    tactical.setFlip(null);
  }

  /**
   * A virada de volta: o tático (já com os dois onde pararam) aparece de longe até os pés e a
   * corrida some na mesma onda.
   */
  async leave(agentHex: HexCoord, enemyHex: HexCoord): Promise<void> {
    const { tactical } = this.o;
    const R = RUNNER_TRANSITION;
    const a = hexToWorld(agentHex, 1);
    const e = hexToWorld(enemyHex, 1);
    const len = Math.hypot(e.x - a.x, e.z - a.z);
    const dir = len > 0.01 ? { x: (e.x - a.x) / len, z: (e.z - a.z) / len } : this.dir;
    const flip = (front: number) => {
      tactical.setFlip({ origin: a, dir, front, mode: 'sai' });
      this.board.setFlip({ origin: this.raceOrigin(), dir: this.raceDir(), front, mode: 'entra' });
    };
    flip(R.reach);
    tactical.setRendering(true);
    this.board.setBackdrop(false);
    await this.animate(this.o.instant ? 0 : R.leaveMs, (t) => flip(R.reach + (R.from - R.reach) * t));
    tactical.setFlip(null);
  }

  private animate(ms: number, frame: (t: number) => void): Promise<void> {
    return new Promise((done) => {
      if (ms <= 0) {
        frame(1);
        return done();
      }
      const t0 = performance.now();
      const tick = (now: number) => {
        if (!this.o.alive() || this.disposed) return done();
        const t = Math.min(1, (now - t0) / ms);
        frame(t * t * (3 - 2 * t));
        if (t >= 1) return done();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ---------- a corrida ----------

  /** Roda até agarrar ou ele fugir (ou a partida acabar no meio: `null`). */
  run(): Promise<RunnerEnd | null> {
    return new Promise((done) => {
      let last = performance.now();
      const frame = (now: number) => {
        if (!this.o.alive() || this.disposed) return done(null);
        const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
        last = now;
        for (const ev of this.race.step(dt, this.o.boost())) this.o.onEvent(ev);
        this.pose();
        this.hud();
        if (this.race.over) return done(this.race.over);
        requestAnimationFrame(frame);
      };
      this.hud();
      requestAnimationFrame(frame);
    });
  }

  /** Placar: distância e quanto da rota dele já foi. */
  hud(): void {
    const per = RUNNER_RULES.rowsPerHex;
    this.o.onHud(
      this.race.distance(),
      Math.floor(this.race.progress('garimpeiro') / per),
      Math.floor(this.race.span / per),
    );
  }

  /** Põe os dois no tabuleiro de corrida. */
  private pose(): void {
    const draw = (who: 'unit' | 'enemy', id: string, p: RunnerPose) => {
      const hop = p.action === 'pula' ? Math.sin(Math.PI * p.t) * JUMP_HEIGHT : 0;
      const clip = p.action === 'desliza' ? 'crouch' : p.action === 'tropeca' ? 'idle' : 'run';
      const lean = p.action === 'tropeca' ? Math.sin(Math.PI * p.t) * STUMBLE_LEAN : 0;
      const at = who === 'unit' ? this.agentPose() : pathPose(this.o.start.race.path, p.at);
      this.board.runnerPose(who, id, { x: at.x, z: at.z, yaw: at.yaw, hop, clip, lean, runAnim: RUN_ANIM });
    };
    draw('unit', this.o.agent.id, this.race.pose('agente'));
    draw('enemy', this.o.enemy.id, this.race.pose('garimpeiro'));
  }

  /** O jogador: `left`/`right` viram (só perto de uma curva), `up` pula, `down` desliza. */
  input(cmd: 'left' | 'right' | 'up' | 'down'): void {
    if (this.race.over) return;
    if (cmd === 'left') this.race.turn(-1);
    else if (cmd === 'right') this.race.turn(1);
    else if (cmd === 'up') this.race.jump();
    else this.race.slide();
  }

  /** Arrastar na tela: para os lados vira, para cima pula, para baixo desliza. */
  private bindTouch(): void {
    const el = this.o.canvas;
    const MIN = 24;
    const down = (ev: PointerEvent) => {
      this.touch = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, done: false };
    };
    const move = (ev: PointerEvent) => {
      const t = this.touch;
      if (!t || t.done || t.id !== ev.pointerId) return;
      const dx = ev.clientX - t.x;
      const dy = ev.clientY - t.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < MIN) return;
      t.done = true;
      if (Math.abs(dx) > Math.abs(dy)) this.input(dx < 0 ? 'left' : 'right');
      else this.input(dy < 0 ? 'up' : 'down');
    };
    const up = () => (this.touch = null);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    this.unbind.push(() => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    });
  }

  // ---------- volta ao tático ----------

  /**
   * Onde cada um parou, na pista tática. Agarrado, o agente fica no hexágono antes do dele.
   */
  tacticalResult(): { agent: HexCoord; enemy: HexCoord } {
    const { track, n } = this.o;
    const total = track.length - 1;
    const len = this.race.span;
    const ia = tacticalIndex(this.race.progress('agente'), this.gap0, len, n, total);
    let ie = tacticalIndex(this.race.progress('garimpeiro'), this.gap0, len, n, total);
    if (this.race.over === 'fugiu') ie = total;
    ie = Math.max(ie, Math.min(total, 1));
    const agent = track[Math.min(ia, ie - 1)];
    return { agent: { ...agent }, enemy: { ...track[ie] } };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const u of this.unbind) u();
    this.board.dispose();
    this.o.tactical.setRendering(true);
    this.o.tactical.setFlip(null);
  }
}
