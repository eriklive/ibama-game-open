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

/** Escolha de alvo aberta: quem escolhe, quantos fogem e qual está em prévia (`null`: nenhum). */
export interface TargetPrompt {
  agent: string;
  count: number;
  picked: string | null;
}

/**
 * Por cima do tabuleiro durante a perseguição: o placar no topo e, na curva, o cartão de
 * deslizar (← / →, com o prazo correndo). Arrastar para um lado em qualquer ponto da tela
 * também vale. Quem decide o que o deslize faz é a tela da partida (`swipe`). Na escolha de
 * alvo (`decisao:alvo`), tocar numa metade da tela olha para aquele lado e tocar de novo confirma.
 */
@Component({
  selector: 'app-chase-overlay',
  templateUrl: './chase-overlay.html',
  styleUrl: './chase-overlay.css',
})
export class ChaseOverlay {
  readonly hud = input<ChaseHud | null>(null);
  readonly curve = input<CurvePrompt | null>(null);
  readonly target = input<TargetPrompt | null>(null);
  /** Grito do trecho: `ready` pode gritar, `used` já gritou neste trecho, `null` sem botão. */
  readonly shout = input<'ready' | 'used' | null>(null);
  readonly swipe = output<Side>();
  readonly shoutPress = output<void>();
  /** Escolha de alvo: tocou num lado (metade da tela ou seta), confirmou ou desistiu. */
  readonly targetSide = output<Side>();
  readonly targetConfirm = output<void>();
  readonly targetCancel = output<void>();

  /** Toque na metade esquerda ou direita da tela, na escolha de alvo. */
  protected targetTap(ev: MouseEvent): void {
    const el = ev.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    this.targetSide.emit(ev.clientX < r.left + r.width / 2 ? 'esquerda' : 'direita');
  }

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
