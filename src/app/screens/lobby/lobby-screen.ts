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
import { CLASS_INFO } from '../../game/agent-class';
import { PadAction, PadButton, Stick, glyphFor } from '../../game/gamepad';
import { GamepadService } from '../../game/gamepad.service';
import { LobbyViewer } from '../../game/lobby-viewer';
import { CHARACTERS, Character, findMap, phaseTitle } from '../../game/maps';
import { RosterService } from '../../game/roster.service';
import { SaveGames } from '../../game/save-game';

/** Uma opção do menu suspenso do personagem escolhido. */
interface MenuItem {
  id: 'trocar' | 'ficha' | 'voltar';
  label: string;
  /** Bloqueada por enquanto (aparece com "Em breve"). */
  locked?: boolean;
}

const MENU: readonly MenuItem[] = [
  { id: 'trocar', label: 'Trocar personagem', locked: true },
  { id: 'ficha', label: 'Ficha de personagem' },
  { id: 'voltar', label: 'Voltar' },
];

/**
 * Lobby da fase: a equipe de pé, lado a lado, antes da missão. Tocar num agente o destaca (luz e
 * passo à frente) e abre o menu dele à direita: trocar personagem (em breve), a ficha (atributos,
 * classe, modelo 3D) e voltar. Daqui se volta ao menu de fases ou se começa a missão.
 */
@Component({
  selector: 'app-lobby-screen',
  templateUrl: './lobby-screen.html',
  styleUrl: './lobby-screen.css',
})
export class LobbyScreen implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly roster = inject(RosterService);
  private readonly saves = inject(SaveGames);
  private readonly gamepad = inject(GamepadService);
  private readonly mapId = this.route.snapshot.paramMap.get('mapId') ?? '';
  protected readonly map = findMap(this.mapId);
  protected readonly title = this.map ? phaseTitle(this.map) : '';
  protected readonly agents = CHARACTERS;
  protected readonly menu = MENU;
  protected readonly pad = this.gamepad.pad;

  /** Agente destacado (volta destacado ao sair da ficha, pelo `?agente=`). */
  protected readonly selected = signal<number | null>(this.initialSelection());
  /** Opção do menu destacada pelo controle. */
  protected readonly menuFocus = signal(1);
  protected readonly agent = computed<Character | null>(() => {
    const i = this.selected();
    return i === null ? null : CHARACTERS[i];
  });
  protected readonly classLabel = (c: Character): string =>
    CLASS_INFO[this.roster.classOf(c.id)].name;

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private viewer?: LobbyViewer;
  protected readonly viewerFailed = signal(false);
  protected readonly loading = signal(false);

  private readonly stopPad = this.gamepad.listen({
    move: (dir) => this.padMove(dir),
    button: (b) => this.padButton(b),
  });

  ngAfterViewInit(): void {
    const host = this.stage()?.nativeElement;
    if (!host) return;
    try {
      this.viewer = new LobbyViewer(
        host,
        CHARACTERS.map((c) => c.color),
      );
      this.viewer.select(this.selected());
      this.loading.set(true);
      this.viewer
        .load(CHARACTERS.map((c) => c.model))
        .catch(() => this.viewerFailed.set(true))
        .finally(() => this.loading.set(false));
    } catch {
      this.viewerFailed.set(true);
    }
  }

  ngOnDestroy(): void {
    this.stopPad();
    this.viewer?.dispose();
  }

  /** Toca num agente: destaca e abre o menu dele (tocar de novo fecha). */
  protected pick(i: number): void {
    this.setSelected(this.selected() === i ? null : i);
  }

  protected choose(item: MenuItem): void {
    const agent = this.agent();
    if (item.locked || !agent) return;
    if (item.id === 'voltar') this.setSelected(null);
    else if (item.id === 'ficha') this.router.navigate(['/lobby', this.mapId, 'ficha', agent.id]);
  }

  /** Volta ao menu de fases. */
  protected back(): void {
    this.router.navigate(['/']);
  }

  /** Começa a missão com a escalação atual (o que foi salvo nas fichas). */
  protected start(): void {
    // partida nova: o automático da anterior não volta por cima dela
    this.saves.clear('auto');
    this.router.navigate(['/jogo', this.mapId]);
  }

  protected glyph(action: PadAction): string {
    const p = this.pad();
    return p ? glyphFor(p.kind, action) : '';
  }

  /** Cor de um agente como CSS. */
  protected css(c: Character): string {
    return `#${c.color.toString(16).padStart(6, '0')}`;
  }

  private setSelected(i: number | null): void {
    this.selected.set(i);
    this.menuFocus.set(1);
    this.viewer?.select(i);
    // guarda no endereço, para o "voltar" da ficha (e do navegador) cair no mesmo agente
    const agente = i === null ? null : CHARACTERS[i].id;
    this.router.navigate([], { relativeTo: this.route, queryParams: { agente }, replaceUrl: true });
  }

  private initialSelection(): number | null {
    const id = this.route.snapshot.queryParamMap.get('agente');
    const i = CHARACTERS.findIndex((c) => c.id === id);
    return i < 0 ? null : i;
  }

  private padMove(dir: Stick): void {
    const sel = this.selected();
    if (sel !== null && dir.y) {
      // com o menu aberto, cima/baixo anda pelas opções (pulando as bloqueadas)
      const n = MENU.length;
      let i = this.menuFocus();
      do i = (i + Math.sign(dir.y) + n) % n;
      while (MENU[i].locked);
      this.menuFocus.set(i);
    } else if (dir.x) {
      const n = CHARACTERS.length;
      this.setSelected(sel === null ? (dir.x > 0 ? 0 : n - 1) : (sel + Math.sign(dir.x) + n) % n);
    }
  }

  private padButton(b: PadButton): void {
    const sel = this.selected();
    if (b === 'cross') {
      if (sel === null) this.setSelected(0);
      else this.choose(MENU[this.menuFocus()]);
    } else if (b === 'circle') {
      if (sel === null) this.back();
      else this.setSelected(null);
    } else if (b === 'options') this.start();
  }
}
