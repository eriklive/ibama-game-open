import { Component, input } from '@angular/core';
import { DieComponent } from './die';
import { d20Model } from './die-models';

/**
 * d20 3D (icosaedro verde-mata, números marfim; o resultado é a face de cima, em pé para
 * quem olha). Lance um pouco mais curto que o do d4: os testes não devem segurar o jogo.
 *
 * Uso: `<app-d20 [tone]="passou ? 'pass' : 'fail'" (rolled)="onResult($event)" />`.
 * Veja `DieComponent`.
 */
@Component({
  selector: 'app-d20',
  template: `
    @if (flat()) {
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="50,3 91,26 91,74 50,97 9,74 9,26" />
        <path
          d="M50 30L76 70H24Z M50 30L50 3 M50 30L9 26 M50 30L91 26 M24 70L9 26 M24 70L9 74 M24 70L50 97 M76 70L91 26 M76 70L91 74 M76 70L50 97"
        />
      </svg>
      <span class="value" aria-hidden="true">{{ face() }}</span>
    }
  `,
  styleUrl: './die.css',
  host: { class: 'die die-d20' },
})
export class D20 extends DieComponent {
  readonly sides = 20;
  override readonly duration = input(1200);
  protected createModel() {
    return d20Model();
  }
}
