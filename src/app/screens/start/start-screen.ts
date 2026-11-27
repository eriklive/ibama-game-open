import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PadButton, Stick, glyphFor } from '../../game/gamepad';
import { GamepadService } from '../../game/gamepad.service';
import { GameMap, PHASES, phaseTitle } from '../../game/maps';

@Component({
  selector: 'app-start-screen',
  templateUrl: './start-screen.html',
  styleUrl: './start-screen.css',
})
export class StartScreen implements OnDestroy {
  private readonly router = inject(Router);
  private readonly gamepad = inject(GamepadService);
  protected readonly maps = PHASES;
  protected readonly phaseTitle = phaseTitle;
  /** Já vem com a primeira fase disponível marcada: hoje só há uma. */
  protected readonly selectedId = signal<string | null>(PHASES.find((m) => m.available)?.id ?? null);
  protected readonly pad = this.gamepad.pad;

  // Controle: direcional/analógico escolhe a fase, ✕ (ou Options) escolhe e inicia.
  private readonly stopPad = this.gamepad.listen({
    move: (dir) => this.cycle(dir),
    button: (b) => this.padButton(b),
  });

  protected choose(map: GameMap): void {
    if (map.available) this.selectedId.set(map.id);
  }

  protected start(): void {
    const id = this.selectedId();
    // antes da partida, o lobby com a equipe
    if (id) this.router.navigate(['/lobby', id]);
  }

  protected confirmGlyph(): string {
    const p = this.pad();
    return p ? glyphFor(p.kind, 'confirm') : '';
  }

  ngOnDestroy(): void {
    this.stopPad();
  }

  private cycle(dir: Stick): void {
    const step = dir.y || dir.x;
    if (!step) return;
    const available = PHASES.filter((m) => m.available);
    const i = available.findIndex((m) => m.id === this.selectedId());
    const next = i < 0 ? (step > 0 ? 0 : available.length - 1) : (i + Math.sign(step) + available.length) % available.length;
    this.selectedId.set(available[next]?.id ?? null);
  }

  private padButton(b: PadButton): void {
    if (b !== 'cross' && b !== 'options') return;
    if (this.selectedId()) this.start();
    else this.selectedId.set(PHASES.find((m) => m.available)?.id ?? null);
  }
}
