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
import { rollDie, sum } from '../../game/dice';
import {
  ArrestOrigin,
  CHASE_RULES,
  ChaseAgent,
  ChaseCandidate,
  ChaseStats,
  Side,
  arrestQueue,
  chaseCandidates,
  fleeDoorAction,
  targetChoices,
  fleeDoorNeed,
  initiativeChance,
  initiativeCheck,
  lockRoute,
  resolveCurve,
  resolveFleeDoor,
} from '../../game/chase';
import { ChaseHud, ChaseOverlay, CurvePrompt, TargetPrompt } from '../../ui/chase/chase-overlay';
import { CloseUpInsets, HexBoard, SECONDS_PER_HEX } from '../../game/hex-board';
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
  EscapeRoll,
  EnemyState,
  canAct,
  facingBetween,
  isBorder,
  known,
  lineOfSight,
  onBoard,
  planFlee,
  planPatrol,
  resolveApproach,
  rollEscape,
  spawnEnemy,
  spotted,
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
  applyDoor,
  doorChance,
  doorNeed,
  isOpen,
  nextToDoor,
  resolveBreakIn,
  resolveDoor,
  roomBehind,
  rollsDie,
  spawnDoors,
} from '../../game/door';
import { BURN_RULES, Burnable, burnTarget, canBurn, seeFire } from '../../game/burn';
import {
  KEY_PANEL_ID,
  KEY_TAKEN,
  PLANE_LOCKED,
  PlaneState,
  WITNESS_LINE,
  keyKnown,
  leftKey,
  lookInside,
  needsKeyRoll,
  nextToPanel,
  seesKey,
  witness,
} from '../../game/plane';
import { MissionProgress, Verdict, canEndMission, missionVerdict, objectiveState, visibleObjectives } from '../../game/mission';
import { CLASS_INFO, CLASS_RULES, commandFree, rallyCost, skillBonus, SKILLS } from '../../game/agent-class';
import { GROUP_RULES, RallyPlan, followLeader, rallyPoints, suggestedRally } from '../../game/group';
import { APPROACH_PATTERN, Haptics, ROLL_PATTERN, SETTLE_PATTERN } from '../../game/haptics';
import { waveArrival, waveDuration } from '../../game/approach-fx';
import { HexCoord, hexDistance, hexKey, hexNeighbors, hexToWorld, hexesInRange, pathTo, reachableHexes, rectArea, sameHex } from '../../game/hex';
import { CHARACTERS, Character, GameMap, MOVE_DICE, blockedHexes, findMap, inStructure, lowCoverHexes, playArea } from '../../game/maps';
import { RosterService } from '../../game/roster.service';
import {
  Clues,
  DialogueMemory,
  EMPTY_MEMORY,
  INTERROGATION_RULES,
  NoteKind,
  PoolUsage,
  askQuestion,
  auraHexes,
  dialogueOptions,
  hasDialogue,
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
import { approachRulesFor, signed, statBreakdown, turnMovement } from '../../game/stats';

/** Turnos (rodadas) até o carro fugir — por enquanto só aparece na linha do tempo. */
const MISSION_DEADLINE = 5;

/**
 * `checking`: rolando um d20 (percepção, inspecionar) — nada mais anda até o dado parar.
 * `interrogating`: interrogatório em close-up (balões e cartões de pergunta na tela).
 * `over`: a operação foi encerrada (fica o relatório na tela).
 */
type Phase = 'rolling' | 'moving-choice' | 'walking' | 'checking' | 'door' | 'plane' | 'interrogating' | 'ending' | 'enemy' | 'over';

/** Anotação da caderneta de campo (vai para o relatório da operação). */
export interface FieldNote {
  id: number;
  suspect: string;
  text: string;
  kind: NoteKind;
  /** 0 pergunta, 1 réplica, 2 tréplica. */
  depth: number;
}

/** Inspeção em close-up: quem procura, onde e o resultado do d20 (quando parar). */
interface SearchView {
  who: string;
  furniture: string;
  target: number;
  result: number | null;
  pass: boolean | null;
  /** Aviso quando acha ("Arma apreendida!"). */
  seized: string;
  /** Número do lance: cada lance novo recria o `app-d20` (que rola de novo). */
  throw: number;
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
}

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
const wholeTeam = (): ReadonlySet<string> => new Set(CHARACTERS.map((c) => c.id));

const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

@Component({
  selector: 'app-game-screen',
  imports: [MainButton, D4, D20, TalkButton, InterrogationPanel, ChaseOverlay],
  templateUrl: './game-screen.html',
  styleUrl: './game-screen.css',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class GameScreen implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly gamepad = inject(GamepadService);
  private readonly renderSettings = inject(RenderSettings);
  /** Atributos escolhidos na ficha (escalação). */
  private readonly roster = inject(RosterService);
  private readonly haptics = inject(Haptics);
  private readonly sound = inject(Sound);
  private stopPad?: () => void;
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('board');
  private board?: HexBoard;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private readonly rollConfirmBtn = viewChild('rollConfirm', { read: ElementRef<HTMLButtonElement> });
  private destroyed = false;
  /** Muda a cada "Recomeçar": animações antigas param de mexer no estado. */
  private epoch = 0;

  protected readonly map: GameMap | undefined = findMap(inject(ActivatedRoute).snapshot.paramMap.get('mapId'));
  protected readonly characters = CHARACTERS;
  /** Paredes, árvores, avião e carga alta: bloqueiam passagem e visão. */
  private readonly fixedWalls = this.map ? blockedHexes(this.map) : new Set<string>();
  /** Carga baixa: bloqueia passagem; esconde da visão só quem está colado nela. */
  private readonly lowCover = this.map ? lowCoverHexes(this.map) : new Set<string>();
  /** Portas comuns (ver `door.ts`): fechadas, bloqueiam passagem e visão como parede. */
  protected readonly doors = signal<ReadonlyMap<string, Door>>(this.initialDoors());
  private readonly closedDoors = computed(
    () => new Set([...this.doors()].filter(([, d]) => !isOpen(d)).map(([k]) => k)),
  );
  /** O que bloqueia a visão: paredes e afins, mais as portas fechadas. */
  private readonly walls = computed(() => new Set([...this.fixedWalls, ...this.closedDoors()]));
  /** Tudo o que ninguém atravessa (paredes, toda a carga e as portas fechadas). */
  private readonly solid = computed(() => new Set([...this.fixedWalls, ...this.lowCover, ...this.closedDoors()]));
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
  /**
   * Um `app-d4` por chave: cada rolagem ganha chaves novas, então os dados são recriados e
   * lançados de novo. Cada um sorteia o seu valor e avisa quando para (`dieRolled`).
   */
  protected readonly rollKeys = signal<readonly string[]>([]);
  private rollSeq = 0;
  private dieResults: number[] = [];
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
    // resultado da inspeção: o foco vai para "De novo!" (falhou) ou "Fechar"
    effect(() => this.searchCloseBtn()?.nativeElement.focus({ preventScroll: true }));
    // ficha do d20 e auto de abordagem: o foco vai para "Continuar"/"Fechar"
    effect(() => this.checkCloseBtn()?.nativeElement.focus({ preventScroll: true }));
    effect(() => this.reportCloseBtn()?.nativeElement.focus({ preventScroll: true }));
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
    // losango amarelo nas portas fechadas coladas no agente da vez (tocar nelas abre o menu)
    effect(() => {
      const free = !this.approaching() && !this.burning() && !this.grouping() && !this.selected();
      const keys = free ? this.nearDoors().filter((d) => !isOpen(d)).map((d) => hexKey(d.hex)) : [];
      this.board?.setDoorHints(keys);
    });
    // aura de interrogatório em volta dos suspeitos rendidos com diálogo (some no close-up)
    effect(() => {
      const show = this.phase() !== 'interrogating' && this.phase() !== 'door' && this.phase() !== 'plane' && this.phase() !== 'over';
      const { talk, muted } = this.auraKeys();
      const here = this.positions().get(this.active().id);
      const hot = this.canTalk() && here && show ? [hexKey(here)] : [];
      this.board?.setInterrogationAura(show ? talk : [], hot, show ? muted : []);
    });
    // aura de brasa em volta de cada queimável (o avião, os suprimentos): chegar nela mostra o botão de ação
    effect(() => {
      const show = !['interrogating', 'door', 'plane', 'over'].includes(this.phase()) && !this.search() && !this.aiming();
      const { ring, hot } = this.actionAuraKeys();
      this.board?.setActionAura(show ? ring : [], show ? hot : []);
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
  protected readonly report = signal<{
    agent: string;
    surrender: EnemyState[];
    flee: EnemyState[];
    /** Testes de fuga rolados na zona de rolagem (por id do inimigo). */
    rolls: ReadonlyMap<string, EscapeRoll>;
  } | null>(null);
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
    hidden: 'escondido',
  };
  /** Suspeitos que a equipe conhece (os escondidos só entram depois de revelados). */
  protected readonly knownEnemies = computed(() => this.enemies().filter(known));

  // ---------- percepção e esconderijos ----------

  /** Teste de d20 na ficha da lateral (percepção ao entrar no cômodo, inspecionar o móvel). */
  protected readonly check = signal<CheckView | null>(null);
  /** Carimbo "Perseguir?" do turno inimigo (ver `tryChase`). */
  protected readonly chaseOffer = signal<{
    /** Linha de cima do carimbo ("Ele vai correr", "Voz de prisão", "Reforço"). */
    kicker: string;
    enemy: string;
    options: { id: string; name: string; steps: number; chance: string }[];
  } | null>(null);
  private chaseOfferDone?: (agentId: string | null) => void;
  /**
   * Suspeitos que fugiram de uma abordagem nesta rodada: quem deu a voz de prisão (ver
   * `arrestQueue`). Vale até o fim do próximo turno inimigo.
   */
  private readonly arrests = new Map<string, ArrestOrigin>();
  /** Placar da perseguição em curso: distância e quanto da rota dele já foi. */
  protected readonly chaseHud = signal<ChaseHud | null>(null);
  /** Curva: o jogador tem `seconds` para deslizar para o lado (`decisao:perseguicao`). */
  protected readonly curvePrompt = signal<CurvePrompt | null>(null);
  private curveDone?: (side: Side | null) => void;
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
  private curveSeq = 0;
  /** Quem espera o jogador fechar a ficha (**Continuar**, ✕). */
  private checkDone?: () => void;
  /** Some com a ficha do d20 das portas (essas não esperam o Continuar: a cena da porta segue). */
  private doorCheckTimer?: ReturnType<typeof setTimeout>;
  /** A ficha como lista (0 ou 1 item), para o `@for` recriar o d20 a cada teste novo. */
  protected readonly checks = computed(() => {
    const c = this.check();
    return c ? [c] : [];
  });
  private checkSeq = 0;
  /** Quem espera o d20 da ficha parar. */
  private checkRolled?: (value: number) => void;
  protected readonly searchRules = SEARCH_RULES;
  /**
   * Inspeção em close-up (toque na lupa): a câmera aproxima, o d20 rola no meio da cena e o
   * resultado fica na tela até o jogador tocar em **Fechar**.
   */
  protected readonly search = signal<SearchView | null>(null);
  /**
   * Inspeção aberta (toque na lupa): a câmera trava atrás do agente com o móvel em foco; a
   * HUD some e só fica o que dá para tocar (**Inspecionar!** e **Cancelar**, depois o resultado).
   */
  protected readonly aiming = signal<HiddenItem | null>(null);
  /** Quem espera o d20 da inspeção parar. */
  private searchRolled?: (value: number) => void;
  /** Conta os lances do d20 da inspeção (cada um recria o dado). */
  private searchThrows = 0;
  private readonly searchCloseBtn = viewChild('searchClose', { read: ElementRef<HTMLButtonElement> });
  private readonly checkCloseBtn = viewChild('checkClose', { read: ElementRef<HTMLButtonElement> });
  private readonly reportCloseBtn = viewChild('reportClose', { read: ElementRef<HTMLButtonElement> });
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
  /** Hexágonos da aura: dos rendidos com diálogo (`talk`) e dos sem diálogo (`muted`). */
  private readonly auraKeys = computed(() => {
    const ring = (e: EnemyState) => auraHexes(e.hex, this.area, this.solid()).map(hexKey);
    const es = this.surrenderedEnemies();
    return {
      talk: es.filter((e) => hasDialogue(npcClass(e.npc))).flatMap(ring),
      muted: es.filter((e) => !hasDialogue(npcClass(e.npc))).flatMap(ring),
    };
  });
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
  protected readonly breakInUntil = signal(0);
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
  /** Fichas do menu da porta: arrombar, destrancar e abrir. */
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
        st === 'bloqueada' && !door.broken ? 'nunca passa' : open ? 'já está aberta' : st === 'encostada' ? 'sem tranca, chama atenção' : 'porta trancada',
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
   * A equipe chega junta: a partida começa com todos no grupo.
   */
  protected readonly group = signal<ReadonlySet<string>>(wholeTeam());
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
  protected readonly led = computed(() => {
    const id = this.captainId();
    return !!id && this.group().has(id);
  });
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
  /** Vezes que o Comando já foi usado neste turno. */
  private readonly commandsUsed = signal(0);
  /** O Agrupar do agente da vez sai de graça (Comando do Capitão, ainda não usado no turno). */
  protected readonly freeRally = computed(() =>
    commandFree(this.roster.classOf(this.active().id), this.commandsUsed()),
  );
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
  /** Partes do raio de abordagem do agente da vez (base, intimidação e grupo) e as faixas. */
  protected readonly approachParts = computed(() => {
    const loadout = this.roster.loadout(this.active().id);
    const grouped = this.grouped();
    return {
      base: APPROACH_RULES.surrenderRange,
      int: statBreakdown(loadout, 'intimidacao', false).total,
      group: grouped ? GROUP_RULES.approachBonus : 0,
      leader: grouped && this.led() ? CLASS_RULES.leadership.intimidacao : 0,
      door: this.breakInBoost(),
      total: this.activeApproach().surrenderRange,
      zones: this.activeApproach(),
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
    const group = this.group();
    const leader = this.active().id;
    const blocked = new Set([
      // no grupo, o líder passa por entre os companheiros (eles andam junto)
      ...[...this.positions()]
        .filter(([id]) => id !== leader && !(group.has(leader) && group.has(id)))
        .map(([, h]) => hexKey(h)),
      ...this.solid(),
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
          hidden: e.status === 'hidden',
        })),
      },
    );
    // os queimáveis não levam ícone de chama: cada um tem a sua aura (ver `actionAuraKeys`)
    this.board.setBurnTargets([]);
    this.board.setDoors(this.doors(), true);
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
    clearTimeout(this.speechTimer);
    clearInterval(this.statsTicker);
    removeEventListener('resize', this.onDoorResize);
    removeEventListener('resize', this.onInterrogationResize);
    clearTimeout(this.doorCheckTimer);
    this.board?.dispose();
    this.sound.stopAll();
  }

  // ---------- turnos ----------

  private startTurn(): void {
    const active = this.active();
    this.commandsUsed.set(0);
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
    this.roll();
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
    const final = [...this.dieResults];
    this.dice.set(final);
    this.rolled.set(sum(final));
    this.movesLeft.set(turnMovement(sum(final), this.roster.loadout(this.active().id), this.grouped(), this.led()));
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
    if (['walking', 'checking', 'door', 'plane', 'interrogating', 'rolling', 'enemy', 'over'].includes(this.phase())) return;
    // só quando o jogador decide passar (não depois de abordar ou queimar)
    if (this.phase() === 'moving-choice') this.sound.play('ui.passar');
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
    this.sound.play('ui.vez-inimigo');
    await this.wait(700);

    // perseguição: quem já correu nesta rodada não vai de novo; quem foi agarrado agora fica abalado
    const chased = new Set<string>();
    const caught = new Set<string>();
    // um agente no raio de dois que vão correr escolhe antes qual perseguir
    const handled = new Set<string>();
    await this.resolveTargetChoices(epoch, chased, caught, handled);
    for (const { id } of this.enemies()) {
      if (stale()) return;
      const enemy = this.enemy(id);
      if (!enemy || !canAct(enemy) || handled.has(id)) continue;
      // parado no lugar (o Jô comendo): não anda nem gira, então nem chama a câmera
      if (enemy.status === 'patrol' && stationary(enemy)) continue;
      // em alerta: antes de correr, quem está perto pode ir atrás dele
      if (enemy.status === 'alert' && (await this.tryChase(enemy, epoch, chased, caught, handled))) {
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
    // a voz de prisão vale só para a corrida logo depois da abordagem
    this.arrests.clear();
    // o abalado de uma rodada atrás passa
    for (const e of this.enemies()) if (e.shaken && !caught.has(e.id)) this.updateEnemy(e.id, { shaken: false });
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
      if (!covered) {
        this.say(`${enemy.name} está encurralado!`, 'info');
        this.sound.play('ini.encurralado');
      }
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
      this.sound.play('ini.foge', { at: this.enemy(enemy.id)!.hex });
      await this.board!.removeEnemy(enemy.id);
      return true;
    }
    return shown;
  }

  // ---------- perseguição (ver `chase.ts`) ----------

  /** Teclado na perseguição: setas (ou A/D) deslizam na curva; Esc deixa fugir. */
  protected onKey(ev: KeyboardEvent): void {
    if (this.targetPrompt()) {
      if (ev.key === 'ArrowLeft' || ev.key === 'a') this.targetSide('esquerda');
      else if (ev.key === 'ArrowRight' || ev.key === 'd') this.targetSide('direita');
      else if (ev.key === 'Enter' || ev.key === ' ') this.targetConfirm();
      else if (ev.key === 'Escape') this.targetCancel();
      else return;
      ev.preventDefault();
      return;
    }
    if (this.curvePrompt()) {
      const side = ev.key === 'ArrowLeft' || ev.key === 'a' ? 'esquerda' : ev.key === 'ArrowRight' || ev.key === 'd' ? 'direita' : null;
      if (side) {
        ev.preventDefault();
        this.swipeCurve(side);
      }
    } else if (this.chaseOffer() && ev.key === 'Escape') this.pickChase(null);
  }

  /** Atributos de perseguição do agente: os da ficha (o grupo não soma). */
  private chaseStats(id: string): ChaseStats {
    const { vigor, iniciativa, agilidade } = this.roster.loadout(id).attributes;
    return { vigor, iniciativa, agilidade };
  }

  /**
   * Antes de um suspeito em alerta correr: os agentes no raio de perseguição podem ir atrás.
   * O jogador escolhe quem (ou deixa fugir), o agente rola a iniciativa e, se arrancar, a
   * perseguição roda inteira. Devolve se houve perseguição (`false`: ele foge como sempre).
   */
  private async tryChase(
    enemy: EnemyState,
    epoch: number,
    chased: Set<string>,
    caught: Set<string>,
    handled: Set<string>,
  ): Promise<boolean> {
    const board = this.board!;
    // debaixo de um telhado que o jogador não enxerga, ninguém vê ele arrancar
    if (board.isCovered(enemy.hex)) return false;
    const arrest = this.arrests.get(enemy.id);
    if (arrest) return this.chaseArrest(enemy, arrest, epoch, chased, caught, handled);
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

  /** Fila da voz de prisão para este suspeito agora (ver `arrestQueue`). */
  private arrestOffers(enemy: EnemyState, arrest: ArrestOrigin, chased: ReadonlySet<string>): ChaseCandidate[] {
    return arrestQueue(enemy.hex, arrest, this.chaseAgents(), this.area, this.enemyWalls(), chased);
  }

  /**
   * Suspeito que fugiu de uma abordagem: quem deu a voz de prisão rola primeiro. Se ele tiver
   * dois ou mais fugindo dele, escolhe antes qual perseguir (`decisao:alvo`); o escolhido corre
   * a fila dele na hora e sai da vez. Devolve se houve perseguição.
   */
  private async chaseArrest(
    enemy: EnemyState,
    arrest: ArrestOrigin,
    epoch: number,
    chased: Set<string>,
    caught: Set<string>,
    handled: Set<string>,
  ): Promise<boolean> {
    const alive = () => !this.destroyed && this.epoch === epoch;
    const leader = arrest.agentId;
    this.arrests.delete(enemy.id);
    const leads = (e: EnemyState, a: ArrestOrigin) => this.arrestOffers(e, a, chased)[0]?.id === leader;
    let picked: string | null | undefined;
    if (leads(enemy, arrest)) {
      const rivals = this.enemies().filter((e) => {
        const a = this.arrests.get(e.id);
        return e.status === 'alert' && !handled.has(e.id) && a?.agentId === leader && !this.board!.isCovered(e.hex) && leads(e, a);
      });
      if (rivals.length) {
        picked = await this.chooseTarget(leader, [enemy.id, ...rivals.map((e) => e.id)]);
        if (!alive()) return true;
        if (picked !== enemy.id) {
          // foi atrás de outro (ou de nenhum): este segue a fila sem ele
          if (picked) {
            const other = this.enemy(picked)!;
            const otherArrest = this.arrests.get(picked)!;
            this.arrests.delete(picked);
            handled.add(picked);
            if (!(await this.runArrestQueue(other, otherArrest, epoch, chased, caught, true)) && alive()) await this.flee(other, epoch);
            if (!alive()) return true;
            await this.wait(300);
          }
          chased.add(leader);
        }
      }
    }
    return this.runArrestQueue(enemy, arrest, epoch, chased, caught, picked === enemy.id);
  }

  /**
   * A fila da voz de prisão, um agente por vez: carimbo "Perseguir?" só com o da vez (ou
   * direto, se ele já escolheu este alvo), iniciativa e, se arrancar, a perseguição. Hesitou:
   * o próximo da fila. Devolve se houve perseguição (`false`: ninguém foi, ele foge normal).
   */
  private async runArrestQueue(
    enemy: EnemyState,
    arrest: ArrestOrigin,
    epoch: number,
    chased: Set<string>,
    caught: Set<string>,
    chosen: boolean,
  ): Promise<boolean> {
    const board = this.board!;
    for (let first = true; ; first = false) {
      if (this.destroyed || this.epoch !== epoch) return true;
      const queue = this.arrestOffers(this.enemy(enemy.id) ?? enemy, arrest, chased);
      const [next] = queue;
      if (!next) return false;
      if (!(first && chosen)) {
        board.focusHex(enemy.hex);
        board.startleEnemy(enemy.id);
        this.sound.play('abo.carimbo');
        const kicker = next.id === arrest.agentId ? 'Voz de prisão' : 'Reforço';
        const agentId = await this.offerChase(enemy, [next], kicker);
        if (this.destroyed || this.epoch !== epoch) return true;
        if (!agentId) return false;
      }
      const more = queue.length > 1;
      if (await this.startChase(enemy, next.id, next.path, epoch, chased, caught, more)) return true;
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
      this.sound.chaseEnd();
      this.board?.setChaseCamera(null);
      this.say(backup ? `${this.nameOf(agentId)} hesitou! Quem vai?` : `${this.nameOf(agentId)} hesitou. ${enemy.name} corre!`, 'alert');
      return false;
    }
    await this.runChase(enemy.id, agentId, path, epoch, caught);
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
    const alive = () => !this.destroyed && this.epoch === epoch;
    const agents = () => this.chaseAgents();
    // quem fugiu de uma abordagem tem a fila da voz de prisão (ver `chaseArrest`)
    const runners = () =>
      this.enemies().filter((e) => e.status === 'alert' && !handled.has(e.id) && !this.arrests.has(e.id) && !board.isCovered(e.hex));
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
    this.sound.chaseSlow(true);
    this.say(`${this.nameOf(agentId)}: dois fugindo! Qual?`, 'alert');
    const picked = await new Promise<string | null>((done) => {
      this.targetDone = done;
      this.targetPrompt.set({ id: ++this.targetSeq, agent: this.nameOf(agentId), agentId, options, pick: null });
      this.paintTargets();
    });
    this.board?.setSpotlight(null);
    this.sound.chaseSlow(false);
    if (!picked) {
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
   * A perseguição: trava a rota de fuga e os dois correm por ela, parando em cada curva (o
   * jogador desliza para o lado e rola) e em cada porta (o garimpeiro rola). Distância 0:
   * agarrou, ele se rende abalado. Rota no fim: ele escapa (e foge do mapa, se chegou à borda).
   */
  private async runChase(enemyId: string, agentId: string, agentPath: HexCoord[], epoch: number, caught: Set<string>): Promise<void> {
    try {
      await this.chaseSteps(enemyId, agentId, agentPath, epoch, caught);
    } finally {
      // terminou, ou a partida recomeçou no meio: a câmera sobe, a faixa some e o placar sai
      this.board?.setChaseCamera(null);
      this.sound.chaseEnd();
      this.chaseHud.set(null);
    }
  }

  private async chaseSteps(enemyId: string, agentId: string, agentPath: HexCoord[], epoch: number, caught: Set<string>): Promise<void> {
    const board = this.board!;
    const alive = () => !this.destroyed && this.epoch === epoch;
    const enemy = this.enemy(enemyId)!;
    const agentFrom = this.positions().get(agentId)!;
    const others = [...this.positions()].filter(([id]) => id !== agentId).map(([, h]) => h);
    const blocked = new Set([
      ...this.fixedWalls,
      ...this.lowCover,
      ...this.onBoardEnemies().filter((e) => e.id !== enemyId).map((e) => hexKey(e.hex)),
    ]);
    const route = lockRoute(enemy.hex, this.area, blocked, this.doors(), others);
    // a pista: do agente até ele e, dali, a rota de fuga travada
    const track = [agentFrom, ...agentPath, ...route.flee];
    const n = agentPath.length;
    let distance = Math.max(0, n - 1);
    let a = 0;
    let g = 0;
    const who = this.nameOf(agentId);
    this.say(`${who} persegue ${enemy.name}!`, 'alert');
    board.setSelected(route.flee.at(-1) ?? null, route.flee);
    const hud = () => {
      this.chaseHud.set({ agent: who, enemy: enemy.name, distance, step: g, total: route.flee.length });
      this.sound.chaseDistance(distance);
    };
    hud();
    // a câmera desce e encosta nas costas do agente; a faixa entra quando ela chega
    board.setChaseCamera(agentId, enemyId);
    await this.wait(800);
    if (!alive()) return;
    void this.sound.chaseStart(distance);
    const onStep = (w: 'unit' | 'enemy', hex: HexCoord) => {
      if (!alive()) return;
      if (w === 'unit') {
        this.positions.update((m) => new Map(m).set(agentId, hex));
        this.agentSteps(hex, false);
      } else {
        const prev = this.enemy(enemyId)!.hex;
        this.updateEnemy(enemyId, { hex, facing: facingBetween(prev, hex) });
        this.enemySteps(hex, 1.6);
      }
    };
    /** Os dois correm até ele estar no ponto `s` da rota; o agente fica `distance` atrás. */
    const legTo = async (s: number) => {
      const aT = Math.max(a, Math.min(n + s - distance - 1, n + s - 1));
      await board.runPair(agentId, track.slice(a + 1, aT + 1), enemyId, track.slice(n + g + 1, n + s + 1), onStep);
      a = aT;
      g = s;
      hud();
    };

    // encurralado, ela chega nele; colada nele (distância 0), agarra na largada
    if (route.cornered) distance = 0;
    else if (distance > 0) {
      for (const stop of route.stops) {
        // na porta ele para colado nela; na curva, em cima dela
        await legTo(stop.kind === 'porta' ? stop.index - 1 : stop.index);
        if (!alive()) return;
        if (stop.kind === 'curva') distance += await this.chaseCurve(stop.side, agentId, enemyId);
        else
          distance = await this.chaseDoor(stop.door, enemyId, distance, (d) => {
            distance = Math.max(0, d);
            hud();
          });
        if (!alive()) return;
        distance = Math.max(0, distance);
        hud();
        if (distance <= 0) break;
      }
      if (distance > 0) await legTo(route.flee.length);
    }
    if (!alive()) return;
    board.setSelected(null);

    if (distance <= 0) {
      // encosta nele (no hexágono de trás) e ele se rende
      const aT = n + g - 1;
      if (aT > a) await board.runPair(agentId, track.slice(a + 1, aT + 1), enemyId, [], onStep);
      if (!alive()) return;
      const e = this.enemy(enemyId)!;
      const facing = facingBetween(e.hex, this.positions().get(agentId)!);
      this.updateEnemy(enemyId, { status: 'surrendered', shaken: true, facing });
      board.setEnemyFacing(enemyId, facing);
      board.setEnemyAlert(enemyId, false);
      board.setEnemySurrendered(enemyId, true);
      caught.add(enemyId);
      this.sound.play('ini.rende', { at: e.hex });
      this.gamepad.rumble(0.8, 0.5, 300);
      this.say(`${who} agarrou ${e.name}! Rendido e abalado: +${CHASE_RULES.shakenBonus} no interrogatório.`, 'alert');
    } else if (route.escapes) {
      const e = this.enemy(enemyId)!;
      this.updateEnemy(enemyId, { status: 'fled' });
      this.say(`${e.name} escapou de ${who} e fugiu do mapa!`, 'alert');
      this.sound.play('ini.foge', { at: e.hex });
      await board.removeEnemy(enemyId);
    } else this.say(`${enemy.name} escapou de ${who}.`, 'alert');
    this.refreshVision();
    this.sound.chaseEnd();
    await this.wait(1400);
    if (!alive()) return;
    board.setChaseCamera(null);
    this.chaseHud.set(null);
    await this.wait(800);
  }

  /**
   * Curva (`decisao:perseguicao`): o jogador desliza para o lado em até `swipeSeconds`. Lado
   * errado ou nada: bateu. Lado certo: d20 + agilidade. O garimpeiro sempre rola a dele.
   * Devolve a mudança na distância.
   */
  private async chaseCurve(side: Side, agentId: string, enemyId: string): Promise<number> {
    const enemy = this.enemy(enemyId)!;
    const agent = this.chaseStats(agentId);
    // a fita cai para o ultra slow enquanto o jogador decide; volta no gesto
    this.sound.chaseSlow(true);
    const swiped = await this.askCurve();
    this.sound.chaseSlow(false);
    const crashed = swiped !== side;
    let agentRoll = 0;
    if (crashed) {
      this.sound.play('ui.invalido');
      this.gamepad.rumble(0.9, 0.6, 260);
      this.say(`${this.nameOf(agentId)} bateu! A curva era para a ${side}.`, 'alert');
      await this.wait(900);
    } else {
      const need = CHASE_RULES.curveDC - (agent.agilidade ?? 0);
      const r = await this.rollD20(
        { kicker: 'Curva · agilidade', who: this.nameOf(agentId), need: `precisa de ${need} ou mais`, passText: 'Fechou a curva', failText: 'Escorregou' },
        (roll) => roll + (agent.agilidade ?? 0) >= CHASE_RULES.curveDC,
        800,
      );
      agentRoll = r?.roll ?? 0;
    }
    const eAgi = enemy.agilidade ?? 0;
    const er = await this.rollD20(
      { kicker: 'Curva · agilidade', who: enemy.name, need: `precisa de ${CHASE_RULES.curveDC - eAgi} ou mais`, passText: 'Passou', failText: 'Escorregou' },
      (roll) => roll + eAgi >= CHASE_RULES.curveDC,
      800,
    );
    const res = resolveCurve({ side, swiped, agentRoll, agent, enemyRoll: er?.roll ?? 20, enemy: { agilidade: eAgi } });
    this.say(res.delta < 0 ? `Encostando: ${signed(res.delta)} de distância` : res.delta > 0 ? `Ele abriu: ${signed(res.delta)}` : 'Distância igual', 'info');
    return res.delta;
  }

  /** Espera o deslize da curva (← ou →) por `swipeSeconds`; `null` se não veio a tempo. */
  private askCurve(): Promise<Side | null> {
    return new Promise((done) => {
      const id = ++this.curveSeq;
      this.curveDone = done;
      this.curvePrompt.set({ id, seconds: CHASE_RULES.swipeSeconds });
      this.sound.play('abo.modo');
      // tempo real (não o reduzido do "menos movimento"): é o prazo do jogador
      this.timers.push(setTimeout(() => this.curveId() === id && this.swipeCurve(null), CHASE_RULES.swipeSeconds * 1000));
    });
  }

  private curveId(): number | undefined {
    return this.curvePrompt()?.id;
  }

  /** Deslize da curva: toque, teclado ou controle. */
  protected swipeCurve(side: Side | null): void {
    const done = this.curveDone;
    if (!done) return;
    this.curveDone = undefined;
    this.curvePrompt.set(null);
    if (side) this.sound.play('ui.hex');
    done(side);
  }

  /**
   * Porta fechada na rota: o garimpeiro rola d4 (1–2 abre, 3–4 arromba) e d20. Falhou: perde
   * tempo (−1) e tenta de novo. Passou: a porta fica aberta (ou arrombada). Devolve a distância.
   */
  private async chaseDoor(door: Door, enemyId: string, distance: number, onDistance: (d: number) => void): Promise<number> {
    const name = this.enemy(enemyId)!.name;
    const current = this.doors().get(hexKey(door.hex)) ?? door;
    // a porta é dele: a cena fica lenta só para mostrar os dados
    this.sound.chaseSlow(true);
    try {
      return await this.fleeDoorTries(current, door, name, distance, onDistance);
    } finally {
      this.sound.chaseSlow(false);
    }
  }

  /** As tentativas dele na porta, até passar (ou ela o alcançar). Devolve a distância. */
  private async fleeDoorTries(
    current: Door,
    door: Door,
    name: string,
    distance: number,
    onDistance: (d: number) => void,
  ): Promise<number> {
    const board = this.board!;
    for (;;) {
      const d4 = rollDie(CHASE_RULES.doorChoiceDie);
      const action = fleeDoorAction(d4);
      this.sound.play('dado.2d4');
      this.say(`${name} tenta ${action === 'abrir' ? 'abrir' : 'arrombar'} a porta (d4: ${d4})`, 'info');
      await this.wait(800);
      const need = fleeDoorNeed(action, current);
      const r = await this.rollD20(
        { kicker: action === 'abrir' ? 'Abrir' : 'Arrombar', who: name, need: `precisa de ${need} ou mais`, passText: action === 'abrir' ? 'Abriu' : 'Arrombou', failText: 'Travou' },
        (roll) => roll >= need,
        800,
      );
      if (!r) return distance;
      const res = resolveFleeDoor(current, d4, r.roll);
      if (res.pass) {
        this.sound.play(action === 'abrir' ? (current.state === 'trancada' ? 'porta.destrancou' : 'porta.abrir') : 'porta.chute-ok', { at: door.hex });
        this.doors.update((m) => new Map(m).set(hexKey(door.hex), res.door));
        board.setDoors(this.doors());
        return distance;
      }
      this.sound.play(action === 'abrir' ? 'porta.trancada' : 'porta.chute-falha', { at: door.hex });
      distance += res.delta;
      onDistance(distance);
      if (distance <= 0) return distance;
      current = res.door;
    }
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
    const who = spotted(enemy, agents, this.area, this.walls(), this.lowCover);
    if (!who) return false;
    const agent = agents.get(who)!;
    // vira para quem viu
    this.updateEnemy(enemyId, { status: 'alert', facing: facingBetween(enemy.hex, agent) });
    this.board?.setEnemyFacing(enemyId, facingBetween(enemy.hex, agent));
    this.board?.setEnemyAlert(enemyId, true);
    this.refreshVision();
    this.gamepad.rumble(0.7, 0.4, 260);
    this.sound.spotted();
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
    // porta fechada: colado nela, abre o menu; de longe, avisa
    const door = hex && this.doors().get(hexKey(hex));
    if (door && !isOpen(door)) {
      if (this.viewingOther()) this.focusCharacter(this.active().id);
      if (this.nearDoors().includes(door)) this.openDoorMenu(door);
      else this.say('Chegue colado na porta para interagir com ela', 'info');
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
      this.sound.play('ui.hex');
      this.sound.play('ui.caminho', { delay: 0.06 });
    } else {
      if (hex) this.sound.play('ui.invalido');
      this.selected.set(null);
    }
    this.board?.setSelected(this.selected(), this.selectedPath());
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
    this.positions.update((m) => {
      const next = new Map(m);
      for (const [who, p] of paths) if (p.length) next.set(who, p.at(-1)!);
      return next;
    });
    return true;
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
    const cost = rallyCost(plan.cost, this.roster.classOf(id), this.commandsUsed());
    if (!(await this.walkUnits(id, plan.paths))) return;
    this.sound.play('eq.agrupar');
    this.group.set(wholeTeam());
    if (free) this.commandsUsed.update((n) => n + 1);
    this.movesLeft.update((n) => Math.max(0, n - cost));
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
    this.group.set(new Set());
    this.sound.play('eq.desagrupar');
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
        if (!needsNoticeRoll(item, who, path, this.noticed(), this.noticeRolled)) continue;
        this.noticeRolled.add(`${item.id}:${who}`);
        this.phase.set('checking');
        const pass = await this.rollCheck('notice', who, SEARCH_RULES.notice);
        if (pass === null) return false;
        if (!pass) continue;
        this.noticed.update((s) => new Set([...s, item.id]));
        this.board?.setClue(item.spot);
        this.board?.keepInView(item.spot);
        this.say(`${this.nameOf(who)} reparou em algo na ${item.furniture}!`, 'info');
        this.sound.play('eq.percebeu');
      }
    }
    return true;
  }

  /** Toque na lupa: abre a inspeção (ou, já nela, rola o d20); senão, diz o que falta. */
  protected tapClue(): void {
    if (this.aiming()) {
      if (this.search()?.pass === false) this.retryInspect();
      else if (!this.search()) void this.inspect();
      return;
    }
    if (this.phase() !== 'moving-choice' || this.approaching() || this.burning() || this.grouping()) return;
    const item = this.inspectable();
    if (item) {
      if (this.movesLeft() < SEARCH_RULES.inspectCost) this.say(`Sem movimento para inspecionar a ${item.furniture} agora`, 'info');
      else this.startInspect();
      return;
    }
    const spot = (this.map?.hidden ?? []).find((h) => this.noticed().has(h.id) && !this.found().has(h.id));
    if (spot) this.say(`Chegue colado na ${spot.furniture} para inspecionar`, 'info');
  }

  /**
   * Abre a inspeção do móvel percebido: a câmera gira para trás do agente da vez (mesma
   * inclinação do jogo), com o móvel em foco, e fica travada. A HUD some; sobram
   * **Inspecionar!** (rola o d20) e **Cancelar** (volta ao normal sem gastar nada).
   */
  protected startInspect(): void {
    const item = this.inspectable();
    if (this.phase() !== 'moving-choice' || !item || this.movesLeft() < SEARCH_RULES.inspectCost) return;
    this.focusCharacter(this.active().id);
    this.closeBurn();
    this.closeGrouping();
    this.selected.set(null);
    this.board?.setSelected(null);
    this.board?.setReachable([]);
    this.board?.setInputEnabled(false);
    this.board?.closeUp(this.active().id, item.spot);
    this.aiming.set(item);
  }

  /** **Inspecionar** (botão de teclado, □): abre a inspeção; já nela, rola o d20. */
  protected inspect(): Promise<void> {
    if (!this.aiming()) {
      this.startInspect();
      return Promise.resolve();
    }
    return this.rollInspect();
  }

  /** **De novo!** depois de uma falha: rola outra vez (gasta mais 1 de movimento). */
  protected retryInspect(): void {
    if (this.search()?.pass !== false || this.movesLeft() < SEARCH_RULES.inspectCost) return;
    void this.rollInspect();
  }

  /**
   * Rola o d20 da inspeção: gasta 1 de movimento a cada rolagem, o dado gira no meio da cena
   * e para no resultado. Se achar, a arma é apreendida; se falhar, o d20 fica com o resultado
   * e dá para tentar de novo (enquanto houver movimento) ou fechar.
   */
  private async rollInspect(): Promise<void> {
    const item = this.aiming();
    const id = this.active().id;
    if (!item || this.search()?.result === null || this.movesLeft() < SEARCH_RULES.inspectCost) return;
    const epoch = this.epoch;
    this.phase.set('checking');
    this.movesLeft.update((n) => n - SEARCH_RULES.inspectCost);
    // o `app-d20` da cena rola sozinho e avisa o resultado quando para
    const rolled = new Promise<number>((done) => (this.searchRolled = done));
    this.search.set({
      who: this.nameOf(id),
      furniture: item.furniture,
      target: SEARCH_RULES.find,
      result: null,
      pass: null,
      seized: item.seized,
      throw: ++this.searchThrows,
    });
    const motion = !reducedMotion();
    if (motion) this.haptics.vibrate(ROLL_PATTERN);
    this.sound.play('eq.vasculhar');
    this.sound.play('dado.d20', { delay: 0.3 });
    const result = await rolled;
    if (this.destroyed || this.epoch !== epoch) return;
    const pass = beats(result, SEARCH_RULES.find);
    this.checkSound(result, pass);
    this.search.update((v) => v && { ...v, result, pass });
    this.haptics.vibrate(SETTLE_PATTERN);
    this.gamepad.rumble(pass ? 0.8 : 0.3, pass ? 0.5 : 0.2, pass ? 260 : 120);
    if (pass) {
      this.found.update((s) => new Set([...s, item.id]));
      this.board?.setClue(null);
    } else {
      this.searchFails.update((m) => new Map(m).set(item.id, (m.get(item.id) ?? 0) + 1));
    }
  }

  /** **Cancelar** antes de rolar: a câmera volta ao normal e nada é gasto. */
  protected cancelInspect(): void {
    if (!this.aiming() || this.search()) return;
    this.aiming.set(null);
    this.board?.endCloseUp();
    this.board?.setInputEnabled(true);
    if (this.phase() === 'moving-choice') this.refreshBoard();
  }

  /** **Fechar** (depois de rolar): a câmera volta e a vez segue. */
  protected closeSearch(): void {
    const sv = this.search();
    const item = this.aiming();
    if (!sv || sv.result === null || !item) return;
    this.search.set(null);
    this.aiming.set(null);
    this.board?.endCloseUp();
    this.board?.setInputEnabled(true);
    if (sv.pass) {
      this.say(`${sv.who} achou a ${item.name} na ${item.furniture}. ${item.seized}`, 'alert');
    } else {
      this.say(
        this.movesLeft() >= SEARCH_RULES.inspectCost
          ? `Nada na ${item.furniture}… Toque na lupa para tentar de novo (1 de movimento).`
          : `Nada na ${item.furniture}… Sem movimento para tentar de novo agora.`,
        'info',
      );
    }
    this.afterMove();
  }

  /** O d20 da inspeção parou. */
  protected searchDieRolled(value: number): void {
    const done = this.searchRolled;
    this.searchRolled = undefined;
    done?.(value);
  }

  /** Recomeço ou saída no meio da inspeção: some com a vista sem seguir a vez. */
  private dropSearch(): void {
    this.searchRolled = undefined;
    this.search.set(null);
    this.aiming.set(null);
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
    view: Pick<CheckView, 'kicker' | 'who' | 'need' | 'passText' | 'failText'>,
    passes: (roll: number) => boolean,
    autoMs?: number,
  ): Promise<{ roll: number; pass: boolean } | null> {
    const epoch = this.epoch;
    const rolled = new Promise<number>((done) => (this.checkRolled = done));
    this.check.set({ id: ++this.checkSeq, ...view, result: null, pass: null });
    if (!reducedMotion()) this.haptics.vibrate(ROLL_PATTERN);
    this.sound.play('dado.d20', { delay: 0.2 });
    const result = await rolled;
    if (this.destroyed || this.epoch !== epoch) return null;
    const pass = passes(result);
    this.checkSound(result, pass);
    this.check.update((c) => c && { ...c, result, pass });
    this.haptics.vibrate(SETTLE_PATTERN);
    this.gamepad.rumble(0.3, 0.2, 120);
    if (autoMs !== undefined) {
      await this.wait(autoMs);
      if (this.destroyed || this.epoch !== epoch) return null;
      this.check.set(null);
      return { roll: result, pass };
    }
    // um instante para o carimbo aparecer antes do botão (evita fechar sem querer)
    await this.wait(450);
    if (this.destroyed || this.epoch !== epoch) return null;
    const closed = new Promise<void>((done) => (this.checkDone = done));
    this.check.update((c) => c && { ...c, waiting: true });
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
    const roll = rollDie(DOOR_RULES.die);
    const out = resolveDoor(action, door, roll, gazua);
    this.doorBusy.set(true);
    this.movesLeft.update((n) => n - out.cost);
    const settle = (mode: 'swing' | 'slam') => {
      this.doors.update((m) => new Map(m).set(hexKey(door.hex), applyDoor(door, out)));
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
        await board.stepToDoor(id, door.hex, 1.05);
        if (stale()) return;
        const reveal = out.rolled
          ? this.startDoorCheck('Arrombar', this.nameOf(id), this.needText(need!), 'Arrombou!', door.state === 'bloqueada' ? 'Não cedeu' : 'Aguentou', roll, 950)
          : null;
        if (reveal) await this.wait(500);
        await board.kick(id, () => {
          if (stale()) return;
          reveal?.(roll, out.pass);
          this.sound.play(out.pass ? 'porta.chute-ok' : 'porta.chute-falha');
          if (out.pass) settle('slam');
          else board.pushDoor(door.hex, id, 'rattle');
          this.gamepad.rumble(out.pass ? 1 : 0.6, 0.5, 220);
          this.haptics.vibrate(SETTLE_PATTERN);
        });
        if (stale()) return;
        if (out.reaction) this.reactToBreakIn(door.hex, id);
        if (out.opened) {
          await this.wait(400);
          if (!(await this.breakIn(door.hex, id, stale))) return;
        }
        await this.wait(400);
      }
      if (stale()) return;
      await board.stepBack(id);
    } finally {
      if (!stale()) this.doorBusy.set(false);
    }
  }

  /**
   * Põe a ficha do d20 da porta na tela: o dado 3D cai já em `value` (o resultado sorteado) e
   * leva `duration` ms para parar, a mesma hora em que a ação resolve (no chute, o impacto).
   * A função devolvida pinta o dado de verde ou vermelho e carimba.
   */
  private startDoorCheck(
    kicker: string,
    who: string,
    need: string,
    passText: string,
    failText: string,
    value: number,
    duration: number,
  ): (result: number, pass: boolean) => void {
    clearTimeout(this.doorCheckTimer);
    this.checkRolled = undefined;
    this.check.set({ id: ++this.checkSeq, kicker, who, need, passText, failText, value, duration, result: null, pass: null });
    if (!reducedMotion()) this.haptics.vibrate(ROLL_PATTERN);
    this.sound.play('dado.d20', { delay: 0.1 });
    return (result, pass) => {
      this.check.update((c) => c && { ...c, result, pass });
      this.checkSound(result, pass);
      this.haptics.vibrate(SETTLE_PATTERN);
      this.doorCheckTimer = setTimeout(() => this.check.update((c) => (c?.waiting ? c : null)), 3200);
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
    this.breakInUntil.set(this.round() + BREAK_IN_RULES.rounds);
    const rect = map.structures?.find((st) => inStructure(doorHex, st.rect))?.rect;
    const agent = this.positions().get(agentId);
    const rolls: BreakInRoll[] =
      rect && agent
        ? resolveBreakIn(
            doorHex,
            roomBehind(doorHex, agent, rect, new Set([...map.walls.map(hexKey), ...this.closedDoors()])),
            this.enemies(),
            () => rollDie(DOOR_RULES.die),
          )
        : [];
    for (const r of rolls) {
      const e = r.enemy;
      const resist = r.test === 'resist';
      const reveal = this.startDoorCheck(
        resist ? 'Resistir à rendição' : 'Atitude para correr',
        e.name,
        resist ? `resiste com ${r.need} ou mais` : `corre com mais que ${r.need}`,
        resist ? 'Rendido!' : 'Ficou parado',
        resist ? 'Resistiu: vai correr' : 'Vai correr',
        r.roll,
        1000,
      );
      board.focusHex(e.hex);
      await this.wait(1000);
      if (stale()) return false;
      reveal(r.roll, r.outcome !== 'flee');
      const facing = facingBetween(e.hex, doorHex);
      board.setEnemyFacing(e.id, facing);
      board.startleEnemy(e.id);
      if (r.outcome === 'surrender') {
        if (!rolls.slice(0, rolls.indexOf(r)).some((o) => o.outcome === 'surrender')) this.sound.play('ini.rende', { at: e.hex });
        this.updateEnemy(e.id, { status: 'surrendered', facing });
        board.setEnemySurrendered(e.id, true);
      } else if (r.outcome === 'flee') {
        this.updateEnemy(e.id, { status: 'alert', facing });
        board.setEnemyAlert(e.id, true);
      } else this.updateEnemy(e.id, { facing });
      this.refreshVision();
      await this.wait(1100);
      if (stale()) return false;
    }
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

  /** Fecha a ficha do d20 (**Continuar** ou ✕) e deixa o jogo seguir. */
  protected closeCheck(): void {
    if (!this.check()?.waiting) return;
    this.check.set(null);
    const done = this.checkDone;
    this.checkDone = undefined;
    done?.();
  }

  /** O d20 da ficha parou. */
  protected checkDieRolled(value: number): void {
    const done = this.checkRolled;
    this.checkRolled = undefined;
    done?.(value);
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
  protected async startInterrogation(): Promise<void> {
    const e = this.talkTarget()?.enemy;
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
    if (cost) this.movesLeft.update((n) => Math.max(0, n - cost));
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
    // entregou um esconderijo: conta como percebido (sem rolar percepção; a lupa aparece)
    const noticed = noticedAfter(this.noticed(), out);
    if (noticed !== this.noticed()) {
      this.noticed.set(noticed);
      const item = this.map?.hidden?.find((h) => h.id === out.notices);
      if (item && !this.found().has(item.id)) this.board?.setClue(item.spot);
    }
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
    this.sound.play('abo.modo');
    const zones = this.paintApproachZones();
    // só ficam em cor quem está na vez, os suspeitos no raio e o próprio raio
    const { surrender, roll, flee } = this.approachPlan();
    const from = this.positions().get(this.active().id)!;
    const targets = this.missionTargets();
    const alvo = (id: string) => (targets.has(id) ? ' · alvo!' : '');
    this.board?.frameHexes([from, ...[...surrender, ...roll.map((c) => c.enemy), ...flee].map((e) => e.hex)]);
    this.board?.setSpotlight({
      units: [this.active().id],
      labels: [
        ...surrender.map((e) => ({ id: e.id, text: `${e.name} · se rende`, tone: 'surrender' as const })),
        ...roll.map((c) => ({
          id: c.enemy.id,
          text: `${c.enemy.name} · ${this.percent(c.chance)} de escapar${alvo(c.enemy.id)}`,
          tone: 'roll' as const,
        })),
        ...flee.map((e) => ({ id: e.id, text: `${e.name} · vai correr${alvo(e.id)}`, tone: 'flee' as const })),
      ],
      hexes: zones ? [...zones.surrender, ...zones.roll, ...zones.flee] : [],
    });
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
    const rolls = new Map(rolled.map((r) => [r.enemy.id, r]));
    const surrender = [...plan.surrender, ...rolled.filter((r) => !r.passed).map((r) => r.enemy)];
    const flee = [...rolled.filter((r) => r.passed).map((r) => r.enemy), ...plan.flee];
    this.approaching.set(false);
    this.board?.setSpotlight(null);
    this.paintApproachZones();
    this.phase.set('ending');
    const motion = !reducedMotion();
    for (const e of surrender) this.updateEnemy(e.id, { status: 'surrendered', facing: facingBetween(e.hex, from) });
    for (const e of flee) this.updateEnemy(e.id, { status: 'alert', facing: facingBetween(e.hex, from) });
    // voz de prisão: quem abordou rola primeiro na perseguição; os reforços vêm do raio de movimento dele
    const movement = turnMovement(this.rolled(), this.roster.loadout(this.active().id), this.grouped(), this.led());
    for (const e of flee) this.arrests.set(e.id, { agentId: this.active().id, movement });
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
      // o auto fica na tela até o jogador fechar (com as rolagens de quem tentou escapar)
      this.report.set({ agent: this.active().name, surrender, flee, rolls });
    });
  }

  /** Fecha o auto de abordagem (**Fechar**, ✕ ou toque) e passa a vez. */
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
    this.planeBurn.set(false);
  }

  /** Confirma: o alvo pega fogo, quem vigia perto entra em alerta e a vez do agente acaba. */
  protected confirmBurn(): void {
    const target = this.burnable();
    if (!this.burning() || !target || this.phase() !== 'moving-choice') return;
    const witnesses = this.burnWitnesses();
    this.closeBurn();
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
    this.later(reducedMotion() ? 400 : 2000, () => this.endTurn());
  }

  // ---------- avião trancado e quadro de chaves ----------

  /** Alguém já tentou olhar dentro do avião (sabe que aquela chave é a dele). */
  private readonly planeTried = signal(false);
  /** A equipe pegou a chave. */
  protected readonly hasKey = signal(false);
  /** Quem viu a chave no quadro e deixou lá. */
  private readonly keySeenBy = signal<readonly string[]>([]);
  /** Quem já mexeu no quadro rolando percepção (uma vez por agente). */
  private readonly keyRolled = new Set<string>();
  /** O agente da vez viu a chave e escolhe entre pegar e deixar. */
  protected readonly keyPrompt = signal(false);
  /** Linha do que se vê no menu do avião ("O avião está trancado."). */
  protected readonly planeNote = signal<string | null>(null);
  /** Fala embaixo da tela, com o avatar de quem fala. */
  protected readonly speech = signal<{ who: Character; text: string } | null>(null);
  private speechTimer?: ReturnType<typeof setTimeout>;

  /** O que a equipe sabe do avião e da chave (a regra está em `plane.ts`). */
  private readonly planeState = computed<PlaneState>(() => ({
    tried: this.planeTried(),
    hasKey: this.hasKey(),
    // o piloto contou onde está a chave: `notices` põe o quadro entre os percebidos
    told: this.noticed().has(KEY_PANEL_ID),
    seenBy: this.keySeenBy(),
  }));

  /** Avião ainda inteiro, colado no agente da vez (abre o menu de inspecionar). */
  protected readonly nearPlane = computed<Burnable | null>(() => {
    if (this.phase() !== 'moving-choice' || this.viewingOther()) return null;
    const from = this.positions().get(this.active().id);
    if (!from) return null;
    return (this.map?.burnables ?? []).find((t) => t.inspect && !this.burned().has(t.id) && canBurn(from, t)) ?? null;
  });
  /** Hexágonos da aura dos queimáveis ainda inteiros (a coroa em volta deles) e os em que o agente da vez está. */
  private readonly actionAuraKeys = computed(() => {
    const planes = (this.map?.burnables ?? []).filter((t) => !this.burned().has(t.id));
    const own = new Set(planes.flatMap((t) => t.hexes.map(hexKey)));
    const ring = new Set<string>();
    for (const t of planes)
      for (const h of t.hexes)
        for (const n of hexNeighbors(h)) {
          const k = hexKey(n);
          if (!own.has(k) && this.area.has(n) && !this.solid().has(k)) ring.add(k);
        }
    const here = this.positions().get(this.active().id);
    return { ring: [...ring], hot: here && ring.has(hexKey(here)) ? [hexKey(here)] : [] };
  });
  /** A equipe já vê a chave no quadro: dá para pegar sem rolar percepção. */
  protected readonly keySeen = computed(() => keyKnown(this.planeState()));
  /** Quadro de chaves colado no agente da vez (a chave ainda está lá). */
  protected readonly nearPanel = computed(() => {
    const panel = this.map?.keyPanel;
    if (!panel || this.hasKey() || this.phase() !== 'moving-choice' || this.viewingOther()) return null;
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

  /** Abre o menu de inspecionar do avião (olhar dentro / queimar), como o da porta. */
  protected openPlaneMenu(): void {
    const plane = this.nearPlane();
    if (!plane || this.phase() !== 'moving-choice' || !this.board) return;
    this.closeApproach();
    this.closeGrouping();
    this.closeBurn();
    this.keyPrompt.set(false);
    this.focusCharacter(this.active().id);
    this.selected.set(null);
    this.board.setSelected(null);
    this.board.setReachable([]);
    this.planeNote.set(null);
    this.phase.set('plane');
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
      this.planeNote.set('Destrancado com a chave. Dentro: galões e caixas lacradas de combustível para o garimpo.');
      this.sound.play('porta.destrancou');
      return;
    }
    this.planeTried.set(true);
    this.sound.play('eq.aviao-trancado');
    this.clueLog.update((c) => new Set([...c, PLANE_LOCKED]));
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

  /**
   * Mexer no quadro de chaves: rola percepção (uma vez por agente), a não ser que a equipe já
   * reconheça a chave do avião (alguém tentou o avião ou o piloto contou). Vendo a chave, o
   * agente escolhe pegar ou deixar.
   */
  protected async touchKeyPanel(): Promise<void> {
    const panel = this.nearPanel();
    if (!panel || this.phase() !== 'moving-choice' || this.keyPrompt()) return;
    const who = this.active().id;
    const state = this.planeState();
    let pass = false;
    if (needsKeyRoll(state, who, this.keyRolled)) {
      this.keyRolled.add(who);
      this.phase.set('checking');
      const rolled = await this.rollCheck('notice', who, SEARCH_RULES.notice);
      if (rolled === null) return;
      pass = rolled;
      this.phase.set('moving-choice');
      this.refreshBoard();
    } else if (!seesKey(state, false)) {
      this.say(`${this.nameOf(who)} já olhou o quadro: só chaves de cadeado e gaveta`, 'info');
      return;
    }
    if (!seesKey(state, pass)) {
      this.say(`${this.nameOf(who)} não viu nada de interessante no quadro de chaves`, 'info');
      return;
    }
    if (pass) this.sound.play('eq.percebeu');
    this.keyPrompt.set(true);
  }

  /** Pega a chave do avião: as perguntas sobre ela somem. */
  protected takeKey(): void {
    if (!this.keyPrompt()) return;
    this.keyPrompt.set(false);
    this.hasKey.set(true);
    this.sound.play('eq.chave');
    this.keySeenBy.set([]);
    this.clueLog.update((c) => new Set([...c, KEY_TAKEN]));
    this.closeSpeech();
    this.say(`${this.active().name} pegou a chave do avião`, 'info');
  }

  /** Deixa a chave lá: o agente lembra que viu (ver `witness`). */
  protected leaveKey(): void {
    if (!this.keyPrompt()) return;
    this.keyPrompt.set(false);
    this.keySeenBy.update((l) => leftKey({ ...this.planeState(), seenBy: l }, this.active().id).seenBy);
    this.say(`${this.active().name} deixou a chave no quadro`, 'info');
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
    this.epoch++;
    this.clearTimers();
    this.report.set(null);
    this.positions.set(this.initialPositions());
    this.group.set(wholeTeam());
    this.closeGrouping();
    this.board?.placeUnits(this.positions());
    this.enemies.set(this.initialEnemies());
    this.arrests.clear();
    this.noticed.set(new Set());
    this.found.set(new Set());
    this.searchFails.set(new Map());
    this.noticeRolled.clear();
    this.checkRolled = undefined;
    this.checkDone = undefined;
    this.check.set(null);
    this.dropSearch();
    this.dropInterrogation();
    this.dialogues.set(new Map());
    this.clueLog.set(new Set());
    this.planeTried.set(false);
    this.hasKey.set(false);
    this.keySeenBy.set([]);
    this.keyRolled.clear();
    this.keyPrompt.set(false);
    this.planeNote.set(null);
    this.planeBurn.set(false);
    this.closeSpeech();
    this.linePools.set(new Map());
    this.fieldNotes.set([]);
    this.board?.setClue(null);
    this.doorKey.set(null);
    this.doorBusy.set(false);
    this.breakInUntil.set(0);
    clearTimeout(this.doorCheckTimer);
    this.board?.releaseDoorFocus();
    this.doors.set(this.initialDoors());
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
    if (this.curvePrompt()) return;
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
      const act: Partial<Record<PadButton, DoorAction>> = { cross: 'arrombar', square: 'pick', triangle: 'abrir' };
      const option = this.doorOptions().find((o) => o.action === act[b]);
      if (b === 'circle') this.closeDoorMenu();
      else if (option && !option.disabled) void this.doorAction(option.action);
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
        if (this.keyPrompt()) this.takeKey();
        else if (this.search()?.pass === false && this.movesLeft() >= SEARCH_RULES.inspectCost) this.retryInspect();
        else if (this.search()) this.closeSearch();
        else if (this.check()?.waiting) this.closeCheck();
        else if (this.aiming()) void this.inspect();
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
        if (this.keyPrompt()) this.leaveKey();
        else if (this.search()) this.closeSearch();
        else if (this.aiming()) this.cancelInspect();
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
        if (this.search()?.pass === false) this.retryInspect();
        else if (this.aiming()) { if (!this.search()) void this.inspect(); }
        else if (this.approaching()) this.cancelApproach();
        else if (this.burning()) this.cancelBurn();
        else if (this.grouping()) break;
        else if (this.canApproach()) this.startApproach();
        else if (this.burnable()) this.startBurn();
        else if (this.nearPlane()) this.openPlaneMenu();
        else if (this.nearPanel()) void this.touchKeyPanel();
        else if (this.inspectable()) this.startInspect();
        else if (this.canTalk()) void this.startInterrogation();
        else if (this.nearDoor()) this.openDoorMenu();
        break;
      case 'l3':
        this.openDebrief();
        break;
      case 'share':
        if (this.aiming()) break;
        // Share: agrupa (ou desagrupa) a equipe
        if (this.grouping()) this.cancelGrouping();
        else if (this.group().size) this.ungroup();
        else this.startGrouping();
        break;
      case 'triangle':
        if (choosing && !this.approaching() && !this.burning() && !this.aiming()) this.endTurn();
        break;
      case 'l1':
      case 'r1': {
        if (this.phase() === 'enemy' || this.aiming() || this.search()) break;
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
    // escolha de alvo: esquerda/direita olham (e, de novo, confirmam)
    if (this.targetPrompt()) {
      if (Math.abs(dir.x) > Math.abs(dir.y)) this.targetSide(dir.x < 0 ? 'esquerda' : 'direita', false);
      return;
    }
    // curva da perseguição: esquerda/direita deslizam
    if (this.curvePrompt()) {
      if (Math.abs(dir.x) > Math.abs(dir.y)) this.swipeCurve(dir.x < 0 ? 'esquerda' : 'direita');
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
    if (!map || !this.board || this.phase() === 'enemy' || this.phase() === 'door' || this.phase() === 'plane' || this.approaching() || this.burning() || this.aiming() || this.debrief()) return;
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

  private updateEnemy(id: string, patch: Partial<EnemyState>): void {
    this.enemies.update((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  /** Paredes, carga e inimigos no tabuleiro: o que bloqueia os agentes (sem contar os outros agentes). */
  private enemyWalls(): Set<string> {
    return new Set([...this.solid(), ...this.onBoardEnemies().map((e) => hexKey(e.hex))]);
  }

  /** Hexágonos que um inimigo não pode atravessar: paredes, agentes e os outros inimigos. */
  private blockedFor(enemyId: string): Set<string> {
    return new Set([
      ...this.solid(),
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
