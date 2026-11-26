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
import { AgentViewer } from '../../game/agent-viewer';
import { PadButton, Stick, glyphFor } from '../../game/gamepad';
import { GamepadService } from '../../game/gamepad.service';
import { CHARACTERS, Character, findMap } from '../../game/maps';
import {
  AGENT_CLASSES,
  AgentClass,
  CLASS_INFO,
  CLASS_RULES,
  classAbilities,
  classBaseStats,
  classOf,
  classSkills,
} from '../../game/agent-class';
import { RosterService } from '../../game/roster.service';
import { SaveGames } from '../../game/save-game';
import {
  GROUP_STAT_BONUS,
  STAT_KEYS,
  STAT_RULES,
  StatKey,
  Stats,
  addPoint,
  canAddPoint,
  canRemovePoint,
  freePoints,
  removePoint,
  rulerCells,
  signed,
} from '../../game/stats';

/** Textos de cada atributo na ficha. */
const STAT_TEXT: Record<
  StatKey,
  { name: string; aria: string; on: string; off: string; field: string }
> = {
  vigor: {
    name: 'Vigor',
    aria: 'vigor',
    on: 'de movimento',
    off: 'Movimento sem modificador',
    field: 'Movimento',
  },
  intimidacao: {
    name: 'Intimidação',
    aria: 'intimidação',
    on: 'de alcance na abordagem',
    off: 'Abordagem sem modificador',
    field: 'Abordagem',
  },
  iniciativa: {
    name: 'Iniciativa',
    aria: 'iniciativa',
    on: 'para arrancar',
    off: 'Arrancada sem modificador',
    field: 'Arrancada',
  },
  agilidade: {
    name: 'Agilidade',
    aria: 'agilidade',
    on: 'no pulo',
    off: 'Pulo sem modificador',
    field: 'Pulo',
  },
};

/**
 * Escalação: a ficha de cada agente, entre escolher o mapa e começar a partida. O jogador
 * escolhe a classe (um Capitão na equipe, os demais Agentes), distribui o ponto de cada agente
 * (vigor ou intimidação), vê o modelo 3D e confirma.
 * Uma tela só: larga vira o layout "web" (abas na lateral), estreita vira o de celular.
 */
@Component({
  selector: 'app-roster-screen',
  templateUrl: './roster-screen.html',
  styleUrl: './roster-screen.css',
})
export class RosterScreen implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly roster = inject(RosterService);
  private readonly saves = inject(SaveGames);
  private readonly gamepad = inject(GamepadService);
  private readonly mapId = inject(ActivatedRoute).snapshot.paramMap.get('mapId') ?? '';
  protected readonly map = findMap(this.mapId);
  protected readonly agents = CHARACTERS;
  protected readonly pad = this.gamepad.pad;
  protected readonly signed = signed;
  protected readonly scale = STAT_RULES;
  protected readonly slotsLeft = ['Cabeça', 'Tronco', 'Mãos'];
  protected readonly slotsRight = ['Arma', 'Costas', 'Pés'];
  protected readonly rulerLabels = rulerCells(0, 0).map((c) => signed(c.unit));

  protected readonly cur = signal(0);
  /** Pontos distribuídos por agente (começa com a última escalação confirmada). */
  protected readonly points = signal<Record<string, Stats>>(
    Object.fromEntries(CHARACTERS.map((c) => [c.id, this.roster.spent(c.id)])),
  );
  /** Capitão da equipe (começa com o da última escalação confirmada). */
  protected readonly captain = signal<string | null>(this.roster.captain());
  protected readonly classInfo = CLASS_INFO;
  /** Atributo destacado pelo controle (cima/baixo escolhe, esquerda/direita tira/põe). */
  protected readonly padStat = signal(0);

  protected readonly agent = computed<Character>(() => CHARACTERS[this.cur()]);
  private readonly spent = computed(() => this.points()[this.agent().id]);
  protected readonly free = computed(() => freePoints(this.spent()));
  protected readonly last = computed(() => this.cur() === CHARACTERS.length - 1);

  protected readonly tabs = computed(() =>
    CHARACTERS.map((c, i) => {
      const done = freePoints(this.points()[c.id]) <= 0;
      return { c, i, done, selected: i === this.cur(), captain: c.id === this.captain() };
    }),
  );

  /** Classe do agente da ficha. */
  protected readonly cls = computed<AgentClass>(() => classOf(this.agent().id, this.captain()));
  /** Opções de classe: o Capitão atual não vira Agente por aqui (marque outro como Capitão). */
  protected readonly classes = computed(() => {
    const cls = this.cls();
    const captain = this.captain();
    const holder = CHARACTERS.find((c) => c.id === captain);
    return AGENT_CLASSES.map((key) => ({
      key,
      ...CLASS_INFO[key],
      selected: key === cls,
      disabled: key === 'agente' && cls === 'capitao',
      hint:
        key === 'capitao' && cls !== 'capitao' && holder
          ? `${holder.name} volta a ser Agente`
          : key === 'agente' && cls === 'capitao'
            ? 'Marque outro agente como Capitão'
            : '',
    }));
  });
  /** O que a classe dá: habilidades (regras) e perícias (bônus na rolagem). */
  protected readonly perks = computed(() => {
    const cls = this.cls();
    return [
      ...classAbilities(cls).map(({ key, ability }) => ({
        key,
        kind: 'hab' as const,
        name: ability.name,
        value: '',
        text: ability.summary,
      })),
      ...classSkills(cls).map(({ key, skill, bonus }) => ({
        key,
        kind: 'per' as const,
        name: skill.name,
        value: signed(bonus),
        text: skill.action,
      })),
    ];
  });

  protected readonly stats = computed(() => {
    const spent = this.spent();
    const free = this.free();
    const base = classBaseStats(this.cls());
    return STAT_KEYS.map((key) => {
      const v = base[key] + spent[key];
      const t = STAT_TEXT[key];
      const fromClass = base[key] ? ` (${signed(base[key])} da classe)` : '';
      return {
        key,
        ...t,
        value: v,
        effect: (v ? `${signed(v)} ${t.on}` : t.off) + fromClass,
        cells: rulerCells(v, free),
        canInc: canAddPoint(spent, key, base),
        canDec: canRemovePoint(spent, key),
        group: GROUP_STAT_BONUS[key],
        leader: this.captain() ? CLASS_RULES.leadership[key] : 0,
      };
    });
  });

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private viewer?: AgentViewer;
  protected readonly viewerFailed = signal(false);
  protected readonly loadingModel = signal(false);

  private readonly stopPad = this.gamepad.listen({
    move: (dir) => this.padMove(dir),
    button: (b) => this.padButton(b),
  });

  constructor() {
    // troca de agente: o palco mostra o modelo dele
    effect(() => {
      const model = this.agent().model;
      if (!this.viewer || !model) return;
      this.loadingModel.set(true);
      this.viewer
        .show(model)
        .catch(() => this.viewerFailed.set(true))
        .finally(() => this.loadingModel.set(false));
    });
  }

  ngAfterViewInit(): void {
    const host = this.stage()?.nativeElement;
    if (!host) return;
    try {
      this.viewer = new AgentViewer(host);
      const model = this.agent().model;
      if (model) {
        this.loadingModel.set(true);
        this.viewer
          .show(model)
          .catch(() => this.viewerFailed.set(true))
          .finally(() => this.loadingModel.set(false));
      }
    } catch {
      this.viewerFailed.set(true);
    }
  }

  ngOnDestroy(): void {
    this.stopPad();
    this.viewer?.dispose();
  }

  protected go(i: number): void {
    this.cur.set((i + CHARACTERS.length) % CHARACTERS.length);
  }

  protected inc(key: StatKey): void {
    this.update((s) => addPoint(s, key, classBaseStats(this.cls())));
  }

  /** Troca a classe do agente da ficha (marcar Capitão tira a classe de quem era). */
  protected setClass(key: AgentClass): void {
    const id = this.agent().id;
    if (key === 'capitao') this.captain.set(id);
    // o Capitão só deixa de ser marcando outro (a equipe tem sempre um)
  }

  protected dec(key: StatKey): void {
    this.update((s) => removePoint(s, key));
  }

  protected turnModel(): void {
    this.viewer?.turn();
  }

  protected prev(): void {
    this.go(this.cur() - 1);
  }

  /** Próximo agente; no último, confirma a escalação e começa a partida. */
  protected next(): void {
    if (!this.last()) {
      this.go(this.cur() + 1);
      return;
    }
    this.roster.confirm(this.points(), this.captain());
    // escalação nova é partida nova: o automático da anterior não volta por cima dela
    this.saves.clear('auto');
    this.router.navigate(['/jogo', this.mapId]);
  }

  protected matricula(i: number): string {
    return String(i + 1).padStart(4, '0');
  }

  /** Cor da silhueta na foto 3x4: a cor do agente escurecida (como no jogo). */
  protected shade(c: Character): string {
    const k = 0.62;
    const r = Math.round(((c.color >> 16) & 255) * k);
    const g = Math.round(((c.color >> 8) & 255) * k);
    const b = Math.round((c.color & 255) * k);
    return `rgb(${r}, ${g}, ${b})`;
  }

  protected glyph(action: 'confirm' | 'cancel' | 'prev' | 'next' | 'endTurn'): string {
    const p = this.pad();
    return p ? glyphFor(p.kind, action) : '';
  }

  private update(fn: (s: Stats) => Stats): void {
    const id = this.agent().id;
    this.points.update((all) => ({ ...all, [id]: fn(all[id]) }));
  }

  private padMove(dir: Stick): void {
    if (dir.y)
      this.padStat.update((i) => (i + Math.sign(dir.y) + STAT_KEYS.length) % STAT_KEYS.length);
    else if (dir.x) {
      const key = STAT_KEYS[this.padStat()];
      if (dir.x > 0) this.inc(key);
      else this.dec(key);
    }
  }

  private padButton(b: PadButton): void {
    if (b === 'l1') this.prev();
    else if (b === 'r1') this.go(this.cur() + 1);
    else if (b === 'cross' || b === 'options') this.next();
    else if (b === 'circle') this.router.navigate(['/']);
    else if (b === 'square') this.turnModel();
    else if (b === 'triangle') this.setClass('capitao');
  }
}
