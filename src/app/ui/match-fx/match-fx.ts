import { Component, input } from '@angular/core';

/** Etapas do fósforo: gasolina, as três riscadas (no tempo de `STRIKE_BEATS`), a queda e a saída. */
export type MatchStage = 'pour' | 'fail' | 'spark' | 'lit' | 'drop' | 'out';

/** Faíscas: para onde cada uma voa (vmin), espalhadas para cima e para os lados. */
const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  dx: `${(((i * 37) % 19) - 6) * 1.4}vmin`,
  dy: `${-(((i * 53) % 13) + 3) * 1.3}vmin`,
}));

/**
 * O fósforo toma a tela depois do "Queimar!": overlay escuro com a caixa de fósforos, o palito
 * riscando três vezes (a primeira falha, a segunda solta faísca, a terceira acende), caindo na
 * direção da câmera e inundando a tela de laranja. Quem manda nas etapas é a tela do jogo
 * (`GameScreen.playMatch`); aqui só o desenho e as animações de cada uma.
 */
@Component({
  selector: 'app-match-fx',
  host: {
    '[class]': "'st-' + stage()",
    'aria-hidden': 'true',
    'data-testid': 'match-fx',
  },
  template: `
    <div class="match-flash"></div>
    <p class="match-cap">{{ caption() }}</p>
    <div class="match-box">
      <span class="match-strip"></span>
      <span class="match-label">Fósforos</span>
    </div>
    <div class="match-stick">
      <span class="match-wood"></span>
      <span class="match-head"></span>
      <span class="match-flame"></span>
    </div>
    <div class="match-sparks">
      @for (sp of sparks; track $index) {
        <i [style.--dx]="sp.dx" [style.--dy]="sp.dy"></i>
      }
    </div>
    <div class="match-flood"></div>
  `,
  styleUrl: './match-fx.css',
})
export class MatchFx {
  readonly stage = input.required<MatchStage>();
  readonly caption = input('');
  protected readonly sparks = SPARKS;
}
