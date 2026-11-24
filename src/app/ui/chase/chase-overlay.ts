import { Component, input, output } from '@angular/core';
import { CHASE_RULES, type Side } from '../../game/chase';
import { D20 } from '../dice/d20';

/** Placar da perseguição: distância até ele e quanto da rota travada já foi. */
export interface ChaseHud {
  agent: string;
  enemy: string;
  distance: number;
  step: number;
  total: number;
}

/**
 * Corrida da perseguição (quantas vezes quiser): `ready` pode correr; `rolling` o d20 está no ar;
 * `active` a velocidade maior vale (`percent`, por `ms`); `cooldown` recarregando (por `ms`) até
 * poder rolar outro d20.
 */
export interface SprintView {
  state: 'ready' | 'rolling' | 'active' | 'cooldown';
  /** Face do d20 (já sorteada); `null` antes de rolar. */
  roll: number | null;
  /** Modificador de vigor do agente, somado ao d20. */
  vigor: number;
  /** d20 + vigor: quanto (%) o agente fica mais rápido. */
  percent: number;
  /** Quanto dura (ms) a fase atual (`active` ou `cooldown`), para a barrinha do botão. */
  ms: number;
}

/** Escolha de alvo aberta: quem escolhe, quantos fogem e qual está em prévia (`null`: nenhum). */
export interface TargetPrompt {
  agent: string;
  count: number;
  picked: string | null;
}

/** Quanto o d20 da corrida gira (ms): o resultado sai rapidinho. */
export const SPRINT_DIE_MS = 650;

/**
 * Por cima do tabuleiro durante a perseguição: o placar no topo e o botão de correr. Na escolha
 * de alvo (`decisao:alvo`), tocar numa metade da tela olha para aquele lado e tocar de novo
 * confirma.
 */
@Component({
  selector: 'app-chase-overlay',
  imports: [D20],
  templateUrl: './chase-overlay.html',
  styleUrl: './chase-overlay.css',
})
export class ChaseOverlay {
  readonly hud = input<ChaseHud | null>(null);
  readonly target = input<TargetPrompt | null>(null);
  /** Corrida: `null` sem botão (fora da perseguição). */
  readonly sprint = input<SprintView | null>(null);
  readonly sprintPress = output<void>();
  protected readonly dieMs = SPRINT_DIE_MS;

  protected sprintSub(sp: SprintView): string {
    switch (sp.state) {
      case 'ready':
        return 'teste de vigor';
      case 'rolling':
        return 'rolando…';
      case 'active':
        return `+${sp.percent}% de velocidade (${this.sprintRoll(sp)})`;
      default:
        return 'recuperando o fôlego…';
    }
  }

  /** "d20 13 + 1 vigor" (ou só "d20 13", sem vigor). */
  protected sprintRoll(sp: SprintView): string {
    if (!sp.vigor) return `d20 ${sp.roll}`;
    return `d20 ${sp.roll} ${sp.vigor > 0 ? '+' : '−'} ${Math.abs(sp.vigor)} vigor`;
  }

  protected sprintLabel(sp: SprintView): string {
    return sp.state === 'ready'
      ? `Correr: teste de vigor, d20 + vigor, o total vira o bônus de velocidade por ${CHASE_RULES.sprintSeconds} segundos`
      : `Correr: ${this.sprintSub(sp)}`;
  }

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
}
