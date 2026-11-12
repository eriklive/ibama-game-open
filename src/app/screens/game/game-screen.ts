import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { rollDice, rollDie } from '../../game/dice';
import { HexBoard } from '../../game/hex-board';
import {
  APPROACH_RULES,
  ENEMY_RULES,
  EnemyState,
  canAct,
  facingBetween,
  isBorder,
  onBoard,
  planFlee,
  planPatrol,
  resolveApproach,
  spawnEnemy,
  spotted,
  visionHexes,
} from '../../game/enemies';
import { HexCoord, hexDistance, hexKey, hexesInRange, pathTo, reachableHexes, sameHex } from '../../game/hex';
import { CHARACTERS, Character, GameMap, MOVE_DICE, findMap } from '../../game/maps';

type Phase = 'rolling' | 'moving-choice' | 'walking' | 'ending' | 'enemy';

/** Um dado da reserva da rodada: um movimento (ou uma ação) para qualquer personagem. */
interface Die {
  value: number;
  used: boolean;
}

const namesOf = (es: readonly EnemyState[]): string => {
  const names = es.map((e) => e.name);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : names[0];
};

const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

@Component({
  selector: 'app-game-screen',
  templateUrl: './game-screen.html',
  styleUrl: './game-screen.css',
})
export class GameScreen implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('board');
  private board?: HexBoard;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private rollTicker?: ReturnType<typeof setInterval>;
  private destroyed = false;
  /** Muda a cada "Recomeçar": animações antigas param de mexer no estado. */
  private epoch = 0;

  protected readonly map: GameMap | undefined = findMap(inject(ActivatedRoute).snapshot.paramMap.get('mapId'));
  protected readonly characters = CHARACTERS;
  private readonly walls = new Set((this.map?.walls ?? []).map(hexKey));
  protected readonly diceSides = MOVE_DICE.sides;
  protected readonly rotateStep = Math.PI / 4;

  protected readonly positions = signal<ReadonlyMap<string, HexCoord>>(this.initialPositions());
  protected readonly round = signal(1);
  protected readonly phase = signal<Phase>('rolling');
  /** Reserva de dados da rodada (seis com três agentes). */
  protected readonly pool = signal<Die[]>([]);
  /** Dado escolhido para o próximo movimento ou ação. */
  protected readonly dieIndex = signal(0);
  /** Valores mostrados durante a animação da rolagem. */
  protected readonly rollingFaces = signal<number[]>([]);
  protected readonly selected = signal<HexCoord | null>(null);
  /** Personagem escolhido: é ele quem anda ou age com o dado. */
  protected readonly activeId = signal<string>(CHARACTERS[0].id);
  protected readonly enemies = signal<readonly EnemyState[]>(this.initialEnemies());
  /** Último acontecimento com inimigos (avistou, correu, fugiu…), mostrado num aviso. */
  protected readonly notice = signal<{ text: string; tone: 'alert' | 'info' } | null>(null);
  private noticeTimer?: ReturnType<typeof setTimeout>;

  protected readonly diceLeft = computed(() => this.pool().filter((d) => !d.used).length);
  /** Passos do dado escolhido (0 se acabaram os dados). */
  protected readonly movesLeft = computed(() => {
    const d = this.pool()[this.dieIndex()];
    return d && !d.used ? d.value : 0;
  });

  protected readonly enemyCounts = computed(() => {
    const es = this.enemies();
    return {
      patrol: es.filter((e) => e.status === 'patrol').length,
      alert: es.filter((e) => e.status === 'alert').length,
      surrendered: es.filter((e) => e.status === 'surrendered').length,
      fled: es.filter((e) => e.status === 'fled').length,
    };
  });

  /** Pré-visualizando a abordagem (zonas pintadas, aguardando confirmação). */
  protected readonly approaching = signal(false);
  protected readonly approachRules = APPROACH_RULES;
  protected readonly statusLabel: Record<EnemyState['status'], string> = {
    patrol: 'patrulha',
    alert: 'em fuga',
    surrendered: 'rendido',
    fled: 'fugiu',
  };
  /** Quem se renderia e quem tentaria correr se o agente da vez abordasse agora. */
  protected readonly approachPlan = computed(() => {
    const from = this.positions().get(this.active().id);
    return from ? resolveApproach(from, this.enemies()) : { surrender: [], flee: [] };
  });
  protected readonly canApproach = computed(
    () => this.approachPlan().surrender.length + this.approachPlan().flee.length > 0,
  );

  protected readonly active = computed<Character>(
    () => CHARACTERS.find((c) => c.id === this.activeId()) ?? CHARACTERS[0],
  );

  /** Alcance do personagem da vez com o movimento que ainda resta (contornando os outros). */
  private readonly reach = computed(() => {
    const map = this.map;
    const from = this.positions().get(this.active().id);
    if (!map || !from || this.phase() !== 'moving-choice') return new Map();
    const blocked = new Set([
      ...[...this.positions()].filter(([id]) => id !== this.active().id).map(([, h]) => hexKey(h)),
      ...this.walls,
      ...this.onBoardEnemies().map((e) => hexKey(e.hex)),
    ]);
    return reachableHexes(from, this.movesLeft(), map.cols, map.rows, blocked);
  });
  /** Caminho mais curto até o destino escolhido (sem a origem). */
  private readonly selectedPath = computed(() => {
    const s = this.selected();
    return s ? pathTo(this.reach(), s) : [];
  });
  protected readonly selectedCost = computed(() => {
    const s = this.selected();
    return s ? (this.reach().get(hexKey(s))?.cost ?? 0) : 0;
  });

  ngAfterViewInit(): void {
    if (!this.map) return;
    this.board = new HexBoard(
      this.canvasRef().nativeElement,
      this.map,
      CHARACTERS.map((c, i) => ({
        id: c.id,
        color: c.color,
        model: c.model,
        start: this.map!.starts[i],
      })),
      {
        onHexTap: (hex) => this.tapHex(hex),
        onUnitTap: (id) => this.selectCharacter(id),
      },
      {
        walls: this.map.walls,
        enemies: this.enemies().map((e) => ({
          id: e.id,
          start: e.hex,
          facing: e.facing,
          model: this.map!.enemies.find((s) => s.id === e.id)?.model,
        })),
      },
    );
    this.refreshVision();
    this.startRound();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearTimers();
    clearTimeout(this.noticeTimer);
    this.board?.dispose();
  }

  // ---------- rodadas ----------

  /** Rola a reserva da rodada (2d4 por personagem) com animação; os dados ficam à disposição de todos. */
  private startRound(): void {
    this.closeApproach();
    this.selected.set(null);
    this.board?.setSelected(null);
    this.board?.setReachable([]);
    this.board?.setActive(this.activeId());
    this.phase.set('rolling');
    const count = CHARACTERS.length * MOVE_DICE.count;
    const final = rollDice(count, MOVE_DICE.sides);
    this.pool.set([]);
    this.rollingFaces.set(Array(count).fill(1));
    const duration = reducedMotion() ? 250 : 1100;
    this.rollTicker = setInterval(
      () => this.rollingFaces.set(final.map(() => rollDie(MOVE_DICE.sides))),
      reducedMotion() ? 250 : 70,
    );
    this.later(duration, () => {
      clearInterval(this.rollTicker);
      this.rollingFaces.set(final);
      this.pool.set(final.map((value) => ({ value, used: false })));
      this.dieIndex.set(0);
      // mostra o resultado um instante antes de liberar o movimento
      this.later(reducedMotion() ? 150 : 650, () => this.beginChoosing());
    });
  }

  private beginChoosing(): void {
    this.phase.set('moving-choice');
    this.refreshBoard();
  }

  /** Escolhe qual dado da reserva será usado a seguir. */
  protected pickDie(index: number): void {
    if (this.phase() !== 'moving-choice' || this.pool()[index]?.used) return;
    this.dieIndex.set(index);
    this.selected.set(null);
    if (this.approaching()) this.closeApproach();
    this.refreshBoard();
  }

  /** Marca o dado escolhido como gasto e passa para o próximo; sem dados, a rodada acaba. */
  private spendDie(): void {
    const i = this.dieIndex();
    this.pool.update((p) => p.map((d, j) => (j === i ? { ...d, used: true } : d)));
    const next = this.pool().findIndex((d) => !d.used);
    if (next >= 0) {
      this.dieIndex.set(next);
      this.beginChoosing();
    } else {
      this.phase.set('ending');
      this.later(reducedMotion() ? 200 : 700, () => this.endRound());
    }
  }

  /** Fim da rodada (dados gastos ou "Encerrar rodada"): os inimigos agem e uma nova rodada começa. */
  protected endRound(): void {
    if (this.phase() === 'walking' || this.phase() === 'rolling' || this.phase() === 'enemy') return;
    this.clearTimers();
    this.phase.set('ending');
    this.closeApproach();
    if (this.actingEnemies().length) {
      void this.enemyTurn();
      return;
    }
    this.nextRound();
  }

  private nextRound(): void {
    this.round.update((r) => r + 1);
    this.startRound();
  }

  // ---------- turno inimigo ----------

  /** Cada inimigo age em sequência: quem está em alerta corre para a borda, os outros patrulham. */
  private async enemyTurn(): Promise<void> {
    const map = this.map;
    const board = this.board;
    if (!map || !board) return;
    this.phase.set('enemy');
    this.selected.set(null);
    board.setActive(null);
    board.setSelected(null);
    board.setReachable([]);
    const epoch = this.epoch;
    const stale = () => this.destroyed || this.epoch !== epoch;
    this.say('Turno inimigo', 'info');
    await this.wait(700);

    for (const { id } of this.enemies()) {
      if (stale()) return;
      const enemy = this.enemy(id);
      if (!enemy || !canAct(enemy)) continue;
      board.focusHex(enemy.hex);
      await this.wait(350);
      if (enemy.status === 'alert') await this.flee(enemy, epoch);
      else await this.patrol(enemy, epoch);
      await this.wait(300);
    }
    if (stale()) return;
    this.announceIfOver();
    this.nextRound();
  }

  private async patrol(enemy: EnemyState, epoch: number): Promise<void> {
    const map = this.map!;
    const plan = planPatrol(enemy, ENEMY_RULES.patrolSteps, map.cols, map.rows, this.blockedFor(enemy.id));
    this.updateEnemy(enemy.id, { waypoint: plan.waypoint, dir: plan.dir });
    if (!plan.path.length) {
      this.say(`${enemy.name} espera: o caminho está bloqueado`, 'info');
      return;
    }
    await this.board!.moveEnemy(enemy.id, plan.path, (hex) => {
      if (this.epoch !== epoch) return false;
      const prev = this.enemy(enemy.id)!.hex;
      this.updateEnemy(enemy.id, { hex, facing: facingBetween(prev, hex) });
      this.refreshVision();
      // ao avistar alguém, para onde está
      return !this.checkSpotted(enemy.id);
    });
    // dá tempo de ver o "!" antes de seguir
    if (this.enemy(enemy.id)?.status === 'alert') await this.wait(900);
  }

  private async flee(enemy: EnemyState, epoch: number): Promise<void> {
    const map = this.map!;
    const agents = [...this.positions().values()];
    const plan = planFlee(enemy.hex, ENEMY_RULES.fleeSteps, map.cols, map.rows, this.blockedFor(enemy.id), agents);
    if (plan.cornered) {
      this.say(`${enemy.name} está encurralado!`, 'info');
      return;
    }
    if (plan.path.length) {
      this.say(`${enemy.name} corre para a borda!`, 'alert');
      await this.board!.moveEnemy(
        enemy.id,
        plan.path,
        (hex) => {
          if (this.epoch !== epoch) return false;
          this.updateEnemy(enemy.id, { hex, facing: facingBetween(this.enemy(enemy.id)!.hex, hex) });
          return true;
        },
        1.8,
      );
    }
    if (this.epoch !== epoch) return;
    if (isBorder(this.enemy(enemy.id)!.hex, map.cols, map.rows)) {
      this.updateEnemy(enemy.id, { status: 'fled' });
      this.say(`${enemy.name} fugiu do mapa!`, 'alert');
      await this.board!.removeEnemy(enemy.id);
    }
  }

  /** Se o inimigo em patrulha enxerga algum agente, entra em alerta. Devolve se avistou. */
  private checkSpotted(enemyId: string, agents: ReadonlyMap<string, HexCoord> = this.positions()): boolean {
    const map = this.map;
    const enemy = this.enemy(enemyId);
    if (!map || !enemy) return false;
    const who = spotted(enemy, agents, map.cols, map.rows, this.walls);
    if (!who) return false;
    const agent = agents.get(who)!;
    // vira para quem viu
    this.updateEnemy(enemyId, { status: 'alert', facing: facingBetween(enemy.hex, agent) });
    this.board?.setEnemyFacing(enemyId, facingBetween(enemy.hex, agent));
    this.board?.setEnemyAlert(enemyId, true);
    this.refreshVision();
    const name = CHARACTERS.find((c) => c.id === who)?.name ?? who;
    this.say(`${enemy.name} avistou ${name}! Vai correr para a borda.`, 'alert');
    return true;
  }

  /** Confere todos os inimigos (usado a cada passo de um agente). */
  private checkAllSpotted(agents: ReadonlyMap<string, HexCoord>): void {
    for (const e of this.enemies()) if (e.status === 'patrol') this.checkSpotted(e.id, agents);
  }

  // ---------- seleção e movimento ----------

  private tapHex(hex: HexCoord | null): void {
    if (this.phase() !== 'moving-choice') return;
    if (this.approaching()) {
      this.cancelApproach();
      return;
    }
    if (hex && this.reach().has(hexKey(hex))) {
      // segundo toque no mesmo hexágono confirma o movimento
      if (sameHex(hex, this.selected())) {
        void this.confirm();
        return;
      }
      this.selected.set(hex);
    } else {
      this.selected.set(null);
    }
    this.board?.setSelected(this.selected(), this.selectedPath());
  }

  /** Tocar num personagem (no tabuleiro ou no retrato) o escolhe para andar ou agir. */
  protected selectCharacter(id: string): void {
    if (this.phase() !== 'moving-choice') {
      this.board?.focus(id);
      return;
    }
    if (id !== this.activeId()) {
      this.closeApproach();
      this.activeId.set(id);
      this.board?.setActive(id);
      this.selected.set(null);
    }
    this.board?.focus(id);
    this.refreshBoard();
  }

  protected async confirm(): Promise<void> {
    const target = this.selected();
    if (!this.board || !target || this.phase() !== 'moving-choice') return;
    const path = pathTo(this.reach(), target);
    if (!path.length) return;
    const id = this.active().id;
    const epoch = this.epoch;
    this.phase.set('walking');
    this.selected.set(null);
    await this.board.moveUnit(id, path, (hex) => {
      if (this.epoch !== epoch) return;
      // quem entra no cone de visão é avistado na hora, mesmo só de passagem
      this.checkAllSpotted(new Map(this.positions()).set(id, hex));
    });
    if (this.destroyed || this.epoch !== epoch) return;
    this.positions.update((m) => new Map(m).set(id, target));
    // o dado inteiro é gasto, mesmo que o personagem ande menos passos
    this.spendDie();
  }

  // ---------- abordagem ----------

  /** Primeiro passo: mostra o raio e quem se renderia ou correria. */
  protected startApproach(): void {
    if (this.phase() !== 'moving-choice' || !this.canApproach() || !this.diceLeft()) return;
    const map = this.map;
    const from = this.positions().get(this.active().id);
    if (!map || !from) return;
    this.board?.focus(this.activeId());
    this.selected.set(null);
    this.approaching.set(true);
    this.board?.setSelected(null);
    this.board?.setReachable([]);
    const zone = (min: number, max: number) =>
      hexesInRange(from, max, map.cols, map.rows)
        .filter((h) => !this.walls.has(hexKey(h)))
        .filter((h) => hexDistance(from, h) > min)
        .map(hexKey);
    this.board?.setApproachZones({
      surrender: zone(0, APPROACH_RULES.surrenderRange),
      flee: zone(APPROACH_RULES.surrenderRange, APPROACH_RULES.radius),
    });
  }

  protected cancelApproach(): void {
    this.closeApproach();
    if (this.phase() === 'moving-choice') this.refreshBoard();
  }

  /** Confirma: rendições e alertas acontecem na hora, e a vez do agente acaba. */
  protected confirmApproach(): void {
    if (!this.approaching() || this.phase() !== 'moving-choice') return;
    const from = this.positions().get(this.active().id)!;
    const { surrender, flee } = this.approachPlan();
    for (const e of surrender) {
      const facing = facingBetween(e.hex, from);
      this.updateEnemy(e.id, { status: 'surrendered', facing });
      this.board?.setEnemyFacing(e.id, facing);
      this.board?.setEnemySurrendered(e.id, true);
    }
    for (const e of flee) {
      const facing = facingBetween(e.hex, from);
      this.updateEnemy(e.id, { status: 'alert', facing });
      this.board?.setEnemyFacing(e.id, facing);
      this.board?.setEnemyAlert(e.id, true);
    }
    this.closeApproach();
    this.refreshVision();
    const parts = [
      surrender.length && `${namesOf(surrender)} ${surrender.length === 1 ? 'se rendeu' : 'se renderam'}`,
      flee.length && `${namesOf(flee)} ${flee.length === 1 ? 'vai tentar correr' : 'vão tentar correr'}`,
    ].filter(Boolean);
    this.say(`Ibama! ${parts.join(' · ')}`, 'alert');
    if (!this.actingEnemies().length) this.later(1400, () => this.announceIfOver());
    // agir também gasta um dado, mas a rodada segue para os outros
    this.spendDie();
  }

  private closeApproach(): void {
    if (!this.approaching()) return;
    this.approaching.set(false);
    this.board?.setApproachZones(null);
  }

  protected cancel(): void {
    this.selected.set(null);
    this.board?.setSelected(null);
  }

  protected restart(): void {
    this.epoch++;
    this.clearTimers();
    this.positions.set(this.initialPositions());
    this.board?.placeUnits(this.positions());
    this.enemies.set(this.initialEnemies());
    this.board?.placeEnemies(this.enemies().map((e) => ({ ...e, alert: false, surrendered: false, gone: false })));
    this.refreshVision();
    this.notice.set(null);
    this.activeId.set(CHARACTERS[0].id);
    this.round.set(1);
    this.startRound();
  }

  /** Gira o mapa (positivo = sentido horário). */
  protected rotate(direction: 1 | -1): void {
    this.board?.rotate(direction * this.rotateStep);
  }

  protected exit(): void {
    this.router.navigate(['/']);
  }

  protected positionOf(id: string): HexCoord | undefined {
    return this.positions().get(id);
  }

  protected hexColor(c: Character): string {
    return '#' + c.color.toString(16).padStart(6, '0');
  }

  // ---------- auxiliares ----------

  private refreshBoard(): void {
    this.board?.setReachable(this.reach().keys());
    this.board?.setSelected(this.selected(), this.selectedPath());
  }

  private initialEnemies(): EnemyState[] {
    return (this.map?.enemies ?? []).map(spawnEnemy);
  }

  private enemy(id: string): EnemyState | undefined {
    return this.enemies().find((e) => e.id === id);
  }

  /** Inimigos que ocupam hexágono (inclusive rendidos). */
  private onBoardEnemies(): EnemyState[] {
    return this.enemies().filter(onBoard);
  }

  /** Inimigos que ainda agem no turno inimigo. */
  private actingEnemies(): EnemyState[] {
    return this.enemies().filter(canAct);
  }

  /** Quando não sobra ninguém agindo, mostra o resultado da missão. */
  private announceIfOver(): void {
    if (this.actingEnemies().length || !this.enemies().length) return;
    const { surrendered, fled } = this.enemyCounts();
    this.say(
      `Fim da abordagem: ${surrendered} ${surrendered === 1 ? 'rendido' : 'rendidos'}, ${fled} ${fled === 1 ? 'fugiu' : 'fugiram'}`,
      'info',
    );
  }

  private updateEnemy(id: string, patch: Partial<EnemyState>): void {
    this.enemies.update((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  /** Hexágonos que um inimigo não pode atravessar: paredes, agentes e os outros inimigos. */
  private blockedFor(enemyId: string): Set<string> {
    return new Set([
      ...this.walls,
      ...[...this.positions().values()].map(hexKey),
      ...this.onBoardEnemies().filter((e) => e.id !== enemyId).map((e) => hexKey(e.hex)),
    ]);
  }

  /** Pinta no tabuleiro o que os inimigos em patrulha enxergam. */
  private refreshVision(): void {
    const map = this.map;
    if (!map) return;
    const keys = this.enemies()
      .filter((e) => e.status === 'patrol')
      .flatMap((e) => visionHexes(e, map.cols, map.rows, this.walls).map(hexKey));
    this.board?.setVision(keys);
  }

  private say(text: string, tone: 'alert' | 'info'): void {
    this.notice.set({ text, tone });
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice.set(null), 2600);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((r) => this.later(reducedMotion() ? Math.min(ms, 150) : ms, r));
  }

  private initialPositions(): Map<string, HexCoord> {
    return new Map(CHARACTERS.map((c, i) => [c.id, { ...(this.map?.starts[i] ?? { col: 0, row: 0 }) }]));
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    clearInterval(this.rollTicker);
  }
}
