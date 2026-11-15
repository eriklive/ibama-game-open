import { Component, input } from '@angular/core';

/**
 * Botão principal da interface, na estética de "investigação": papel com fita crepe,
 * texto em estêncil e contorno riscado à mão com caneta (duas passadas, que "tremem" como
 * desenho animado ao passar o mouse ou focar).
 *
 * Uso: `<button type="button" appMainButton (click)="…">Confirmar</button>`
 * (também serve em `<a>`). `tone="paper"` troca o post-it amarelo por papel claro.
 */
@Component({
  selector: 'button[appMainButton], a[appMainButton]',
  host: {
    class: 'main-button',
    '[class.paper]': "tone() === 'paper'",
  },
  template: `
    <svg class="scribble" viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden="true">
      <path
        class="pass-1"
        d="M9 6C52 3 118 7 194 4C197 20 194 42 197 59C138 62 64 58 5 61C2 44 6 25 3 8C14 6 22 5 30 5"
      />
      <path
        class="pass-2"
        d="M4 10C68 6 132 3 195 8C193 25 198 41 194 57C128 59 70 63 8 58C5 41 2 25 7 5"
      />
    </svg>
    <span class="label"><ng-content /></span>
  `,
  styleUrl: './main-button.css',
})
export class MainButton {
  readonly tone = input<'postit' | 'paper'>('postit');
}
