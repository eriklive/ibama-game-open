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
import { AgentViewer, Framing } from '../../game/agent-viewer';
import { PadButton, Stick, glyphFor } from '../../game/gamepad';
import { GamepadService } from '../../game/gamepad.service';
import { CHARACTERS, Character, findMap, phaseTitle } from '../../game/maps';
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

/** A partir desta largura, a ficha fica ao lado do modelo (layout "web"). */
const WIDE_QUERY = '(min-width: 900px)';

/**
 * Ficha de personagem, aberta pelo menu do agente no lobby: classe (um Capitão na equipe, os
 * demais Agentes), o ponto do agente nos atributos e o modelo 3D. "Salvar" guarda na escalação e
 * volta ao lobby; "Voltar" volta sem guardar.
 * Larga: o modelo à esquerda e a ficha à direita. Estreita (celular): o modelo num quadrado em
 * cima, da cintura para cima; tocar nele desce a ficha e deixa girar o modelo inteiro, e rolar a
 * ficha a faz cobrir o modelo.
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
  private readonly params = inject(ActivatedRoute).snapshot.paramMap;
  private readonly mapId = this.params.get('mapId') ?? '';
  protected readonly map = findMap(this.mapId);
  protected readonly title = this.map ? phaseTitle(this.map) : '';
  protected readonly agents = CHARACTERS;
  protected readonly pad = this.gamepad.pad;
  protected readonly signed = signed;
  protected readonly scale = STAT_RULES;
  protected readonly slotsLeft = ['Cabeça', 'Tronco', 'Mãos'];
  protected readonly slotsRight = ['Arma', 'Costas', 'Pés'];
  protected readonly rulerLabels = rulerCells(0, 0).map((c) => signed(c.unit));

  protected readonly cur = signal(
    Math.max(
      0,
      CHARACTERS.findIndex((c) => c.id === this.params.get('agentId')),
    ),
  );
  /** Layout largo (modelo e ficha lado a lado). */
  protected readonly wide = signal(matchMedia?.(WIDE_QUERY).matches ?? true);
  /** Celular: a ficha desceu e o modelo ocupa a tela, girável. */
  protected readonly expanded = signal(false);
  /** Modelo inteiro (web, ou celular com a ficha recolhida); senão, da cintura para cima. */
  private readonly framing = computed<Framing>(() =>
    this.wide() || this.expanded() ? 'full' : 'bust',
  );
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
  protected readonly isCaptain = computed(() => this.agent().id === this.captain());

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
  private readonly media = matchMedia?.(WIDE_QUERY);
  private readonly onMedia = (e: MediaQueryListEvent): void => {
    this.wide.set(e.matches);
    if (e.matches) this.expanded.set(false);
  };

  constructor() {
    this.media?.addEventListener?.('change', this.onMedia);
    effect(() => {
      const framing = this.framing();
      this.viewer?.setFraming(framing);
      // recolhendo o modelo, ele volta de frente para o quadrado
      if (framing === 'bust') this.viewer?.face();
    });
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
      this.viewer = new AgentViewer(host, this.framing());
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
    this.media?.removeEventListener?.('change', this.onMedia);
    this.viewer?.dispose();
  }

  /** Celular: toca no quadrado do modelo (a ficha desce) ou em "Ver ficha" (ela volta). */
  protected expand(on: boolean): void {
    if (this.wide()) return;
    this.expanded.set(on);
    // o modelo fica no topo da página: com a ficha descendo, a tela volta para cima
    if (on) window.scrollTo?.({ top: 0, behavior: 'smooth' });
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

  /** Volta ao lobby sem guardar (com o agente ainda destacado lá). */
  protected back(): void {
    this.router.navigate(['/lobby', this.mapId], { queryParams: { agente: this.agent().id } });
  }

  /** Guarda a ficha na escalação e volta ao lobby. */
  protected save(): void {
    this.roster.confirm(this.points(), this.captain());
    // escalação mudou: o automático da partida anterior não volta por cima dela
    this.saves.clear('auto');
    this.back();
  }

  protected matricula(i: number): string {
    return String(i + 1).padStart(4, '0');
  }

  protected glyph(action: 'confirm' | 'cancel' | 'approach' | 'endTurn'): string {
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
    if (b === 'cross' || b === 'options') this.save();
    else if (b === 'circle') {
      if (this.expanded()) this.expand(false);
      else this.back();
    } else if (b === 'square') {
      if (!this.wide() && !this.expanded()) this.expand(true);
      else this.turnModel();
    } else if (b === 'triangle') this.setClass('capitao');
  }
}
