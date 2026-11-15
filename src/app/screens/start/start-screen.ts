import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PadButton, Stick, glyphFor } from '../../game/gamepad';
import { GamepadService } from '../../game/gamepad.service';
import { GameMap, MAPS } from '../../game/maps';

@Component({
  selector: 'app-start-screen',
  templateUrl: './start-screen.html',
  styleUrl: './start-screen.css',
})
export class StartScreen implements OnDestroy {
  private readonly router = inject(Router);
  private readonly gamepad = inject(GamepadService);
  protected readonly maps = MAPS;
  protected readonly selectedId = signal<string | null>(null);
  protected readonly pad = this.gamepad.pad;

  // Controle: direcional/analógico escolhe o mapa, ✕ (ou Options) escolhe e inicia.
  private readonly stopPad = this.gamepad.listen({
    move: (dir) => this.cycle(dir),
    button: (b) => this.padButton(b),
  });

  protected choose(map: GameMap): void {
    if (map.available) this.selectedId.set(map.id);
  }

  protected start(): void {
    const id = this.selectedId();
    if (id) this.router.navigate(['/jogo', id]);
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
    const available = MAPS.filter((m) => m.available);
    const i = available.findIndex((m) => m.id === this.selectedId());
    const next = i < 0 ? (step > 0 ? 0 : available.length - 1) : (i + Math.sign(step) + available.length) % available.length;
    this.selectedId.set(available[next]?.id ?? null);
  }

  private padButton(b: PadButton): void {
    if (b !== 'cross' && b !== 'options') return;
    if (this.selectedId()) this.start();
    else this.selectedId.set(MAPS.find((m) => m.available)?.id ?? null);
  }
}
