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
import { Rng, rollDice, rollDie, sum } from '../../game/dice';
import {
  GameAction,
  GameState,
  Sighting,
  World,
  applyAction,
  doorOutcome,
  firstSighting,
  initialGameState,
  isGrouped,
  isLed,
  lineOf,
  planFleeAct,
  planBreakIn,
  planDoor,
  planMove,
  planPatrolAct,
  planRally,
  planReline,
  rallyFree,
  rallyOptions,
  sightBlockers,
  solidOf,
  validateAction,
} from '../../game/engine';
import {
  CHASE_RULES,
  ChaseAgent,
  ChaseCandidate,
  ChaseStats,
  Side,
  agentSight,
  arrestQueue,
  type ArrestEscort,
  chaseCandidates,
  targetChoices,
  initiativeChance,
  initiativeCheck,
  lockRoute,
  ChaseRoute,
  agentRate,
  resolveSprint,
  sprintRate,
  sprintTotalMs,
} from '../../game/chase';
import { RunnerEvent } from '../../game/runner';
import { hasRunner, runnerStart } from '../../game/runner-maps';
import { RunnerSession } from '../../game/runner-session';
import { ChaseHud, ChaseOverlay, SPRINT_DIE_MS, SprintView, TargetPrompt } from '../../ui/chase/chase-overlay';
import { CloseUpInsets, HexBoard, NPC_TARGET, SECONDS_PER_HEX } from '../../game/hex-board';
import { Sound } from '../../game/sound.service';
import { zoneAt } from '../../game/audio/ambience';
import { surfaceAt } from '../../game/audio/footsteps';
import { STRIKE_SECONDS } from '../../game/audio/sounds';
import { PadAction, PadButton, PadState, Stick, deadzone, glyphFor, neighborToward } from '../../game/gamepad';
import { GamepadService } from '../../game/gamepad.service';
import { MainButton } from '../../ui/main-button';
import { D4 } from '../../ui/dice/d4';
import { D20 } from '../../ui/dice/d20';
import { TalkButton } from '../../ui/interrogation/talk-button';
import { InterrogationPanel, InterrogationView } from '../../ui/interrogation/interrogation-panel';
import { RENDER_PROFILES, RenderMode, RenderSettings } from '../../game/render-settings';
import {
  APPROACH_RULES,
  ENEMY_RULES,
  EnemyState,
  canAct,
  facingBetween,
  known,
  lineOfSight,
  onBoard,
  resolveApproach,
  rollEscape,
  spawnEnemy,
  stationary,
  visionHexes,
} from '../../game/enemies';
import { HiddenItem, SEARCH_RULES, beats, canReach, needsNoticeRoll } from '../../game/search';
import {
  BREAK_IN_RULES,
  BreakInRoll,
  DOOR_REACTIONS,
  DOOR_RULES,
  Door,
  DoorAction,
  doorChance,
  doorNeed,
  isOpen,
  nextToDoor,
  rollsDie,
  spawnDoors,
} from '../../game/door';
import { BREAK_IN_SCENE, breakInVerdict } from '../../game/break-in-scene';
import { BURN_RULES, Burnable, burnTarget, canBurn, seeFire } from '../../game/burn';
import {
  KEY_PANEL_ID,
  KEY_TAKEN,
  PlaneState,
  WITNESS_LINE,
  leftKey,
  lockedClue,
  lookInside,
  nextToPanel,
  witness,
} from '../../game/plane';
import {
  CABIN_ITEMS,
  CabinEvent,
  CabinState,
  INITIAL_CABIN,
  cabinBuilt,
  cabinClutter,
  cabinItem,
  cabinItemsLeft,
  cabinStep,
  cabinSummary,
  CABIN_NOTICE_ID,
  canEnterPlane,
  planeDoorSpot,
} from '../../game/plane-cabin';
import { MissionProgress, Verdict, canEndMission, missionVerdict, objectiveState, visibleObjectives } from '../../game/mission';
import { IntroTarget, STRUCTURE_TOP, introTargets } from '../../game/mission-intro';
import { IntroMark, MissionIntro } from '../../ui/mission-intro/mission-intro';
import { LESSONS, LessonId, insideScreen, lessonDue, markSeen, readSeen } from '../../game/tactical-board';
import { TacticalBoard } from '../../ui/tactical-board/tactical-board';
import { CLASS_INFO, CLASS_RULES, skillBonus, SKILLS } from '../../game/agent-class';
import {
  GROUP_RULES,
  RallyPlan,
  suggestedRally,
  toBack,
  toFront,
} from '../../game/group';
import { AIM_PATTERN, APPROACH_PATTERN, Haptics, ROLL_PATTERN, SETTLE_PATTERN } from '../../game/haptics';
import { waveArrival, waveDuration } from '../../game/approach-fx';
import { ApproachTablet, TabletReport } from '../../ui/approach-tablet/approach-tablet';
import { HexCoord, hexDistance, hexKey, hexToWorld, hexesInRange, pathTo, reachableHexes, rectArea, sameHex } from '../../game/hex';
import { CHARACTERS, Character, GameMap, HexRect, MOVE_DICE, blockedHexes, findMap, lowCoverHexes, playArea } from '../../game/maps';
import { RosterService } from '../../game/roster.service';
import { SLOT_COUNT, SAVE_VERSION, SaveGames, SaveId, SaveState, savedAtLabel } from '../../game/save-game';
import { TEST_CASES, TestCase, findTestCase } from '../../game/test-cases';
import {
  Clues,
  DialogueMemory,
  EMPTY_MEMORY,
  INTERROGATION_RULES,
  NoteKind,
  PoolUsage,
  askQuestion,
  dialogueOptions,
  hasDialogue,
  inAura,
  hasTalked,
  itemClue,
  noteKind,
  noticedAfter,
  openingLine,
  pickLine,
  questionCost,
  talkTarget,
} from '../../game/interrogation';
import { npcClass } from '../../game/npc-dialogue';
import { approachRulesFor, signed, statBreakdown } from '../../game/stats';

/** Turnos (rodadas) até o carro fugir — por enquanto só aparece na linha do tempo. */
const MISSION_DEADLINE = 5;

/**
 * Folga (ms) entre um "segura" do slow e o próximo: decisão → rolagem, ou um dado atrás do outro,
 * ficam no mesmo slow, sem voltar ao normal no meio.
 */
const SLOW_GRACE_MS = 300;

/**
 * `checking`: rolando um d20 (percepção, inspecionar) — nada mais anda até o dado parar.
 * `interrogating`: interrogatório em close-up (balões e cartões de pergunta na tela).
 * `over`: a operação foi encerrada (fica o relatório na tela).
 */
type Phase = 'rolling' | 'moving-choice' | 'walking' | 'checking' | 'door' | 'plane' | 'cabin' | 'interrogating' | 'ending' | 'chase' | 'enemy' | 'over';

/** Anotação da caderneta de campo (vai para o relatório da operação). */
export interface FieldNote {
  id: number;
  suspect: string;
  text: string;
  kind: NoteKind;
  /** 0 pergunta, 1 réplica, 2 tréplica. */
  depth: number;
}

/**
 * Zoom num móvel já percebido (o quadro de chaves, o armário de um esconderijo): a câmera fica
 * de frente para ele, a peça (a chave do avião, a arma) aparece destacada e se pega tocando nela.
 */
interface PropView {
  kind: 'keys' | 'cache';
  /** O esconderijo (`cache`). */
  hidden?: HiddenItem;
  spot: HexCoord;
  /** Título do bilhete ("Quadro de chaves", "Armário do caseiro"). */
  title: string;
  /** A peça ("a chave do avião", "a arma"). */
  item: string;
  /** O que se destaca ("Uma coronha de madeira…"). */
  glimpse: string;
  /** Quem olha (nome). */
  who: string;
  /** A peça foi pega. */
  taken: boolean;
  /** O que se vê ao tocar no resto do móvel ou ao pegar a peça. */
  note: string | null;
}

/** Teste de d20 mostrado na ficha da lateral. */
interface CheckView {
  /** Um por teste: um teste novo recria a ficha (e relança o dado). */
  id: number;
  /** Título da ficha ("Percepção", "Arrombar"…). */
  kicker: string;
  who: string;
  /** O que precisa tirar ("precisa de mais que 6", "precisa de 12 ou mais"). */
  need: string;
  /** Carimbo de quando passa e de quando não passa. */
  passText: string;
  failText: string;
  /** Face já sorteada (portas): o dado cai nela, em `duration` ms (a hora do impacto do chute). */
  value?: number;
  duration?: number;
  /** Resultado final; `null` enquanto rola. */
  result: number | null;
  pass: boolean | null;
  /** O resultado já foi visto e o jogo espera o **Continuar**. */
  waiting?: boolean;
  /** Texto do botão que fecha a ficha (padrão: "Continuar"). */
  confirmText?: string;
  /** De quem é o dado: o do garimpeiro é vermelho e fica à direita das fichas da equipe. */
  side: CheckSide;
}

type CheckSide = 'team' | 'enemy';

/** O que quem rola informa (o resto da ficha é montado por `rollD20`). */
type CheckAsk = Pick<CheckView, 'kicker' | 'who' | 'need' | 'passText' | 'failText' | 'value' | 'duration'> & { side?: CheckSide };

/** Uma linha do menu da porta (as fichas da direita). */
interface DoorOption {
  action: DoorAction;
  name: string;
  /** Valor no d20 (`Infinity` = rola e nunca passa); `0` sem rolagem; `null` não dá. */
  need: number | null;
  rolls: boolean;
  /** Linha de baixo: o que precisa e o porquê. */
  note: string;
  tone: 'need' | 'free' | 'never';
  /** Movimento gasto ("1 mov."). */
  cost?: string;
  disabled: boolean;
  /** Bloqueada por ora (porta trancada): continua tocável para dar o aviso, mas aparece com cadeado. */
  locked?: boolean;
  label: string;
}

/** Carimbo de cada tipo de anotação na caderneta. */
const NOTE_LABEL: Record<NoteKind, string> = { declarou: 'declarou', sinal: 'sinal', confessou: 'confessou' };

const DOOR_STATE_LABEL: Record<Door['state'], string> = {
  aberta: 'Aberta',
  encostada: 'Encostada',
  trancada: 'Trancada',
  bloqueada: 'Bloqueada',
};

/** "Fulano", "Fulano e Beltrano", "Fulano, Beltrano e Sicrano". */
const namesOf = (es: readonly EnemyState[]): string => {
  const names = es.map((e) => e.name);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : names[0];
};

/** A equipe inteira, junta (como a partida começa). */

/** Teclas do Modo Corrida. */
const RUNNER_KEYS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up', ' ': 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
};

const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Alvo que se toca direto no tabuleiro para interagir (ver `GameScreen.tapTargetOf`). */
/** Prefixo do id de alvo das portas fechadas (`porta:<col,row>`). */
const DOOR_TARGET = 'porta:';
/** Id de alvo do quadro de chaves. */
const KEY_TARGET = 'quadro-chaves';
/** Prefixo do id de alvo dos móveis com algo percebido (`movel:<id do item escondido>`). */
const SPOT_TARGET = 'movel:';

interface TapTarget {
  id: string;
  /** Dá para agir daqui (colado no alvo). */
  near(h: HexCoord): boolean;
  /** Movimento que precisa sobrar depois de chegar. */
  spare: number;
  /** Aviso quando não há caminho até ele. */
  far: string;
  act(): void;
}

@Component({
  selector: 'app-game-screen',
  imports: [MainButton, D4, D20, TalkButton, InterrogationPanel, ChaseOverlay, ApproachTablet, MissionIntro, TacticalBoard],
  templateUrl: './game-screen.html',
  styleUrl: './game-screen.css',
  host: { '(document:keydown)': 'onKey($event)', '(window:resize)': 'onViewResize()' },
})
export class GameScreen implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly gamepad = inject(GamepadService);
  private readonly renderSettings = inject(RenderSettings);
  /** Atributos escolhidos na ficha (escalação). */
  private readonly roster = inject(RosterService);
  private readonly haptics = inject(Haptics);
  private readonly sound = inject(Sound);
  /** Saves da sessão: o automático (começo de cada vez) e os slots do menu. */
  private readonly saves = inject(SaveGames);
  private stopPad?: () => void;
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('board');
  private readonly tacticalBoard = viewChild(TacticalBoard);
  private board?: HexBoard;
  private timers: ReturnType<typeof setTimeout>[] = [];
  /** Quantos seguram o slow da perseguição agora (decisões e rolagens); > 0: tudo desacelera. */
  private slowHolds = 0;
  /** Volta do slow agendada (a folga de `SLOW_GRACE_MS`). */
  private slowResume?: ReturnType<typeof setTimeout>;
  /** Muda no `resetSlow`: quem segurava antes não solta mais nada. */
  private slowGen = 0;
  private readonly rollConfirmBtn = viewChild('rollConfirm', { read: ElementRef<HTMLButtonElement> });
  private destroyed = false;
  /** Muda a cada "Recomeçar": animações antigas param de mexer no estado. */
  private epoch = 0;

  private readonly route = inject(ActivatedRoute);
  protected readonly map: GameMap | undefined = findMap(this.route.snapshot.paramMap.get('mapId'));
  protected readonly characters = CHARACTERS;
  /** Paredes, árvores, avião e carga alta: bloqueiam passagem e visão. */
  private readonly fixedWalls = this.map ? blockedHexes(this.map) : new Set<string>();
  /** Carga baixa: bloqueia passagem; esconde da visão só quem está colado nela. */
  private readonly lowCover = this.map ? lowCoverHexes(this.map) : new Set<string>();
  /** Só há perseguição nos mapas com Modo Corrida; nos outros, quem corre só foge. */
  protected readonly hasChase = hasRunner(this.map?.id);
  /**
   * Portas comuns (ver `door.ts`): fechadas, bloqueiam passagem e visão como parede. Vêm do
   * motor (`engine/doors.ts`); a referência só muda quando alguma porta muda.
   */
  private readonly doorsRecord = computed(() => this.core().doors);
  protected readonly doors = computed<ReadonlyMap<string, Door>>(
    () => new Map(Object.entries(this.doorsRecord())),
  );
  /** O que bloqueia a visão: paredes e afins, mais as portas fechadas. */
  private readonly walls = computed(() => sightBlockers({ doors: this.doorsRecord() }, this.world()));
  /** Tudo o que ninguém atravessa (paredes, toda a carga e as portas fechadas). */
  private readonly solid = computed(() => solidOf({ doors: this.doorsRecord() }, this.world()));
  /** Onde se joga: o círculo da missão (ou o retângulo do mapa de teste). */
  private readonly area = this.map ? playArea(this.map) : rectArea(0, 0);
  protected readonly diceSides = MOVE_DICE.sides;

  /**
   * Estado da partida no motor (vez, posições, movimento, inimigos; ver `game/engine/`). Só
   * muda por `dispatch`: no multiplayer, é o que vai e volta pelo servidor.
   */
  private readonly core = signal<GameState>(this.initialCore());
  // cada leitura pega a mesma referência enquanto aquela parte do estado não muda: quem depende
  // dela (alcance, bloqueios, auras) só recalcula quando precisa
  private readonly positionsRecord = computed(() => this.core().positions);
  protected readonly positions = computed<ReadonlyMap<string, HexCoord>>(
    () => new Map(Object.entries(this.positionsRecord())),
  );
  protected readonly activeIndex = computed(() => this.core().activeIndex);
  /** Turno global: aumenta a cada vez que um personagem começa a jogar. */
  protected readonly turn = computed(() => this.core().turn);
  /** Sorteio da partida (dados, destino de quem vagueia). No multiplayer, quem sorteia é o servidor. */
  private readonly rng: Rng = Math.random;
  protected readonly phase = signal<Phase>('rolling');
  /** Valores da rolagem à mostra: só aparecem quando os dados param (o estado já os tem antes). */
  protected readonly dice = signal<number[]>(Array(MOVE_DICE.count).fill(1));
  protected readonly rolled = signal(0);
  /** Valor imposto a cada `app-d4`: o resultado é sorteado antes e o dado só cai nele. */
  protected readonly rollValues = signal<readonly number[]>([]);
  /**
   * Um `app-d4` por chave: cada rolagem ganha chaves novas, então os dados são recriados e
   * lançados de novo. Cada um sorteia o seu valor e avisa quando para (`dieRolled`).
   */
  protected readonly rollKeys = signal<readonly string[]>([]);
  private rollSeq = 0;
  private dieResults: number[] = [];
  protected readonly movesLeft = computed(() => this.core().movesLeft);
  protected readonly selected = signal<HexCoord | null>(null);
  /** Personagem em foco na interface (tocado no tabuleiro ou no retrato). */
  protected readonly focusedId = signal<string>(CHARACTERS[0].id);
  protected readonly enemies = computed<readonly EnemyState[]>(() => this.core().enemies);
  /**
   * Inimigo no meio da animação: o estado já tem o fim do trecho, mas o cone de visão segue
   * o passo que está na tela.
   */
  private enemyView: Pick<EnemyState, 'id' | 'hex' | 'facing' | 'status'> | null = null;
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

  /** Submenu "Casos de teste" (situações prontas, ver `test-cases.ts`). */
  protected readonly testCases = TEST_CASES;
  protected readonly testCasesOpen = signal(false);
  /** Submenu "Tutoriais" do menu: as lições da lousa tática, para rever. */
  protected readonly tutorialsOpen = signal(false);
  /** Submenu "Saves" do menu: novo jogo, o automático e os slots. */
  protected readonly savesOpen = signal(false);
  protected readonly savesSupported = this.saves.supported;
  protected readonly saveList = computed(() => this.saves.summaries());
  protected readonly savedAtLabel = savedAtLabel;
  /** Slot cheio tocado uma vez em "Salvar": o segundo toque sobrescreve. */
  protected readonly overwriteArmed = signal<number | null>(null);
  /** "Novo jogo" tocado uma vez: o segundo toque apaga o automático e volta ao início. */
  protected readonly newGameArmed = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
    this.overwriteArmed.set(null);
    this.newGameArmed.set(false);
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
  protected readonly soundSupported = this.sound.supported;
  protected readonly soundOn = this.sound.enabled;
  protected setSound(on: boolean): void {
    this.sound.setEnabled(on);
    if (on) this.sound.play('ui.confirmar');
  }
  protected setVibration(on: boolean): void {
    this.haptics.setEnabled(on);
    if (on) this.haptics.vibrate(SETTLE_PATTERN);
  }

  constructor() {
    // resultado na tela: o foco vai para "Confirmar" (Enter/Espaço fecham)
    effect(() => this.rollConfirmBtn()?.nativeElement.focus({ preventScroll: true }));
    // zoom num móvel: o foco vai para "Fechar" (Esc também fecha)
    effect(() => this.propCloseBtn()?.nativeElement.focus({ preventScroll: true }));
    // ficha do d20: o foco vai para "Continuar" (o tablet do auto de abordagem foca a própria tecla)
    effect(() => this.checkCloseBtn()?.nativeElement.focus({ preventScroll: true }));
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
    // o que se toca direto (o avião, os suprimentos, as portas fechadas, o quadro de chaves, o
    // móvel com algo percebido) ganha o contorno pulsante; refaz quando um deles muda de estado
    effect(() => {
      const list = this.tapTargetList();
      this.board?.setTargetOutlines(list);
    });
    // rendidos tocáveis, como o avião: com interação, contorno amarelo; sem, o balão "Nenhuma interação"
    effect(() => {
      const list = this.npcTargets();
      this.board?.setNpcTargets(list);
    });
    // os alvos tocáveis (o avião, os suprimentos, as portas…) não têm aura no chão: o próprio modelo
    // ganha um contorno que pulsa, e só quando dá para tocar nele (a escolha da vez, sem outro modo aberto)
    effect(() => {
      const free =
        this.phase() === 'moving-choice' && !this.prop() &&
        !this.approaching() && !this.grouping() && !this.burning();
      this.board?.showTargetOutlines(free);
      // alvo já tocado uma vez (o caminho até ele está marcado): contorno maior e amarelo, fantasma
      // do agente no destino, pontos correndo no caminho e o balão do segundo toque
      const target = free ? this.armedTarget() : null;
      const aim = this.aimedTarget();
      const cost = this.selectedCost();
      // tocado de longe demais: o mesmo caminho e fantasma, em cinza e com cadeado
      const far = free ? this.lockedTarget() : null;
      this.board?.setTargetAim(
        target && aim
          ? {
              id: target.id,
              unitId: this.active().id,
              dest: aim.hex,
              path: this.selectedPath(),
              label: `Toque de novo para ir · ${cost} ${cost === 1 ? 'passo' : 'passos'}`,
              avoid: () => this.hudRects(),
            }
          : far
            ? {
                id: far.id,
                unitId: this.active().id,
                dest: far.hex,
                path: far.path,
                label: 'Longe demais para interagir',
                locked: true,
                avoid: () => this.hudRects(),
              }
            : null,
      );
    });
    // cartão em foco no interrogatório (controle): o foco do teclado acompanha
    effect(() => {
      const i = this.questionPick();
      const iv = this.interrogation();
      if (!iv || iv.busy) return;
      queueMicrotask(() => {
        const card = document.querySelectorAll<HTMLButtonElement>('.question-card:not(.done)')[i];
        // só a lista rola (não a página): o cartão escolhido não fica cortado embaixo
        card?.focus({ preventScroll: true });
        card?.scrollIntoView({ block: 'nearest' });
      });
    });
  }

  /** O que a interface põe por cima do tabuleiro (cartões, placar, botões), em coordenadas da janela. */
  private hudRects(): DOMRect[] {
    return [...document.querySelectorAll<HTMLElement>('.game .corner, .game .goal, .game .agents, .game .tools, .game .actions > *')].map(
      (e) => e.getBoundingClientRect(),
    );
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

  /** Pré-visualizando a abordagem (zonas pintadas, aguardando confirmação). */
  protected readonly approaching = signal(false);
  /** Muda quando a tela muda de tamanho ou a câmera anda: refaz as posições dos rabiscos do tablet. */
  private readonly viewTick = signal(0);
  /**
   * Prévia da abordagem no tablet de campo (antes de rolar): cada suspeito no raio com o que
   * aconteceria (se rende, rola o d20 com a chance, corre) e onde está na tela.
   */
  protected readonly tabletReport = computed((): TabletReport | null => {
    this.viewTick();
    if (!this.approaching()) return null;
    const from = this.positions().get(this.active().id);
    if (!from) return null;
    const { surrender, roll, flee } = this.approachPlan();
    const targets = this.missionTargets();
    const at = (id: string) => this.board?.pieceOnScreen(id) ?? null;
    const alvo = (id: string) => (targets.has(id) ? ' · alvo!' : '');
    const radius = this.activeApproach().radius;
    return {
      agent: this.active().name,
      round: this.round(),
      op: this.map?.name ?? '',
      hex: from,
      radius,
      agentAt: at(this.active().id),
      ring: this.board?.groundRingOnScreen(from, radius) ?? [],
      preview: true,
      marks: [
        ...surrender.map((e) => ({
          id: e.id, name: e.name, result: 'surrender' as const, note: 'se rende', roll: null, at: at(e.id),
        })),
        ...roll.map((c) => ({
          id: c.enemy.id,
          name: c.enemy.name,
          result: 'roll' as const,
          note: 'rola d20',
          roll: `${this.percent(c.chance)} de escapar${alvo(c.enemy.id)}`,
          at: at(c.enemy.id),
        })),
        ...flee.map((e) => ({
          id: e.id, name: e.name, result: 'flee' as const, note: 'vai correr', roll: alvo(e.id).slice(3) || null, at: at(e.id),
        })),
      ],
    };
  });

  /**
   * A tela do tablet foi medida: a câmera sobe e enquadra o raio inteiro dentro dela; enquanto
   * a câmera anda, os rabiscos acompanham.
   */
  protected frameTablet(area: { x: number; y: number; w: number; h: number }): void {
    const from = this.positions().get(this.active().id);
    if (!this.approaching() || !from) return;
    this.board?.frameRing(from, this.activeApproach().radius, area);
    const t0 = performance.now();
    const tick = (now: number) => {
      if (!this.approaching() || this.destroyed) return;
      this.viewTick.update((n) => n + 1);
      if (now - t0 < 1800) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  /** Suspeitos que a equipe conhece (os escondidos só entram depois de revelados). */
  protected readonly knownEnemies = computed(() => this.enemies().filter(known));

  // ---------- percepção e esconderijos ----------

  /** Teste de d20 na ficha da lateral (percepção ao entrar no cômodo, inspecionar o móvel). */
  /** Carimbo "Perseguir?" do turno inimigo (ver `tryChase`). */
  protected readonly chaseOffer = signal<{
    /** Linha de cima do carimbo ("Ele vai correr", "Voz de prisão", "Reforço"). */
    kicker: string;
    enemy: string;
    options: { id: string; name: string; steps: number; chance: string }[];
  } | null>(null);
  private chaseOfferDone?: (agentId: string | null) => void;
  /** Fuga da voz de prisão que roda quando o auto de abordagem fecha (ver `approachFlight`). */
  /** Voz de prisão pendente: quem abordou, o alcance do grito dele (só quem está nele vai de reforço) e quem foge. */
  private flight: { agentId: string; escort: ArrestEscort; enemies: string[] } | null = null;
  /** Já correram nesta rodada (fugiram na hora da abordagem): no turno inimigo, não correm de novo. */
  private readonly ranThisRound = new Set<string>();
  /** Agarrados na fuga da abordagem: ficam abalados até o fim do turno inimigo seguinte. */
  private readonly caughtThisRound = new Set<string>();
  /** Placar da perseguição em curso: distância e quanto da rota dele já foi. */
  protected readonly chaseHud = signal<ChaseHud | null>(null);
  /** Modo Corrida: o mapa de corrida está na tela (por cima do tabuleiro). */
  protected readonly runnerOn = signal(false);
  private readonly runnerRef = viewChild.required<ElementRef<HTMLCanvasElement>>('runner');
  /** A corrida em curso (ver `runnerSteps`). */
  private runner?: RunnerSession;
  /** Corrida da perseguição em curso (ver `sprint`): `null` fora da perseguição. */
  protected readonly chaseSprint = signal<SprintView | null>(null);
  /** Dá o gás na perseguição em curso, sem parar a corrida (ver `chaseSteps`). */
  private sprintStart?: () => void;
  /** Escolha de alvo (`decisao:alvo`): os suspeitos, da esquerda para a direita, e o em prévia. */
  protected readonly targetPrompt = signal<{
    id: number;
    agent: string;
    agentId: string;
    options: { enemyId: string; name: string; label: string }[];
    pick: number | null;
  } | null>(null);
  private targetDone?: (enemyId: string | null) => void;
  /** O que a camada da perseguição mostra na escolha de alvo. */
  protected readonly targetView = computed<TargetPrompt | null>(() => {
    const t = this.targetPrompt();
    return t && { agent: t.agent, count: t.options.length, picked: t.pick === null ? null : t.options[t.pick].name };
  });
  private targetSeq = 0;
  /**
   * As fichas de d20 na tela, lado a lado: várias podem rolar juntas (o agente grita enquanto o
   * garimpeiro rola a curva dele). As da equipe ficam à esquerda; as do garimpeiro, à direita.
   */
  protected readonly checks = signal<readonly CheckView[]>([]);
  /** Quem espera o jogador fechar cada ficha (**Continuar**, ✕), pelo `id` dela. */
  private readonly checkDone = new Map<number, () => void>();
  /** Quem espera o d20 de cada ficha parar, pelo `id` dela. */
  private readonly checkRolled = new Map<number, (value: number) => void>();
  /** A ficha das portas em cena (essas não esperam o Continuar: a cena da porta segue). */
  private doorCheckId?: number;
  /** Some com a ficha do d20 das portas. */
  private doorCheckTimer?: ReturnType<typeof setTimeout>;
  private checkSeq = 0;
  protected readonly searchRules = SEARCH_RULES;
  /**
   * Zoom num móvel (o quadro de chaves, o armário): a câmera trava de frente para ele, a HUD
   * some e sobram o bilhete e **Fechar**; a peça, destacada, se pega tocando nela.
   */
  protected readonly prop = signal<PropView | null>(null);
  private readonly propCloseBtn = viewChild('propClose', { read: ElementRef<HTMLButtonElement> });
  private readonly checkCloseBtn = viewChild('checkClose', { read: ElementRef<HTMLButtonElement> });
  private readonly tablet = viewChild(ApproachTablet);
  /**
   * Móveis em que alguém reparou (percepção ou um suspeito que contou): os esconderijos e o
   * quadro de chaves (`KEY_PANEL_ID`). Só esses ganham o contorno e abrem o zoom.
   */
  protected readonly noticed = signal<ReadonlySet<string>>(new Set());
  /** Esconderijos já achados (o que havia lá foi apreendido). */
  protected readonly found = signal<ReadonlySet<string>>(new Set());
  /** Quem já rolou percepção em cada móvel (`móvel:agente`): uma vez por agente. */
  private readonly noticeRolled = new Set<string>();

  /** Esconderijo percebido, ainda não achado, cujo móvel está colado no agente da vez. */
  protected readonly inspectable = computed<HiddenItem | null>(() => {
    if (this.phase() !== 'moving-choice' || this.viewingOther() || this.prop()) return null;
    const from = this.positions().get(this.active().id);
    if (!from) return null;
    const noticed = this.noticed();
    const found = this.found();
    return (this.map?.hidden ?? []).find((h) => noticed.has(h.id) && !found.has(h.id) && canReach(from, h.spot)) ?? null;
  });

  // ---------- interrogatório ----------

  protected readonly interrogationRules = INTERROGATION_RULES;
  protected readonly noteLabel = NOTE_LABEL;
  /** Interrogatório aberto (close-up no agente e no suspeito). */
  protected readonly interrogation = signal<InterrogationView | null>(null);
  /** Cartão destacado pelo controle (índice entre as perguntas abertas). */
  protected readonly questionPick = signal(0);
  /** Memória de cada NPC na missão: perguntas feitas e réplicas liberadas (por id do inimigo). */
  protected readonly dialogues = signal<ReadonlyMap<string, DialogueMemory>>(new Map());
  /** Falas já usadas dos pools compartilhados da missão (ver `LinePool`). */
  private readonly linePools = signal<PoolUsage>(new Map());
  /** Pistas registradas pelas respostas (`Outcome.clue`). */
  private readonly clueLog = signal<ReadonlySet<string>>(new Set());
  /** Pistas da missão: o que a inspeção achou (`item:<id>`) e o que as respostas registraram. */
  protected readonly clues = computed<Clues>(() => new Set([...[...this.found()].map(itemClue), ...this.clueLog()]));
  /** Caderneta de campo: o que cada suspeito disse (sai no relatório da operação). */
  protected readonly fieldNotes = signal<readonly FieldNote[]>([]);
  private noteSeq = 0;

  /** Todo rendido ganha a aura (a dos que não têm diálogo fica apagada). */
  private readonly surrenderedEnemies = computed(() => this.enemies().filter((e) => e.status === 'surrendered'));
  /** Rendidos que se tocam no tabuleiro (`talk` = tem interação, ganha o contorno amarelo). */
  private readonly npcTargets = computed(
    () => this.surrenderedEnemies().map((e) => ({ id: e.id, talk: hasDialogue(npcClass(e.npc)) })),
    { equal: (a, b) => a.length === b.length && a.every((x, i) => x.id === b[i].id && x.talk === b[i].talk) },
  );
  /**
   * Rendido em cuja aura o agente da vez está: a ação de conversa aparece (bloqueada, se ele não
   * tem diálogo). Dá para conversar quantas vezes quiser.
   */
  protected readonly talkTarget = computed(() => {
    if (this.phase() !== 'moving-choice' || this.viewingOther()) return null;
    const from = this.positions().get(this.active().id);
    return from ? talkTarget(from, this.enemies(), npcClass) : null;
  });
  /** Já conversou com esse suspeito nesta missão. */
  protected talked(id: string): boolean {
    return hasTalked(this.dialogues().get(id));
  }
  /** Conversa possível agora (o rendido ao lado tem diálogo). */
  protected readonly canTalk = computed(() => !!this.talkTarget() && !this.talkTarget()!.silent);
  /** Perguntas ainda abertas, na ordem dos cartões. */
  protected readonly openQuestions = computed(() => this.interrogation()?.options.filter((o) => !o.done) ?? []);

  // ---------- portas ----------

  /**
   * Arrombamento recente: a equipe ganha intimidação até o começo deste turno (rodada).
   * `0` = sem bônus. Ver `BREAK_IN_RULES`.
   */
  protected readonly breakInUntil = computed(() => this.core().breakInUntil);
  /** Intimidação extra da equipe agora (o arrombamento assusta por alguns turnos). */
  protected readonly breakInBoost = computed(() =>
    this.round() < this.breakInUntil() ? BREAK_IN_RULES.intimidation : 0,
  );
  /** Turnos que ainda restam do bônus do arrombamento (contando o atual). */
  protected readonly breakInLeft = computed(() => Math.max(0, this.breakInUntil() - this.round()));

  /** Porta com o menu aberto (câmera de cena, fichas na direita). */
  protected readonly doorKey = signal<string | null>(null);
  /** Animação de porta em andamento: as fichas ficam travadas. */
  protected readonly doorBusy = signal(false);
  /**
   * Cena de quem reage ao arrombamento (ver `breakIn`): a câmera fecha no garimpeiro, a HUD e
   * as fichas da porta saem, e só ficam a ficha do d20 e os avisos até o **Confirmar**.
   */
  protected readonly breakInCine = signal(false);
  protected readonly doorStateLabel = DOOR_STATE_LABEL;

  /** Portas coladas no agente da vez (dá para interagir). */
  protected readonly nearDoors = computed<Door[]>(() => {
    if (this.phase() !== 'moving-choice' || this.viewingOther()) return [];
    const from = this.positions().get(this.active().id);
    if (!from) return [];
    return [...this.doors().values()].filter((d) => nextToDoor(from, d.hex));
  });
  /** A porta que o botão "Porta" abre: a fechada primeiro. */
  protected readonly nearDoor = computed<Door | null>(
    () => this.nearDoors().find((d) => !isOpen(d)) ?? this.nearDoors()[0] ?? null,
  );
  protected readonly openDoor = computed<Door | null>(() => {
    const k = this.doorKey();
    return k ? (this.doors().get(k) ?? null) : null;
  });
  /** Fichas do menu da porta: arrombar, destrancar e abrir (a de voltar fica no próprio menu). */
  protected readonly doorOptions = computed<DoorOption[]>(() => {
    const door = this.openDoor();
    if (!door) return [];
    const busy = this.doorBusy();
    const open = isOpen(door);
    const st = door.state;
    const gazua = this.pickBonus();
    const option = (action: DoorAction, name: string, note: string, extra: Partial<DoorOption> = {}): DoorOption => {
      const need = doorNeed(action, door, action === 'pick' ? gazua : 0);
      const rolls = rollsDie(need);
      const tone = need === null || need === Infinity ? 'never' : rolls ? 'need' : 'free';
      const line = rolls && need !== Infinity ? `precisa de ${need}+ · ${note}` : note;
      const chance = rolls && need !== Infinity ? ` (${Math.round(doorChance(need) * 100)}% de chance)` : '';
      return {
        action, name, need, rolls, tone, note: line, disabled: busy, ...extra,
        label: `${name}: ${rolls ? (need === Infinity ? 'rola o d20, mas nunca passa' : `rola o d20, precisa de ${need} ou mais${chance}`) : 'sem rolagem'}, ${note}${extra.cost ? `, gasta ${extra.cost} de movimento` : ''}`,
      };
    };
    const noMoves = this.movesLeft() < DOOR_RULES.pickCost;
    return [
      option(
        'arrombar',
        'Arrombar',
        st === 'bloqueada' && !door.broken ? 'nunca passa' : open ? 'já está aberta' : (st === 'encostada' ? 'sem tranca, chama atenção' : 'porta trancada') + (door.damage ? `, já cedeu ${door.damage}` : ''),
        { disabled: busy || open, locked: open },
      ),
      option(
        'pick',
        'Destrancar',
        open ? 'já está aberta' : noMoves ? 'sem movimento' : st === 'bloqueada' ? 'nunca passa' : st === 'trancada' ? `fechadura ${door.lock}${gazua ? `, ${SKILLS.gazua.name} +${gazua}` : ''}` : 'precisa de 0, abre sozinha',
        { cost: `${DOOR_RULES.pickCost} mov.`, disabled: busy || open || noMoves, locked: open || noMoves },
      ),
      option(
        'abrir',
        'Abrir',
        open ? 'já dá para passar' : st === 'encostada' ? 'só empurrar' : st === 'trancada' ? 'está trancada' : 'está bloqueada',
        { disabled: busy || open, locked: open || st !== 'encostada' },
      ),
    ];
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

  // ---------- abertura da missão (tutorial, passo 1) ----------

  /** Abertura na tela: as estruturas circuladas (vazio enquanto a câmera chega) e se já está saindo. */
  protected readonly intro = signal<{ marks: IntroMark[]; leaving: boolean } | null>(null);
  protected readonly introSize = signal({ w: 0, h: 0 });
  private introTargetsNow: IntroTarget[] = [];
  private introThen?: () => void;
  private introEpoch = 0;
  /** O mapa tem o que circular agora (o menu oferece rever a abertura). */
  protected readonly hasIntro = computed(() => !!this.map && introTargets(this.map, this.openObjectives()).length > 0);

  /** Objetivos visíveis e ainda em aberto: os que a abertura circula. */
  private openObjectives() {
    const p = this.progress();
    return visibleObjectives(this.map?.objectives ?? [], p).filter((o) => objectiveState(o, p) === 'open');
  }

  /**
   * Começa a abertura: câmera alta sobre as estruturas com objetivo, mapa escuro, círculos a
   * caneta e o botão **Iniciar missão**. Depois do pan (ou do Pular), chama `then`. Devolve
   * `false` se não há o que circular.
   */
  private playIntro(then: () => void): boolean {
    const board = this.board;
    if (!this.map || !board) return false;
    const targets = introTargets(this.map, this.openObjectives());
    if (!targets.length) return false;
    this.introTargetsNow = targets;
    this.introThen = then;
    this.intro.set({ marks: [], leaving: false });
    const epoch = ++this.introEpoch;
    void board.frameIntro(targets.map((t) => t.rect)).then(() => {
      if (epoch === this.introEpoch) this.layoutIntro();
    });
    addEventListener('resize', this.onIntroResize);
    return true;
  }

  /** Projeta as estruturas na tela e põe os círculos (quando a câmera para, e a cada resize). */
  private layoutIntro(): void {
    const s = this.intro();
    if (!s || s.leaving || !this.board) return;
    const t = this.introTargetsNow;
    const ellipses = this.board.introEllipses(
      t.map((x) => x.rect),
      t.map((x) => STRUCTURE_TOP[x.kind]),
    );
    const canvas = this.canvasRef().nativeElement;
    this.introSize.set({ w: canvas.clientWidth, h: canvas.clientHeight });
    this.intro.set({ leaving: false, marks: ellipses.map((e, i) => ({ ...e, label: t[i].label, notes: t[i].notes })) });
  }

  private readonly onIntroResize = () => {
    const s = this.intro();
    if (!s || s.leaving || !this.board) return;
    // a proporção da tela muda o enquadramento: refaz e reposiciona os círculos
    const epoch = ++this.introEpoch;
    void this.board.frameIntro(this.introTargetsNow.map((t) => t.rect)).then(() => {
      if (epoch === this.introEpoch) this.layoutIntro();
    });
  };

  /** Onde a câmera termina a abertura: quem está na vez. */
  private introAnchor(): HexCoord {
    return this.positions().get(this.active().id) ?? this.map!.starts[0];
  }

  /** **Iniciar missão**: a tinta some e a câmera desce em linha reta até a equipe. */
  protected beginMission(): void {
    const s = this.intro();
    if (!s || s.leaving || !this.board) return;
    this.sound.play('ui.confirmar');
    this.intro.set({ ...s, leaving: true });
    const epoch = ++this.introEpoch;
    void this.board.panFromIntro(this.introAnchor()).then(() => {
      if (epoch === this.introEpoch) this.finishIntro();
    });
  }

  /** **Pular**: corta direto para a equipe. */
  protected skipMissionIntro(): void {
    if (!this.intro()) return;
    this.introEpoch++;
    this.board?.skipIntro(this.introAnchor());
    this.finishIntro();
  }

  private finishIntro(): void {
    this.intro.set(null);
    removeEventListener('resize', this.onIntroResize);
    const then = this.introThen;
    this.introThen = undefined;
    then?.();
  }

  // ---------- lousa tática (tutorial, passo 2) ----------

  protected readonly lessons = LESSONS;
  /** Lição aberta na lousa (ver `game/tactical-board.ts`). */
  protected readonly lesson = signal<LessonId | null>(null);
  private readonly lessonsSeen = readSeen();
  private lessonTicker?: ReturnType<typeof setInterval>;

  /**
   * Abre a lição na primeira vez que a situação aparece: um garimpeiro (vigiando ou em fuga)
   * dentro da tela, ou o primeiro suspeito rendido. Só com o jogador livre para agir (escolhendo
   * o destino), nunca no meio de uma animação, da abertura, do menu ou de outro painel.
   */
  private checkLessons(): void {
    const board = this.board;
    if (!board || this.destroyed || this.lesson() || this.intro() || this.menuOpen()) return;
    if (this.phase() !== 'moving-choice' || this.approaching() || this.interrogation() || this.prop()) return;
    const canvas = this.canvasRef().nativeElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const due = lessonDue({
      seen: this.lessonsSeen,
      suspectOnScreen: this.enemies().some(
        (e) => (e.status === 'patrol' || e.status === 'alert') && insideScreen(board.pieceOnScreen(e.id), w, h),
      ),
      anySurrendered: this.surrenderedEnemies().length > 0,
    });
    if (due) this.lesson.set(due);
  }

  /** **Entendi** (ou ×): a lição fica marcada como vista e não abre sozinha de novo. */
  protected closeLesson(): void {
    const id = this.lesson();
    if (id) {
      this.lessonsSeen.add(id);
      markSeen(id);
    }
    this.lesson.set(null);
  }

  /** Menu: rever uma lição da lousa. */
  protected reviewLesson(id: LessonId): void {
    this.toggleMenu();
    this.tutorialsOpen.set(false);
    this.lesson.set(id);
  }

  /** Menu: rever a abertura no meio da partida (volta para quem está na vez). */
  protected replayIntro(): void {
    this.toggleMenu();
    this.playIntro(() => this.board?.focus(this.active().id));
  }

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
    if (!from) return null;
    const burnables = this.map?.burnables ?? [];
    // o avião (`inspect`) só se queima pelo menu de inspecionar (`planeBurn`)
    const direct = burnTarget(from, burnables.filter((t) => !t.inspect), this.burned());
    if (direct || !this.planeBurn()) return direct;
    return burnables.find((t) => t.inspect && !this.burned().has(t.id) && canBurn(from, t)) ?? null;
  });
  /** O "Queimar" do menu do avião está valendo (o avião entra como alvo para a confirmação). */
  private readonly planeBurn = signal(false);
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
   * A equipe chega junta: a partida começa com todos no grupo. Vem do motor (`engine/group.ts`).
   */
  private readonly groupIds = computed(() => this.core().group);
  protected readonly group = computed<ReadonlySet<string>>(() => new Set(this.groupIds()));
  /** Ordem da fila do grupo, da frente para trás (ver `toFront` / `toBack`). */
  private readonly groupLine = computed(() => this.core().groupLine);
  /** A vez está passando (a fila do grupo se arrumando antes do próximo). */
  private passing = false;
  /** Capitão e ordem da equipe, como o motor guarda. */
  private readonly coreCaptain = computed(() => this.core().captain);
  private readonly order = computed(() => this.core().order);
  // fila e Liderança dependem só do grupo, da fila e do Capitão (não do resto do estado)
  private readonly line = computed(() =>
    lineOf({ group: this.groupIds(), groupLine: this.groupLine(), order: this.order() }),
  );
  protected readonly groupBonus = GROUP_RULES.moveBonus;
  protected readonly groupApproachBonus = GROUP_RULES.approachBonus;
  protected readonly leaderBonus = CLASS_RULES.leadership;
  protected readonly signed = signed;

  /** Quem é o Capitão da equipe (escolhido na ficha). */
  protected readonly captainId = this.roster.captain;
  protected isCaptain(c: Character): boolean {
    return c.id === this.captainId();
  }
  /** O grupo tem o Capitão: quem está nele ganha a Liderança. */
  protected readonly led = computed(() => isLed({ captain: this.coreCaptain(), group: this.groupIds() }));
  /** Bônus de grupo de movimento e de intimidação (com a Liderança, se o Capitão estiver no grupo). */
  protected readonly groupMove = computed(() => GROUP_RULES.moveBonus + (this.led() ? CLASS_RULES.leadership.vigor : 0));
  protected readonly groupInt = computed(
    () => GROUP_RULES.approachBonus + (this.led() ? CLASS_RULES.leadership.intimidacao : 0),
  );
  /** Bônus de agrupar com o Capitão na equipe (o que o botão "Agrupar" promete). */
  protected readonly rallyMove = computed(() => GROUP_RULES.moveBonus + (this.captainId() ? CLASS_RULES.leadership.vigor : 0));
  protected readonly rallyInt = computed(
    () => GROUP_RULES.approachBonus + (this.captainId() ? CLASS_RULES.leadership.intimidacao : 0),
  );
  /** Gazua do agente da vez (0 para quem não tem a perícia). */
  protected readonly pickBonus = computed(() => skillBonus(this.roster.classOf(this.active().id), 'gazua'));
  /** O Agrupar do agente da vez sai de graça (Comando do Capitão, ainda não usado no turno). */
  protected readonly freeRally = computed(() => rallyFree(this.core()));
  protected readonly classInfo = CLASS_INFO;

  /** Atributos de um agente em campo (com o bônus do grupo, se ele estiver agrupado). */
  protected fieldStats(c: Character): { vig: number; int: number; range: number } {
    const loadout = this.roster.loadout(c.id);
    const grouped = this.group().has(c.id);
    const led = this.led();
    const boost = this.breakInBoost();
    return {
      vig: statBreakdown(loadout, 'vigor', grouped, led).total,
      int: statBreakdown(loadout, 'intimidacao', grouped, led).total + boost,
      range: approachRulesFor(loadout, grouped, APPROACH_RULES, boost, led).surrenderRange,
    };
  }
  /** Vigor do agente da vez que entra na rolagem (sem o grupo, que aparece à parte). */
  protected readonly activeSpeed = computed(
    () => statBreakdown(this.roster.loadout(this.active().id), 'vigor', false).total,
  );
  /** Parcela do vigor na conta da rolagem (" + 1 (vigor)"), vazia sem modificador. */
  protected readonly speedTerm = computed(() => {
    const v = this.activeSpeed();
    return v ? ` ${v > 0 ? '+' : '−'} ${Math.abs(v)} (vigor)` : '';
  });
  /** Escolhendo o ponto de encontro do "Agrupar". */
  protected readonly grouping = signal(false);
  /** Ponto de encontro destacado (aguardando confirmação). */
  protected readonly rallyHex = signal<HexCoord | null>(null);
  protected inGroup(c: Character): boolean {
    return this.group().has(c.id);
  }
  protected readonly grouped = computed(() =>
    isGrouped({ group: this.groupIds(), order: this.order(), activeIndex: this.activeIndex() }),
  );

  /** Pontos de encontro possíveis com o movimento que resta ao agente da vez. */
  private readonly rallyPlans = computed<Map<string, RallyPlan>>(() => {
    const map = this.map;
    if (!map || this.phase() !== 'moving-choice') return new Map();
    return rallyOptions(this.core(), this.world());
  });
  protected readonly canGroup = computed(() => CHARACTERS.length > 1 && this.rallyPlans().size > 0);
  protected readonly rallyPlan = computed(() => {
    const h = this.rallyHex();
    return h ? this.rallyPlans().get(hexKey(h)) : undefined;
  });

  /** Turno máximo: no último turno o carro foge. */
  protected readonly deadline = MISSION_DEADLINE;
  protected readonly late = computed(() => this.round() > MISSION_DEADLINE);

  // ---------- bilhete de objetivos (compacto; abre ao toque) ----------
  protected readonly goalOpen = signal(false);
  protected toggleGoal(): void {
    this.goalOpen.update((v) => !v);
  }
  /** Resumo da linha fechada: o próximo objetivo principal pendente e quantos já foram cumpridos. */
  protected readonly goalSummary = computed(() => {
    const list = this.objectives();
    const next = list.find((o) => o.primary && o.state === 'open') ?? list.find((o) => o.state === 'open') ?? list[0];
    return { done: list.filter((o) => o.state === 'done').length, total: list.length, text: next?.text ?? '' };
  });

  // ---------- coluna da esquerda ----------
  /** Quem está em foco vai para o topo; os outros seguem na ordem da equipe. */
  protected readonly orderedAgents = computed<Character[]>(() => {
    const f = this.focused();
    return [f, ...CHARACTERS.filter((c) => c.id !== f.id)];
  });
  /** As ferramentas (agrupar e passar a vez) só aparecem quando nenhum outro modo ocupa a tela. */
  protected readonly toolsVisible = computed(
    () =>
      this.phase() !== 'enemy' &&
      this.phase() !== 'chase' &&
      this.phase() !== 'rolling' &&
      !this.approaching() &&
      !(this.burning() && this.burnable()) &&
      !this.grouping() &&
      !this.viewingOther() &&
      !(this.selected() && this.phase() === 'moving-choice'),
  );

  // ---------- conta da rolagem: cada parcela explica de onde vem ----------
  protected readonly termKey = signal<string | null>(null);
  protected toggleTerm(key: string): void {
    this.termKey.update((k) => (k === key ? null : key));
  }
  protected readonly rollTerms = computed(() => {
    const who = this.active().name;
    const terms: { key: string; kind: 'dice' | 'bonus'; value: string; label: string; hint: string }[] = this.dice().map((v, i) => ({
      key: 'd' + i,
      kind: 'dice',
      value: String(v),
      label: 'Dado',
      hint: `Dado ${i + 1}: o que saiu no d${MOVE_DICE.sides}.`,
    }));
    const vigor = this.activeSpeed();
    if (vigor) {
      terms.push({ key: 'vigor', kind: 'bonus', value: signed(vigor), label: 'Vigor', hint: `Vigor: o atributo de ${who} na ficha.` });
    }
    if (this.grouped()) {
      terms.push({ key: 'grupo', kind: 'bonus', value: signed(this.groupBonus), label: 'Grupo', hint: `Grupo: +${this.groupBonus} por andar com a equipe agrupada.` });
      if (this.led()) {
        terms.push({ key: 'capitao', kind: 'bonus', value: signed(this.leaderBonus.vigor), label: 'Capitão', hint: `Capitão: +${this.leaderBonus.vigor} de Liderança, porque o Capitão está no grupo.` });
      }
    }
    return terms;
  });
  protected readonly termHint = computed(() => this.rollTerms().find((t) => t.key === this.termKey())?.hint ?? null);
  protected readonly rollSummary = computed(
    () => this.rollTerms().map((t) => `${t.label} ${t.value}`).join(', ') + `: ${this.movesLeft()} de movimento`,
  );
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
   * Faixas da abordagem do agente da vez: o raio de abordagem base (`APPROACH_RULES`) +
   * intimidação, +1 enquanto estiver agrupado e +1 com o Capitão no grupo; a zona de rolagem e a
   * de fuga vêm logo depois (ver `approachRulesFor` em `stats.ts`).
   */
  protected readonly activeApproach = computed(() =>
    approachRulesFor(this.roster.loadout(this.active().id), this.grouped(), APPROACH_RULES, this.breakInBoost(), this.led()),
  );
  /** Quem se renderia, quem rolaria o teste de fuga e quem correria se o agente da vez abordasse agora. */
  protected readonly approachPlan = computed(() => {
    const from = this.positions().get(this.active().id);
    // só quem o agente alcança direto (sem parede nem porta fechada no meio)
    return from
      ? resolveApproach(from, this.enemies(), this.activeApproach(), this.walls())
      : { surrender: [], roll: [], flee: [] };
  });
  protected readonly canApproach = computed(() => this.approachCount() > 0);
  /** Inimigos que a missão pede para render (o alvo, como o Caseiro Jô): a prévia avisa a chance deles. */
  protected readonly missionTargets = computed(
    () => new Set((this.map?.objectives ?? []).flatMap((o) => ('surrender' in o ? [o.surrender] : []))),
  );
  /** Modificador do teste como parcela da conta (" −1"), vazio quando é 0. */
  protected modTerm(v: number): string {
    return v ? ` ${signed(v)}` : '';
  }
  /** Chance em porcentagem, para a prévia ("65%"). */
  protected percent(p: number): string {
    return `${Math.round(p * 100)}%`;
  }

  protected readonly approachCount = computed(() => {
    const p = this.approachPlan();
    return p.surrender.length + p.roll.length + p.flee.length;
  });

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
    return reachableHexes(from, this.movesLeft(), this.area, this.moveBlocked());
  });
  /** Hexágonos por onde o personagem da vez não passa (os outros, paredes, inimigos). */
  private readonly moveBlocked = computed(() => {
    const group = this.group();
    const leader = this.active().id;
    return new Set([
      // no grupo, o líder passa por entre os companheiros (eles andam junto)
      ...[...this.positions()]
        .filter(([id]) => id !== leader && !(group.has(leader) && group.has(id)))
        .map(([, h]) => hexKey(h)),
      ...this.solid(),
      ...this.onBoardEnemies().map((e) => hexKey(e.hex)),
    ]);
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

  /** O agente da vez é o ouvinte; a zona dele (e o avião queimado) decide o ambiente. */
  private readonly soundZone = effect(() => {
    const map = this.map;
    if (!map) return;
    const here = this.positions().get(this.active().id);
    const fire = (map.burnables ?? []).some((b) => b.inspect && this.burned().has(b.id));
    this.sound.setListener(here);
    this.sound.setZone(zoneAt(map, here, fire ? ['fogo'] : []));
  });
  private readonly soundApproach = effect(() => this.sound.setApproach(this.approaching()));

  ngAfterViewInit(): void {
    if (!this.map) return;
    // o toque em "Iniciar" já destravou o áudio na maioria dos navegadores
    this.sound.unlock();
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
        onUnitTap: (id) => this.pickCharacter(id),
        onPropTap: (part) => this.tapProp(part),
        onCabinTap: (part) => this.tapCabin(part),
        onTargetTap: (id) => {
          this.tapTarget(id);
          this.centerOnTarget(id);
        },
      },
      {
        profile: this.renderSettings.profile(),
        walls: this.map.walls,
        enemies: this.enemies().map((e) => ({
          id: e.id,
          start: e.hex,
          facing: e.facing,
          model: this.map!.enemies.find((s) => s.id === e.id)?.model,
          hidden: e.status === 'hidden',
        })),
      },
    );
    // os queimáveis não levam ícone de chama nem aura: um contorno pulsante no modelo, que se toca
    // de qualquer lugar (vai até lá e abre a ação, ver `tapTarget`)
    this.board.setBurnTargets([]);
    this.board.setTargetOutlines(this.tapTargetList());
    this.board.setNpcTargets(this.npcTargets());
    this.board.setDoors(this.doors(), true);
    this.refreshVision();
    // `?caso=` abre direto num caso de teste (o menu usa isso para trocar de mapa)
    const testCase = findTestCase(this.route.snapshot.queryParamMap.get('caso'));
    // `?save=` carrega um save (o menu usa isso para trocar de mapa); sem nada, o automático
    // deste mapa, se houver (a página recarregou no meio da partida)
    const save = this.saveFromUrl() ?? this.saves.read('auto');
    if (testCase?.mapId === this.map.id) void this.runTestCase(testCase);
    else if (save?.mapId === this.map.id) this.applySave(save);
    else this.beginMatch();
    // tira o `?save=` da URL: recarregar a página volta ao automático, não a este slot
    if (this.route.snapshot.queryParamMap.has('save')) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: { save: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
    this.lessonTicker = setInterval(() => this.checkLessons(), 400);
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
    clearTimeout(this.slowResume);
    clearTimeout(this.noticeTimer);
    clearTimeout(this.speechTimer);
    clearInterval(this.statsTicker);
    clearInterval(this.lessonTicker);
    removeEventListener('resize', this.onDoorResize);
    removeEventListener('resize', this.onInterrogationResize);
    removeEventListener('resize', this.onIntroResize);
    clearTimeout(this.doorCheckTimer);
    this.board?.dispose();
    this.sound.stopAll();
  }

  // ---------- turnos ----------

  private startTurn(): void {
    const active = this.active();
    // fim do turno anterior: a partida vai para o save automático da sessão
    this.autosave();
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
    this.sound.play('ui.vez-agente');
    // agrupado: quem joga vai para a frente da fila antes de rolar o movimento
    const epoch = this.epoch;
    void this.reorderLine(toFront(this.line(), active.id)).then((ok) => {
      if (ok && this.epoch === epoch && !this.destroyed) this.roll();
    });
  }

  /**
   * Troca os agentes do grupo de lugar para a fila ficar como `next` (as vagas são as mesmas: cada
   * um anda até o hexágono de quem ocupava a vaga nova). Grupo espalhado: a fila fica como está.
   * Devolve `false` se a partida recomeçou no meio.
   */
  private async reorderLine(next: readonly string[]): Promise<boolean> {
    const epoch = this.epoch;
    const act = this.board ? planReline(this.core(), next, this.world()) : null;
    if (!act) return true;
    this.phase.set('walking');
    await this.board!.moveUnits(next[0], new Map(Object.entries(act.paths).map(([id, p]) => [id, [...p]])));
    if (this.destroyed || this.epoch !== epoch) return false;
    this.dispatch(act);
    return true;
  }

  /**
   * Rola 2d4: põe dois `app-d4` novos na tela, que caem e param sozinhos. O resultado fica
   * na tela até o jogador confirmar.
   */
  private roll(): void {
    this.phase.set('rolling');
    this.rolled.set(0);
    const seq = ++this.rollSeq;
    this.dieResults = [];
    // o resultado sai antes da animação: os dados só mostram o que já foi decidido
    const values = rollDice(MOVE_DICE.count, MOVE_DICE.sides, this.rng);
    // o motor soma vigor, grupo e Liderança
    this.dispatch({ type: 'roll', dice: values });
    this.rollValues.set(values);
    this.rollKeys.set(Array.from({ length: MOVE_DICE.count }, (_, i) => `${seq}-${i}`));
    // no celular, os dados "quicam" na mão (a não ser que a animação esteja reduzida)
    if (!reducedMotion()) this.haptics.vibrate(ROLL_PATTERN);
    this.sound.play('dado.2d4', { delay: 0.45 });
  }

  /** Um dos d4 parou; quando todos pararem, mostra o total. */
  protected dieRolled(key: string, index: number, value: number): void {
    if (this.destroyed || this.phase() !== 'rolling' || !this.rollKeys().includes(key)) return;
    this.dieResults[index] = value;
    if (this.dieResults.filter(Number.isFinite).length < MOVE_DICE.count) return;
    const final = [...this.core().dice];
    this.dice.set(final);
    this.rolled.set(sum(final));
    this.gamepad.rumble(0.3, 0.2, 120);
    this.haptics.vibrate(SETTLE_PATTERN);
  }

  /** Fecha o resultado da rolagem e libera o movimento. */
  protected confirmRoll(): void {
    if (this.phase() !== 'rolling' || this.rolled() === 0) return;
    this.beginChoosing();
  }

  private beginChoosing(): void {
    this.termKey.set(null);
    this.phase.set('moving-choice');
    this.refreshBoard();
  }

  protected endTurn(): void {
    if (['walking', 'checking', 'door', 'plane', 'cabin', 'interrogating', 'rolling', 'chase', 'enemy', 'over'].includes(this.phase())) return;
    // só quando o jogador decide passar (não depois de abordar ou queimar)
    if (this.phase() === 'moving-choice') this.sound.play('ui.passar');
    this.clearTimers();
    this.phase.set('ending');
    this.closeApproach();
    this.closeGrouping();
    this.closeBurn();
    // agrupado: quem jogou vai para o fim da fila e os de trás andam uma vaga para a frente
    // (a vez só passa depois; um segundo "encerrar" no meio disso não conta)
    if (this.passing) return;
    this.passing = true;
    const epoch = this.epoch;
    void this.reorderLine(toBack(this.line(), this.active().id)).then((ok) => {
      if (this.epoch !== epoch) return;
      this.passing = false;
      if (!ok || this.destroyed) return;
      if (this.activeIndex() === CHARACTERS.length - 1 && this.actingEnemies().length) {
        void this.enemyTurn();
        return;
      }
      this.nextCharacter();
    });
  }

  private nextCharacter(): void {
    this.dispatch({ type: 'nextAgent' });
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
    this.sound.play('ui.vez-inimigo');
    await this.wait(700);

    // perseguição: quem já correu nesta rodada não vai de novo; quem foi agarrado agora fica abalado
    const chased = new Set<string>();
    const caught = new Set<string>(this.caughtThisRound);
    this.caughtThisRound.clear();
    // um agente no raio de dois que vão correr escolhe antes qual perseguir; quem já fugiu na
    // hora da abordagem não corre de novo nesta rodada
    const handled = new Set<string>(this.ranThisRound);
    this.ranThisRound.clear();
    await this.resolveTargetChoices(epoch, chased, caught, handled);
    for (const { id } of this.enemies()) {
      if (stale()) return;
      const enemy = this.enemy(id);
      if (!enemy || !canAct(enemy) || handled.has(id)) continue;
      // parado no lugar (o Jô comendo): não anda nem gira, então nem chama a câmera
      if (enemy.status === 'patrol' && stationary(enemy)) continue;
      // em alerta: antes de correr, quem está perto pode ir atrás dele
      if (enemy.status === 'alert' && (await this.tryChase(enemy, epoch, chased, caught))) {
        if (stale()) return;
        await this.wait(300);
        continue;
      }
      if (stale()) return;
      // debaixo de um telhado que o jogador não enxerga, o inimigo age sem câmera nem animação
      const shown = enemy.status === 'alert' ? await this.flee(enemy, epoch) : await this.patrol(enemy, epoch);
      if (shown) await this.wait(300);
    }
    if (stale()) return;
    // o abalado de uma rodada atrás passa
    this.dispatch({ type: 'clearShaken', except: [...caught] });
    this.announceIfOver();
    this.nextCharacter();
  }

  /** Patrulha um trecho. Devolve se o jogador viu alguma coisa (câmera, animação, aviso). */
  private async patrol(enemy: EnemyState, epoch: number): Promise<boolean> {
    // o motor decide o trecho inteiro (e em que passo ele avista alguém); a tela só anima
    const act = planPatrolAct(this.core(), enemy.id, this.world(), this.rng);
    if (!this.dispatch(act)) return false;
    if (!act.path.length) {
      if (this.board!.isCovered(enemy.hex)) return false;
      this.say(`${enemy.name} espera: o caminho está bloqueado`, 'info');
      return true;
    }
    const shown = await this.walkEnemy(enemy, act.path, () => this.epoch === epoch);
    if (this.epoch !== epoch || !act.spotted) return shown;
    // o caminho já termina onde ele avistou: mostra o "!" e dá tempo de ver antes de seguir
    this.showSpotted(enemy.id, act.spotted);
    await this.wait(900);
    return true;
  }

  /** Foge para a borda. Devolve se o jogador viu alguma coisa (câmera, animação, aviso). */
  private async flee(enemy: EnemyState, epoch: number): Promise<boolean> {
    const act = planFleeAct(this.core(), enemy.id, this.world());
    if (!this.dispatch(act)) return false;
    const covered = this.board!.isCovered(enemy.hex);
    if (act.cornered) {
      if (!covered) {
        this.say(`${enemy.name} está encurralado!`, 'info');
        this.sound.play('ini.encurralado');
      }
      return !covered;
    }
    let shown = false;
    if (act.path.length) {
      if (!covered) this.say(`${enemy.name} corre para a borda!`, 'alert');
      shown = await this.walkEnemy(enemy, act.path, () => this.epoch === epoch, 1.8);
    }
    if (this.epoch !== epoch) return shown;
    if (act.fled) {
      this.say(`${enemy.name} fugiu do mapa!`, 'alert');
      this.sound.play('ini.foge', { at: this.enemy(enemy.id)!.hex });
      await this.board!.removeEnemy(enemy.id);
      return true;
    }
    return shown;
  }

  // ---------- perseguição (ver `chase.ts`) ----------

  /** Teclado: Modo Corrida, lousa tática, abertura, escolha de alvo e perseguição (C dá o gás; Esc deixa fugir). */
  protected onKey(ev: KeyboardEvent): void {
    // Modo Corrida: setas (ou WASD) trocam de faixa, pulam e deslizam
    if (this.runner && this.runnerOn()) {
      const cmd = RUNNER_KEYS[ev.key];
      if (cmd) {
        ev.preventDefault();
        this.runner.input(cmd);
        return;
      }
    }
    if (this.lesson()) {
      if (ev.key === 'Enter' || ev.key === 'ArrowRight') this.tacticalBoard()?.next();
      else if (ev.key === 'ArrowLeft') this.tacticalBoard()?.prev();
      else if (ev.key === 'Escape') this.tacticalBoard()?.close();
      else return;
      ev.preventDefault();
      return;
    }
    if (this.intro()) {
      if (ev.key === 'Enter') this.beginMission();
      else if (ev.key === 'Escape') this.skipMissionIntro();
      else return;
      ev.preventDefault();
      return;
    }
    // zoom num móvel: Esc fecha (o foco já fica no "Fechar"; "Pegar" aparece com o Tab)
    if (this.prop()) {
      if (ev.key !== 'Escape') return;
      ev.preventDefault();
      this.closeProp();
      return;
    }
    // dentro do avião: Esc sai; as setas deslizam a vista entre o painel e o fundo
    if (this.cabinInside()) {
      if (ev.key === 'Escape') this.leavePlane();
      else if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') this.board?.panCabinSide(1);
      else if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') this.board?.panCabinSide(-1);
      else return;
      ev.preventDefault();
      return;
    }
    if (this.targetPrompt()) {
      if (ev.key === 'ArrowLeft' || ev.key === 'a') this.targetSide('esquerda');
      else if (ev.key === 'ArrowRight' || ev.key === 'd') this.targetSide('direita');
      else if (ev.key === 'Enter' || ev.key === ' ') this.targetConfirm();
      else if (ev.key === 'Escape') this.targetCancel();
      else return;
      ev.preventDefault();
      return;
    }
    if (this.chaseOffer() && ev.key === 'Escape') this.pickChase(null);
    else if (this.chaseSprint()?.state === 'ready' && (ev.key === 'c' || ev.key === 'C')) {
      ev.preventDefault();
      this.sprint();
    }
  }

  /** Atributos de perseguição do agente: os da ficha (o grupo não soma). */
  private chaseStats(id: string): ChaseStats {
    const loadout = this.roster.loadout(id);
    const { vigor, iniciativa } = loadout.attributes;
    return { vigor, iniciativa };
  }

  /**
   * Antes de um suspeito em alerta correr: os agentes no raio de perseguição podem ir atrás.
   * O jogador escolhe quem (ou deixa fugir), o agente rola a iniciativa e, se arrancar, a
   * perseguição roda inteira. Devolve se houve perseguição (`false`: ele foge como sempre).
   */
  private async tryChase(enemy: EnemyState, epoch: number, chased: Set<string>, caught: Set<string>): Promise<boolean> {
    const board = this.board!;
    // debaixo de um telhado que o jogador não enxerga, ninguém vê ele arrancar
    if (!this.hasChase || board.isCovered(enemy.hex)) return false;
    const offers = chaseCandidates(enemy.hex, this.chaseAgents(), this.area, this.enemyWalls(), chased);
    if (!offers.length) return false;
    board.focusHex(enemy.hex);
    board.startleEnemy(enemy.id);
    this.sound.play('abo.carimbo');
    const agentId = await this.offerChase(enemy, offers);
    if (this.destroyed || this.epoch !== epoch) return true;
    if (!agentId) return false;
    return this.startChase(enemy, agentId, offers.find((o) => o.id === agentId)!.path, epoch, chased, caught);
  }

  /** Agentes no tabuleiro, com os atributos de perseguição. */
  private chaseAgents(): ChaseAgent[] {
    return CHARACTERS.flatMap((c) => {
      const hex = this.positions().get(c.id);
      return hex ? [{ id: c.id, hex, stats: this.chaseStats(c.id) }] : [];
    });
  }

  /**
   * Voz de prisão: depois do auto de abordagem, quem não se rendeu foge na hora, um por vez
   * (sempre depois de terminar a perseguição do anterior). Para cada um, a fila da voz de
   * prisão (`arrestQueue`); ninguém foi, ele corre como no turno inimigo. Depois passa a vez.
   */
  private async approachFlight(): Promise<void> {
    const flight = this.flight;
    this.flight = null;
    const epoch = this.epoch;
    const alive = () => !this.destroyed && this.epoch === epoch;
    if (flight?.enemies.length) {
      this.phase.set('chase');
      // quem arrancou atrás de um não vai atrás do próximo
      const ran = new Set<string>();
      for (const id of flight.enemies) {
        const enemy = this.enemy(id);
        if (!enemy || enemy.status !== 'alert') continue;
        this.ranThisRound.add(id);
        const went = await this.runArrestQueue(enemy, flight.agentId, flight.escort, epoch, ran);
        if (!alive()) return;
        if (!went) await this.flee(this.enemy(id)!, epoch);
        if (!alive()) return;
        await this.wait(300);
      }
      this.phase.set('ending');
    }
    if (!this.actingEnemies().length) this.announceIfOver();
    this.endTurn();
  }

  /**
   * A fila da voz de prisão de um suspeito, um agente por vez: carimbo "Perseguir?" só com o
   * da vez, iniciativa e, se arrancar, a perseguição. Hesitou: o próximo. Devolve se houve
   * perseguição (`false`: ninguém foi). Quem arrancou entra em `ran`.
   */
  private async runArrestQueue(
    enemy: EnemyState,
    leaderId: string,
    escort: ArrestEscort,
    epoch: number,
    ran: Set<string>,
  ): Promise<boolean> {
    const board = this.board!;
    // quem já rolou para este (ou já correu atrás de outro) fica de fora
    if (!this.hasChase) return false;
    const tried = new Set(ran);
    for (;;) {
      if (this.destroyed || this.epoch !== epoch) return true;
      const now = this.enemy(enemy.id) ?? enemy;
      const queue = arrestQueue(now.hex, leaderId, this.chaseAgents(), this.area, this.enemyWalls(), tried, escort);
      const [next] = queue;
      if (!next) return false;
      board.focusHex(now.hex);
      board.startleEnemy(enemy.id);
      this.sound.play('abo.carimbo');
      const agentId = await this.offerChase(now, [next], next.id === leaderId ? 'Voz de prisão' : 'Reforço');
      if (this.destroyed || this.epoch !== epoch) return true;
      if (!agentId) return false;
      if (await this.startChase(now, next.id, next.path, epoch, tried, this.caughtThisRound, queue.length > 1)) {
        ran.add(next.id);
        return true;
      }
    }
  }

  /**
   * O agente escolhido rola a iniciativa e, se arrancar, corre. Devolve se houve perseguição
   * (`false`: ele hesitou e o suspeito foge como sempre).
   */
  private async startChase(
    enemy: EnemyState,
    agentId: string,
    path: HexCoord[],
    epoch: number,
    chased: Set<string>,
    caught: Set<string>,
    /** Ainda tem gente na fila da voz de prisão depois dele. */
    backup = false,
  ): Promise<boolean> {
    chased.add(agentId);
    const stats = this.chaseStats(agentId);
    const need = CHASE_RULES.initiativeDC - (stats.iniciativa ?? 0);
    const ini = await this.rollD20(
      { kicker: 'Iniciativa', who: this.nameOf(agentId), need: `precisa de ${need} ou mais`, passText: 'Arrancou!', failText: 'Hesitou' },
      (roll) => initiativeCheck(roll, stats).go,
      900,
    );
    if (!ini) return true;
    if (!ini.pass) {
      this.resetSlow();
      this.sound.chaseEnd();
      this.board?.setChaseCamera(null);
      this.say(backup ? `${this.nameOf(agentId)} hesitou! Quem vai?` : `${this.nameOf(agentId)} hesitou. ${enemy.name} corre!`, 'alert');
      return false;
    }
    // d20 natural 20 ou 1 na iniciativa: muda a velocidade dele a corrida inteira
    const { crit, permanent } = initiativeCheck(ini.roll, stats);
    if (crit === 'critico') this.say(`Acerto crítico! ${this.nameOf(agentId)} arranca ${permanent}% mais rápido nesta corrida.`, 'alert');
    else if (crit === 'falha') this.say(`Falha crítica! ${this.nameOf(agentId)} arranca ${-permanent}% mais lento nesta corrida.`, 'alert');
    await this.runChase(enemy.id, agentId, path, epoch, caught, permanent);
    return true;
  }

  /**
   * Escolha de alvo (`decisao:alvo`): um agente no raio de dois ou mais suspeitos que vão
   * correr escolhe qual perseguir. Roda no começo do turno inimigo; quem foi escolhido (e
   * perseguido) entra em `handled` e não age de novo no turno. O outro segue a fila normal:
   * é oferecido aos agentes que ainda não correram.
   */
  private async resolveTargetChoices(epoch: number, chased: Set<string>, caught: Set<string>, handled: Set<string>): Promise<void> {
    const board = this.board!;
    if (!this.hasChase) return;
    const alive = () => !this.destroyed && this.epoch === epoch;
    const agents = () => this.chaseAgents();
    const runners = () =>
      this.enemies().filter((e) => e.status === 'alert' && !handled.has(e.id) && !board.isCovered(e.hex));
    for (;;) {
      if (!alive()) return;
      const offers = new Map(runners().map((e) => [e.id, chaseCandidates(e.hex, agents(), this.area, this.enemyWalls(), chased)]));
      const [choice] = targetChoices(offers);
      if (!choice) return;
      const [agentId, enemyIds] = choice;
      const enemyId = await this.chooseTarget(agentId, enemyIds);
      if (!alive()) return;
      // desistiu dos dois: ele não vai atrás de ninguém nesta rodada (os outros ainda podem)
      chased.add(agentId);
      if (!enemyId) continue;
      const enemy = this.enemy(enemyId)!;
      const path = offers.get(enemyId)!.find((o) => o.id === agentId)!.path;
      if (await this.startChase(enemy, agentId, path, epoch, chased, caught)) handled.add(enemyId);
      if (!alive()) return;
      await this.wait(300);
    }
  }

  /**
   * A cena da escolha: a câmera desce atrás do agente olhando para o meio dos suspeitos, tudo
   * fica cinza (menos eles, com a etiqueta do lado) e a música entra em ultra slow. O 1º toque
   * num lado vira o agente para aquele; o 2º no mesmo lado confirma. Resolve com o escolhido
   * (ou `null`: deixar os dois).
   */
  private async chooseTarget(agentId: string, enemyIds: readonly string[]): Promise<string | null> {
    const board = this.board!;
    const from = this.positions().get(agentId)!;
    const enemies = enemyIds.map((id) => this.enemy(id)!).filter(Boolean);
    // lado de cada um para quem olha do agente para o meio deles (produto vetorial no plano)
    const w = (h: HexCoord) => hexToWorld(h, 1);
    const a = w(from);
    const mid = enemies.reduce((m, e) => ({ x: m.x + w(e.hex).x / enemies.length, z: m.z + w(e.hex).z / enemies.length }), { x: 0, z: 0 });
    const f = { x: mid.x - a.x, z: mid.z - a.z };
    const across = (e: EnemyState) => f.x * (w(e.hex).z - a.z) - f.z * (w(e.hex).x - a.x);
    const options = [...enemies]
      .sort((p, q) => across(p) - across(q))
      .map((e, i, all) => ({
        enemyId: e.id,
        name: e.name,
        label: all.length === 2 ? (i === 0 ? 'esquerda' : 'direita') : `${i + 1}`,
      }));
    board.setChaseCamera(agentId, undefined, enemies.map((e) => e.hex));
    await this.sound.chaseStart(4);
    const release = this.holdSlow();
    this.say(`${this.nameOf(agentId)}: dois fugindo! Qual?`, 'alert');
    const picked = await new Promise<string | null>((done) => {
      this.targetDone = done;
      this.targetPrompt.set({ id: ++this.targetSeq, agent: this.nameOf(agentId), agentId, options, pick: null });
      this.paintTargets();
    });
    this.board?.setSpotlight(null);
    // escolheu: o slow emenda na iniciativa (ver `SLOW_GRACE_MS`)
    release();
    if (!picked) {
      this.resetSlow();
      this.sound.chaseEnd();
      this.board?.setChaseCamera(null);
    }
    return picked;
  }

  /** Cinza da escolha de alvo, com a etiqueta de cada um (a do que está em prévia, marcada). */
  private paintTargets(): void {
    const t = this.targetPrompt();
    if (!t) return;
    this.board?.setSpotlight({
      units: [t.agentId],
      labels: t.options.map((o, i) => ({
        id: o.enemyId,
        text: t.pick === i ? `▶ ${o.label} · ${o.name}` : o.label,
        tone: t.pick === i ? ('roll' as const) : ('flee' as const),
      })),
      hexes: [],
    });
  }

  /**
   * Toque/seta para um lado na escolha de alvo: o 1º vira o agente para aquele suspeito, o 2º
   * no mesmo lado confirma. Com mais de dois, cada toque anda um para aquele lado.
   */
  protected targetSide(side: Side, confirmAgain = true): void {
    const t = this.targetPrompt();
    if (!t) return;
    const n = t.options.length;
    const next =
      t.pick === null ? (side === 'esquerda' ? 0 : n - 1) : Math.max(0, Math.min(n - 1, t.pick + (side === 'esquerda' ? -1 : 1)));
    if (t.pick === next) {
      // no controle o direcional repete enquanto segura: lá só ✕ confirma
      if (confirmAgain) this.targetConfirm();
      return;
    }
    this.sound.play('ui.hex');
    this.targetPrompt.set({ ...t, pick: next });
    this.board?.faceEnemy(t.agentId, t.options[next].enemyId);
    this.paintTargets();
  }

  /** Confirma o alvo em prévia (✕, Enter, 2º toque). */
  protected targetConfirm(): void {
    const t = this.targetPrompt();
    if (!t || t.pick === null) return;
    this.sound.play('ui.confirmar');
    this.finishTarget(t.options[t.pick].enemyId);
  }

  /** Deixa os dois fugirem (○, Esc). */
  protected targetCancel(): void {
    if (this.targetPrompt()) this.finishTarget(null);
  }

  private finishTarget(enemyId: string | null): void {
    const done = this.targetDone;
    this.targetDone = undefined;
    this.targetPrompt.set(null);
    done?.(enemyId);
  }

  /** Mostra o carimbo "Perseguir?" com os agentes que podem ir. Resolve com o escolhido (ou `null`). */
  private offerChase(enemy: EnemyState, offers: readonly ChaseCandidate[], kicker = 'Ele vai correr'): Promise<string | null> {
    return new Promise((done) => {
      this.chaseOfferDone = done;
      this.chaseOffer.set({
        kicker,
        enemy: enemy.name,
        options: offers.map((o) => ({
          id: o.id,
          name: this.nameOf(o.id),
          steps: o.path.length,
          chance: this.percent(initiativeChance(this.chaseStats(o.id))),
        })),
      });
    });
  }

  /** Escolha no carimbo "Perseguir?" (`null`: deixar fugir). */
  protected pickChase(agentId: string | null): void {
    const done = this.chaseOfferDone;
    if (!done) return;
    this.chaseOfferDone = undefined;
    this.chaseOffer.set(null);
    if (agentId) this.sound.play('ui.confirmar');
    done(agentId);
  }

  /**
   * A perseguição: trava a rota de fuga e a corrida roda no mapa de corrida (Modo Corrida, ver
   * `runnerSteps`). Distância 0: agarrou, ele se rende abalado. Rota no fim: ele escapa (e foge do
   * mapa, se chegou à borda).
   */
  private async runChase(
    enemyId: string,
    agentId: string,
    agentPath: HexCoord[],
    epoch: number,
    caught: Set<string>,
    startPct = 0,
  ): Promise<void> {
    try {
      await this.chaseSteps(enemyId, agentId, agentPath, epoch, caught, startPct);
    } finally {
      // terminou, ou a partida recomeçou no meio: a câmera sobe, a faixa some e o placar sai
      this.resetSlow();
      this.board?.setChaseCamera(null);
      this.sound.chaseEnd();
      this.chaseHud.set(null);
      this.chaseSprint.set(null);
      this.sprintStart = undefined;
    }
  }

  private async chaseSteps(
    enemyId: string,
    agentId: string,
    agentPath: HexCoord[],
    epoch: number,
    caught: Set<string>,
    startPct: number,
  ): Promise<void> {
    const alive = () => !this.destroyed && this.epoch === epoch;
    const enemy = this.enemy(enemyId)!;
    const agentFrom = this.positions().get(agentId)!;
    const others = [...this.positions()].filter(([id]) => id !== agentId).map(([, h]) => h);
    const blocked = new Set([
      ...this.fixedWalls,
      ...this.lowCover,
      ...this.onBoardEnemies().filter((e) => e.id !== enemyId).map((e) => hexKey(e.hex)),
    ]);
    // ele foge do que os agentes enxergam (todos, inclusive quem corre atrás dele)
    const sight = agentSight([...this.positions().values()], this.area, this.walls());
    const route = lockRoute(enemy.hex, this.area, blocked, this.doors(), others, sight);
    // a pista: do agente até ele e, dali, a rota de fuga travada
    const track = [agentFrom, ...agentPath, ...route.flee];
    const n = agentPath.length;
    // a perseguição troca o tabuleiro pelo mapa de corrida (ver game/runner-session.ts)
    return this.runnerSteps(enemyId, agentId, route, track, n, alive, caught, startPct);
  }

  /**
   * Modo Corrida: a câmera desce nas costas do agente, as peças viram e a perseguição corre no mapa
   * de corrida (três faixas, obstáculos). No fim, a onda volta e os dois aparecem no tabuleiro
   * onde a corrida os deixou (ver `RunnerSession`).
   */
  private async runnerSteps(
    enemyId: string,
    agentId: string,
    route: ChaseRoute,
    track: HexCoord[],
    n: number,
    alive: () => boolean,
    caught: Set<string>,
    startPct: number,
  ): Promise<void> {
    const board = this.board!;
    const enemy = this.enemy(enemyId)!;
    const who = this.nameOf(agentId);
    const character = CHARACTERS.find((c) => c.id === agentId)!;
    const start = runnerStart(enemy.hex, route.flee, this.map!);
    this.say(`${who} persegue ${enemy.name}!`, 'alert');
    board.setChaseCamera(agentId, enemyId);

    // corrida (gás): o mesmo botão de sempre, de novo a cada recarga
    let sprintAt = 0;
    let sprintPct = 0;
    // críticos (d20 natural 20 na iniciativa ou no gás, 1 na iniciativa): mudam a velocidade até o fim da corrida
    let permanentPct = startPct;
    const boost = () => agentRate(sprintPct ? sprintRate(sprintPct, performance.now() - sprintAt) : 1, permanentPct);
    let shown = -1;
    const session = new RunnerSession({
      canvas: this.runnerRef().nativeElement,
      tactical: board,
      start,
      agent: { id: agentId, color: character.color, model: character.model, hex: track[0] },
      enemy: {
        id: enemyId,
        model: this.map!.enemies.find((e) => e.id === enemyId)?.model,
        hex: enemy.hex,
        agilidade: enemy.agilidade,
      },
      track,
      n,
      profile: this.renderSettings.profile(),
      boost,
      alive,
      instant: reducedMotion(),
      rollEnemy: () => rollDie(CHASE_RULES.die),
      onEvent: (ev) => this.runnerEvent(ev, who, enemy.name),
      onHud: (distance, step, total) => {
        const now = this.chaseHud();
        if (!now || now.distance !== distance || now.step !== step) this.chaseHud.set({ agent: who, enemy: enemy.name, distance, step, total });
        if (distance !== shown) this.sound.chaseDistance((shown = distance));
      },
    });
    this.runner = session;
    // o placar entra já (a papelada sai) e a câmera desce
    session.hud();
    try {
      // a câmera desce e encosta (como sempre); aí as peças viram
      await this.wait(600);
      if (!alive()) return;
      this.runnerOn.set(true);
      void this.sound.chaseStart(Math.max(0, n - 1));
      this.sound.play('ui.hex');
      await session.enter();
      if (!alive()) return;
      this.say('← → vira nas curvas · ↑ pula · ↓ desliza (ou arraste na tela)', 'info');
      this.chaseSprint.set({ state: 'ready', roll: null, vigor: 0, percent: 0, ms: 0 });
      this.sprintStart = () => {
        const roll = rollDie(CHASE_RULES.sprintDie);
        const vigor = this.chaseStats(agentId).vigor ?? 0;
        const { percent, crit, permanent, trip } = resolveSprint(roll, { vigor });
        // tropeço: sem gás, o selo fica só o tempo de ler e a recarga começa
        const ms = crit === 'tropeco' ? 1200 : sprintTotalMs();
        const rolling: SprintView = { state: 'rolling', roll, vigor, percent, ms, crit, permanent: permanentPct + permanent };
        const active: SprintView = { ...rolling, state: 'active' };
        this.chaseSprint.set(rolling);
        this.sound.play('dado.d20');
        const swap = (from: SprintView, to: SprintView) => {
          if (!alive() || this.chaseSprint() !== from) return false;
          this.chaseSprint.set(to);
          return true;
        };
        const cooldownMs = CHASE_RULES.sprintCooldownSeconds * 1000;
        const cooldown: SprintView = { ...active, state: 'cooldown', ms: cooldownMs };
        this.timers.push(
          setTimeout(() => {
            if (!swap(rolling, active)) return;
            if (crit === 'tropeco') {
              // tirou 1: sem gás, ele tropeça e perde `sprintTripSeconds`
              session.race.trip(trip);
              this.gamepad.rumble(0.7, 0.4, 220);
              this.haptics.vibrate(60);
              this.sound.play('teste.falhou');
              this.say(`${who} tropeçou na arrancada e perdeu terreno!`, 'alert');
              return;
            }
            sprintAt = performance.now();
            sprintPct = percent;
            permanentPct += permanent;
            this.gamepad.rumble(crit ? 0.8 : 0.4, crit ? 0.6 : 0.3, crit ? 350 : 200);
            this.say(`${who} deu o gás: +${percent}% de velocidade por ${CHASE_RULES.sprintSeconds} s!`, 'alert');
            if (crit === 'critico') {
              this.sound.play('teste.20');
              this.say(`Acerto crítico! ${who} fica ${CHASE_RULES.sprintCritPercent}% mais rápido até o fim da corrida.`, 'alert');
            }
          }, SPRINT_DIE_MS + 150),
          setTimeout(() => swap(active, cooldown), SPRINT_DIE_MS + 150 + ms),
          // recarregou: pode rolar outro d20
          setTimeout(() => {
            if (swap(cooldown, { state: 'ready', roll: null, vigor, percent: 0, ms: 0 })) this.sound.play('ui.confirmar');
          }, SPRINT_DIE_MS + 150 + ms + cooldownMs),
        );
      };
      const over = await session.run();
      this.chaseSprint.set(null);
      this.sprintStart = undefined;
      if (!alive() || !over) return;
      await this.wait(300);
      if (!alive()) return;
      // onde a corrida os deixou, no tabuleiro
      const at = session.tacticalResult();
      this.dispatch({ type: 'place', positions: { [agentId]: at.agent } });
      this.updateEnemy(enemyId, { hex: at.enemy, facing: facingBetween(at.agent, at.enemy) });
      board.endChaseRun(agentId, at.agent, enemyId, at.enemy);
      board.setChaseCamera(agentId, enemyId);
      this.sound.play('ui.hex');
      await session.leave(at.agent, at.enemy);
      this.runnerOn.set(false);
      session.dispose();
      if (!alive()) return;
      await this.chaseOutcome(over, route.escapes, enemyId, agentId, caught, alive);
    } finally {
      this.runnerOn.set(false);
      session.dispose();
      if (this.runner === session) this.runner = undefined;
    }
  }

  /** O que aconteceu na corrida: bater, ele tropeçar, pular, deslizar. */
  private runnerEvent(ev: RunnerEvent, who: string, enemy: string): void {
    if (ev.type === 'bateu') {
      this.gamepad.rumble(0.7, 0.4, 220);
      this.haptics.vibrate(60);
      this.sound.play('teste.falhou');
      const what: Record<string, string> = { aviao: 'no avião', asa: 'na asa do avião', parede: 'na parede', porta: 'na porta' };
      this.say(`${who} bateu ${what[ev.obstacle.kind] ?? 'no obstáculo'} e perdeu terreno!`, 'alert');
    } else if (ev.type === 'curva-perto') {
      this.say(ev.side === 'esquerda' ? '← Curva à esquerda!' : 'Curva à direita! →', 'info');
      this.sound.play('ui.relogio');
    } else if (ev.type === 'virou') {
      this.sound.play('ui.confirmar');
    } else if (ev.type === 'bateu-curva') {
      this.gamepad.rumble(0.9, 0.5, 300);
      this.haptics.vibrate(90);
      this.sound.play('teste.falhou');
      this.say(ev.wrong ? `${who} virou para o lado errado e bateu!` : `${who} passou da curva e bateu!`, 'alert');
    } else if (ev.type === 'tropecou') {
      this.sound.play('teste.passou');
      this.say(`${enemy} tropeçou (d20 ${ev.roll}, precisava de ${ev.need})!`, 'info');
    } else if ((ev.type === 'pulo' || ev.type === 'deslize') && ev.who === 'agente') {
      this.sound.play('ui.caminho');
    }
  }

  /** Fim da perseguição: agarrou (ele se rende), ou ele foge ou escapa. */
  private async chaseOutcome(
    over: 'agarrou' | 'fugiu' | null,
    escapes: boolean,
    enemyId: string,
    agentId: string,
    caught: Set<string>,
    alive: () => boolean,
  ): Promise<void> {
    if (over === 'agarrou') {
      const e = this.enemy(enemyId)!;
      const facing = facingBetween(e.hex, this.positions().get(agentId)!);
      this.updateEnemy(enemyId, { status: 'surrendered', shaken: true, facing });
      this.board?.setEnemyFacing(enemyId, facing);
      this.board?.setEnemyAlert(enemyId, false);
      this.board?.setEnemySurrendered(enemyId, true);
      caught.add(enemyId);
      this.sound.play('ini.rende', { at: e.hex });
      this.gamepad.rumble(0.8, 0.5, 300);
      this.say(`${this.nameOf(agentId)} agarrou ${e.name}! Rendido e abalado: +${CHASE_RULES.shakenBonus} no interrogatório.`, 'alert');
    } else if (escapes) {
      const e = this.enemy(enemyId)!;
      this.updateEnemy(enemyId, { status: 'fled' });
      this.say(`${e.name} escapou de ${this.nameOf(agentId)} e fugiu do mapa!`, 'alert');
      this.sound.play('ini.foge', { at: e.hex });
      await this.board?.removeEnemy(enemyId);
    } else this.say(`${this.enemy(enemyId)!.name} escapou de ${this.nameOf(agentId)}.`, 'alert');
    this.refreshVision();
    this.sound.chaseEnd();
    await this.wait(1000);
    if (!alive()) return;
    this.board?.setChaseCamera(null);
    this.chaseHud.set(null);
    await this.wait(500);
  }

  /** Botão **Correr!** (toque, C, □): com os dois correndo, de novo a cada recarga. */
  protected sprint(): void {
    const start = this.sprintStart;
    if (this.chaseSprint()?.state !== 'ready' || !start) return;
    start();
  }

  /**
   * Segura o slow da perseguição (a escolha de alvo e o dado que vem dela): enquanto
   * alguém segurar, a música, a animação, os passos e o zoom ficam desacelerados. Devolve quem
   * solta (uma vez só). O último a soltar volta tudo ao normal depois de `SLOW_GRACE_MS`, se
   * ninguém segurar de novo antes.
   */
  private holdSlow(): () => void {
    if (this.slowResume !== undefined) {
      clearTimeout(this.slowResume);
      this.slowResume = undefined;
    } else if (this.slowHolds === 0) this.applySlow(true);
    this.slowHolds++;
    const gen = this.slowGen;
    let held = true;
    return () => {
      if (!held || gen !== this.slowGen) return;
      held = false;
      if (--this.slowHolds > 0) return;
      this.slowResume = setTimeout(() => {
        this.slowResume = undefined;
        if (this.slowHolds === 0) this.applySlow(false);
      }, SLOW_GRACE_MS);
    };
  }

  /** O slow está valendo (alguém segura, ou acabou de soltar e ainda está na folga). */
  private slowActive(): boolean {
    return this.slowHolds > 0 || this.slowResume !== undefined;
  }

  private applySlow(on: boolean): void {
    this.sound.chaseSlow(on);
    this.board?.setChaseSlowmo(on);
  }

  /** Fim da perseguição (ou recomeço): ninguém segura mais, e tudo volta ao normal na hora. */
  private resetSlow(): void {
    clearTimeout(this.slowResume);
    const was = this.slowActive();
    this.slowResume = undefined;
    this.slowHolds = 0;
    this.slowGen++;
    if (was) this.applySlow(false);
  }

  /**
   * Anda com o inimigo pelo caminho. Os passos de um hexágono coberto a outro (debaixo de
   * um telhado que o jogador não enxerga, ver `HexBoard.isCovered`) acontecem na hora, sem
   * câmera nem animação — o jogador não sabe o que se passa lá dentro. O resto anda
   * normalmente, com a câmera chegando antes do primeiro trecho visível. `onStep` é como o
   * de `moveEnemy`. Devolve se algum trecho apareceu na tela.
   */
  private async walkEnemy(
    enemy: EnemyState,
    path: readonly HexCoord[],
    onStep: (hex: HexCoord) => boolean,
    speed = 1,
  ): Promise<boolean> {
    const board = this.board!;
    const { id, status } = enemy;
    const hiddenStep = (from: HexCoord, to: HexCoord) => board.isCovered(from) && board.isCovered(to);
    // o passo que está na tela (o estado já tem o fim do trecho): o cone de visão segue ele
    let view = { id, status, hex: enemy.hex, facing: enemy.facing };
    const step = (hex: HexCoord): boolean => {
      view = { ...view, hex, facing: facingBetween(view.hex, hex) };
      this.enemyView = view;
      this.refreshVision();
      return onStep(hex);
    };
    try {
      return await this.walkEnemySteps(board, id, path, step, hiddenStep, () => view.hex, speed);
    } finally {
      this.enemyView = null;
      this.refreshVision();
    }
  }

  private async walkEnemySteps(
    board: HexBoard,
    id: string,
    path: readonly HexCoord[],
    onStep: (hex: HexCoord) => boolean,
    hiddenStep: (from: HexCoord, to: HexCoord) => boolean,
    at: () => HexCoord,
    speed: number,
  ): Promise<boolean> {
    let shown = false;
    let i = 0;
    while (i < path.length) {
      const from = at();
      if (hiddenStep(from, path[i])) {
        board.jumpEnemy(id, path[i]);
        this.enemySteps(path[i], speed, true);
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
          this.enemySteps(hex, speed);
          stopped = !onStep(hex);
          return !stopped;
        },
        speed,
      );
      if (stopped || hexKey(at()) !== hexKey(path[j - 1])) return shown;
      i = j;
    }
    return shown;
  }

  /** Se o inimigo em patrulha enxerga algum agente, entra em alerta. Devolve se avistou. */
  private checkSpotted(enemyId: string, agents: ReadonlyMap<string, HexCoord> = this.positions()): boolean {
    if (!this.map) return false;
    const seen = firstSighting(this.core(), agents, this.world(), enemyId);
    if (!seen) return false;
    const { agent, at } = seen.sighting;
    if (!this.dispatch({ type: 'spot', enemy: enemyId, agent, at })) return false;
    this.showSpotted(enemyId, seen.sighting);
    return true;
  }

  /** Mostra que o inimigo avistou alguém (o estado já está em alerta): "!", giro, som e aviso. */
  private showSpotted(enemyId: string, { agent: who }: Sighting): void {
    const enemy = this.enemy(enemyId);
    if (!enemy) return;
    // quem foi visto não se abaixa mais na cobertura
    this.seenAgents.add(who);
    this.board?.setSeenAgents(this.seenAgents);
    // vira para quem viu
    this.board?.setEnemyFacing(enemyId, enemy.facing);
    this.board?.setEnemyAlert(enemyId, true);
    this.refreshVision();
    this.gamepad.rumble(0.7, 0.4, 260);
    this.sound.spotted();
    this.say(`${enemy.name} avistou ${this.nameOf(who)}! Vai correr para a borda.`, 'alert');
  }

  /** Agentes já avistados por algum inimigo na partida (não se abaixam na cobertura). */
  private readonly seenAgents = new Set<string>();

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
    // porta fechada: como tocar no contorno dela (colado, abre o menu; de longe, marca o caminho)
    const door = hex && this.doors().get(hexKey(hex));
    if (door && !isOpen(door)) {
      this.tapTarget(DOOR_TARGET + hexKey(door.hex));
      return;
    }
    if (this.viewingOther()) this.focusCharacter(this.active().id);
    this.farTarget.set(null);
    if (hex && this.destinations().has(hexKey(hex))) {
      // segundo toque no mesmo hexágono confirma o movimento
      if (sameHex(hex, this.selected())) {
        void this.confirm();
        return;
      }
      this.selected.set(hex);
      this.sound.play('ui.hex');
      this.sound.play('ui.caminho', { delay: 0.06 });
    } else {
      if (hex) this.sound.play('ui.invalido');
      this.selected.set(null);
    }
    this.board?.setSelected(this.selected(), this.selectedPath());
  }

  /**
   * O que se toca direto no tabuleiro para interagir: o avião, os suprimentos e os NPCs rendidos
   * com interação (`npc:<id>`). `near` diz de onde dá para agir (colado no alvo); `spare` é o
   * movimento que precisa sobrar depois de chegar (conversar gasta a primeira pergunta).
   */
  private tapTargetOf(id: string): TapTarget | null {
    if (id.startsWith(DOOR_TARGET)) {
      const key = id.slice(DOOR_TARGET.length);
      const door = this.doors().get(key);
      if (!door || isOpen(door)) return null;
      return {
        id,
        near: (h) => nextToDoor(h, door.hex),
        spare: 0,
        far: 'Chegue colado na porta para interagir com ela',
        act: () => this.openDoorMenu(this.doors().get(key) ?? null),
      };
    }
    if (id === KEY_TARGET) {
      const panel = this.map?.keyPanel;
      if (!panel || !this.panelNoticed()) return null;
      return {
        id,
        near: (h) => nextToPanel(h, panel),
        spare: 0,
        far: 'Chegue colado no quadro de chaves para olhar de perto',
        act: () => void this.openProp('keys'),
      };
    }
    if (id.startsWith(SPOT_TARGET)) {
      const item = this.spotTargets().find((h) => SPOT_TARGET + h.id === id);
      if (!item) return null;
      return {
        id,
        near: (h) => canReach(h, item.spot),
        spare: 0,
        far: `Chegue colado ${item.at} para olhar de perto`,
        act: () => void this.openProp(item),
      };
    }
    if (id.startsWith(NPC_TARGET)) {
      const e = this.enemies().find((x) => NPC_TARGET + x.id === id && x.status === 'surrendered');
      if (!e || !hasDialogue(npcClass(e.npc))) return null;
      return {
        id,
        near: (h) => inAura(h, e.hex),
        spare: INTERROGATION_RULES.moveCost,
        far: `Chegue perto de ${e.name} para conversar`,
        act: () => void this.startInterrogation(e.id),
      };
    }
    const t = (this.map?.burnables ?? []).find((b) => b.id === id && !this.burned().has(b.id));
    return t
      ? { id, near: (h) => canBurn(h, t), spare: 0, far: `Chegue colado n${t.name} para interagir`, act: () => this.actOn(t) }
      : null;
  }

  /**
   * Alvo tocado direto no tabuleiro (o avião, os suprimentos, um NPC rendido). Colado nele, abre
   * a ação (o menu do avião, o "Queimar", a conversa); de longe, escolhe o caminho mais curto até
   * ficar colado — e o segundo toque (no alvo ou no Confirmar) anda até lá e já abre a ação. NPC
   * rendido sem interação só mostra o balão "Nenhuma interação".
   */
  /** Primeiro toque num alvo (o avião, os suprimentos, um NPC rendido): a câmera vai até ele. */
  private centerOnTarget(id: string): void {
    const spot = this.tapTargetList().find((t) => t.id === id);
    if (spot && !(this.map?.burnables ?? []).some((b) => b.id === id)) {
      this.board?.focusArea(spot.hexes);
      return;
    }
    if (id.startsWith(NPC_TARGET)) {
      const e = this.enemies().find((x) => NPC_TARGET + x.id === id);
      if (e) this.board?.focusArea([e.hex]);
      return;
    }
    const t = (this.map?.burnables ?? []).find((b) => b.id === id);
    if (t) this.board?.focusArea(t.hexes);
  }

  private tapTarget(id: string): void {
    if (this.phase() !== 'moving-choice' || this.approaching() || this.grouping()) return;
    if (this.burning()) {
      this.cancelBurn();
      return;
    }
    const from = this.positions().get(this.active().id);
    if (!from) return;
    const target = this.tapTargetOf(id);
    if (!target) {
      // rendido sem nada a dizer (o tabuleiro só manda rendidos): balão sobre ele, sem andar
      if (id.startsWith(NPC_TARGET)) {
        if (this.viewingOther()) this.focusCharacter(this.active().id);
        this.sound.play('ui.invalido');
        this.board?.flashTargetLabel(id, 'Nenhuma interação', { avoid: () => this.hudRects() });
      }
      return;
    }
    if (this.viewingOther()) this.focusCharacter(this.active().id);
    if (target.near(from)) {
      this.aimedTarget.set(null);
      this.farTarget.set(null);
      target.act();
      return;
    }
    const reach = this.reach();
    const budget = this.movesLeft() - target.spare;
    let best: HexCoord | null = null;
    let bestCost = Infinity;
    for (const key of this.destinations()) {
      const [col, row] = key.split(',').map(Number);
      const h = { col, row };
      const cost = reach.get(key)?.cost ?? Infinity;
      if (cost < bestCost && cost <= budget && target.near(h)) {
        best = h;
        bestCost = cost;
      }
    }
    if (!best) {
      this.sound.play('ui.invalido');
      this.selected.set(null);
      this.aimedTarget.set(null);
      this.board?.setSelected(null);
      // sem movimento para chegar: mostra mesmo assim, em cinza, o caminho até ficar colado
      const far = this.farRoute(from, target);
      if (far) this.farTarget.set({ id: target.id, from: hexKey(from), ...far });
      else this.say(target.far, 'info');
      return;
    }
    this.farTarget.set(null);
    if (sameHex(best, this.selected())) {
      void this.confirm();
      return;
    }
    this.selected.set(best);
    this.aimedTarget.set({ id: target.id, hex: best });
    this.cursor.set(best);
    // "trava-mira": som e vibração próprios, diferentes do toque comum num hexágono
    this.sound.play('ui.mira');
    this.sound.play('ui.caminho', { delay: 0.2 });
    this.haptics.vibrate(AIM_PATTERN);
    this.board?.setSelected(this.selected(), this.selectedPath());
  }

  /**
   * Caminho mais curto até ficar colado no alvo sem o limite de movimento (o hexágono de chegada
   * e os passos até ele), ou `null` se não há como chegar.
   */
  private farRoute(from: HexCoord, target: TapTarget): { hex: HexCoord; path: HexCoord[] } | null {
    const occupied = new Set([...this.positions().values()].map(hexKey));
    const all = reachableHexes(from, Number.MAX_SAFE_INTEGER, this.area, this.moveBlocked());
    let best: { coord: HexCoord; cost: number } | null = null;
    for (const [key, node] of all) {
      if (occupied.has(key) || !target.near(node.coord)) continue;
      if (!best || node.cost < best.cost) best = node;
    }
    return best ? { hex: best.coord, path: pathTo(all, best.coord) } : null;
  }

  /**
   * Alvo tocado de longe demais (o movimento não alcança): o caminho até ele fica marcado em
   * cinza, com o balão "Longe demais para interagir". Vale enquanto o agente não sair do lugar.
   */
  private readonly farTarget = signal<{ id: string; from: string; hex: HexCoord; path: HexCoord[] } | null>(null);
  protected readonly lockedTarget = computed(() => {
    const far = this.farTarget();
    if (!far || this.phase() !== 'moving-choice' || this.selected()) return null;
    if (hexKey(this.positions().get(this.active().id) ?? { col: NaN, row: NaN }) !== far.from) return null;
    return this.tapTargetOf(far.id) ? far : null;
  });

  /** Alvo escolhido por toque e o hexágono colado nele para onde o agente vai andar. */
  private readonly aimedTarget = signal<{ id: string; hex: HexCoord } | null>(null);
  /**
   * Alvo tocado uma vez cujo caminho ainda está marcado (o destino não mudou): some o Confirmar
   * e o tabuleiro mostra que o agente vai andar até lá, com o balão pedindo o segundo toque.
   */
  protected readonly armedTarget = computed<TapTarget | null>(() => {
    const aim = this.aimedTarget();
    if (!aim || !sameHex(aim.hex, this.selected()) || this.phase() !== 'moving-choice') return null;
    // lê aqui o que faz o alvo sumir (queimou, deixou de estar rendido, a porta abriu, a chave saiu)
    this.enemies();
    this.burned();
    this.doors();
    this.hasKey();
    this.spotTargets();
    return this.tapTargetOf(aim.id);
  });

  /** Móveis de esconderijos percebidos e ainda não achados: tocar neles aproxima a câmera (ver `openProp`). */
  private readonly spotTargets = computed<HiddenItem[]>(() => {
    const noticed = this.noticed();
    const found = this.found();
    return (this.map?.hidden ?? []).filter((h) => noticed.has(h.id) && !found.has(h.id));
  });

  /**
   * Tudo o que se toca direto no tabuleiro, com o contorno pulsante (ver `HexBoard.setTargetOutlines`):
   * os queimáveis ainda inteiros, as portas fechadas, o quadro de chaves (percebido, enquanto a
   * chave estiver lá) e os móveis dos esconderijos percebidos e ainda não achados. Os NPCs rendidos vão à parte (`setNpcTargets`).
   */
  protected readonly tapTargetList = computed<{ id: string; hexes: HexCoord[] }[]>(() => {
    const burned = this.burned();
    const list = (this.map?.burnables ?? []).filter((b) => !burned.has(b.id)).map((b) => ({ id: b.id, hexes: [...b.hexes] }));
    for (const [key, d] of this.doors()) if (!isOpen(d)) list.push({ id: DOOR_TARGET + key, hexes: [d.hex] });
    const panel = this.map?.keyPanel;
    if (panel && this.panelNoticed()) list.push({ id: KEY_TARGET, hexes: [panel.spot] });
    for (const h of this.spotTargets()) list.push({ id: SPOT_TARGET + h.id, hexes: [h.spot] });
    return list;
  });

  /** A ação de um alvo colado no agente: o avião abre o menu de inspecionar; o resto, o "Queimar". */
  private actOn(target: Burnable): void {
    if (target.inspect) this.openPlaneMenu();
    else this.startBurn();
  }

  /** Os retratos de quem não está em foco ficam empilhados; abrem ao toque. */
  protected readonly agentsOpen = signal(false);
  protected tapAgent(c: Character): void {
    if (c.id !== this.focused().id && !this.agentsOpen()) {
      this.agentsOpen.set(true);
      return;
    }
    this.agentsOpen.set(false);
    this.pickCharacter(c.id);
  }

  /** Toque numa peça ou num retrato: o mesmo que `focusCharacter`, com o som do cartão. */
  protected pickCharacter(id: string): void {
    if (id !== this.focusedId()) this.sound.play('ui.retrato');
    this.focusCharacter(id);
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
    this.sound.play('ui.confirmar');
    const id = this.active().id;
    // agrupado, os companheiros seguem o rastro do líder e a fila fica na ordem em que andaram
    const act = planMove(this.core(), path, this.world());
    const paths = new Map(Object.entries(act.paths).map(([who, p]) => [who, [...p]]));
    if (!(await this.walkUnits(id, paths, act))) return;
    if (act.left?.length) this.sayLeft(act.left, 'ficou para trás');
    // andou até um alvo tocado: chegando colado, a ação dele já abre
    const aimed = this.aimedTarget();
    const aim = aimed && sameHex(aimed.hex, target) ? aimed : null;
    this.aimedTarget.set(null);
    if (!(await this.perceive(paths))) return;
    this.afterMove();
    const goal = aim && this.tapTargetOf(aim.id);
    const here = this.positions().get(id);
    if (goal && here && this.phase() === 'moving-choice' && goal.near(here)) goal.act();
  }

  /**
   * Anda com um ou mais agentes ao mesmo tempo, conferindo a visão dos inimigos a cada passo.
   * Quando todos chegam, a ação (`commit`, já planejada pelo motor) vira estado.
   */
  private async walkUnits(
    leaderId: string,
    paths: ReadonlyMap<string, HexCoord[]>,
    commit: GameAction,
  ): Promise<boolean> {
    const epoch = this.epoch;
    this.phase.set('walking');
    this.selected.set(null);
    const live = new Map(this.positions());
    // o grupo soa como um passo mais cheio, não como três: só o líder pisa
    const together = [...paths.values()].filter((p) => p.length).length > 1;
    await this.board!.moveUnits(leaderId, paths, (who, hex) => {
      if (this.epoch !== epoch) return;
      if (who === leaderId) this.agentSteps(hex, together);
      live.set(who, hex);
      // quem entra no cone de visão é avistado na hora, mesmo só de passagem
      this.checkAllSpotted(live);
    });
    if (this.destroyed || this.epoch !== epoch) return false;
    return this.dispatch(commit);
  }

  /**
   * Depois de andar: segue escolhendo. Mesmo sem movimento a vez não passa sozinha: aparece o
   * botão "Encerrar turno" e o jogador decide (ainda pode abordar, queimar, inspecionar...).
   */
  private afterMove(): void {
    this.beginChoosing();
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
    const free = this.freeRally();
    // o motor junta a equipe, põe quem chamou na frente da fila e decide se o Comando paga
    const act = planRally(this.core(), plan.point, this.world());
    if (!act || !(await this.walkUnits(id, plan.paths, act))) return;
    this.sound.play('eq.agrupar');
    this.say(
      `${free ? 'Comando do Capitão: agrupou sem gastar movimento! ' : 'Equipe agrupada! '}` +
        `Juntos: +${this.groupMove()} de movimento e +${this.groupInt()} de intimidação` +
        (this.led() ? ' (com a Liderança)' : ''),
      'info',
    );
    if (!(await this.perceive(plan.paths))) return;
    this.afterMove();
  }

  /** Desfaz o grupo: cada um volta a andar por conta própria. */
  protected ungroup(): void {
    if (this.phase() !== 'moving-choice' || !this.group().size) return;
    if (!this.dispatch({ type: 'ungroup' })) return;
    this.sound.play('eq.desagrupar');
    this.say('Equipe desagrupada: cada um por si', 'info');
    this.refreshBoard();
  }

  /** Avisa quem saiu do grupo (o motor já tirou; com menos de dois, o grupo acaba). */
  private sayLeft(ids: readonly string[], why: string): void {
    const names = ids.map((id) => CHARACTERS.find((c) => c.id === id)?.name ?? id);
    this.say(`${names.join(' e ')} ${why}`, 'info');
  }

  // ---------- zoom nos móveis: percepção e a peça destacável ----------

  /**
   * Percepção passiva: quem acabou de andar pelo cômodo de um móvel com algo escondido (o
   * armário do caseiro, o fundo do hangar com o quadro de chaves) e ainda não tinha rolado ali
   * rola 1d20. Passando, repara no móvel: ele ganha o contorno pulsante e passa a abrir o zoom.
   * Falhando, nada se destaca. Devolve `false` se a partida foi recomeçada no meio.
   */
  private async perceive(paths: ReadonlyMap<string, HexCoord[]>): Promise<boolean> {
    for (const spot of this.perceivable()) {
      for (const [who, path] of paths) {
        if (this.noticed().has(spot.id)) break;
        if (!needsNoticeRoll(spot, who, path, this.noticed(), this.noticeRolled)) continue;
        this.noticeRolled.add(`${spot.id}:${who}`);
        this.phase.set('checking');
        const pass = await this.rollCheck('notice', who, SEARCH_RULES.notice);
        if (pass === null) return false;
        if (!pass) continue;
        this.noticed.update((s) => new Set([...s, spot.id]));
        this.board?.keepInView(spot.spot);
        this.say(`${this.nameOf(who)} reparou ${spot.what}!`, 'info');
        this.sound.play('eq.percebeu');
      }
    }
    return true;
  }

  /** Móveis que a percepção revela: os esconderijos ainda não achados e o quadro de chaves (com a chave lá). */
  private perceivable(): { id: string; room: HexRect; spot: HexCoord; what: string }[] {
    const list = (this.map?.hidden ?? [])
      .filter((h) => !this.found().has(h.id))
      .map((h) => ({ id: h.id, room: h.room, spot: h.spot, what: `em algo ${h.at}` }));
    const panel = this.map?.keyPanel;
    if (panel && !this.hasKey()) list.push({ id: KEY_PANEL_ID, room: panel.room, spot: panel.spot, what: 'no quadro de chaves do fundo do hangar' });
    return list;
  }

  /**
   * Toque no quadro de chaves (`keys`) ou no móvel de um esconderijo, já percebido: a câmera
   * fica de frente para ele (`HexBoard.propCloseUp`), a HUD some e a peça (a chave do avião, a
   * arma) aparece destacada; tocar nela pega (`tapProp`). Não gasta movimento.
   */
  protected openProp(target: 'keys' | HiddenItem): void {
    if (this.phase() !== 'moving-choice' || this.prop() || !this.board) return;
    const id = this.active().id;
    const from = this.positions().get(id);
    if (!from) return;
    const keys = target === 'keys';
    const spot = keys
      ? this.nearPanel()?.spot
      : this.noticed().has(target.id) && canReach(from, target.spot) && !this.found().has(target.id) ? target.spot : null;
    if (!spot) return;
    this.closeApproach();
    this.closeGrouping();
    this.closeBurn();
    this.focusCharacter(id);
    this.selected.set(null);
    this.board.setSelected(null);
    this.board.setReachable([]);
    this.board.setInputEnabled(false);
    if (!this.board.propCloseUp(id, spot, this.propInsets())) {
      this.board.setInputEnabled(true);
      this.refreshBoard();
      return;
    }
    this.sound.play('ui.confirmar');
    this.board.setPropHighlight(spot, true);
    this.prop.set({
      kind: keys ? 'keys' : 'cache',
      hidden: keys ? undefined : target,
      spot,
      title: keys ? 'Quadro de chaves' : target.title,
      item: keys ? 'a chave do avião' : `a ${target.name}`,
      glimpse: keys ? 'A chave de etiqueta vermelha é a do avião.' : target.glimpse,
      who: this.nameOf(id),
      taken: false,
      note: null,
    });
  }

  private patchProp(patch: Partial<PropView>): void {
    this.prop.update((v) => v && { ...v, ...patch });
  }

  /**
   * O que a papelada cobre no zoom (o bilhete e os botões, no canto de baixo à direita): em
   * paisagem, a faixa da direita; em retrato, a de baixo. As faixas pretas também contam.
   */
  private propInsets(): { bottom: number; right: number } {
    const el = this.canvasRef().nativeElement;
    const w = Math.max(el.clientWidth || innerWidth, 1);
    const h = Math.max(el.clientHeight || innerHeight, 1);
    return w > h * 1.1 ? { bottom: 40 / h, right: Math.min(0.4, 270 / w) } : { bottom: Math.min(0.4, 210 / h), right: 0 };
  }

  /** Toque no zoom: na peça, pega; no resto do móvel, diz o que tem ali. */
  private tapProp(part: 'item' | 'other'): void {
    const v = this.prop();
    if (!v || v.taken || this.phase() !== 'moving-choice') return;
    if (part === 'item') {
      this.takeProp();
      return;
    }
    this.sound.play('ui.hex');
    this.patchProp({ note: v.kind === 'keys' ? 'Só chaves de cadeado, de gaveta e um cadeado velho.' : (v.hidden?.clutter ?? 'Nada de mais.') });
  }

  /**
   * Pega a peça (toque nela, ou ✕ / **Pegar** pelo teclado): a chave vai com a equipe (as
   * perguntas sobre ela somem); a arma é apreendida. A peça sobe e some do móvel.
   */
  protected takeProp(): void {
    const v = this.prop();
    if (!v || v.taken || this.phase() !== 'moving-choice') return;
    this.board?.takePropItem(v.spot);
    this.haptics.vibrate(SETTLE_PATTERN);
    this.gamepad.rumble(0.8, 0.5, 220);
    if (v.kind === 'keys') {
      this.hasKey.set(true);
      this.sound.play('eq.chave');
      this.keySeenBy.set([]);
      this.clueLog.update((c) => new Set([...c, KEY_TAKEN]));
      this.closeSpeech();
      this.patchProp({ taken: true, note: 'Chave do avião com a equipe.' });
    } else if (v.hidden) {
      const item = v.hidden;
      this.found.update((s) => new Set([...s, item.id]));
      this.sound.play('eq.vasculhar');
      this.patchProp({ taken: true, note: item.seized });
    }
  }

  /**
   * **Fechar**: a câmera volta e a vez segue. Quem viu a chave e não pegou lembra disso (ver
   * `witness`).
   */
  protected closeProp(): void {
    const v = this.prop();
    if (!v || this.phase() !== 'moving-choice') return;
    const id = this.active().id;
    if (v.kind === 'keys' && !v.taken) {
      this.keySeenBy.update((l) => leftKey({ ...this.planeState(), seenBy: l }, id).seenBy);
    }
    this.dropProp();
    if (v.taken && v.kind === 'keys') this.say(`${v.who} pegou a chave do avião`, 'info');
    else if (v.taken && v.hidden) this.say(`${v.who} achou a ${v.hidden.name} ${v.hidden.at}. ${v.hidden.seized}`, 'alert');
    else if (v.kind === 'keys') this.say(`${v.who} deixou a chave no quadro`, 'info');
    this.afterMove();
  }

  /** Some com o zoom (recomeço, saída ou fim do **Fechar**) sem seguir a vez. */
  private dropProp(): void {
    const v = this.prop();
    this.prop.set(null);
    if (v) this.board?.setPropHighlight(v.spot, false);
    this.board?.endCloseUp();
    this.board?.setInputEnabled(true);
  }

  /**
   * Rola 1d20 na ficha da lateral (um `app-d20` que cai, para e brilha verde ou vermelho).
   * O resultado fica na tela até o jogador tocar em **Continuar** (ou ✕); só então o jogo
   * segue. Devolve se passou (mais que `target`), ou `null` se a partida foi recomeçada.
   */
  private async rollCheck(kind: 'notice' | 'find', who: string, target: number): Promise<boolean | null> {
    const r = await this.rollD20(
      {
        kicker: kind === 'notice' ? 'Percepção' : 'Inspecionar',
        who: this.nameOf(who),
        need: `precisa de mais que ${target}`,
        passText: kind === 'notice' ? 'Percebeu algo!' : 'Achou!',
        failText: kind === 'notice' ? 'Não percebeu' : 'Nada ainda',
      },
      (roll) => beats(roll, target),
    );
    return r && r.pass;
  }

  /**
   * Um d20 na ficha da lateral. `passes` decide pelo valor tirado. Sem `autoMs`, o resultado
   * fica até o **Continuar**; com ele, a ficha some sozinha depois desse tempo (a perseguição
   * não para a cada dado). `null` se a partida foi recomeçada.
   */
  private async rollD20(
    view: CheckAsk,
    passes: (roll: number) => boolean,
    autoMs?: number,
  ): Promise<{ roll: number; pass: boolean } | null> {
    // só a escolha de alvo desacelera: o dado da equipe que vem logo depois dela (a iniciativa)
    // emenda no mesmo slow
    const release = view.side !== 'enemy' && this.slowActive() ? this.holdSlow() : undefined;
    try {
      return await this.rollD20Sheet(view, passes, autoMs);
    } finally {
      release?.();
    }
  }

  private async rollD20Sheet(
    { side = 'team', ...view }: CheckAsk,
    passes: (roll: number) => boolean,
    autoMs?: number,
  ): Promise<{ roll: number; pass: boolean } | null> {
    const epoch = this.epoch;
    const id = ++this.checkSeq;
    const rolled = new Promise<number>((done) => this.checkRolled.set(id, done));
    this.addCheck({ id, ...view, side, result: null, pass: null });
    if (!reducedMotion()) this.haptics.vibrate(ROLL_PATTERN);
    this.sound.play('dado.d20', { delay: 0.2 });
    const result = await rolled;
    if (this.destroyed || this.epoch !== epoch) return null;
    const pass = passes(result);
    this.checkSound(result, pass);
    this.patchCheck(id, { result, pass });
    this.haptics.vibrate(SETTLE_PATTERN);
    this.gamepad.rumble(0.3, 0.2, 120);
    if (autoMs !== undefined) {
      await this.wait(autoMs);
      if (this.destroyed || this.epoch !== epoch) return null;
      this.dropCheck(id);
      return { roll: result, pass };
    }
    // um instante para o carimbo aparecer antes do botão (evita fechar sem querer)
    await this.wait(450);
    if (this.destroyed || this.epoch !== epoch) return null;
    const closed = new Promise<void>((done) => this.checkDone.set(id, done));
    this.patchCheck(id, { waiting: true });
    await closed;
    if (this.destroyed || this.epoch !== epoch) return null;
    return { roll: result, pass };
  }

  // ---------- portas: menu e ações ----------

  /** Largura das fichas da direita no menu da porta (igual ao CSS de `.door-sheet`). */
  private doorPanelWidth(): number {
    const w = this.canvasRef().nativeElement.clientWidth || innerWidth;
    return (w <= 640 ? Math.min(205, w * 0.54) : Math.min(300, w * 0.4)) + 14;
  }

  private readonly onDoorResize = (): void => this.board?.setDoorFocusOffset(this.doorPanelWidth() / 2);

  /** Abre o menu da porta: a câmera gira e aproxima, a HUD some e as fichas entram na direita. */
  protected openDoorMenu(door: Door | null = this.nearDoor()): void {
    if (!door || this.phase() !== 'moving-choice' || !this.board) return;
    this.closeApproach();
    this.closeGrouping();
    this.closeBurn();
    this.focusCharacter(this.active().id);
    this.selected.set(null);
    this.board.setSelected(null);
    this.board.setReachable([]);
    this.phase.set('door');
    this.doorKey.set(hexKey(door.hex));
    this.board.focusDoor(door.hex, this.active().id, this.doorPanelWidth() / 2);
    addEventListener('resize', this.onDoorResize);
  }

  /** Fecha o menu da porta e volta ao movimento (ou passa a vez, sem movimento). */
  protected closeDoorMenu(): void {
    if (this.phase() !== 'door' || this.doorBusy()) return;
    this.doorKey.set(null);
    this.notice.set(null);
    this.board?.releaseDoorFocus();
    removeEventListener('resize', this.onDoorResize);
    this.afterMove();
  }

  /**
   * Faz a ação na porta com animação: **arrombar** é um chute (o d20 gira na ficha e para
   * quando o pé bate); **destrancar** agacha, rola enquanto mexe na fechadura e levanta, dê
   * certo ou não; **abrir** empurra a folha. Uma porta sem tranca arrombada faz o inimigo
   * mais perto comentar.
   */
  protected async doorAction(action: DoorAction): Promise<void> {
    const door = this.openDoor();
    const board = this.board;
    if (!door || !board || this.phase() !== 'door' || this.doorBusy()) return;
    const gazua = action === 'pick' ? this.pickBonus() : 0;
    const need = doorNeed(action, door, gazua);
    if (action === 'pick' && (need === null || this.movesLeft() < DOOR_RULES.pickCost)) return;
    if (action === 'abrir' && isOpen(door)) return;
    const epoch = this.epoch;
    const stale = () => this.destroyed || this.epoch !== epoch;
    const id = this.active().id;
    // o motor sorteia o d20 e decide o resultado; a tela anima e aplica quando ele aparece
    const act = planDoor(this.core(), hexKey(door.hex), action, this.rng);
    const out = doorOutcome(this.core(), act);
    const roll = act.roll;
    let committed = false;
    const commit = () => {
      if (committed || stale()) return;
      committed = true;
      this.dispatch(act);
    };
    this.doorBusy.set(true);
    const settle = (mode: 'swing' | 'slam') => {
      commit();
      board.setDoors(this.doors());
      board.pushDoor(door.hex, id, mode);
      this.refreshVision();
      // no arrombamento, quem está do lado de lá só reage depois do susto (ver `breakIn`)
      if (mode !== 'slam') this.checkAllSpotted(this.positions());
    };
    try {
      if (action === 'abrir') {
        await board.stepToDoor(id, door.hex, 0.75);
        if (stale()) return;
        if (out.opened) {
          settle('swing');
          this.sound.play('porta.abrir');
          this.say('Porta aberta', 'info');
        } else {
          this.sound.play('porta.trancada');
          board.pushDoor(door.hex, id, 'rattle');
          await this.wait(260);
          board.pushDoor(door.hex, id, 'rattle');
          this.say(door.state === 'trancada' ? 'Trancada. Tente destrancar ou arrombar' : 'Bloqueada: não abre', 'alert');
        }
        await this.wait(450);
      } else if (action === 'pick') {
        await board.stepToDoor(id, door.hex, 0.55);
        if (stale()) return;
        board.crouchAtDoor(id, true);
        await this.wait(450);
        if (out.rolled) {
          const reveal = this.startDoorCheck('Destrancar', this.nameOf(id), this.needText(need!, gazua), 'Destrancou!', 'Não deu', roll, 1300);
          this.sound.play('porta.gazua');
          await this.wait(1300); // mexendo na fechadura
          if (stale()) return;
          reveal(roll, out.pass);
          if (out.opened) {
            this.sound.play('porta.destrancou');
            await this.wait(250);
            settle('swing');
          } else board.pushDoor(door.hex, id, 'rattle');
        } else {
          this.sound.play('porta.destrancou');
          await this.wait(300);
          settle('swing');
          this.say('Sem tranca: abriu sozinha', 'info');
        }
        await this.wait(500);
        // deu certo ou não, levanta
        board.crouchAtDoor(id, false);
        await this.wait(450);
      } else {
        await board.stepToDoor(id, door.hex, board.kickReach(id));
        if (stale()) return;
        // a câmera fecha na porta; o agente recolhe o joelho, a cena entra em slow e o d20 rola
        // com a perna no ar; quando o dado para, o slow acaba e o pé bate na porta
        board.zoomOnDoor(door.hex);
        let reveal: ((result: number, pass: boolean) => void) | null = null;
        const ROLL_MS = 1100;
        await board.kick(id, {
          through: out.pass,
          onSlow: out.rolled
            ? async () => {
                reveal = this.startDoorCheck('Arrombar', this.nameOf(id), this.needText(need!), 'Arrombou!', door.state === 'bloqueada' ? 'Não cedeu' : 'Aguentou', roll, ROLL_MS);
                await this.wait(ROLL_MS);
              }
            : undefined,
          onImpact: () => {
            if (stale()) return;
            reveal?.(roll, out.pass);
            this.sound.play(out.pass ? 'porta.chute-ok' : 'porta.chute-falha');
            if (out.pass) settle('slam');
            else {
              // a porta aguenta, mas cede um pouco: o próximo chute precisa de menos
              commit();
              board.setDoors(this.doors());
              board.pushDoor(door.hex, id, 'rattle');
            }
            if (out.damage) board.floatDoorDamage(door.hex, `\u2212${out.damage}`);
            this.gamepad.rumble(out.pass ? 1 : 0.6, 0.5, 220);
            this.haptics.vibrate(SETTLE_PATTERN);
          },
        });
        if (stale()) return;
        if (out.reaction) this.reactToBreakIn(door.hex, id);
        if (out.opened) {
          await this.wait(250);
          if (!(await this.breakIn(door.hex, id, stale))) return;
        } else if (!out.pass && out.damage && door.state !== 'bloqueada') {
          const next = doorNeed('arrombar', this.doors().get(hexKey(door.hex)) ?? door);
          if (next) this.say(`A porta cedeu um pouco: o próximo chute precisa de ${next}+`, 'info');
        }
        await this.wait(400);
        board.resetCineAim();
      }
      if (stale()) return;
      await board.stepBack(id);
    } finally {
      // o que não mudou a porta (trancada que não abriu, fechadura que não cedeu) também conta:
      // o movimento do destrancar é gasto do mesmo jeito
      commit();
      if (!stale()) this.doorBusy.set(false);
    }
  }

  /**
   * Põe a ficha do d20 da porta na tela: o dado 3D cai já em `value` (o resultado sorteado) e
   * leva `duration` ms para parar, a mesma hora em que a ação resolve (no chute, o impacto).
   * A função devolvida pinta o dado de verde ou vermelho e carimba; com `hold`, a ficha fica na
   * tela até `confirmDoorCheck` (senão, some sozinha uns segundos depois).
   */
  private startDoorCheck(
    kicker: string,
    who: string,
    need: string,
    passText: string,
    failText: string,
    value: number,
    duration: number,
    side: CheckSide = 'team',
    hold = false,
  ): (result: number, pass: boolean) => void {
    clearTimeout(this.doorCheckTimer);
    if (this.doorCheckId !== undefined) this.dropCheck(this.doorCheckId);
    const id = (this.doorCheckId = ++this.checkSeq);
    this.addCheck({ id, kicker, who, need, passText, failText, value, duration, side, result: null, pass: null });
    if (!reducedMotion()) this.haptics.vibrate(ROLL_PATTERN);
    this.sound.play('dado.d20', { delay: 0.1 });
    return (result, pass) => {
      this.patchCheck(id, { result, pass });
      this.checkSound(result, pass);
      this.haptics.vibrate(SETTLE_PATTERN);
      // `hold`: a ficha fica até o botão (ver `confirmDoorCheck`)
      if (hold) return;
      this.doorCheckTimer = setTimeout(() => {
        if (this.doorCheckId === id) this.doorCheckId = undefined;
        this.dropCheck(id);
      }, 3200);
    };
  }

  /** "precisa de 6 ou mais (Gazua +6)": com a perícia, o valor já vem descontado. */
  private needText(need: number, skill = 0): string {
    if (need === Infinity) return 'nunca passa';
    return `precisa de ${need} ou mais${skill ? ` (${SKILLS.gazua.name} +${skill})` : ''}`;
  }

  /**
   * Depois de arrombar: a equipe ganha intimidação por alguns turnos, e cada inimigo do
   * cômodo arrombado rola o seu d20 (ver `BREAK_IN_RULES`): perto da porta, só não se rende
   * quem resiste; mais longe, só corre quem tem atitude. Na ficha, o verde é sempre o que é
   * bom para a equipe (rendeu, ficou parado). Devolve `false` se a partida foi recomeçada.
   */
  private async breakIn(doorHex: HexCoord, agentId: string, stale: () => boolean): Promise<boolean> {
    const map = this.map;
    const board = this.board;
    if (!map || !board) return true;
    // o motor acha o cômodo do outro lado, rola o d20 de cada um e aplica tudo (e o bônus da
    // equipe); a cena abaixo só mostra, um por um
    const { act, rolls } = planBreakIn(this.core(), hexKey(doorHex), agentId, this.world(), this.rng);
    this.dispatch(act);
    // o estouro da porta: todo mundo do cômodo dá um passo para trás, de frente para ela
    for (const r of rolls) void board.enemyFlinch(r.enemy.id, doorHex);
    if (rolls.length) await this.wait(380);
    if (stale()) return false;
    // a cena de cada um: a HUD e as fichas da porta saem (só ficam a ficha do d20 e os avisos),
    // a câmera fecha nele com o cenário da frente escondido, e o jogo espera o Confirmar
    if (rolls.length) {
      this.breakInCine.set(true);
      board.setDoorFocusOffset(0);
    }
    try {
      for (const r of rolls) {
        const e = r.enemy;
        const resist = r.test === 'resist';
        // a câmera fecha nele, que olha de um lado para o outro; a rolagem vem em slow
        board.focusBreakIn(e.id);
        board.enemyLookAround(e.id, true);
        await this.wait(BREAK_IN_SCENE.lookMs);
        if (stale()) return false;
        board.setSceneSlowmo(true);
        const reveal = this.startDoorCheck(
          resist ? 'Resistir à rendição' : 'Atitude para correr',
          e.name,
          resist ? `resiste com ${r.need} ou mais` : `corre com mais que ${r.need}`,
          resist ? 'Rendido!' : 'Ficou parado',
          resist ? 'Resistiu: vai correr' : 'Vai correr',
          r.roll,
          BREAK_IN_SCENE.rollMs,
          'enemy',
          true,
        );
        await this.wait(BREAK_IN_SCENE.rollMs);
        board.setSceneSlowmo(false);
        if (stale()) return false;
        reveal(r.roll, r.outcome !== 'flee');
        board.enemyLookAround(e.id, false);
        const facing = facingBetween(e.hex, doorHex);
        if (r.outcome === 'surrender') {
          // falhou: rende na hora
          board.setEnemyFacing(e.id, facing);
          if (!rolls.slice(0, rolls.indexOf(r)).some((o) => o.outcome === 'surrender')) this.sound.play('ini.rende', { at: e.hex });
          board.setEnemySurrendered(e.id, true);
        } else if (r.outcome === 'flee') {
          // passou: vira de costas e fica pronto para correr (sai na vez dele)
          board.setEnemyAlert(e.id, true);
          board.enemyBolt(e.id, doorHex);
        } else {
          board.setEnemyFacing(e.id, facing);
        }
        board.startleEnemy(e.id);
        this.refreshVision();
        this.say(breakInVerdict(r), r.outcome === 'surrender' ? 'info' : 'alert');
        await this.wait(BREAK_IN_SCENE.reactMs);
        if (stale()) return false;
        // o carimbo e o aviso ficam até o jogador confirmar
        if (!(await this.confirmDoorCheck())) return false;
      }
    } finally {
      if (rolls.length && !stale()) {
        board.focusBreakIn(null);
        board.setDoorFocusOffset(this.doorPanelWidth() / 2);
        this.notice.set(null);
        this.breakInCine.set(false);
      }
    }
    board.resetCineAim();
    this.checkAllSpotted(this.positions());
    const said = (o: BreakInRoll['outcome']) => rolls.filter((r) => r.outcome === o).map((r) => r.enemy);
    const parts = [
      said('surrender').length && `${namesOf(said('surrender'))} se ${said('surrender').length === 1 ? 'rendeu' : 'renderam'}`,
      said('flee').length && `${namesOf(said('flee'))} vai correr`,
      said('stay').length && `${namesOf(said('stay'))} ficou parado`,
    ].filter(Boolean);
    this.say(
      `Porta arrombada! Equipe +${BREAK_IN_RULES.intimidation} de intimidação por ${BREAK_IN_RULES.rounds} turnos.` +
        (parts.length ? ` ${parts.join('; ')}.` : ''),
      'alert',
    );
    return true;
  }

  /**
   * Espera o **Confirmar** na ficha do d20 da porta (a de `startDoorCheck` com `hold`) e tira a
   * ficha da tela. Devolve `false` se a partida foi recomeçada no meio.
   */
  private async confirmDoorCheck(): Promise<boolean> {
    const id = this.doorCheckId;
    if (id === undefined || !this.checks().some((c) => c.id === id)) return true;
    const epoch = this.epoch;
    // um instante para o carimbo aparecer antes do botão (evita fechar sem querer)
    await this.wait(450);
    if (this.destroyed || this.epoch !== epoch) return false;
    const closed = new Promise<void>((done) => this.checkDone.set(id, done));
    this.patchCheck(id, { waiting: true, confirmText: BREAK_IN_SCENE.confirm });
    await closed;
    if (this.doorCheckId === id) this.doorCheckId = undefined;
    return !this.destroyed && this.epoch === epoch;
  }

  /** Arrombou uma porta sem tranca: o inimigo mais perto (que esteja vendo) comenta. */
  private reactToBreakIn(doorHex: HexCoord, agentId: string): void {
    const witness = this.onBoardEnemies()
      .filter((e) => hexDistance(e.hex, doorHex) <= DOOR_RULES.witnessRange)
      .sort((a, b) => hexDistance(a.hex, doorHex) - hexDistance(b.hex, doorHex))
      .find((e) => this.board?.enemyHeadOnScreen(e.id));
    if (!witness) return;
    this.board?.enemyLookAt(witness.id, agentId);
    this.board?.speak(witness.id, DOOR_REACTIONS[Math.floor(Math.random() * DOOR_REACTIONS.length)]);
  }

  /** Fecha uma ficha do d20 (**Continuar** ou ✕; sem `id`, a primeira que espera) e o jogo segue. */
  protected closeCheck(id = this.waitingCheck()?.id): void {
    if (id === undefined || !this.checks().find((c) => c.id === id)?.waiting) return;
    const done = this.checkDone.get(id);
    this.dropCheck(id);
    done?.();
  }

  /** A primeira ficha que espera o **Continuar** (a do controle e do teclado). */
  private waitingCheck(): CheckView | undefined {
    return this.checks().find((c) => c.waiting);
  }

  /** O d20 de uma ficha parou. */
  protected checkDieRolled(id: number, value: number): void {
    const done = this.checkRolled.get(id);
    this.checkRolled.delete(id);
    done?.(value);
  }

  /** Põe uma ficha na tela, ao lado das que já estão (as do garimpeiro sempre à direita). */
  private addCheck(view: CheckView): void {
    this.checks.update((cs) => {
      const team = [...cs.filter((c) => c.side === 'team'), ...(view.side === 'team' ? [view] : [])];
      const enemy = [...cs.filter((c) => c.side === 'enemy'), ...(view.side === 'enemy' ? [view] : [])];
      return [...team, ...enemy];
    });
  }

  private patchCheck(id: number, patch: Partial<CheckView>): void {
    this.checks.update((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  private dropCheck(id: number): void {
    this.checkRolled.delete(id);
    this.checkDone.delete(id);
    this.checks.update((cs) => cs.filter((c) => c.id !== id));
  }

  private clearChecks(): void {
    this.checkRolled.clear();
    this.checkDone.clear();
    this.doorCheckId = undefined;
    this.checks.set([]);
  }

  private nameOf(id: string): string {
    return CHARACTERS.find((c) => c.id === id)?.name ?? id;
  }

  // ---------- interrogatório ----------

  /**
   * Quanto da tela a papelada do interrogatório cobre (igual ao CSS de `.interro`): embaixo, em
   * retrato e na tela larga; à direita, em paisagem baixa (celular deitado).
   */
  private interrogationInsets(): CloseUpInsets {
    const el = this.canvasRef().nativeElement;
    const w = el.clientWidth || innerWidth;
    const h = el.clientHeight || innerHeight;
    if (w > h && h <= 560) return { bottom: 0, right: Math.min(440, w * 0.52) / w };
    return { bottom: h > w ? 0.52 : 0.46, right: 0 };
  }

  private readonly onInterrogationResize = (): void => this.board?.setCloseUpInsets(this.interrogationInsets());

  /** Vinheta do close-up (elipse clara) em cima da dupla, acompanhando o que a papelada cobre. */
  protected interrogationVignette(): string {
    const { bottom, right } = this.interrogationInsets();
    return right ? '30% 46% at 26% 50%' : `52% 30% at 50% ${Math.round((1 - bottom) * 50)}%`;
  }

  /**
   * **Conversar** (dentro da aura de um suspeito rendido com diálogo, a qualquer momento): close-up
   * no agente e no suspeito, como na inspeção e nas portas; a HUD sai e o suspeito abre com a fala
   * de entrada da classe (ou a de retomada, se já conversaram). As perguntas são as que ele tem
   * guardadas na memória: as feitas aparecem marcadas; as pendentes, inclusive réplicas, seguem.
   */
  protected async startInterrogation(enemyId?: string): Promise<void> {
    const here = this.positions().get(this.active().id);
    const e = enemyId
      ? this.enemies().find((x) => x.id === enemyId && x.status === 'surrendered' && !!here && inAura(here, x.hex))
      : this.talkTarget()?.enemy;
    const cls = npcClass(e?.npc);
    if (!e || !hasDialogue(cls) || this.phase() !== 'moving-choice' || !this.board) return;
    if (this.movesLeft() < INTERROGATION_RULES.moveCost) {
      this.say(`Sem movimento para conversar com ${e.name} agora`, 'info');
      return;
    }
    const memory = this.dialogues().get(e.id) ?? EMPTY_MEMORY;
    const epoch = this.epoch;
    this.focusCharacter(this.active().id);
    this.closeApproach();
    this.closeGrouping();
    this.closeBurn();
    this.selected.set(null);
    this.board.setSelected(null);
    this.board.setReachable([]);
    this.board.setInputEnabled(false);
    this.phase.set('interrogating');
    this.sound.play('eq.closeup');
    this.board.closeUp(this.active().id, e.hex, { frame: 'pair', faceEnemy: e.id, insets: this.interrogationInsets() });
    addEventListener('resize', this.onInterrogationResize);
    this.questionPick.set(0);
    const opening = openingLine(cls, memory);
    this.interrogation.set({
      enemyId: e.id,
      suspect: e.name,
      cls,
      options: dialogueOptions(cls, memory, this.clues()),
      agentLine: null,
      suspectLine: null,
      busy: true,
      asked: 0,
      reveal: null,
    });
    // a câmera chega; o suspeito abre com a postura e a fala da classe
    await this.wait(450);
    if (!this.interrogating(epoch, e.id)) return;
    if (opening) {
      const ok = await this.suspectSays(pickLine(opening), { posture: cls.intro?.posture, think: 300 }, epoch, e.id);
      if (!ok) return;
    }
    this.patchInterrogation({ busy: false });
  }

  /** O interrogatório de `enemyId` ainda está aberto (e a partida não recomeçou). */
  private interrogating(epoch: number, enemyId: string): boolean {
    return !this.destroyed && this.epoch === epoch && this.interrogation()?.enemyId === enemyId;
  }

  private patchInterrogation(patch: Partial<InterrogationView>): void {
    this.interrogation.update((v) => v && { ...v, ...patch });
  }

  /** Escreve o texto aos poucos (máquina de escrever); sem animação, de uma vez. */
  private async typeOut(text: string, speed: number, set: (t: string) => void, alive: () => boolean): Promise<boolean> {
    if (reducedMotion()) {
      set(text);
      return alive();
    }
    let shown = '';
    for (const ch of text) {
      shown += ch;
      set(shown);
      await new Promise<void>((r) => this.later(',.…?!'.includes(ch) ? speed * 6 : speed, r));
      if (!alive()) return false;
    }
    return true;
  }

  /** Balão do suspeito: "…" pensando, a fala aparecendo e, se houver, o sinal de mentira. */
  private async suspectSays(
    text: string,
    opts: { posture?: string; tell?: string; think?: number },
    epoch: number,
    enemyId: string,
  ): Promise<boolean> {
    const alive = () => this.interrogating(epoch, enemyId);
    this.patchInterrogation({ suspectLine: { text: '', full: text, posture: opts.posture, thinking: true } });
    if (opts.think) await this.wait(opts.think);
    if (!alive()) return false;
    const set = (t: string) =>
      this.interrogation.update((v) => v && v.suspectLine ? { ...v, suspectLine: { ...v.suspectLine, text: t, thinking: false } } : v);
    if (!(await this.typeOut(text, 22, set, alive))) return false;
    if (opts.tell) {
      await this.wait(350);
      if (!alive()) return false;
      this.interrogation.update((v) => v && v.suspectLine ? { ...v, suspectLine: { ...v.suspectLine, tell: opts.tell } } : v);
      // a pequena reação: um tranco no lugar
      if (!reducedMotion()) this.board?.startleEnemy(enemyId);
      this.gamepad.rumble(0.25, 0.15, 90);
    }
    return true;
  }

  /**
   * Faz uma pergunta (cartão de papel, uma vez só): o agente pergunta no balão de cima; o
   * suspeito rola d20 escondido (passa com mais que a CD) e responde no balão de baixo. Passou
   * e há réplica (ou tréplica): ela surge logo abaixo. A resposta vai para a caderneta.
   */
  protected async ask(key: string): Promise<void> {
    const iv = this.interrogation();
    if (!iv || iv.busy || this.phase() !== 'interrogating') return;
    const before = this.dialogues().get(iv.enemyId) ?? EMPTY_MEMORY;
    const res = askQuestion(iv.cls, before, key, {
      die: () => rollDie(INTERROGATION_RULES.die),
      clues: this.clues(),
      // a intimidação do próprio agente (sem o bônus do grupo nem o do arrombamento) sobe a CD;
      // agarrado numa perseguição, ele está abalado: +2 a favor do agente
      intimidation: this.talkIntimidation() + (this.enemy(iv.enemyId)?.shaken ? CHASE_RULES.shakenBonus : 0),
      pools: this.linePools(),
    });
    if (!res) return;
    this.linePools.set(res.pools);
    const epoch = this.epoch;
    const alive = () => this.interrogating(epoch, iv.enemyId);
    const { answer } = res;
    // a pergunta fica bloqueada para sempre, seja qual for a resposta
    this.dialogues.update((m) => new Map(m).set(iv.enemyId, res.memory));
    // a primeira pergunta de cada entrada gasta o movimento (como a rolagem da inspeção)
    const cost = questionCost(iv.asked);
    if (cost) this.dispatch({ type: 'spend', cost });
    // o cartão feito fica marcado na hora; a réplica só aparece depois da resposta
    this.patchInterrogation({
      busy: true,
      asked: iv.asked + 1,
      options: iv.options.map((o) => (o.key === key ? { ...o, done: true } : o)),
      agentLine: '',
      suspectLine: null,
    });
    const node = answer.option.node;
    if (!(await this.typeOut(node.ask, 13, (t) => this.patchInterrogation({ agentLine: t }), alive))) return;
    const out = answer.outcome;
    if (!(await this.suspectSays(answer.line, { tell: out.tell, think: 600 }, epoch, iv.enemyId))) return;
    // resistiu ao último nível: o agente fecha a insistência (sem cartão, sem resposta)
    if (answer.closing) {
      await this.wait(500);
      if (!alive()) return;
      this.patchInterrogation({ agentLine: '' });
      if (!(await this.typeOut(answer.closing, 13, (t) => this.patchInterrogation({ agentLine: t }), alive))) return;
    }
    this.fieldNotes.update((ns) => [
      ...ns,
      { id: ++this.noteSeq, suspect: iv.suspect, text: out.note, kind: noteKind(out), depth: answer.option.depth },
    ]);
    this.sound.play(noteKind(out) === 'confessou' ? 'eq.confessou' : 'eq.anotar');
    // entregou alguém: aparece no mapa ao encerrar (se a missão tiver essa unidade escondida)
    const hidden = out.reveal ? this.hiddenAccomplice(iv.enemyId) : null;
    // entregou um esconderijo (ou o quadro de chaves): conta como percebido e ganha o contorno
    const noticed = noticedAfter(this.noticed(), out);
    if (noticed !== this.noticed()) this.noticed.set(noticed);
    // pista nova: pode liberar perguntas (neste e em outros NPCs)
    if (out.clue && !this.clueLog().has(out.clue)) this.clueLog.update((c) => new Set([...c, out.clue!]));
    const options = dialogueOptions(iv.cls, this.dialogues().get(iv.enemyId) ?? res.memory, this.clues());
    const open = options.filter((o) => !o.done);
    const pick = answer.unlocked ? open.findIndex((o) => o.key === answer.unlocked!.key) : 0;
    this.questionPick.set(Math.max(0, pick));
    this.patchInterrogation({ options, busy: false, ...(hidden ? { reveal: hidden } : {}) });
  }

  /** Intimidação do agente que conversa: só o ponto dele (atributo + equipamento, sem grupo). */
  private talkIntimidation(): number {
    return statBreakdown(this.roster.loadout(this.active().id), 'intimidacao', false).total;
  }

  /** O comparsa escondido que o suspeito pode entregar (ainda não revelado), se houver. */
  private hiddenAccomplice(enemyId: string): string | null {
    const id = this.enemy(enemyId)?.reveals;
    return id && this.enemy(id)?.status === 'hidden' ? id : null;
  }

  /**
   * **Encerrar**: a câmera volta e o jogo segue com o que foi anotado. Se o suspeito entregou
   * alguém escondido, a unidade aparece no mapa.
   */
  protected endInterrogation(): void {
    const iv = this.interrogation();
    if (!iv || iv.busy) return;
    this.dropInterrogation();
    this.phase.set('moving-choice');
    // o abalado vale só para a primeira conversa
    if (iv.asked && this.enemy(iv.enemyId)?.shaken) this.updateEnemy(iv.enemyId, { shaken: false });
    const revealed = !!iv.reveal && this.revealAccomplice(iv.reveal, iv.suspect);
    if (!revealed && iv.asked) {
      const n = this.fieldNotes().filter((note) => note.suspect === iv.suspect).length;
      this.say(`Conversa com ${iv.suspect}: ${n} ${n === 1 ? 'anotação' : 'anotações'} na caderneta`, 'info');
    }
    const next = () => (INTERROGATION_RULES.endsTurn && iv.asked ? this.endTurn() : this.afterMove());
    if (!revealed) return next();
    // dá tempo de ver quem apareceu antes de seguir
    this.phase.set('ending');
    this.later(reducedMotion() ? 300 : 1400, () => {
      this.phase.set('moving-choice');
      next();
    });
  }

  /** Some com o close-up do interrogatório (sem seguir a vez). */
  private dropInterrogation(): void {
    if (!this.interrogation()) return;
    this.interrogation.set(null);
    this.board?.endCloseUp();
    this.board?.setInputEnabled(true);
    removeEventListener('resize', this.onInterrogationResize);
  }

  /** A unidade escondida aparece no mapa (no lugar dela ou no hexágono livre mais perto). */
  private revealAccomplice(id: string, by: string): boolean {
    const e = this.enemy(id);
    if (!e || e.status !== 'hidden') return false;
    const taken = new Set([...this.positions().values(), ...this.onBoardEnemies().map((o) => o.hex)].map(hexKey));
    const free = (h: HexCoord) => !taken.has(hexKey(h)) && !this.solid().has(hexKey(h));
    let hex = e.hex;
    for (let r = 0; r < 4 && !free(hex); r++) {
      hex = hexesInRange(e.hex, r + 1, this.area).find(free) ?? hex;
    }
    this.updateEnemy(id, { status: 'patrol', hex });
    this.board?.revealEnemy(id, hex, e.facing);
    this.board?.focusHex(hex);
    this.refreshVision();
    this.checkSpotted(id);
    this.gamepad.rumble(0.7, 0.4, 260);
    this.say(`${by} entregou: ${e.name} apareceu no mapa!`, 'alert');
    return true;
  }

  // ---------- abordagem ----------

  /**
   * Primeiro passo (toque no **Abordar** ou □): entra no modo de abordagem e o tablet de campo
   * sobe com a prévia (a câmera sobe e enquadra o raio na tela dele); nada é rolado até o
   * jogador confirmar (**Abordar!**, ✕) ou cancelar (tecla vermelha, ○). As duas teclas
   * guardam o tablet antes.
   */
  protected startApproach(): void {
    if (this.phase() !== 'moving-choice' || !this.canApproach()) return;
    if (!this.map || !this.positions().get(this.active().id)) return;
    this.closeBurn();
    this.clearBoardForApproach();
    this.approaching.set(true);
    this.sound.play('abo.modo');
    // o tablet sobe com a prévia (ver `tabletReport`): é a tela de confirmação; as zonas
    // pintadas aparecem pela lente dele
    this.paintApproachZones();
  }

  /** Pinta as zonas da abordagem (rendição, rolagem e fuga) em volta de quem está na vez. */
  private paintApproachZones(): { surrender: string[]; roll: string[]; flee: string[] } | null {
    const from = this.positions().get(this.active().id);
    if (!from) return null;
    const walls = this.walls();
    const ring = (min: number, max: number) =>
      hexesInRange(from, max, this.area)
        .filter((h) => !this.solid().has(hexKey(h)))
        .filter((h) => lineOfSight(from, h, walls))
        .filter((h) => hexDistance(from, h) > min)
        .filter((h) => lineOfSight(from, h, walls))
        .map(hexKey);
    const rules = this.activeApproach();
    const zones = {
      surrender: ring(0, rules.surrenderRange),
      roll: ring(rules.surrenderRange, rules.rollRange),
      flee: ring(rules.rollRange, rules.radius),
    };
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
    if (this.approaching()) this.sound.play('abo.cancelar');
    this.closeApproach();
    if (this.phase() === 'moving-choice') this.refreshBoard();
  }

  /** Confirma o modo de abordagem (**Abordar!** ou ✕). */
  protected confirmApproach(): void {
    if (!this.approaching() || this.phase() !== 'moving-choice') return;
    this.executeApproach();
  }

  /**
   * Aborda: quem está na zona de rolagem rola o teste de fuga (passou, corre; falhou, se
   * rende). Rendições e alertas valem na hora, mas no tabuleiro cada suspeito reage quando
   * a onda de voz chega até ele. Depois da onda aparece o auto de abordagem e a vez acaba.
   */
  private executeApproach(): void {
    if (this.phase() !== 'moving-choice') return;
    const from = this.positions().get(this.active().id);
    const plan = this.approachPlan();
    if (!from || this.approachCount() === 0) return;
    const rolled = plan.roll.map((c) => rollEscape(c, () => rollDie(APPROACH_RULES.escapeDie)));
    const surrender = [...plan.surrender, ...rolled.filter((r) => !r.passed).map((r) => r.enemy)];
    const flee = [...rolled.filter((r) => r.passed).map((r) => r.enemy), ...plan.flee];
    this.approaching.set(false);
    this.board?.frameRing(null);
    this.paintApproachZones();
    this.phase.set('ending');
    const motion = !reducedMotion();
    for (const e of surrender) this.updateEnemy(e.id, { status: 'surrendered', facing: facingBetween(e.hex, from) });
    for (const e of flee) this.updateEnemy(e.id, { status: 'alert', facing: facingBetween(e.hex, from) });
    // voz de prisão: quem não se rendeu foge na hora, depois do auto (o mais perto de quem abordou primeiro)
    this.flight = {
      agentId: this.active().id,
      escort: { from, range: this.activeApproach().radius, walls: this.walls() },
      enemies: [...flee].sort((a, b) => hexDistance(from, a.hex) - hexDistance(from, b.hex)).map((e) => e.id),
    };
    this.refreshVision();
    this.gamepad.rumble(1, 0.6, 320);
    this.haptics.vibrate(APPROACH_PATTERN);
    this.sound.play('abo.carimbo');
    this.sound.play('abo.onda', { delay: 0.12 });
    this.sound.duck();
    const radius = this.activeApproach().radius;
    const firstSurrender = [...surrender].sort((a, b) => hexDistance(from, a.hex) - hexDistance(from, b.hex))[0];
    if (motion) this.board?.playApproachWave(from, radius);
    for (const e of [...surrender, ...flee]) {
      const delay = motion ? waveArrival(hexDistance(from, e.hex)) * 1000 : 0;
      this.later(delay, () => {
        const facing = facingBetween(e.hex, from);
        this.board?.setEnemyFacing(e.id, facing);
        if (motion) this.board?.startleEnemy(e.id);
        if (surrender.includes(e)) {
          this.board?.setEnemySurrendered(e.id, true);
          // a cena congela uma vez só, no primeiro que se rende
          if (e === firstSurrender) this.sound.play('ini.rende');
        } else this.board?.setEnemyAlert(e.id, true);
      });
    }
    this.later(motion ? waveDuration(radius) * 1000 : 300, () => {
      this.board?.setApproachZones(null);
      // voz de prisão: quem não se rendeu corre agora (depois passa a vez)
      void this.approachFlight();
    });
  }

  /** A tela mudou de tamanho: o tabuleiro reajusta a câmera no próximo quadro, então refaz as posições. */
  protected onViewResize(): void {
    requestAnimationFrame(() => this.viewTick.update((n) => n + 1));
  }

  private closeApproach(): void {
    if (!this.approaching()) return;
    this.approaching.set(false);
    this.board?.frameRing(null);
    this.board?.setApproachZones(null);
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
    // a câmera aproxima e enquadra o agente e o alvo juntos no meio da tela (issue #126)
    const from = this.positions().get(this.active().id);
    this.board?.frameGroupOn(from ? [from, ...target.hexes] : target.hexes);
  }

  protected cancelBurn(): void {
    if (!this.burning()) return;
    this.closeBurn();
    if (this.phase() === 'moving-choice') this.refreshBoard();
  }

  /** Fecha a confirmação; `keepFrame` segura o enquadramento (o fogo pegando, ver `setFire`). */
  private closeBurn(keepFrame = false): void {
    if (!keepFrame) this.board?.frameGroupOn(null);
    this.burning.set(false);
    this.planeBurn.set(false);
  }

  /** Confirma: o alvo pega fogo, quem vigia perto entra em alerta e a vez do agente acaba. */
  protected confirmBurn(): void {
    const target = this.burnable();
    if (!this.burning() || !target || this.phase() !== 'moving-choice') return;
    const witnesses = this.burnWitnesses();
    // a câmera continua no agente e no alvo enquanto o fogo pega; volta quando a vez acaba
    this.closeBurn(true);
    this.phase.set('ending');
    // com som, o fogo só pega depois da gasolina e das riscadas de fósforo
    this.sound.play('fogo.riscar', { at: target.hexes[0] });
    this.sound.duck();
    this.later(this.sound.audible() ? STRIKE_SECONDS * 1000 : 0, () => this.setFire(target, witnesses));
  }

  private setFire(target: Burnable, witnesses: EnemyState[]): void {
    this.burned.update((s) => new Set([...s, target.id]));
    this.board?.ignite(target.id, target.hexes);
    const plane = !!target.inspect;
    this.sound.ignite(target.id, target.hexes, plane);
    this.sound.play(plane ? 'fogo.aviao' : 'fogo.pegar', { at: target.hexes[0] });
    if (!plane) this.sound.play('fogo.tambor', { at: target.hexes[0], delay: 2.5 });
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
    this.later(reducedMotion() ? 400 : 2000, () => {
      this.board?.frameGroupOn(null);
      this.endTurn();
    });
  }

  // ---------- avião trancado e quadro de chaves ----------

  /** A equipe pegou a chave. */
  protected readonly hasKey = signal(false);
  /** Quem viu a chave no quadro e deixou lá. */
  private readonly keySeenBy = signal<readonly string[]>([]);
  /** Linha do que se vê no menu do avião ("O avião está trancado."). */
  protected readonly planeNote = signal<string | null>(null);
  /** Fala embaixo da tela, com o avatar de quem fala. */
  protected readonly speech = signal<{ who: Character; text: string } | null>(null);
  private speechTimer?: ReturnType<typeof setTimeout>;

  /** O que a equipe sabe do avião e da chave (a regra está em `plane.ts`). */
  private readonly planeState = computed<PlaneState>(() => ({
    hasKey: this.hasKey(),
    seenBy: this.keySeenBy(),
  }));
  /**
   * O quadro de chaves tem o contorno e abre o zoom: alguém reparou nele (percepção no fundo do
   * hangar) ou o piloto contou (`notices` põe o quadro entre os percebidos), e a chave está lá.
   */
  protected readonly panelNoticed = computed(() => !!this.map?.keyPanel && !this.hasKey() && this.noticed().has(KEY_PANEL_ID));

  /**
   * Avião ainda inteiro, colado no agente da vez. Não tem botão na tela: o menu de inspecionar abre
   * tocando no próprio avião (`tapTarget`) ou, no controle, no □.
   */
  protected readonly nearPlane = computed<Burnable | null>(() => {
    if (this.phase() !== 'moving-choice' || this.viewingOther()) return null;
    const from = this.positions().get(this.active().id);
    if (!from) return null;
    return (this.map?.burnables ?? []).find((t) => t.inspect && !this.burned().has(t.id) && canBurn(from, t)) ?? null;
  });
  /** Quadro de chaves percebido, colado no agente da vez (a chave ainda está lá). */
  protected readonly nearPanel = computed(() => {
    const panel = this.map?.keyPanel;
    if (!panel || !this.panelNoticed() || this.phase() !== 'moving-choice' || this.viewingOther()) return null;
    const from = this.positions().get(this.active().id);
    return from && nextToPanel(from, panel) ? panel : null;
  });

  /** Fala embaixo da tela (some sozinha ou ao tocar). */
  private speak(who: string, text: string, ms = 5200): void {
    const c = CHARACTERS.find((x) => x.id === who);
    if (!c) return;
    this.speech.set({ who: c, text });
    clearTimeout(this.speechTimer);
    this.speechTimer = setTimeout(() => this.speech.set(null), reducedMotion() ? ms + 1500 : ms);
  }

  protected closeSpeech(): void {
    clearTimeout(this.speechTimer);
    this.speech.set(null);
  }

  /** Registra uma pista da missão (uma vez só); pode liberar perguntas nos interrogatórios. */
  private noteClue(clue: string | null): void {
    if (clue && !this.clueLog().has(clue)) this.clueLog.update((c) => new Set([...c, clue]));
  }

  /**
   * Abre o menu de inspecionar do avião (olhar dentro / queimar), como o da porta. Sem a chave,
   * o carimbo "Trancado" já conta como saber que está trancado (`lockedClue`).
   */
  protected openPlaneMenu(): void {
    const plane = this.nearPlane();
    if (!plane || this.phase() !== 'moving-choice' || !this.board) return;
    this.closeApproach();
    this.closeGrouping();
    this.closeBurn();
    this.focusCharacter(this.active().id);
    this.selected.set(null);
    this.board.setSelected(null);
    this.board.setReachable([]);
    this.planeNote.set(null);
    this.phase.set('plane');
    // o carimbo "Trancado" já está à vista: as perguntas sobre a chave passam a existir
    this.noteClue(lockedClue(this.planeState()));
    this.board.focusSpot(plane.hexes, this.active().id, this.doorPanelWidth() / 2, 1.2);
    addEventListener('resize', this.onDoorResize);
  }

  protected closePlaneMenu(): void {
    if (this.phase() !== 'plane') return;
    this.board?.releaseDoorFocus();
    removeEventListener('resize', this.onDoorResize);
    this.planeNote.set(null);
    this.afterMove();
  }

  /**
   * "Olhar dentro": sem a chave, só um leve zoom out e o aviso de que está trancado — e as
   * perguntas sobre a chave passam a existir nos interrogatórios. Quem já viu a chave e deixou
   * lá comenta embaixo da tela. Com a chave, o avião abre.
   */
  protected planeLook(): void {
    if (this.phase() !== 'plane') return;
    if (lookInside(this.planeState()) === 'open') {
      this.sound.play('porta.destrancou');
      void this.enterPlane();
      return;
    }
    this.sound.play('eq.aviao-trancado');
    this.noteClue(lockedClue(this.planeState()));
    this.planeNote.set('O avião está trancado. Pergunte ao piloto e aos ajudantes onde está a chave.');
    this.board?.setCineZoom(1.45);
    const who = witness(this.planeState());
    if (who) this.speak(who, WITNESS_LINE);
  }

  /** "Queimar" do menu do avião: volta ao tabuleiro e abre a confirmação de queimar. */
  protected planeBurnPick(): void {
    if (this.phase() !== 'plane') return;
    this.planeBurn.set(true);
    this.board?.releaseDoorFocus();
    removeEventListener('resize', this.onDoorResize);
    this.planeNote.set(null);
    this.phase.set('moving-choice');
    this.startBurn();
  }

  // ---------- dentro do avião (issue #125; a regra está em `plane-cabin.ts`) ----------

  /** Etapa da entrada no avião e quem entrou. */
  private readonly cabinState = signal<CabinState>(INITIAL_CABIN);
  /** Alguém está dentro: o interior está montado e a ficha da cabine aparece. */
  protected readonly cabinInside = computed(() => cabinBuilt(this.cabinState()));
  /** Peças que ainda estão na cabine (o GPS, o rádio). */
  protected readonly cabinLeft = computed(() => cabinItemsLeft(this.found()));
  /** O que a ficha da cabine diz do que sobrou. */
  protected readonly cabinText = computed(() => cabinSummary(this.found()));
  /** Última coisa vista ou pega na cabine. */
  protected readonly cabinNote = signal<string | null>(null);
  /** Quem está dentro (nome, para a ficha). */
  protected readonly cabinWho = computed(() => {
    const id = this.cabinState().agent;
    return id ? this.nameOf(id) : '';
  });

  private cabinEvent(e: CabinEvent): void {
    this.cabinState.update((s) => cabinStep(s, e));
  }

  /**
   * Entrar no avião (com a chave): o agente anda até a porta da cabine (sem gastar movimento) e
   * a câmera vai junto; a porta abre e só então o interior é montado no tabuleiro.
   */
  private async enterPlane(): Promise<void> {
    const plane = (this.map?.burnables ?? []).find((t) => t.inspect);
    const board = this.board;
    const id = this.active().id;
    const from = this.positions().get(id);
    if (!plane || !board || !from || this.phase() !== 'plane') return;
    if (!canEnterPlane(this.planeState(), this.burned().has(plane.id))) return;
    const epoch = this.epoch;
    board.releaseDoorFocus();
    removeEventListener('resize', this.onDoorResize);
    this.planeNote.set(null);
    this.cabinNote.set(null);
    this.cabinEvent({ type: 'enter', agent: id });
    this.phase.set('cabin');
    board.focus(id);
    // até a porta: o hexágono livre colado no avião mais perto dela (se não der, entra de onde está)
    const blocked = this.moveBlocked();
    const door = planeDoorSpot(plane.hexes, blocked);
    const path = door && !sameHex(door, from) ? pathTo(reachableHexes(from, Number.MAX_SAFE_INTEGER, this.area, blocked), door) : [];
    if (path.length) {
      // ir até a porta do avião não gasta movimento
      if (!(await this.walkUnits(id, new Map([[id, path]]), { type: 'move', paths: { [id]: path }, cost: 0 }))) {
        return;
      }
      if (this.epoch !== epoch || this.phase() !== 'walking') {
        this.dropCabin();
        return;
      }
      this.phase.set('cabin');
    }
    this.cabinEvent({ type: 'arrived' });
    // percepção na porta: passando, o GPS e o rádio aparecem destacados lá dentro; falhando,
    // continuam lá (e tocáveis), só sem o destaque
    const spotted = await this.perceiveCabin(id);
    if (spotted === null || this.epoch !== epoch || this.cabinState().stage !== 'opening') return;
    this.phase.set('cabin');
    board.setPlaneDoor(true);
    this.sound.play('porta.abrir');
    this.later(reducedMotion() ? 150 : 750, () => {
      if (this.epoch !== epoch || this.cabinState().stage !== 'opening') return;
      board.setInputEnabled(false);
      if (!board.enterPlaneCabin(id, this.found(), this.propInsets())) {
        board.setInputEnabled(true);
        board.setPlaneDoor(false);
        this.dropCabin();
        this.afterMove();
        return;
      }
      board.setCabinHighlight(spotted);
      this.cabinEvent({ type: 'opened' });
      this.sound.play('eq.closeup');
      addEventListener('resize', this.onCabinResize);
    });
  }

  private readonly onCabinResize = (): void => this.board?.setCloseUpInsets(this.propInsets());

  /**
   * Rolagem de percepção de quem entra no avião (uma vez por agente, como a dos móveis): passando
   * (ou se alguém da equipe já reparou), as peças da cabine ficam destacadas. Sem nada para achar,
   * não rola. Devolve `null` se a partida foi recomeçada no meio.
   */
  private async perceiveCabin(who: string): Promise<boolean | null> {
    if (!this.cabinLeft().length) return false;
    if (this.noticed().has(CABIN_NOTICE_ID)) return true;
    const key = `${CABIN_NOTICE_ID}:${who}`;
    if (this.noticeRolled.has(key)) return false;
    this.noticeRolled.add(key);
    this.phase.set('checking');
    const pass = await this.rollCheck('notice', who, SEARCH_RULES.notice);
    if (pass === null) return null;
    if (pass) {
      this.noticed.update((s) => new Set([...s, CABIN_NOTICE_ID]));
      this.sound.play('eq.percebeu');
    }
    return pass;
  }

  /** Toque na cabine: na peça, pega; no resto, diz o que tem ali. */
  private tapCabin(part: string): void {
    if (!this.cabinInside()) return;
    if (part !== 'other') {
      this.takeCabin(part);
      return;
    }
    this.sound.play('ui.hex');
    this.cabinNote.set(cabinClutter(this.cabinState()));
    this.cabinEvent({ type: 'poke' });
  }

  /** Pega o GPS ou o rádio: vai para os achados da equipe (como a arma) e some da cabine. */
  protected takeCabin(id: string): void {
    if (!this.cabinInside()) return;
    const item = cabinItem(id, this.found());
    if (!item) return;
    this.found.update((s) => new Set([...s, item.id]));
    this.board?.takeCabinItem(item.id);
    this.haptics.vibrate(SETTLE_PATTERN);
    this.gamepad.rumble(0.8, 0.5, 220);
    this.sound.play('eq.vasculhar');
    this.cabinNote.set(item.seized);
  }

  /** **Sair do avião**: o interior é descartado, a câmera volta, a porta fecha e a vez segue. */
  protected leavePlane(): void {
    if (!this.cabinInside()) return;
    const who = this.cabinWho();
    const took = CABIN_ITEMS.filter((i) => this.found().has(i.id)).map((i) => i.name);
    this.cabinEvent({ type: 'leave' });
    this.dropCabin();
    this.sound.play('porta.abrir');
    this.say(took.length ? `${who} saiu do avião com ${took.join(' e ')}` : `${who} saiu do avião`, 'info');
    this.afterMove();
  }

  /** Some com o interior e fecha a porta (saída ou recomeço), sem seguir a vez. */
  private dropCabin(): void {
    const was = this.cabinState().stage;
    this.cabinEvent({ type: 'closed' });
    this.cabinNote.set(null);
    removeEventListener('resize', this.onCabinResize);
    if (was === 'outside') return;
    this.board?.leavePlaneCabin();
    this.board?.setPlaneDoor(false, was !== 'leaving');
    this.board?.setInputEnabled(true);
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
    this.sound.play('fogo.encerrar');
  }

  protected cancel(): void {
    this.selected.set(null);
    this.board?.setSelected(null);
  }

  protected restart(): void {
    this.resetMatch();
    this.beginMatch();
  }

  /** Início de partida: a abertura da missão (se o mapa tem o que circular) e então a primeira rolagem. */
  private beginMatch(): void {
    // nada da partida anterior fica por baixo da abertura: sem dados na mesa nem destino marcado
    this.rollSeq++;
    this.rollKeys.set([]);
    this.phase.set('rolling');
    this.board?.setReachable([]);
    this.board?.setSelected(null);
    if (!this.playIntro(() => this.startTurn())) this.startTurn();
  }

  /** Volta tudo ao começo da partida (posições, inimigos, portas, fogo…) sem começar a vez. */
  private resetMatch(): void {
    this.epoch++;
    this.clearTimers();
    this.resetSlow();
    this.closeApproach();
    this.core.set(this.initialCore());
    this.passing = false;
    this.closeGrouping();
    this.board?.placeUnits(this.positions());
    this.flight = null;
    this.ranThisRound.clear();
    this.caughtThisRound.clear();
    this.noticed.set(new Set());
    this.found.set(new Set());
    this.seenAgents.clear();
    this.board?.setSeenAgents(this.seenAgents);
    this.noticeRolled.clear();
    this.clearChecks();
    this.dropProp();
    this.board?.resetProps();
    this.dropInterrogation();
    this.dialogues.set(new Map());
    this.clueLog.set(new Set());
    this.hasKey.set(false);
    this.keySeenBy.set([]);
    this.planeNote.set(null);
    this.planeBurn.set(false);
    this.dropCabin();
    this.closeSpeech();
    this.linePools.set(new Map());
    this.fieldNotes.set([]);
    this.doorKey.set(null);
    this.doorBusy.set(false);
    this.breakInCine.set(false);
    clearTimeout(this.doorCheckTimer);
    this.board?.releaseDoorFocus();
    this.board?.setSceneSlowmo(false);
    this.board?.setDoors(this.doors(), true);
    this.burned.set(new Set());
    this.closeBurn();
    this.debrief.set(null);
    this.board?.clearFires();
    this.sound.clearFires();
    this.board?.placeEnemies(
      this.enemies().map((e) => ({ ...e, alert: false, surrendered: false, gone: e.status === 'hidden' })),
    );
    this.refreshVision();
    this.notice.set(null);
  }

  // ---------- saves (ver `save-game.ts`) ----------

  /** A partida agora, num formato que vai para o `sessionStorage`. Só no começo de uma vez. */
  private snapshot(): SaveState | null {
    const map = this.map;
    if (!map) return null;
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      mapId: map.id,
      mapName: map.name,
      round: this.round(),
      activeName: this.active().name,
      roster: {
        points: Object.fromEntries(CHARACTERS.map((c) => [c.id, this.roster.spent(c.id)])),
        captain: this.captainId(),
      },
      turn: this.turn(),
      activeIndex: this.activeIndex(),
      positions: [...this.positions()].map(([id, h]) => [id, { ...h }]),
      group: [...this.group()],
      groupLine: [...this.groupLine()],
      enemies: this.enemies().map((e) => ({ ...e })),
      doors: [...this.doors()],
      burned: [...this.burned()],
      noticed: [...this.noticed()],
      found: [...this.found()],
      noticeRolled: [...this.noticeRolled],
      seenAgents: [...this.seenAgents],
      ranThisRound: [...this.ranThisRound],
      caughtThisRound: [...this.caughtThisRound],
      dialogues: [...this.dialogues()],
      linePools: [...this.linePools()].map(([k, v]) => [k, [...v]]),
      clueLog: [...this.clueLog()],
      fieldNotes: this.fieldNotes().map((n) => ({ ...n })),
      hasKey: this.hasKey(),
      keySeenBy: [...this.keySeenBy()],
      planeNote: this.planeNote(),
      breakInUntil: this.breakInUntil(),
    };
  }

  private autosave(): void {
    const state = this.snapshot();
    if (state) this.saves.write('auto', state);
  }

  /** O save pedido na URL (`?save=auto` ou `?save=2`). */
  private saveFromUrl(): SaveState | null {
    const raw = this.route.snapshot.queryParamMap.get('save');
    if (!raw) return null;
    const id: SaveId = raw === 'auto' ? 'auto' : Number(raw);
    return id === 'auto' || (Number.isInteger(id) && id >= 1 && id <= SLOT_COUNT) ? this.saves.read(id) : null;
  }

  /** Remonta a partida do save (sem a abertura da missão) e começa a vez de quem estava nela. */
  private applySave(s: SaveState): void {
    this.resetMatch();
    this.roster.confirm(s.roster.points, s.roster.captain);
    // o que é do motor (vez, posições, inimigos) volta de uma vez
    const fresh = this.initialCore();
    this.core.set({
      ...fresh,
      turn: s.turn,
      activeIndex: Math.min(Math.max(0, s.activeIndex), CHARACTERS.length - 1),
      positions: { ...fresh.positions, ...Object.fromEntries(s.positions) },
      enemies: s.enemies,
      group: s.group,
      groupLine: s.groupLine,
      doors: Object.fromEntries(s.doors),
      breakInUntil: s.breakInUntil,
    });
    this.board?.placeUnits(this.positions());
    this.board?.placeEnemies(
      this.enemies().map((e) => ({
        ...e,
        alert: e.status === 'alert',
        surrendered: e.status === 'surrendered',
        gone: e.status === 'hidden' || e.status === 'fled',
      })),
    );
    this.board?.setDoors(this.doors(), true);
    this.noticed.set(new Set(s.noticed));
    this.found.set(new Set(s.found));
    for (const k of s.noticeRolled) this.noticeRolled.add(k);
    for (const id of s.seenAgents) this.seenAgents.add(id);
    this.board?.setSeenAgents(this.seenAgents);
    for (const id of s.ranThisRound) this.ranThisRound.add(id);
    for (const id of s.caughtThisRound) this.caughtThisRound.add(id);
    this.dialogues.set(new Map(s.dialogues));
    this.linePools.set(new Map(s.linePools));
    this.clueLog.set(new Set(s.clueLog));
    this.fieldNotes.set(s.fieldNotes as FieldNote[]);
    this.noteSeq = Math.max(0, ...s.fieldNotes.map((n) => n.id));
    this.hasKey.set(s.hasKey);
    this.keySeenBy.set(s.keySeenBy);
    this.planeNote.set(s.planeNote);
    // o que já foi pego some dos móveis; o que já queimou volta a arder
    for (const h of this.map?.hidden ?? []) if (this.found().has(h.id)) this.board?.hidePropItem(h.spot);
    const panel = this.map?.keyPanel;
    if (panel && s.hasKey) this.board?.hidePropItem(panel.spot);
    this.burned.set(new Set(s.burned));
    for (const t of this.map?.burnables ?? []) {
      if (!this.burned().has(t.id)) continue;
      this.board?.ignite(t.id, t.hexes);
      this.sound.ignite(t.id, t.hexes, !!t.inspect);
    }
    this.refreshVision();
    this.rollSeq++;
    this.rollKeys.set([]);
    this.phase.set('rolling');
    this.say(`Save carregado · turno ${this.round()}, vez de ${this.active().name}`, 'info');
    this.startTurn();
  }

  /** Copia o estado do começo do turno atual (o automático) para um slot. */
  protected saveToSlot(slot: number): void {
    const filled = !!this.saveList().slots.find((x) => x.slot === slot)?.save;
    if (filled && this.overwriteArmed() !== slot) {
      this.overwriteArmed.set(slot);
      return;
    }
    this.overwriteArmed.set(null);
    const state = this.saves.read('auto') ?? this.snapshot();
    const ok = !!state && state.mapId === this.map?.id && this.saves.write(slot, { ...state, savedAt: Date.now() });
    this.sound.play(ok ? 'ui.confirmar' : 'ui.hex');
    this.say(ok ? `Salvo no slot ${slot} · começo do turno ${state!.round}` : 'Não deu para salvar neste navegador', ok ? 'info' : 'alert');
  }

  /** Carrega um save: no mesmo mapa, aqui; em outro, abre a partida lá com `?save=`. */
  protected loadSave(id: SaveId): void {
    const state = this.saves.read(id);
    if (!state) return;
    this.menuOpen.set(false);
    this.savesOpen.set(false);
    clearInterval(this.statsTicker);
    if (state.mapId === this.map?.id) {
      this.applySave(state);
      return;
    }
    void this.router
      .navigateByUrl('/', { skipLocationChange: true })
      .then(() => this.router.navigate(['/jogo', state.mapId], { queryParams: { save: id } }));
  }

  /** Novo jogo: apaga o automático (os slots ficam) e volta para a escolha da missão. */
  protected newGame(): void {
    if (!this.newGameArmed()) {
      this.newGameArmed.set(true);
      return;
    }
    this.saves.clear('auto');
    this.router.navigate(['/']);
  }

  // ---------- casos de teste (ver `test-cases.ts`) ----------

  /** Escolhido no menu: no mesmo mapa, carrega aqui; em outro, abre a partida lá com `?caso=`. */
  protected loadTestCase(testCase: TestCase): void {
    this.menuOpen.set(false);
    this.testCasesOpen.set(false);
    if (testCase.mapId === this.map?.id) {
      void this.runTestCase(testCase);
      return;
    }
    // a rota é a mesma: passa pela tela inicial para a partida ser montada de novo
    void this.router
      .navigateByUrl('/', { skipLocationChange: true })
      .then(() => this.router.navigate(['/jogo', testCase.mapId], { queryParams: { caso: testCase.id } }));
  }

  /** Recomeça a partida já na situação do caso e dispara o que ele começa. */
  private async runTestCase(testCase: TestCase): Promise<void> {
    this.resetMatch();
    const epoch = this.epoch;
    const positions = new Map(this.positions());
    for (const [id, hex] of Object.entries(testCase.agents ?? {})) positions.set(id, { ...hex });
    this.dispatch({ type: 'place', positions: Object.fromEntries(positions) });
    this.board?.placeUnits(positions);
    const { agent } = testCase.start;
    const agentHex = positions.get(agent)!;
    for (const [id, { hex, status }] of Object.entries(testCase.enemies ?? {})) {
      // em fuga, de costas para quem abordou
      this.updateEnemy(id, { hex: { ...hex }, ...(status ? { status } : {}), facing: facingBetween(agentHex, hex) });
    }
    this.board?.placeEnemies(
      this.enemies().map((e) => ({
        ...e,
        alert: e.status === 'alert',
        surrendered: e.status === 'surrendered',
        gone: e.status === 'hidden' || e.status === 'fled',
      })),
    );
    this.refreshVision();
    const index = CHARACTERS.findIndex((c) => c.id === testCase.active);
    this.dispatch({ type: 'setActive', agent: CHARACTERS[Math.max(0, index)].id });
    const active = this.active();
    this.focusedId.set(active.id);
    this.board?.setActive(active.id);
    this.board?.focus(active.id);
    this.board?.setSelected(null);
    this.board?.setReachable([]);
    if (testCase.hasKey) {
      this.hasKey.set(true);
      this.clueLog.update((c) => new Set([...c, KEY_TAKEN]));
      const panel = this.map?.keyPanel;
      if (panel) this.board?.hidePropItem(panel.spot);
    }
    this.say(testCase.name, 'info');

    if (testCase.start.kind === 'turn') {
      this.startTurn();
      return;
    }
    // dois fugindo: o turno inimigo abre com a escolha de alvo (ver `resolveTargetChoices`)
    if (testCase.start.kind === 'targets') {
      await this.wait(600);
      if (this.destroyed || this.epoch !== epoch) return;
      void this.enemyTurn();
      return;
    }
    // a perseguição já em curso: sem carimbo nem iniciativa, o agente corre atrás dele
    const enemyId = testCase.start.enemy;
    const enemy = this.enemy(enemyId);
    const path = enemy
      ? arrestQueue(enemy.hex, agent, this.chaseAgents(), this.area, this.enemyWalls()).find((c) => c.id === agent)?.path
      : undefined;
    if (!enemy || !path) {
      this.startTurn();
      return;
    }
    this.phase.set('chase');
    this.ranThisRound.add(enemyId);
    await this.runChase(enemyId, agent, path, epoch, this.caughtThisRound);
    if (this.destroyed || this.epoch !== epoch) return;
    this.phase.set('ending');
    if (!this.actingEnemies().length) this.announceIfOver();
    this.endTurn();
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
    // Modo Corrida: ✕ pula, ○ desliza (□ continua sendo a corrida)
    if (this.runner && this.runnerOn() && (b === 'cross' || b === 'circle')) {
      this.runner.input(b === 'cross' ? 'up' : 'down');
      return;
    }
    // lousa tática: ✕ avança (ou fecha na última página), ○ fecha
    if (this.lesson()) {
      if (b === 'cross') this.tacticalBoard()?.next();
      else if (b === 'circle') this.tacticalBoard()?.close();
      return;
    }
    // abertura da missão: ✕ inicia, ○ pula
    if (this.intro()) {
      if (b === 'cross') this.beginMission();
      else if (b === 'circle') this.skipMissionIntro();
      return;
    }
    // carimbo "Perseguir?": ✕ manda o primeiro da lista, ○ deixa fugir
    const offer = this.chaseOffer();
    if (offer) {
      if (b === 'cross') this.pickChase(offer.options[0].id);
      else if (b === 'circle') this.pickChase(null);
      return;
    }
    if (this.targetPrompt()) {
      if (b === 'cross') this.targetConfirm();
      else if (b === 'circle') this.targetCancel();
      return;
    }
    // perseguição correndo: □ dá o gás
    if (this.chaseHud()) {
      if (b === 'square') this.sprint();
      return;
    }
    const choosing = this.phase() === 'moving-choice';
    // relatório na tela: ✕ encerra (ou recomeça, no fim) e ○ volta ao jogo
    if (this.debrief()) {
      if (b === 'cross' && this.debrief() === 'confirm') this.confirmEnd();
      else if (b === 'cross') this.restart();
      else if (b === 'circle') this.closeDebrief();
      else if (b === 'options') this.padHelp.update((v) => !v);
      return;
    }
    // interrogatório: direcional escolhe o cartão, ✕ pergunta e ○ encerra
    if (this.interrogation()) {
      const open = this.openQuestions();
      if (b === 'cross' && open.length) void this.ask(open[Math.min(this.questionPick(), open.length - 1)].key);
      else if (b === 'circle') this.endInterrogation();
      else if (b === 'options') this.padHelp.update((v) => !v);
      return;
    }
    // menu da porta: ○ volta; ✕ arromba, □ destranca, △ abre
    if (this.phase() === 'door') {
      // cena do arrombamento: só o Confirmar da ficha
      if (this.breakInCine()) {
        if (b === 'cross' && this.waitingCheck()) this.closeCheck();
        return;
      }
      const act: Partial<Record<PadButton, DoorAction>> = { cross: 'arrombar', square: 'pick', triangle: 'abrir' };
      const option = this.doorOptions().find((o) => o.action === act[b]);
      if (b === 'circle') this.closeDoorMenu();
      else if (option && !option.disabled) void this.doorAction(option.action);
      return;
    }
    // dentro do avião: ✕ pega a peça que está na vista, ○ sai; o direcional desliza a vista
    if (this.phase() === 'cabin') {
      const inView = this.board?.cabinItemInView();
      if (b === 'circle') this.leavePlane();
      else if (b === 'cross' && inView) this.takeCabin(inView);
      else if (b === 'cross') this.tapCabin('other');
      return;
    }
    // menu do avião: ○ volta; ✕ olha dentro, □ queima
    if (this.phase() === 'plane') {
      if (b === 'circle') this.closePlaneMenu();
      else if (b === 'cross') this.planeLook();
      else if (b === 'square') this.planeBurnPick();
      return;
    }
    switch (b) {
      case 'cross':
        if (this.prop()) { if (this.prop()!.taken) this.closeProp(); else this.takeProp(); }
        else if (this.waitingCheck()) this.closeCheck();
        else if (this.phase() === 'rolling') this.confirmRoll();
        else if (this.approaching()) { const t = this.tablet(); if (t) t.press(); else this.confirmApproach(); }
        else if (this.burning()) this.confirmBurn();
        else if (this.grouping()) void this.confirmGrouping();
        else if (this.viewingOther()) this.focusCharacter(this.active().id);
        else if (choosing && this.selected()) void this.confirm();
        else this.focusUnitUnderCursor();
        break;
      case 'circle':
        if (this.prop()) this.closeProp();
        else if (this.approaching()) { const t = this.tablet(); if (t) t.cancel(); else this.cancelApproach(); }
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
        if (this.prop()) break;
        else if (this.approaching()) { const t = this.tablet(); if (t) t.cancel(); else this.cancelApproach(); }
        else if (this.burning()) this.cancelBurn();
        else if (this.grouping()) break;
        else if (this.canApproach()) this.startApproach();
        else if (this.burnable()) this.startBurn();
        else if (this.nearPlane()) this.openPlaneMenu();
        else if (this.nearPanel()) void this.openProp('keys');
        else if (this.inspectable()) void this.openProp(this.inspectable()!);
        else if (this.canTalk()) void this.startInterrogation();
        else if (this.nearDoor()) this.openDoorMenu();
        break;
      case 'l3':
        this.openDebrief();
        break;
      case 'share':
        if (this.prop()) break;
        // Share: agrupa (ou desagrupa) a equipe
        if (this.grouping()) this.cancelGrouping();
        else if (this.group().size) this.ungroup();
        else this.startGrouping();
        break;
      case 'triangle':
        if (choosing && !this.approaching() && !this.burning() && !this.prop()) this.endTurn();
        break;
      case 'l1':
      case 'r1': {
        if (this.phase() === 'enemy' || this.phase() === 'chase' || this.prop()) break;
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
    // Modo Corrida: direcional e analógico trocam de faixa, pulam e deslizam
    if (this.runner && this.runnerOn()) {
      if (Math.abs(dir.x) > Math.abs(dir.y)) this.runner.input(dir.x < 0 ? 'left' : 'right');
      else if (dir.y) this.runner.input(dir.y < 0 ? 'up' : 'down');
      return;
    }
    // escolha de alvo: esquerda/direita olham (e, de novo, confirmam)
    if (this.targetPrompt()) {
      if (Math.abs(dir.x) > Math.abs(dir.y)) this.targetSide(dir.x < 0 ? 'esquerda' : 'direita', false);
      return;
    }
    if (this.chaseOffer()) return;
    // no interrogatório, cima/baixo escolhem o cartão de pergunta
    if (this.interrogation()) {
      const n = this.openQuestions().length;
      if (n && Math.abs(dir.y) >= Math.abs(dir.x)) this.questionPick.update((i) => (i + (dir.y > 0 ? 1 : n - 1)) % n);
      return;
    }
    const map = this.map;
    if (this.phase() === 'cabin' && this.cabinInside()) {
      if (dir.x) this.board?.panCabinSide(dir.x > 0 ? 1 : -1);
      return;
    }
    if (!map || !this.board || this.phase() === 'enemy' || this.phase() === 'chase' || this.phase() === 'door' || this.phase() === 'plane' || this.phase() === 'cabin' || this.approaching() || this.burning() || this.prop() || this.debrief()) return;
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
    if (!this.board || this.intro()) return;
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

  private initialDoors(): Map<string, Door> {
    return spawnDoors(this.map?.doors ?? [], this.map?.doorStates);
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
    if (this.actingEnemies().length || !this.knownEnemies().length) return;
    const { surrendered, fled } = this.enemyCounts();
    this.say(
      `Fim da abordagem: ${surrendered} ${surrendered === 1 ? 'rendido' : 'rendidos'}, ${fled} ${fled === 1 ? 'fugiu' : 'fugiram'}`,
      'info',
    );
  }

  /** Muda um inimigo direto: só para os sistemas que ainda não migraram para o motor. */
  private updateEnemy(id: string, patch: Partial<EnemyState>): void {
    this.dispatch({ type: 'patchEnemy', enemy: id, patch });
  }

  /** O mapa como o motor precisa dele (as portas ainda vivem aqui). */
  /** O que é fixo no mapa, como o motor precisa (as portas vêm do estado). */
  private worldMap?: World;
  private world(): World {
    return (this.worldMap ??= {
      area: this.area,
      blocked: this.fixedWalls,
      lowCover: this.lowCover,
      roomWalls: new Set((this.map?.walls ?? []).map(hexKey)),
      structures: (this.map?.structures ?? []).map((st) => st.rect),
    });
  }

  /** Paredes, carga e inimigos no tabuleiro: o que bloqueia os agentes (sem contar os outros agentes). */
  private enemyWalls(): Set<string> {
    return new Set([...this.solid(), ...this.onBoardEnemies().map((e) => hexKey(e.hex))]);
  }

  /** Hexágonos que um inimigo não pode atravessar: paredes, agentes e os outros inimigos. */

  /** Pinta no tabuleiro o que os inimigos em patrulha enxergam. */
  private refreshVision(): void {
    const map = this.map;
    if (!map) return;
    const view = this.enemyView;
    const keys = this.enemies()
      .map((e) => (view && e.id === view.id ? { ...e, ...view } : e))
      .filter((e) => e.status === 'patrol')
      .flatMap((e) =>
        visionHexes(e, this.area, this.walls(), ENEMY_RULES.visionRange, ENEMY_RULES.visionAngle, this.lowCover).map(hexKey),
      );
    this.board?.setVision(keys);
  }

  // ---------- som ----------

  /** Passos do agente ao chegar num hexágono: duas pisadas por hexágono, na corrida. */
  private agentSteps(hex: HexCoord, together: boolean): void {
    if (!this.map) return;
    const surface = surfaceAt(this.map, hex);
    const gain = together ? 1.15 : 1;
    this.sound.step(surface, { gain });
    this.sound.step(surface, { gain: gain * 0.85, delay: SECONDS_PER_HEX / 2 });
  }

  /** Passos de galocha do inimigo (de longe, mais baixos; debaixo de telhado, abafados e só de perto). */
  private enemySteps(hex: HexCoord, speed: number, hidden = false): void {
    if (!this.map) return;
    const surface = surfaceAt(this.map, hex);
    const opts = { boot: 'galocha' as const, at: hex, hidden, gain: speed > 1 ? 1 : 0.7 };
    this.sound.step(surface, opts);
    if (!hidden) this.sound.step(surface, { ...opts, gain: opts.gain * 0.85, delay: SECONDS_PER_HEX / speed / 2 });
  }

  /** Resultado de um d20 que o jogador vê (o do interrogatório é escondido e não passa por aqui). */
  private checkSound(result: number, pass: boolean): void {
    this.sound.play(result === 20 && pass ? 'teste.20' : pass ? 'teste.passou' : 'teste.falhou');
  }

  private say(text: string, tone: 'alert' | 'info'): void {
    this.notice.set({ text, tone });
    clearTimeout(this.noticeTimer);
    // no menu da porta o aviso fica nas fichas até sair do menu (ver `closeDoorMenu`)
    if (this.phase() !== 'door') this.noticeTimer = setTimeout(() => this.notice.set(null), 2600);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((r) => this.later(reducedMotion() ? Math.min(ms, 150) : ms, r));
  }

  private initialCore(): GameState {
    const starts = CHARACTERS.map((c, i) => [c.id, { ...(this.map?.starts[i] ?? { col: 0, row: 0 }) }] as const);
    return initialGameState({
      order: CHARACTERS.map((c) => c.id),
      positions: Object.fromEntries(starts),
      enemies: this.initialEnemies(),
      // a escalação da ficha: o motor calcula movimento, grupo e Comando com ela
      loadouts: Object.fromEntries(CHARACTERS.map((c) => [c.id, this.roster.loadout(c.id)])),
      captain: this.roster.captain(),
      doors: Object.fromEntries(this.initialDoors()),
    });
  }

  /**
   * Única entrada do estado do turno: confere a ação e aplica. No multiplayer, a ação vai ao
   * servidor, que confere de novo e a devolve para todos.
   */
  private dispatch(action: GameAction): boolean {
    const why = validateAction(this.core(), action);
    if (why) {
      console.error(`Ação recusada (${action.type}): ${why}`);
      return false;
    }
    this.core.update((s) => applyAction(s, action));
    return true;
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
