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
import { DiceTray } from '../../game/dice-3d';
import { HexBoard } from '../../game/hex-board';
import { PadAction, PadButton, PadState, Stick, deadzone, glyphFor, neighborToward } from '../../game/gamepad';
import { GamepadService } from '../../game/gamepad.service';
import { MainButton } from '../../ui/main-button';
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
  stationary,
  visionHexes,
} from '../../game/enemies';
import { HiddenItem, SEARCH_RULES, beats, canReach, entersRoom } from '../../game/search';
import { BURN_RULES, Burnable, burnTarget, seeFire } from '../../game/burn';
import { MissionProgress, Verdict, canEndMission, missionVerdict, objectiveState, visibleObjectives } from '../../game/mission';
import { GROUP_RULES, RallyPlan, followLeader, rallyPoints, suggestedRally } from '../../game/group';
import { APPROACH_PATTERN, Haptics, ROLL_PATTERN, SETTLE_PATTERN } from '../../game/haptics';
import { APPROACH_FX, waveArrival, waveDuration } from '../../game/approach-fx';
import { HexCoord, hexDistance, hexKey, hexesInRange, pathTo, reachableHexes, rectArea, sameHex } from '../../game/hex';
import { CHARACTERS, Character, GameMap, MOVE_DICE, blockedHexes, findMap, lowCoverHexes, playArea } from '../../game/maps';
import { RosterService } from '../../game/roster.service';
import { approachRulesFor, signed, statBreakdown, turnMovement } from '../../game/stats';

/** Turnos (rodadas) até o carro fugir — por enquanto só aparece na linha do tempo. */
const MISSION_DEADLINE = 5;

/**
 * `checking`: rolando um d20 (percepção, inspecionar) — nada mais anda até o dado parar.
 * `over`: a operação foi encerrada (fica o relatório na tela).
 */
type Phase = 'rolling' | 'moving-choice' | 'walking' | 'checking' | 'ending' | 'enemy' | 'over';

/** Teste de d20 mostrado na ficha da lateral. */
/** Inspeção em close-up: quem procura, onde, a face do d20 e o resultado (quando parar). */
interface SearchView {
  who: string;
  furniture: string;
  target: number;
  face: number;
  result: number | null;
  pass: boolean | null;
  /** Aviso quando acha ("Arma apreendida!"). */
  seized: string;
}

interface CheckView {
  kind: 'notice' | 'find';
  who: string;
  /** Passa com mais que isto. */
  target: number;
  /** Face à mostra (gira enquanto rola). */
  face: number;
  /** Resultado final; `null` enquanto rola. */
  result: number | null;
  pass: boolean | null;
}

/** "Fulano", "Fulano e Beltrano", "Fulano, Beltrano e Sicrano". */
const namesOf = (es: readonly EnemyState[]): string => {
  const names = es.map((e) => e.name);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : names[0];
};

/** A equipe inteira, junta (como a partida começa). */
const wholeTeam = (): ReadonlySet<string> => new Set(CHARACTERS.map((c) => c.id));

const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

@Component({
  selector: 'app-game-screen',
  imports: [MainButton],
  templateUrl: './game-screen.html',
  styleUrl: './game-screen.css',
})
export class GameScreen implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly gamepad = inject(GamepadService);
  private readonly renderSettings = inject(RenderSettings);
  /** Atributos escolhidos na ficha (escalação). */
  private readonly roster = inject(RosterService);
  private readonly haptics = inject(Haptics);
  private stopPad?: () => void;
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('board');
  private board?: HexBoard;
  private timers: ReturnType<typeof setTimeout>[] = [];
  /** Palco dos dados 3D (só existe enquanto a rolagem está na tela). */
  private readonly diceHost = viewChild<ElementRef<HTMLDivElement>>('diceHost');
  private readonly rollConfirmBtn = viewChild('rollConfirm', { read: ElementRef<HTMLButtonElement> });
  private diceTray?: DiceTray;
  /** Resultado sorteado esperando o palco aparecer para ser jogado. */
  private pendingRoll: number[] | null = null;
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
  /** Valores sorteados nesta rolagem. */
  protected readonly dice = signal<number[]>(Array(MOVE_DICE.count).fill(1));
  protected readonly rolled = signal(0);
  /** Sem WebGL: a rolagem cai nos d4 desenhados em 2D. */
  protected readonly flatDice = signal(false);
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

  /** Vibração na rolagem dos dados (celular); liga/desliga no menu. */
  protected readonly vibrationSupported = this.haptics.supported;
  protected readonly vibration = this.haptics.enabled;
  protected setVibration(on: boolean): void {
    this.haptics.setEnabled(on);
    if (on) this.haptics.vibrate(SETTLE_PATTERN);
  }

  constructor() {
    // o palco da rolagem entra e sai com a fase: monta/desmonta a bandeja 3D junto
    effect(() => {
      const host = this.diceHost()?.nativeElement;
      if (!host) {
        this.diceTray?.dispose();
        this.diceTray = undefined;
        return;
      }
      if (!this.diceTray && !this.flatDice()) {
        try {
          this.diceTray = new DiceTray(host);
        } catch {
          this.flatDice.set(true);
        }
      }
      if (this.pendingRoll) this.throwDice(this.pendingRoll);
    });
    // resultado na tela: o foco vai para "Confirmar" (Enter/Espaço fecham)
    effect(() => this.rollConfirmBtn()?.nativeElement.focus({ preventScroll: true }));
    // resultado da inspeção: o foco vai para "Fechar"
    effect(() => this.searchCloseBtn()?.nativeElement.focus({ preventScroll: true }));
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
  /** Auto de abordagem na tela: quem se rendeu e quem vai tentar correr. */
  protected readonly report = signal<{ agent: string; surrender: EnemyState[]; flee: EnemyState[] } | null>(null);
  protected readonly reportTally = computed(() => {
    const r = this.report();
    if (!r) return '';
    const s = r.surrender.length;
    const f = r.flee.length;
    return [s && `${s} ${s === 1 ? 'rendido' : 'rendidos'}`, f && `${f} ${f === 1 ? 'alertado' : 'alertados'}`, 'vez encerrada']
      .filter(Boolean)
      .join(' · ');
  });
  protected readonly statusLabel: Record<EnemyState['status'], string> = {
    patrol: 'vigiando',
    alert: 'em fuga!',
    surrendered: 'rendido',
    fled: 'fugiu',
  };

  // ---------- percepção e esconderijos ----------

  /** Teste de d20 na ficha da lateral (percepção ao entrar no cômodo, inspecionar o móvel). */
  protected readonly check = signal<CheckView | null>(null);
  private checkTimer?: ReturnType<typeof setTimeout>;
  private checkSpin?: ReturnType<typeof setInterval>;
  protected readonly searchRules = SEARCH_RULES;
  /**
   * Inspeção em close-up (toque na lupa): a câmera aproxima, o d20 rola no meio da cena e o
   * resultado fica na tela até o jogador tocar em **Fechar**.
   */
  protected readonly search = signal<SearchView | null>(null);
  private searchDone?: () => void;
  private searchSpin?: ReturnType<typeof setInterval>;
  private readonly searchCloseBtn = viewChild('searchClose', { read: ElementRef<HTMLButtonElement> });
  /** Esconderijos em que alguém reparou (o móvel ganha a lupa e pode ser inspecionado). */
  protected readonly noticed = signal<ReadonlySet<string>>(new Set());
  /** Esconderijos já achados (o que havia lá foi apreendido). */
  protected readonly found = signal<ReadonlySet<string>>(new Set());
  /** Tentativas de inspecionar que falharam, por esconderijo (o botão vira "rolar de novo"). */
  protected readonly searchFails = signal<ReadonlyMap<string, number>>(new Map());
  /** Quem já rolou percepção em cada esconderijo (`esconderijo:agente`): uma vez por agente. */
  private readonly noticeRolled = new Set<string>();

  /** Esconderijo percebido, ainda não achado, colado no agente da vez. */
  protected readonly inspectable = computed<HiddenItem | null>(() => {
    if (this.phase() !== 'moving-choice' || this.viewingOther()) return null;
    const from = this.positions().get(this.active().id);
    if (!from) return null;
    const noticed = this.noticed();
    const found = this.found();
    return (this.map?.hidden ?? []).find((h) => noticed.has(h.id) && !found.has(h.id) && canReach(from, h.spot)) ?? null;
  });

  /** O que já aconteceu e decide os objetivos (rendidos, achados, queimados). */
  private readonly progress = computed<MissionProgress>(() => ({
    enemies: this.enemies(),
    noticed: this.noticed(),
    found: this.found(),
    burned: this.burned(),
  }));

  /**
   * Objetivos da missão com a situação de cada um (os principais primeiro). Passos
   * seguintes (`after`) só aparecem depois do anterior: "Investigar a casa" vira, ao achar
   * a arma, um ✓ e o novo "Apreender a arma escondida".
   */
  protected readonly objectives = computed(() => {
    const p = this.progress();
    return visibleObjectives(this.map?.objectives ?? [], p)
      .map((o) => ({ id: o.id, text: o.text, primary: !!o.primary, state: objectiveState(o, p) }))
      .sort((a, b) => Number(b.primary) - Number(a.primary));
  });

  // ---------- queimar e encerrar a operação ----------

  protected readonly burnRules = BURN_RULES;
  /** Alvos já queimados (o fogo fica aceso até o fim). */
  protected readonly burned = signal<ReadonlySet<string>>(new Set());
  /** Pré-visualizando o "Queimar" (aguardando confirmação). */
  protected readonly burning = signal(false);

  /** Alvo ainda inteiro colado no agente da vez. */
  protected readonly burnable = computed<Burnable | null>(() => {
    if (this.phase() !== 'moving-choice' || this.viewingOther()) return null;
    const from = this.positions().get(this.active().id);
    return from ? burnTarget(from, this.map?.burnables ?? [], this.burned()) : null;
  });
  /** Quem está vigiando perto e veria o fogo (entra em alerta ao queimar). */
  protected readonly burnWitnesses = computed(() => {
    const target = this.burnable();
    return target ? seeFire(target, this.enemies()) : [];
  });

  /** Objetivos que liberam o fim cumpridos (queimar o avião): a equipe pode encerrar. */
  protected readonly canEnd = computed(() => canEndMission(this.map?.objectives ?? [], this.progress()));
  protected readonly verdict = computed<Verdict>(() => missionVerdict(this.map?.objectives ?? [], this.progress()));
  protected readonly verdictLabel: Record<Verdict, string> = {
    success: 'Missão cumprida',
    partial: 'Missão parcial',
    failure: 'Missão fracassada',
  };
  /** Relatório da operação: `confirm` pergunta antes de encerrar; `over` é o resultado final. */
  protected readonly debrief = signal<'confirm' | 'over' | null>(null);
  /** Dá para abrir o relatório agora (na vez de um agente, sem outra ação aberta). */
  protected readonly endAvailable = computed(
    () => this.canEnd() && this.phase() === 'moving-choice' && !this.debrief(),
  );

  // ---------- grupo ----------

  /**
   * Agentes agrupados (andam juntos e ganham movimento extra); vazio = cada um por si.
   * A equipe chega junta: a partida começa com todos no grupo.
   */
  protected readonly group = signal<ReadonlySet<string>>(wholeTeam());
  protected readonly groupBonus = GROUP_RULES.moveBonus;
  protected readonly groupApproachBonus = GROUP_RULES.approachBonus;
  protected readonly signed = signed;

  /** Atributos de um agente em campo (com o bônus do grupo, se ele estiver agrupado). */
  protected fieldStats(c: Character): { vel: number; int: number; range: number } {
    const loadout = this.roster.loadout(c.id);
    const grouped = this.group().has(c.id);
    return {
      vel: statBreakdown(loadout, 'velocidade', grouped).total,
      int: statBreakdown(loadout, 'intimidacao', grouped).total,
      range: approachRulesFor(loadout, grouped).radius,
    };
  }
  /** Velocidade do agente da vez que entra na rolagem (sem o grupo, que aparece à parte). */
  protected readonly activeSpeed = computed(
    () => statBreakdown(this.roster.loadout(this.active().id), 'velocidade', false).total,
  );
  /** Parcela da velocidade na conta da rolagem (" + 1 (velocidade)"), vazia sem modificador. */
  protected readonly speedTerm = computed(() => {
    const v = this.activeSpeed();
    return v ? ` ${v > 0 ? '+' : '−'} ${Math.abs(v)} (velocidade)` : '';
  });
  /** Partes do alcance da abordagem do agente da vez: base, intimidação e grupo. */
  protected readonly approachParts = computed(() => {
    const loadout = this.roster.loadout(this.active().id);
    const grouped = this.grouped();
    return {
      base: APPROACH_RULES.radius,
      int: statBreakdown(loadout, 'intimidacao', false).total,
      group: grouped ? GROUP_RULES.approachBonus : 0,
      total: this.activeApproach().radius,
    };
  });
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
  /**
   * Raio da abordagem do agente da vez: o base (`APPROACH_RULES`) + intimidação, e +2 enquanto
   * estiver agrupado (ver `approachRulesFor` em `stats.ts`).
   */
  protected readonly activeApproach = computed(() =>
    approachRulesFor(this.roster.loadout(this.active().id), this.grouped()),
  );
  /** Quem se renderia e quem tentaria correr se o agente da vez abordasse agora. */
  protected readonly approachPlan = computed(() => {
    const from = this.positions().get(this.active().id);
    return from ? resolveApproach(from, this.enemies(), this.activeApproach()) : { surrender: [], flee: [] };
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
        onClueTap: () => this.tapClue(),
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
    this.board.setBurnTargets(this.map.burnables ?? []);
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
    clearInterval(this.searchSpin);
    clearTimeout(this.noticeTimer);
    clearTimeout(this.checkTimer);
    clearInterval(this.checkSpin);
    clearInterval(this.statsTicker);
    this.diceTray?.dispose();
    this.diceTray = undefined;
    this.board?.dispose();
  }

  // ---------- turnos ----------

  private startTurn(): void {
    const active = this.active();
    this.closeApproach();
    this.closeGrouping();
    this.closeBurn();
    this.selected.set(null);
    this.focusedId.set(active.id);
    this.placeCursor(this.positions().get(active.id));
    this.board?.setActive(active.id);
    this.board?.focus(active.id);
    this.board?.setSelected(null);
    this.board?.setReachable([]);
    this.roll();
  }

  /** Rola 2d4 com dados 3D; o resultado fica na tela até o jogador confirmar. */
  private roll(): void {
    this.phase.set('rolling');
    this.rolled.set(0);
    const final = rollDice(MOVE_DICE.count, MOVE_DICE.sides);
    this.dice.set(final);
    this.pendingRoll = final;
    // palco já montado (ex.: recomeçar durante a rolagem): joga direto
    if (this.diceTray || this.flatDice()) this.throwDice(final);
  }

  private throwDice(final: number[]): void {
    this.pendingRoll = null;
    const epoch = this.epoch;
    const show = () => {
      if (this.destroyed || this.epoch !== epoch || this.dice() !== final) return;
      this.rolled.set(sum(final));
      this.movesLeft.set(turnMovement(sum(final), this.roster.loadout(this.active().id), this.grouped()));
      this.gamepad.rumble(0.3, 0.2, 120);
      this.haptics.vibrate(SETTLE_PATTERN);
    };
    // no celular, os dados "quicam" na mão (a não ser que a animação esteja reduzida)
    if (!reducedMotion()) this.haptics.vibrate(ROLL_PATTERN);
    if (this.diceTray) void this.diceTray.roll(final, { instant: reducedMotion() }).then(show);
    else this.later(reducedMotion() ? 150 : 700, show);
  }

  /** Fecha o resultado da rolagem e libera o movimento. */
  protected confirmRoll(): void {
    if (this.phase() !== 'rolling' || this.rolled() === 0) return;
    this.beginChoosing();
  }

  private beginChoosing(): void {
    this.phase.set('moving-choice');
    this.refreshBoard();
  }

  protected endTurn(): void {
    if (['walking', 'checking', 'rolling', 'enemy', 'over'].includes(this.phase())) return;
    this.clearTimers();
    this.phase.set('ending');
    this.closeApproach();
    this.closeGrouping();
    this.closeBurn();
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
      // parado no lugar (o Jô comendo): não anda nem gira, então nem chama a câmera
      if (enemy.status === 'patrol' && stationary(enemy)) continue;
      // debaixo de um telhado que o jogador não enxerga, o inimigo age sem câmera nem animação
      const shown = enemy.status === 'alert' ? await this.flee(enemy, epoch) : await this.patrol(enemy, epoch);
      if (shown) await this.wait(300);
    }
    if (stale()) return;
    this.announceIfOver();
    this.nextCharacter();
  }

  /** Patrulha um trecho. Devolve se o jogador viu alguma coisa (câmera, animação, aviso). */
  private async patrol(enemy: EnemyState, epoch: number): Promise<boolean> {
    const plan = planPatrol(enemy, ENEMY_RULES.patrolSteps, this.area, this.blockedFor(enemy.id));
    this.updateEnemy(enemy.id, { waypoint: plan.waypoint, dir: plan.dir, target: plan.target });
    if (!plan.path.length) {
      if (this.board!.isCovered(enemy.hex)) return false;
      this.say(`${enemy.name} espera: o caminho está bloqueado`, 'info');
      return true;
    }
    const shown = await this.walkEnemy(enemy.id, plan.path, (hex) => {
      if (this.epoch !== epoch) return false;
      const prev = this.enemy(enemy.id)!.hex;
      this.updateEnemy(enemy.id, { hex, facing: facingBetween(prev, hex) });
      this.refreshVision();
      // ao avistar alguém, para onde está
      return !this.checkSpotted(enemy.id);
    });
    // dá tempo de ver o "!" antes de seguir
    if (this.enemy(enemy.id)?.status === 'alert') {
      await this.wait(900);
      return true;
    }
    return shown;
  }

  /** Foge para a borda. Devolve se o jogador viu alguma coisa (câmera, animação, aviso). */
  private async flee(enemy: EnemyState, epoch: number): Promise<boolean> {
    const agents = [...this.positions().values()];
    const plan = planFlee(enemy.hex, ENEMY_RULES.fleeSteps, this.area, this.blockedFor(enemy.id), agents);
    const covered = this.board!.isCovered(enemy.hex);
    if (plan.cornered) {
      if (!covered) this.say(`${enemy.name} está encurralado!`, 'info');
      return !covered;
    }
    let shown = false;
    if (plan.path.length) {
      if (!covered) this.say(`${enemy.name} corre para a borda!`, 'alert');
      shown = await this.walkEnemy(
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
    if (this.epoch !== epoch) return shown;
    if (isBorder(this.enemy(enemy.id)!.hex, this.area)) {
      this.updateEnemy(enemy.id, { status: 'fled' });
      this.say(`${enemy.name} fugiu do mapa!`, 'alert');
      await this.board!.removeEnemy(enemy.id);
      return true;
    }
    return shown;
  }

  /**
   * Anda com o inimigo pelo caminho. Os passos de um hexágono coberto a outro (debaixo de
   * um telhado que o jogador não enxerga, ver `HexBoard.isCovered`) acontecem na hora, sem
   * câmera nem animação — o jogador não sabe o que se passa lá dentro. O resto anda
   * normalmente, com a câmera chegando antes do primeiro trecho visível. `onStep` é como o
   * de `moveEnemy`. Devolve se algum trecho apareceu na tela.
   */
  private async walkEnemy(
    id: string,
    path: HexCoord[],
    onStep: (hex: HexCoord) => boolean,
    speed = 1,
  ): Promise<boolean> {
    const board = this.board!;
    const hiddenStep = (from: HexCoord, to: HexCoord) => board.isCovered(from) && board.isCovered(to);
    let shown = false;
    let i = 0;
    while (i < path.length) {
      const from = this.enemy(id)?.hex;
      if (!from) return shown;
      if (hiddenStep(from, path[i])) {
        board.jumpEnemy(id, path[i]);
        if (!onStep(path[i++])) return shown;
        continue;
      }
      let j = i + 1;
      while (j < path.length && !hiddenStep(path[j - 1], path[j])) j++;
      if (!shown) {
        board.focusHex(from);
        await this.wait(350);
        shown = true;
      }
      let stopped = false;
      await board.moveEnemy(
        id,
        path.slice(i, j),
        (hex) => {
          stopped = !onStep(hex);
          return !stopped;
        },
        speed,
      );
      if (stopped || hexKey(this.enemy(id)?.hex ?? from) !== hexKey(path[j - 1])) return shown;
      i = j;
    }
    return shown;
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
    this.say(`${enemy.name} avistou ${this.nameOf(who)}! Vai correr para a borda.`, 'alert');
    return true;
  }

  /** Confere todos os inimigos (usado a cada passo de um agente). */
  private checkAllSpotted(agents: ReadonlyMap<string, HexCoord>): void {
    for (const e of this.enemies()) if (e.status === 'patrol') this.checkSpotted(e.id, agents);
  }

  // ---------- seleção e movimento ----------

  private tapHex(hex: HexCoord | null): void {
    if (this.phase() !== 'moving-choice') return;
    if (hex && !this.approaching() && !this.burning()) this.cursor.set(hex);
    // no modo de abordagem só os dois botões decidem: toque no tabuleiro não faz nada
    if (this.approaching()) return;
    if (this.burning()) {
      this.cancelBurn();
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
      this.cancelBurn();
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
    if (!(await this.perceive(paths))) return;
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
    this.closeBurn();
    this.selected.set(null);
    this.rallyHex.set(null);
    this.grouping.set(true);
    this.board?.setSelected(null);
    this.board?.setReachable(this.rallyPlans().keys());
    // já deixa destacado o ponto sugerido: é só confirmar (ou tocar em outro)
    const suggested = suggestedRally(this.rallyPlans(), this.active().id);
    if (suggested) {
      this.pickRally(suggested.point, false);
      this.cursor.set({ ...suggested.point });
      this.board?.keepInView(suggested.point);
    }
    this.say('Ponto de encontro sugerido: confirme ou escolha outro', 'info');
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
    this.group.set(wholeTeam());
    this.movesLeft.update((n) => Math.max(0, n - plan.cost));
    this.say(
      `Equipe agrupada! Juntos: +${GROUP_RULES.moveBonus} de movimento e +${GROUP_RULES.approachBonus} de alcance na abordagem`,
      'info',
    );
    if (!(await this.perceive(plan.paths))) return;
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

  // ---------- percepção e inspeção ----------

  /**
   * Percepção passiva: quem acabou de entrar no cômodo de um esconderijo (e ainda não
   * tinha rolado ali) rola 1d20; passando, repara no móvel. Devolve `false` se a partida
   * foi recomeçada no meio.
   */
  private async perceive(paths: ReadonlyMap<string, HexCoord[]>): Promise<boolean> {
    for (const item of this.map?.hidden ?? []) {
      for (const [who, path] of paths) {
        if (this.noticed().has(item.id)) break;
        const key = `${item.id}:${who}`;
        if (this.noticeRolled.has(key) || !entersRoom(path, item.room)) continue;
        this.noticeRolled.add(key);
        this.phase.set('checking');
        const pass = await this.rollCheck('notice', who, SEARCH_RULES.notice);
        if (pass === null) return false;
        if (!pass) continue;
        this.noticed.update((s) => new Set([...s, item.id]));
        this.board?.setClue(item.spot);
        this.board?.keepInView(item.spot);
        this.say(`${this.nameOf(who)} reparou em algo na ${item.furniture}!`, 'info');
      }
    }
    return true;
  }

  /** Toque na lupa: inspeciona se dá; senão, diz o que falta. */
  protected tapClue(): void {
    if (this.phase() !== 'moving-choice' || this.approaching() || this.burning() || this.grouping()) return;
    const item = this.inspectable();
    if (item) {
      if (this.movesLeft() < SEARCH_RULES.inspectCost) this.say(`Sem movimento para inspecionar a ${item.furniture} agora`, 'info');
      else void this.inspect();
      return;
    }
    const spot = (this.map?.hidden ?? []).find((h) => this.noticed().has(h.id) && !this.found().has(h.id));
    if (spot) this.say(`Chegue colado na ${spot.furniture} para inspecionar`, 'info');
  }

  /**
   * Inspeciona o móvel percebido (toque na lupa ou □): gasta 1 de movimento, a câmera
   * aproxima no agente e no móvel e o d20 rola ali (mais que 4 acha). O resultado fica na
   * tela até o jogador fechar; só então a câmera volta e a vez segue.
   */
  protected async inspect(): Promise<void> {
    const item = this.inspectable();
    const from = this.positions().get(this.active().id);
    if (!item || !from || this.movesLeft() < SEARCH_RULES.inspectCost) return;
    const epoch = this.epoch;
    const id = this.active().id;
    this.selected.set(null);
    this.board?.setSelected(null);
    this.board?.setReachable([]);
    this.board?.setInputEnabled(false);
    this.phase.set('checking');
    this.movesLeft.update((n) => n - SEARCH_RULES.inspectCost);
    this.board?.closeUp([from, item.spot]);
    const motion = !reducedMotion();
    // primeiro a câmera chega; depois o dado rola
    await this.wait(motion ? 550 : 0);
    if (this.destroyed || this.epoch !== epoch) return;
    const result = rollDie(SEARCH_RULES.die);
    this.search.set({
      who: this.nameOf(id),
      furniture: item.furniture,
      target: SEARCH_RULES.find,
      face: rollDie(SEARCH_RULES.die),
      result: null,
      pass: null,
      seized: item.seized,
    });
    if (motion) {
      this.haptics.vibrate(ROLL_PATTERN);
      this.searchSpin = setInterval(
        () => this.search.update((v) => (v && v.result === null ? { ...v, face: rollDie(SEARCH_RULES.die) } : v)),
        70,
      );
    }
    await this.wait(900);
    clearInterval(this.searchSpin);
    if (this.destroyed || this.epoch !== epoch) return;
    const pass = beats(result, SEARCH_RULES.find);
    this.search.update((v) => v && { ...v, face: result, result, pass });
    this.haptics.vibrate(SETTLE_PATTERN);
    this.gamepad.rumble(pass ? 0.8 : 0.3, pass ? 0.5 : 0.2, pass ? 260 : 120);
    // a mensagem fica até o jogador fechar
    await new Promise<void>((done) => (this.searchDone = done));
    if (this.destroyed || this.epoch !== epoch) return;
    this.board?.endCloseUp();
    this.board?.setInputEnabled(true);
    if (pass) {
      this.found.update((s) => new Set([...s, item.id]));
      this.board?.setClue(null);
      this.say(`${this.nameOf(id)} achou a ${item.name} na ${item.furniture}. ${item.seized}`, 'alert');
    } else {
      this.searchFails.update((m) => new Map(m).set(item.id, (m.get(item.id) ?? 0) + 1));
      this.say(
        this.movesLeft() >= SEARCH_RULES.inspectCost
          ? `Nada na ${item.furniture}… Toque na lupa para tentar de novo (1 de movimento).`
          : `Nada na ${item.furniture}… Sem movimento para tentar de novo agora.`,
        'info',
      );
    }
    this.afterMove();
  }

  /** Fecha o resultado da inspeção (botão **Fechar**, ✕ ou ○). */
  protected closeSearch(): void {
    if (this.search()?.result == null) return;
    this.search.set(null);
    const done = this.searchDone;
    this.searchDone = undefined;
    done?.();
  }

  /** Recomeço ou saída no meio da inspeção: some com o close-up sem seguir a vez. */
  private dropSearch(): void {
    clearInterval(this.searchSpin);
    this.search.set(null);
    this.searchDone = undefined;
    this.board?.endCloseUp();
    this.board?.setInputEnabled(true);
  }

  /**
   * Rola 1d20 na ficha da lateral: a face gira, para no resultado e mostra se passou.
   * Devolve se passou (mais que `target`), ou `null` se a partida foi recomeçada.
   */
  private async rollCheck(kind: CheckView['kind'], who: string, target: number): Promise<boolean | null> {
    const epoch = this.epoch;
    const result = rollDie(SEARCH_RULES.die);
    clearTimeout(this.checkTimer);
    clearInterval(this.checkSpin);
    this.check.set({ kind, who: this.nameOf(who), target, face: rollDie(SEARCH_RULES.die), result: null, pass: null });
    if (!reducedMotion()) {
      this.haptics.vibrate(ROLL_PATTERN);
      this.checkSpin = setInterval(
        () => this.check.update((c) => (c && c.result === null ? { ...c, face: rollDie(SEARCH_RULES.die) } : c)),
        70,
      );
    }
    await this.wait(900);
    clearInterval(this.checkSpin);
    if (this.destroyed || this.epoch !== epoch) return null;
    const pass = beats(result, target);
    this.check.update((c) => c && { ...c, face: result, result, pass });
    this.haptics.vibrate(SETTLE_PATTERN);
    this.gamepad.rumble(0.3, 0.2, 120);
    await this.wait(1100);
    if (this.destroyed || this.epoch !== epoch) return null;
    // a ficha fica mais um pouco na tela, sem segurar o jogo
    this.checkTimer = setTimeout(() => this.check.set(null), 2400);
    return pass;
  }

  private nameOf(id: string): string {
    return CHARACTERS.find((c) => c.id === id)?.name ?? id;
  }

  // ---------- abordagem ----------

  /**
   * Primeiro passo (toque no **Abordar** ou □): entra no modo de abordagem. O tabuleiro fica
   * em cinza, menos quem está na vez, os suspeitos no raio e o raio; nada acontece até o
   * jogador confirmar (**Abordar!**, ✕) ou cancelar (botão vermelho, ○).
   */
  protected startApproach(): void {
    if (this.phase() !== 'moving-choice' || !this.canApproach()) return;
    if (!this.map || !this.positions().get(this.active().id)) return;
    this.closeBurn();
    this.clearBoardForApproach();
    this.approaching.set(true);
    const zones = this.paintApproachZones();
    // só ficam em cor quem está na vez, os suspeitos no raio e o próprio raio
    const { surrender, flee } = this.approachPlan();
    const from = this.positions().get(this.active().id)!;
    this.board?.frameHexes([from, ...surrender.map((e) => e.hex), ...flee.map((e) => e.hex)]);
    this.board?.setSpotlight({
      units: [this.active().id],
      labels: [
        ...surrender.map((e) => ({ id: e.id, text: `${e.name} · se rende`, tone: 'surrender' as const })),
        ...flee.map((e) => ({ id: e.id, text: `${e.name} · vai correr`, tone: 'flee' as const })),
      ],
      hexes: zones ? [...zones.surrender, ...zones.flee] : [],
    });
  }

  /** Pinta as zonas da abordagem (rendição e alerta) em volta de quem está na vez. */
  private paintApproachZones(): { surrender: string[]; flee: string[] } | null {
    const from = this.positions().get(this.active().id);
    if (!from) return null;
    const zone = (min: number, max: number) =>
      hexesInRange(from, max, this.area)
        .filter((h) => !this.solid.has(hexKey(h)))
        .filter((h) => hexDistance(from, h) > min)
        .map(hexKey);
    const rules = this.activeApproach();
    const zones = { surrender: zone(0, rules.surrenderRange), flee: zone(rules.surrenderRange, rules.radius) };
    this.board?.setApproachZones(zones);
    return zones;
  }

  private clearBoardForApproach(): void {
    this.focusCharacter(this.active().id);
    this.closeGrouping();
    this.selected.set(null);
    this.board?.setSelected(null);
    this.board?.setReachable([]);
  }

  protected cancelApproach(): void {
    this.closeApproach();
    if (this.phase() === 'moving-choice') this.refreshBoard();
  }

  /** Confirma o modo de abordagem (**Abordar!** ou ✕). */
  protected confirmApproach(): void {
    if (!this.approaching() || this.phase() !== 'moving-choice') return;
    this.executeApproach();
  }

  /**
   * Aborda: rendições e alertas valem na hora, mas no tabuleiro cada suspeito reage quando
   * a onda de voz chega até ele. Depois da onda aparece o auto de abordagem e a vez acaba.
   */
  private executeApproach(): void {
    if (this.phase() !== 'moving-choice') return;
    const from = this.positions().get(this.active().id);
    const { surrender, flee } = this.approachPlan();
    if (!from || surrender.length + flee.length === 0) return;
    this.approaching.set(false);
    this.board?.setSpotlight(null);
    this.paintApproachZones();
    this.phase.set('ending');
    const motion = !reducedMotion();
    for (const e of surrender) this.updateEnemy(e.id, { status: 'surrendered', facing: facingBetween(e.hex, from) });
    for (const e of flee) this.updateEnemy(e.id, { status: 'alert', facing: facingBetween(e.hex, from) });
    this.refreshVision();
    this.gamepad.rumble(1, 0.6, 320);
    this.haptics.vibrate(APPROACH_PATTERN);
    const radius = this.activeApproach().radius;
    if (motion) this.board?.playApproachWave(from, radius);
    for (const e of [...surrender, ...flee]) {
      const delay = motion ? waveArrival(hexDistance(from, e.hex)) * 1000 : 0;
      this.later(delay, () => {
        const facing = facingBetween(e.hex, from);
        this.board?.setEnemyFacing(e.id, facing);
        if (motion) this.board?.startleEnemy(e.id);
        if (surrender.includes(e)) this.board?.setEnemySurrendered(e.id, true);
        else this.board?.setEnemyAlert(e.id, true);
      });
    }
    this.later(motion ? waveDuration(radius) * 1000 : 300, () => {
      this.board?.setApproachZones(null);
      this.report.set({ agent: this.active().name, surrender, flee });
      this.later(motion ? APPROACH_FX.reportMs : 1800, () => this.closeReport());
    });
  }

  /** Fecha o auto de abordagem (sozinho ou com um toque) e passa a vez. */
  protected closeReport(): void {
    if (!this.report()) return;
    this.report.set(null);
    if (!this.actingEnemies().length) this.announceIfOver();
    this.endTurn();
  }

  private closeApproach(): void {
    if (!this.approaching()) return;
    this.approaching.set(false);
    this.board?.setApproachZones(null);
    this.board?.setSpotlight(null);
  }

  // ---------- queimar ----------

  /** Primeiro passo: mostra o que vai queimar e quem veria o fogo. */
  protected startBurn(): void {
    const target = this.burnable();
    if (!target || this.phase() !== 'moving-choice') return;
    this.focusCharacter(this.active().id);
    this.closeApproach();
    this.closeGrouping();
    this.selected.set(null);
    this.burning.set(true);
    this.board?.setSelected(null);
    this.board?.setReachable([]);
    this.board?.keepInView(target.hexes[0]);
  }

  protected cancelBurn(): void {
    if (!this.burning()) return;
    this.closeBurn();
    if (this.phase() === 'moving-choice') this.refreshBoard();
  }

  private closeBurn(): void {
    this.burning.set(false);
  }

  /** Confirma: o alvo pega fogo, quem vigia perto entra em alerta e a vez do agente acaba. */
  protected confirmBurn(): void {
    const target = this.burnable();
    if (!this.burning() || !target || this.phase() !== 'moving-choice') return;
    const witnesses = this.burnWitnesses();
    this.closeBurn();
    this.burned.update((s) => new Set([...s, target.id]));
    this.board?.ignite(target.id, target.hexes);
    for (const e of witnesses) {
      const facing = facingBetween(e.hex, target.hexes[0]);
      this.updateEnemy(e.id, { status: 'alert', facing });
      this.board?.setEnemyFacing(e.id, facing);
      this.board?.setEnemyAlert(e.id, true);
    }
    this.refreshVision();
    this.gamepad.rumble(1, 0.7, 420);
    this.haptics.vibrate(SETTLE_PATTERN);
    const seen = witnesses.length
      ? ` ${namesOf(witnesses)} ${witnesses.length === 1 ? 'viu o fogo e vai correr' : 'viram o fogo e vão correr'}!`
      : '';
    const unlocked = this.canEnd() && this.map?.objectives?.some((o) => o.unlocksEnd && 'burn' in o && o.burn === target.id);
    this.say(
      // "n" + "o avião" = "no avião"; "n" + "os suprimentos…" = "nos suprimentos…"
      `${this.active().name} ateou fogo n${target.name}!${seen}` +
        (unlocked ? ' A equipe já pode encerrar a operação.' : ''),
      'alert',
    );
    this.phase.set('ending');
    this.later(reducedMotion() ? 400 : 2000, () => this.endTurn());
  }

  // ---------- encerrar a operação ----------

  /** Abre o relatório para confirmar o fim (só depois de cumprir o que libera o fim). */
  protected openDebrief(): void {
    if (!this.endAvailable()) return;
    this.closeApproach();
    this.closeGrouping();
    this.closeBurn();
    this.selected.set(null);
    this.board?.setSelected(null);
    this.debrief.set('confirm');
  }

  /** Volta ao jogo sem encerrar. */
  protected closeDebrief(): void {
    if (this.debrief() !== 'confirm') return;
    this.debrief.set(null);
    if (this.phase() === 'moving-choice') this.refreshBoard();
  }

  /** Encerra a operação: nada mais anda e o relatório fica com o resultado. */
  protected confirmEnd(): void {
    if (this.debrief() !== 'confirm') return;
    this.clearTimers();
    this.phase.set('over');
    this.debrief.set('over');
    this.board?.setReachable([]);
    this.board?.setSelected(null);
    this.board?.setActive(null);
    this.gamepad.rumble(0.6, 0.6, 300);
  }

  protected cancel(): void {
    this.selected.set(null);
    this.board?.setSelected(null);
  }

  protected restart(): void {
    this.epoch++;
    this.clearTimers();
    this.report.set(null);
    this.positions.set(this.initialPositions());
    this.group.set(wholeTeam());
    this.closeGrouping();
    this.board?.placeUnits(this.positions());
    this.enemies.set(this.initialEnemies());
    this.noticed.set(new Set());
    this.found.set(new Set());
    this.searchFails.set(new Map());
    this.noticeRolled.clear();
    clearTimeout(this.checkTimer);
    clearInterval(this.checkSpin);
    this.check.set(null);
    this.dropSearch();
    this.board?.setClue(null);
    this.burned.set(new Set());
    this.closeBurn();
    this.debrief.set(null);
    this.board?.clearFires();
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
    // relatório na tela: ✕ encerra (ou recomeça, no fim) e ○ volta ao jogo
    if (this.debrief()) {
      if (b === 'cross' && this.debrief() === 'confirm') this.confirmEnd();
      else if (b === 'cross') this.restart();
      else if (b === 'circle') this.closeDebrief();
      else if (b === 'options') this.padHelp.update((v) => !v);
      return;
    }
    switch (b) {
      case 'cross':
        if (this.search()) this.closeSearch();
        else if (this.report()) this.closeReport();
        else if (this.phase() === 'rolling') this.confirmRoll();
        else if (this.approaching()) this.confirmApproach();
        else if (this.burning()) this.confirmBurn();
        else if (this.grouping()) void this.confirmGrouping();
        else if (this.viewingOther()) this.focusCharacter(this.active().id);
        else if (choosing && this.selected()) void this.confirm();
        else this.focusUnitUnderCursor();
        break;
      case 'circle':
        if (this.search()) this.closeSearch();
        else if (this.approaching()) this.cancelApproach();
        else if (this.burning()) this.cancelBurn();
        else if (this.grouping()) this.cancelGrouping();
        else if (this.viewingOther()) this.focusCharacter(this.active().id);
        else if (this.selected()) {
          this.cancel();
          this.placeCursor(this.positions().get(this.active().id));
        }
        break;
      case 'square':
        // □ abre o modo de abordagem (de novo, cancela);
        // sem ninguém no raio, queima o alvo ou inspeciona o móvel percebido ao lado
        if (this.approaching()) this.cancelApproach();
        else if (this.burning()) this.cancelBurn();
        else if (this.grouping()) break;
        else if (this.canApproach()) this.startApproach();
        else if (this.burnable()) this.startBurn();
        else if (this.inspectable()) void this.inspect();
        break;
      case 'l3':
        this.openDebrief();
        break;
      case 'share':
        // Share: agrupa (ou desagrupa) a equipe
        if (this.grouping()) this.cancelGrouping();
        else if (this.group().size) this.ungroup();
        else this.startGrouping();
        break;
      case 'triangle':
        if (choosing && !this.approaching() && !this.burning()) this.endTurn();
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
    if (!map || !this.board || this.phase() === 'enemy' || this.approaching() || this.burning() || this.debrief()) return;
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
  }
}
