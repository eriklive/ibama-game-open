import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { rollDice, rollDie, sum } from '../../game/dice';
import { HexBoard } from '../../game/hex-board';
import { PadAction, PadButton, PadState, Stick, deadzone, glyphFor, neighborToward } from '../../game/gamepad';
import { GamepadService } from '../../game/gamepad.service';
import { RENDER_PROFILES, RenderMode, RenderSettings } from '../../game/render-settings';
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
import { GROUP_RULES, RallyPlan, followLeader, rallyPoints } from '../../game/group';
import { HexCoord, hexDistance, hexKey, hexesInRange, pathTo, reachableHexes, rectArea, sameHex } from '../../game/hex';
import { CHARACTERS, Character, GameMap, MOVE_DICE, blockedHexes, findMap, lowCoverHexes, playArea } from '../../game/maps';

/** Turnos (rodadas) até o carro fugir — por enquanto só aparece na linha do tempo. */
const MISSION_DEADLINE = 5;

type Phase ='rolling' | 'moving-choice' | 'walking' | 'ending' | 'enemy';

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
  private readonly gamepad = inject(GamepadService);
  private readonly renderSettings = inject(RenderSettings);
  private stopPad?: () => void;
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('board');
  private board?: HexBoard;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private rollTicker?: ReturnType<typeof setInterval>;
  private destroyed = false;
  /** Muda a cada "Recomeçar": animações antigas param de mexer no estado. */
  private epoch = 0;

  protected readonly map: GameMap | undefined = findMap(inject(ActivatedRoute).snapshot.paramMap.get('mapId'));
  protected readonly characters = CHARACTERS;
  /** Paredes, árvores, avião e carga alta: bloqueiam passagem e visão. */
  private readonly walls = this.map ? blockedHexes(this.map) : new Set<string>();
  /** Carga baixa: bloqueia passagem; esconde da visão só quem está colado nela. */
  private readonly lowCover = this.map ? lowCoverHexes(this.map) : new Set<string>();
  /** Tudo o que ninguém atravessa (paredes e toda a carga). */
  private readonly solid = new Set([...this.walls, ...this.lowCover]);
  /** Onde se joga: o círculo da missão (ou o retângulo do mapa de teste). */
  private readonly area = this.map ? playArea(this.map) : rectArea(0, 0);
  protected readonly diceSides = MOVE_DICE.sides;

  protected readonly positions = signal<ReadonlyMap<string, HexCoord>>(this.initialPositions());
  protected readonly activeIndex = signal(0);
  /** Turno global: aumenta a cada vez que um personagem começa a jogar. */
  protected readonly turn = signal(1);
  protected readonly phase = signal<Phase>('rolling');
  /** Valores mostrados nos dados (mudam durante a animação). */
  protected readonly dice = signal<number[]>(Array(MOVE_DICE.count).fill(1));
  protected readonly rolled = signal(0);
  protected readonly movesLeft = signal(0);
  protected readonly selected = signal<HexCoord | null>(null);
  /** Personagem em foco na interface (tocado no tabuleiro ou no retrato). */
  protected readonly focusedId = signal<string>(CHARACTERS[0].id);
  protected readonly enemies = signal<readonly EnemyState[]>(this.initialEnemies());
  /** Último acontecimento com inimigos (avistou, correu, fugiu…), mostrado num aviso. */
  protected readonly notice = signal<{ text: string; tone: 'alert' | 'info' } | null>(null);
  private noticeTimer?: ReturnType<typeof setTimeout>;

  /** Controle conectado (DualShock 4 ou outro): troca os textos de toque pelos botões. */
  protected readonly pad = this.gamepad.pad;
  /** Hexágono apontado pelo cursor do controle. */
  protected readonly cursor = signal<HexCoord | null>(null);
  /** Legenda dos botões do controle (Options mostra/esconde). */
  protected readonly padHelp = signal(false);

  /** Menu (modo de renderização e números do carregamento). */
  protected readonly menuOpen = signal(false);
  protected readonly renderMode = this.renderSettings.mode;
  protected readonly renderProfiles = Object.values(RENDER_PROFILES);
  protected readonly renderStats = signal<ReturnType<HexBoard['renderStats']> | null>(null);
  private statsTicker?: ReturnType<typeof setInterval>;

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
    clearInterval(this.statsTicker);
    if (this.menuOpen()) {
      const tick = () => this.renderStats.set(this.board?.renderStats() ?? null);
      tick();
      this.statsTicker = setInterval(tick, 250);
    }
  }

  protected setRenderMode(mode: RenderMode): void {
    this.renderSettings.set(mode);
  }

  constructor() {
    // troca de modo no menu: o tabuleiro remonta o mundo em segundo plano
    effect(() => {
      const mode = this.renderMode();
      this.board?.setProfile(RENDER_PROFILES[mode]);
    });
    // o cursor só aparece no tabuleiro com um controle conectado
    // (lê os sinais antes do `?.`: sem tabuleiro ainda, o effect precisa ficar inscrito neles)
    effect(() => {
      const hex = this.pad() ? this.cursor() : null;
      this.board?.setCursor(hex);
    });
  }

  /** Símbolo do botão do controle para uma ação (✕, ○, □, △ no DualShock 4). */
  protected glyph(action: PadAction): string {
    const p = this.pad();
    return p ? glyphFor(p.kind, action) : '';
  }

  protected readonly enemyCounts = computed(() => {
    const es = this.enemies();
    return {
      patrol: es.filter((e) => e.status === 'patrol').length,
      alert: es.filter((e) => e.status === 'alert').length,
      surrendered: es.filter((e) => e.status === 'surrendered').length,
      fled: es.filter((e) => e.status === 'fled').length,
    };
  });

  /** Resumo da pilha de suspeitos: só os estados que têm alguém. */
  protected readonly enemySummary = computed(() => {
    const c = this.enemyCounts();
    return [
      c.alert && `${c.alert} em fuga!`,
      c.patrol && `${c.patrol} vigiando`,
      c.surrendered && `${c.surrendered} ${c.surrendered === 1 ? 'rendido' : 'rendidos'}`,
      c.fled && `${c.fled} ${c.fled === 1 ? 'fugiu' : 'fugiram'}`,
    ]
      .filter(Boolean)
      .join(' · ');
  });
  /** A pilha de suspeitos aberta em lista. */
  protected readonly suspectsOpen = signal(false);
  protected toggleSuspects(): void {
    this.suspectsOpen.update((v) => !v);
  }

  /** Pré-visualizando a abordagem (zonas pintadas, aguardando confirmação). */
  protected readonly approaching = signal(false);
  protected readonly approachRules = APPROACH_RULES;
  protected readonly statusLabel: Record<EnemyState['status'], string> = {
    patrol: 'vigiando',
    alert: 'em fuga!',
    surrendered: 'rendido',
    fled: 'fugiu',
  };

  // ---------- grupo ----------

  /** Agentes agrupados (andam juntos e ganham movimento extra); vazio = cada um por si. */
  protected readonly group = signal<ReadonlySet<string>>(new Set());
  protected readonly groupBonus = GROUP_RULES.moveBonus;
  /** Escolhendo o ponto de encontro do "Agrupar". */
  protected readonly grouping = signal(false);
  /** Ponto de encontro destacado (aguardando confirmação). */
  protected readonly rallyHex = signal<HexCoord | null>(null);
  protected inGroup(c: Character): boolean {
    return this.group().has(c.id);
  }
  protected readonly grouped = computed(() => this.group().has(this.active().id));

  /** Pontos de encontro possíveis com o movimento que resta ao agente da vez. */
  private readonly rallyPlans = computed<Map<string, RallyPlan>>(() => {
    const map = this.map;
    if (!map || this.phase() !== 'moving-choice' || this.group().size) return new Map();
    return rallyPoints(this.active().id, this.positions(), this.movesLeft(), this.area, this.enemyWalls());
  });
  protected readonly canGroup = computed(() => CHARACTERS.length > 1 && this.rallyPlans().size > 0);
  protected readonly rallyPlan = computed(() => {
    const h = this.rallyHex();
    return h ? this.rallyPlans().get(hexKey(h)) : undefined;
  });

  /** Linha do tempo da fita no topo: no último turno o carro foge. */
  protected readonly deadline = MISSION_DEADLINE;
  protected readonly timeline = Array.from({ length: MISSION_DEADLINE }, (_, i) => i + 1);
  protected readonly late = computed(() => this.round() > MISSION_DEADLINE);
  /** Inclinação dos papéis (fotos e fichas), para não ficarem alinhados demais. */
  protected readonly tilts = [-3, 2, -1, 1.5];

  protected onTurn(c: Character): boolean {
    return c.id === this.active().id && this.phase() !== 'enemy';
  }

  /** Cor da silhueta na foto 3x4: a cor do agente escurecida. */
  protected shade(c: Character): string {
    const k = 0.62;
    const r = Math.round(((c.color >> 16) & 255) * k);
    const g = Math.round(((c.color >> 8) & 255) * k);
    const b = Math.round((c.color & 255) * k);
    return `rgb(${r}, ${g}, ${b})`;
  }
  /** Quem se renderia e quem tentaria correr se o agente da vez abordasse agora. */
  protected readonly approachPlan = computed(() => {
    const from = this.positions().get(this.active().id);
    return from ? resolveApproach(from, this.enemies()) : { surrender: [], flee: [] };
  });
  protected readonly canApproach = computed(
    () => this.approachPlan().surrender.length + this.approachPlan().flee.length > 0,
  );

  protected readonly approachCount = computed(
    () => this.approachPlan().surrender.length + this.approachPlan().flee.length,
  );

  protected readonly active = computed<Character>(() => CHARACTERS[this.activeIndex()]);
  protected readonly focused = computed<Character>(
    () => CHARACTERS.find((c) => c.id === this.focusedId()) ?? this.active(),
  );
  protected readonly viewingOther = computed(() => this.focusedId() !== this.active().id);
  protected readonly round = computed(() => Math.floor((this.turn() - 1) / CHARACTERS.length) + 1);

  /** Alcance do personagem da vez com o movimento que ainda resta (contornando os outros). */
  private readonly reach = computed(() => {
    const map = this.map;
    const from = this.positions().get(this.active().id);
    if (!map || !from || this.phase() !== 'moving-choice') return new Map();
    const group = this.group();
    const leader = this.active().id;
    const blocked = new Set([
      // no grupo, o líder passa por entre os companheiros (eles andam junto)
      ...[...this.positions()]
        .filter(([id]) => id !== leader && !(group.has(leader) && group.has(id)))
        .map(([, h]) => hexKey(h)),
      ...this.solid,
      ...this.onBoardEnemies().map((e) => hexKey(e.hex)),
    ]);
    return reachableHexes(from, this.movesLeft(), this.area, blocked);
  });
  /** Destinos que dá para escolher: o alcance menos os hexágonos com agentes. */
  private readonly destinations = computed(() => {
    const occupied = new Set([...this.positions().values()].map(hexKey));
    return new Set([...this.reach().keys()].filter((k) => !occupied.has(k)));
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
        onUnitTap: (id) => this.focusCharacter(id),
      },
      {
        profile: this.renderSettings.profile(),
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
    this.startTurn();
    this.stopPad = this.gamepad.listen({
      button: (b) => this.padButton(b),
      move: (dir) => this.moveCursor(dir),
      frame: (dt, state) => this.padFrame(dt, state),
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopPad?.();
    this.clearTimers();
    clearTimeout(this.noticeTimer);
    clearInterval(this.statsTicker);
    this.board?.dispose();
  }

  // ---------- turnos ----------

  private startTurn(): void {
    const active = this.active();
    this.closeApproach();
    this.closeGrouping();
    this.selected.set(null);
    this.focusedId.set(active.id);
    this.placeCursor(this.positions().get(active.id));
    this.board?.setActive(active.id);
    this.board?.focus(active.id);
    this.board?.setSelected(null);
    this.board?.setReachable([]);
    this.roll();
  }

  /** Rola 2d4 com animação; ao parar, a soma vira o movimento do turno. */
  private roll(): void {
    this.phase.set('rolling');
    this.rolled.set(0);
    const final = rollDice(MOVE_DICE.count, MOVE_DICE.sides);
    const duration = reducedMotion() ? 250 : 1100;
    this.rollTicker = setInterval(
      () => this.dice.set(final.map(() => rollDie(MOVE_DICE.sides))),
      reducedMotion() ? 250 : 70,
    );
    this.later(duration, () => {
      clearInterval(this.rollTicker);
      this.dice.set(final);
      this.rolled.set(sum(final));
      this.movesLeft.set(sum(final) + (this.grouped() ? GROUP_RULES.moveBonus : 0));
      // mostra o resultado um instante antes de liberar o movimento
      this.later(reducedMotion() ? 150 : 650, () => this.beginChoosing());
    });
  }

  private beginChoosing(): void {
    this.phase.set('moving-choice');
    this.refreshBoard();
  }

  protected endTurn(): void {
    if (this.phase() === 'walking' || this.phase() === 'rolling' || this.phase() === 'enemy') return;
    this.clearTimers();
    this.phase.set('ending');
    this.closeApproach();
    this.closeGrouping();
    if (this.activeIndex() === CHARACTERS.length - 1 && this.actingEnemies().length) {
      void this.enemyTurn();
      return;
    }
    this.nextCharacter();
  }

  private nextCharacter(): void {
    this.activeIndex.update((i) => (i + 1) % CHARACTERS.length);
    this.turn.update((t) => t + 1);
    this.startTurn();
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
    this.nextCharacter();
  }

  private async patrol(enemy: EnemyState, epoch: number): Promise<void> {
    const map = this.map!;
    const plan = planPatrol(enemy, ENEMY_RULES.patrolSteps, this.area, this.blockedFor(enemy.id));
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
    const plan = planFlee(enemy.hex, ENEMY_RULES.fleeSteps, this.area, this.blockedFor(enemy.id), agents);
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
    if (isBorder(this.enemy(enemy.id)!.hex, this.area)) {
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
    const who = spotted(enemy, agents, this.area, this.walls, this.lowCover);
    if (!who) return false;
    const agent = agents.get(who)!;
    // vira para quem viu
    this.updateEnemy(enemyId, { status: 'alert', facing: facingBetween(enemy.hex, agent) });
    this.board?.setEnemyFacing(enemyId, facingBetween(enemy.hex, agent));
    this.board?.setEnemyAlert(enemyId, true);
    this.refreshVision();
    this.gamepad.rumble(0.7, 0.4, 260);
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
    if (hex && !this.approaching()) this.cursor.set(hex);
    if (this.approaching()) {
      this.cancelApproach();
      return;
    }
    if (this.grouping()) {
      this.pickRally(hex, true);
      return;
    }
    if (this.viewingOther()) this.focusCharacter(this.active().id);
    if (hex && this.destinations().has(hexKey(hex))) {
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

  protected focusCharacter(id: string): void {
    if (id !== this.active().id) {
      this.cancelApproach();
      this.cancelGrouping();
    }
    this.focusedId.set(id);
    this.board?.focus(id);
    this.placeCursor(this.positions().get(id));
    if (id !== this.active().id) {
      this.selected.set(null);
      this.board?.setSelected(null);
    }
  }

  protected async confirm(): Promise<void> {
    const target = this.selected();
    if (!this.board || !target || this.phase() !== 'moving-choice') return;
    const path = pathTo(this.reach(), target);
    if (!path.length) return;
    const id = this.active().id;
    const paths = new Map([[id, path]]);
    let left: string[] = [];
    if (this.grouped()) {
      // os companheiros seguem o rastro do líder
      const followers = new Map([...this.positions()].filter(([o]) => o !== id && this.group().has(o)));
      const plan = followLeader(this.positions().get(id)!, path, followers, this.area, this.enemyWalls());
      for (const [o, p] of plan.paths) paths.set(o, p);
      left = plan.left;
    }
    if (!(await this.walkUnits(id, paths))) return;
    if (left.length) this.leaveGroup(left, 'ficou para trás');
    this.movesLeft.update((n) => n - path.length);
    this.afterMove();
  }

  /** Anda com um ou mais agentes ao mesmo tempo, conferindo a visão dos inimigos a cada passo. */
  private async walkUnits(leaderId: string, paths: ReadonlyMap<string, HexCoord[]>): Promise<boolean> {
    const epoch = this.epoch;
    this.phase.set('walking');
    this.selected.set(null);
    const live = new Map(this.positions());
    await this.board!.moveUnits(leaderId, paths, (who, hex) => {
      if (this.epoch !== epoch) return;
      live.set(who, hex);
      // quem entra no cone de visão é avistado na hora, mesmo só de passagem
      this.checkAllSpotted(live);
    });
    if (this.destroyed || this.epoch !== epoch) return false;
    this.positions.update((m) => {
      const next = new Map(m);
      for (const [who, p] of paths) if (p.length) next.set(who, p.at(-1)!);
      return next;
    });
    return true;
  }

  /** Depois de andar: segue escolhendo, espera para abordar ou passa a vez. */
  private afterMove(): void {
    if (this.movesLeft() <= 0 && this.canApproach()) {
      // sem movimento, mas com inimigos no raio: espera para poder abordar
      this.beginChoosing();
    } else if (this.movesLeft() <= 0) {
      // sem movimento: passa a vez automaticamente após um instante
      this.phase.set('ending');
      this.later(reducedMotion() ? 200 : 700, () => this.endTurn());
    } else {
      this.beginChoosing();
    }
  }

  // ---------- agrupar ----------

  /** Primeiro passo: mostra os pontos de encontro possíveis. */
  protected startGrouping(): void {
    if (this.phase() !== 'moving-choice' || !this.canGroup()) return;
    this.focusCharacter(this.active().id);
    this.selected.set(null);
    this.rallyHex.set(null);
    this.grouping.set(true);
    this.board?.setSelected(null);
    this.board?.setReachable(this.rallyPlans().keys());
    this.say('Escolha o ponto de encontro', 'info');
  }

  /** Destaca um ponto de encontro (o caminho do líder brilha); tocar de novo confirma. */
  private pickRally(hex: HexCoord | null, tapToConfirm: boolean): void {
    const plan = hex ? this.rallyPlans().get(hexKey(hex)) : undefined;
    if (plan && tapToConfirm && sameHex(hex, this.rallyHex())) {
      void this.confirmGrouping();
      return;
    }
    this.rallyHex.set(plan ? plan.point : null);
    this.board?.setSelected(this.rallyHex(), plan?.paths.get(this.active().id) ?? []);
  }

  protected cancelGrouping(): void {
    if (!this.grouping()) return;
    this.closeGrouping();
    if (this.phase() === 'moving-choice') this.refreshBoard();
  }

  private closeGrouping(): void {
    if (!this.grouping()) return;
    this.grouping.set(false);
    this.rallyHex.set(null);
    this.board?.setSelected(null);
  }

  /** Todos andam até o ponto de encontro e passam a andar juntos. */
  protected async confirmGrouping(): Promise<void> {
    const plan = this.rallyPlan();
    if (!this.board || !plan || !this.grouping() || this.phase() !== 'moving-choice') return;
    const id = this.active().id;
    this.closeGrouping();
    if (!(await this.walkUnits(id, plan.paths))) return;
    this.group.set(new Set(CHARACTERS.map((c) => c.id)));
    this.movesLeft.update((n) => Math.max(0, n - plan.cost));
    this.say(`Equipe agrupada! Andando juntos: +${GROUP_RULES.moveBonus} de movimento`, 'info');
    this.afterMove();
  }

  /** Desfaz o grupo: cada um volta a andar por conta própria. */
  protected ungroup(): void {
    if (this.phase() !== 'moving-choice' || !this.group().size) return;
    this.group.set(new Set());
    this.say('Equipe desagrupada: cada um por si', 'info');
    this.refreshBoard();
  }

  /** Tira agentes do grupo; com menos de dois, o grupo acaba. */
  private leaveGroup(ids: string[], why: string): void {
    const next = new Set([...this.group()].filter((id) => !ids.includes(id)));
    this.group.set(next.size > 1 ? next : new Set());
    const names = ids.map((id) => CHARACTERS.find((c) => c.id === id)?.name ?? id);
    this.say(`${names.join(' e ')} ${why}`, 'info');
  }

  // ---------- abordagem ----------

  /** Primeiro passo: mostra o raio e quem se renderia ou correria. */
  protected startApproach(): void {
    if (this.phase() !== 'moving-choice' || !this.canApproach()) return;
    const map = this.map;
    const from = this.positions().get(this.active().id);
    if (!map || !from) return;
    this.focusCharacter(this.active().id);
    this.closeGrouping();
    this.selected.set(null);
    this.approaching.set(true);
    this.board?.setSelected(null);
    this.board?.setReachable([]);
    const zone = (min: number, max: number) =>
      hexesInRange(from, max, this.area)
        .filter((h) => !this.solid.has(hexKey(h)))
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
    this.gamepad.rumble(1, 0.6, 320);
    this.phase.set('ending');
    if (!this.actingEnemies().length) this.later(1400, () => this.announceIfOver());
    this.later(reducedMotion() ? 400 : 1600, () => this.endTurn());
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
    this.group.set(new Set());
    this.closeGrouping();
    this.board?.placeUnits(this.positions());
    this.enemies.set(this.initialEnemies());
    this.board?.placeEnemies(this.enemies().map((e) => ({ ...e, alert: false, surrendered: false, gone: false })));
    this.refreshVision();
    this.notice.set(null);
    this.activeIndex.set(0);
    this.turn.set(1);
    this.startTurn();
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

  // ---------- controle (DualShock 4) ----------

  /**
   * ✕ confirma · ○ cancela · □ aborda · △ passa a vez · L1/R1 trocam o personagem em foco ·
   * touchpad/R3 voltam para quem está na vez · Options mostra os comandos.
   */
  private padButton(b: PadButton): void {
    const choosing = this.phase() === 'moving-choice';
    switch (b) {
      case 'cross':
        if (this.approaching()) this.confirmApproach();
        else if (this.grouping()) void this.confirmGrouping();
        else if (this.viewingOther()) this.focusCharacter(this.active().id);
        else if (choosing && this.selected()) void this.confirm();
        else this.focusUnitUnderCursor();
        break;
      case 'circle':
        if (this.approaching()) this.cancelApproach();
        else if (this.grouping()) this.cancelGrouping();
        else if (this.viewingOther()) this.focusCharacter(this.active().id);
        else if (this.selected()) {
          this.cancel();
          this.placeCursor(this.positions().get(this.active().id));
        }
        break;
      case 'square':
        if (this.approaching()) this.cancelApproach();
        else if (!this.grouping()) this.startApproach();
        break;
      case 'share':
        // Share: agrupa (ou desagrupa) a equipe
        if (this.grouping()) this.cancelGrouping();
        else if (this.group().size) this.ungroup();
        else this.startGrouping();
        break;
      case 'triangle':
        if (choosing && !this.approaching()) this.endTurn();
        break;
      case 'l1':
      case 'r1': {
        if (this.phase() === 'enemy') break;
        const ids = CHARACTERS.map((c) => c.id);
        const i = ids.indexOf(this.focusedId());
        this.focusCharacter(ids[(i + (b === 'r1' ? 1 : ids.length - 1)) % ids.length]);
        break;
      }
      case 'touchpad':
      case 'r3':
        if (this.phase() !== 'enemy') this.focusCharacter(this.active().id);
        break;
      case 'options':
        this.padHelp.update((v) => !v);
        break;
    }
  }

  /** Anda o cursor um hexágono; sobre um destino alcançável, já mostra o caminho (como o 1º toque). */
  private moveCursor(dir: Stick): void {
    const map = this.map;
    if (!map || !this.board || this.phase() === 'enemy' || this.approaching()) return;
    const from = this.cursor() ?? this.positions().get(this.active().id);
    if (!from) return;
    const next = neighborToward(from, dir);
    if (!this.area.has(next)) return;
    this.cursor.set(next);
    this.board.keepInView(next);
    if (this.phase() !== 'moving-choice') return;
    if (this.viewingOther()) {
      this.focusedId.set(this.active().id);
      this.board.focus(this.active().id, false);
    }
    if (this.grouping()) {
      this.pickRally(next, false);
      return;
    }
    this.selected.set(this.destinations().has(hexKey(next)) ? next : null);
    this.board.setSelected(this.selected(), this.selectedPath());
  }

  /** Analógico direito move a câmera; R2 aproxima e L2 afasta. */
  private padFrame(dt: number, state: PadState): void {
    if (!this.board) return;
    const r = deadzone(state.right);
    if (r.x || r.y) this.board.panBy(r.x * dt * 9, r.y * dt * 9);
    const zoom = state.buttons.l2 - state.buttons.r2;
    if (Math.abs(zoom) > 0.1) this.board.zoomBy(Math.exp(zoom * dt * 1.6));
  }

  /** ✕ sobre um agente (que não é destino) mostra aquele agente. */
  private focusUnitUnderCursor(): void {
    const c = this.cursor();
    const who = c && [...this.positions()].find(([, h]) => sameHex(h, c))?.[0];
    if (who) this.focusCharacter(who);
  }

  private placeCursor(hex: HexCoord | undefined): void {
    if (hex) this.cursor.set({ ...hex });
  }

  // ---------- auxiliares ----------

  private refreshBoard(): void {
    this.board?.setReachable(this.destinations());
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

  /** Paredes, carga e inimigos no tabuleiro: o que bloqueia os agentes (sem contar os outros agentes). */
  private enemyWalls(): Set<string> {
    return new Set([...this.solid, ...this.onBoardEnemies().map((e) => hexKey(e.hex))]);
  }

  /** Hexágonos que um inimigo não pode atravessar: paredes, agentes e os outros inimigos. */
  private blockedFor(enemyId: string): Set<string> {
    return new Set([
      ...this.solid,
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
      .flatMap((e) =>
        visionHexes(e, this.area, this.walls, ENEMY_RULES.visionRange, ENEMY_RULES.visionAngle, this.lowCover).map(hexKey),
      );
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
