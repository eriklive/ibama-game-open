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

/** Caixote de meia altura no caminho: o jogador tem `seconds` para pular (`id` muda a cada um). */
export interface VaultPrompt {
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
 * Por cima do tabuleiro durante a perseguição: o placar no topo e o botão de gritar. No caixote
 * de meia altura, o cartão de pular (botão ou arrastar para cima). Na escolha de alvo (`decisao:alvo`), tocar numa metade da tela olha para aquele lado e tocar de novo confirma.
 */
@Component({
  selector: 'app-chase-overlay',
  templateUrl: './chase-overlay.html',
  styleUrl: './chase-overlay.css',
})
export class ChaseOverlay {
  readonly hud = input<ChaseHud | null>(null);
  readonly vault = input<VaultPrompt | null>(null);
  readonly target = input<TargetPrompt | null>(null);
  /** Grito do trecho: `ready` pode gritar, `used` já gritou neste trecho, `null` sem botão. */
  readonly shout = input<'ready' | 'used' | null>(null);
  /** Pulou o caixote (botão ou arrasto para cima). */
  readonly vaultPress = output<void>();
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
  private startY?: number;

  /** No caixote, arrastar pelo menos 30 px para cima pula. */
  protected pointer(ev: PointerEvent): void {
    if (ev.type === 'pointerdown') {
      this.startX = ev.clientX;
      this.startY = ev.clientY;
      return;
    }
    const dx = ev.clientX - (this.startX ?? ev.clientX);
    const dy = ev.clientY - (this.startY ?? ev.clientY);
    this.startX = this.startY = undefined;
    if (this.vault() && dy <= -30 && Math.abs(dy) > Math.abs(dx)) this.vaultPress.emit();
  }
}
