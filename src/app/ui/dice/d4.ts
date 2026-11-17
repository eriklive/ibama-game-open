import { Component } from '@angular/core';
import { DieComponent } from './die';
import { d4Model } from './die-models';

/**
 * d4 3D (tetraedro marfim, números em tinta; o resultado é o vértice de cima).
 *
 * Uso: `<app-d4 (rolled)="onResult($event)" />` — rola sozinho ao aparecer. Veja `DieComponent`.
 */
@Component({
  selector: 'app-d4',
  template: `
    @if (flat()) {
      <svg viewBox="0 0 100 92" aria-hidden="true">
        <polygon points="50,4 96,88 4,88" />
        <path d="M50 4V62L4 88M50 62L96 88" />
      </svg>
      <span class="value" aria-hidden="true">{{ face() }}</span>
    }
  `,
  styleUrl: './die.css',
  host: { class: 'die die-d4' },
})
export class D4 extends DieComponent {
  readonly sides = 4;
  protected createModel() {
    return d4Model();
  }
}
