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
import { rollDice, rollDie, sum } from '../../game/dice';
import { HexBoard } from '../../game/hex-board';
import { HexCoord, hexKey, pathTo, reachableHexes, sameHex } from '../../game/hex';
import { CHARACTERS, Character, GameMap, MOVE_DICE, findMap } from '../../game/maps';

type Phase = 'rolling' | 'moving-choice' | 'walking' | 'ending';

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

  protected readonly map: GameMap | undefined = findMap(inject(ActivatedRoute).snapshot.paramMap.get('mapId'));
  protected readonly characters = CHARACTERS;
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
    const blocked = new Set(
      [...this.positions()].filter(([id]) => id !== this.active().id).map(([, h]) => hexKey(h)),
    );
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
      CHARACTERS.map((c, i) => ({ id: c.id, color: c.color, start: this.map!.starts[i] })),
      {
        onHexTap: (hex) => this.tapHex(hex),
        onUnitTap: (id) => this.focusCharacter(id),
      },
    );
    this.startTurn();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearTimers();
    this.board?.dispose();
  }

  // ---------- turnos ----------

  private startTurn(): void {
    const active = this.active();
    this.selected.set(null);
    this.focusedId.set(active.id);
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
      this.movesLeft.set(sum(final));
      // mostra o resultado um instante antes de liberar o movimento
      this.later(reducedMotion() ? 150 : 650, () => this.beginChoosing());
    });
  }

  private beginChoosing(): void {
    this.phase.set('moving-choice');
    this.refreshBoard();
  }

  protected endTurn(): void {
    if (this.phase() === 'walking' || this.phase() === 'rolling') return;
    this.clearTimers();
    this.phase.set('ending');
    this.activeIndex.update((i) => (i + 1) % CHARACTERS.length);
    this.turn.update((t) => t + 1);
    this.startTurn();
  }

  // ---------- seleção e movimento ----------

  private tapHex(hex: HexCoord | null): void {
    if (this.phase() !== 'moving-choice') return;
    if (this.viewingOther()) this.focusCharacter(this.active().id);
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

  protected focusCharacter(id: string): void {
    this.focusedId.set(id);
    this.board?.focus(id);
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
    this.phase.set('walking');
    this.selected.set(null);
    await this.board.moveUnit(id, path);
    if (this.destroyed) return;
    this.positions.update((m) => new Map(m).set(id, target));
    this.movesLeft.update((n) => n - path.length);
    if (this.movesLeft() <= 0) {
      // sem movimento: passa a vez automaticamente após um instante
      this.phase.set('ending');
      this.later(reducedMotion() ? 200 : 700, () => this.endTurn());
    } else {
      this.beginChoosing();
    }
  }

  protected cancel(): void {
    this.selected.set(null);
    this.board?.setSelected(null);
  }

  protected restart(): void {
    this.clearTimers();
    this.positions.set(this.initialPositions());
    this.board?.placeUnits(this.positions());
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

  // ---------- auxiliares ----------

  private refreshBoard(): void {
    this.board?.setReachable(this.reach().keys());
    this.board?.setSelected(this.selected(), this.selectedPath());
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
