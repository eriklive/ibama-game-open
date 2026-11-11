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
import { HexBoard } from '../../game/hex-board';
import { HexCoord, hexDistance } from '../../game/hex';
import { GameMap, MOVES_PER_TEST, MOVE_RANGE, findMap } from '../../game/maps';

@Component({
  selector: 'app-game-screen',
  templateUrl: './game-screen.html',
  styleUrl: './game-screen.css',
})
export class GameScreen implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('board');
  private board?: HexBoard;

  protected readonly map: GameMap | undefined = findMap(inject(ActivatedRoute).snapshot.paramMap.get('mapId'));
  protected readonly range = MOVE_RANGE;
  protected readonly totalMoves = MOVES_PER_TEST;
  protected readonly pips = Array.from({ length: MOVES_PER_TEST }, (_, i) => i);

  protected readonly position = signal<HexCoord | null>(this.map ? { ...this.map.start } : null);
  protected readonly selected = signal<HexCoord | null>(null);
  protected readonly movesDone = signal(0);
  protected readonly moving = signal(false);
  protected readonly finished = computed(() => this.movesDone() >= MOVES_PER_TEST);
  protected readonly selectedDistance = computed(() => {
    const s = this.selected();
    const p = this.position();
    return s && p ? hexDistance(p, s) : 0;
  });

  ngAfterViewInit(): void {
    if (!this.map) return;
    this.board = new HexBoard(this.canvasRef().nativeElement, this.map, MOVE_RANGE, {
      onSelect: (hex) => this.selected.set(hex),
    });
  }

  ngOnDestroy(): void {
    this.board?.dispose();
  }

  protected async confirm(): Promise<void> {
    if (!this.board || !this.selected() || this.moving()) return;
    this.moving.set(true);
    this.selected.set(null);
    const pos = await this.board.confirmMove();
    this.moving.set(false);
    if (pos) {
      this.position.set(pos);
      this.movesDone.update((n) => n + 1);
      if (this.finished()) this.board.setInputEnabled(false);
    }
  }

  protected cancel(): void {
    this.board?.clearSelection();
  }

  protected restart(): void {
    this.board?.reset();
    this.board?.setInputEnabled(true);
    this.position.set(this.map ? { ...this.map.start } : null);
    this.selected.set(null);
    this.movesDone.set(0);
  }

  protected exit(): void {
    this.router.navigate(['/']);
  }
}
