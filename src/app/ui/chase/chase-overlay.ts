import { Component, input, output } from '@angular/core';
import type { Side } from '../../game/chase';

/** Placar da perseguição: distância até ele e quanto da rota travada já foi. */
export interface ChaseHud {
  agent: string;
  enemy: string;
  distance: number;
  step: number;
  total: number;
}

/** Curva aberta: o jogador tem `seconds` para deslizar (`id` muda a cada curva). */
export interface CurvePrompt {
  id: number;
  seconds: number;
}

/**
 * Por cima do tabuleiro durante a perseguição: o placar no topo e, na curva, o cartão de
 * deslizar (← / →, com o prazo correndo). Arrastar para um lado em qualquer ponto da tela
 * também vale. Quem decide o que o deslize faz é a tela da partida (`swipe`).
 */
@Component({
  selector: 'app-chase-overlay',
  templateUrl: './chase-overlay.html',
  styleUrl: './chase-overlay.css',
})
export class ChaseOverlay {
  readonly hud = input<ChaseHud | null>(null);
  readonly curve = input<CurvePrompt | null>(null);
  readonly swipe = output<Side>();

  private startX?: number;

  /** Arrasto de pelo menos 30 px: para que lado foi. */
  protected pointer(ev: PointerEvent): void {
    if (ev.type === 'pointerdown') {
      this.startX = ev.clientX;
      return;
    }
    const dx = ev.clientX - (this.startX ?? ev.clientX);
    this.startX = undefined;
    if (Math.abs(dx) >= 30) this.swipe.emit(dx < 0 ? 'esquerda' : 'direita');
  }
}
