import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameMap, MAPS } from '../../game/maps';

@Component({
  selector: 'app-start-screen',
  templateUrl: './start-screen.html',
  styleUrl: './start-screen.css',
})
export class StartScreen {
  private readonly router = inject(Router);
  protected readonly maps = MAPS;
  protected readonly selectedId = signal<string | null>(null);

  protected choose(map: GameMap): void {
    if (map.available) this.selectedId.set(map.id);
  }

  protected start(): void {
    const id = this.selectedId();
    if (id) this.router.navigate(['/jogo', id]);
  }
}
