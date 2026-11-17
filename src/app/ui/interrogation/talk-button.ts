import { Component, input } from '@angular/core';

/**
 * Botão **Conversar** das ações (dentro da aura de um suspeito rendido): o papel da HUD com um
 * carimbo de borda dupla, como o "Abordar". O conteúdo é o nome do suspeito. Com `silent` (NPC
 * sem diálogo), o carimbo fica apagado e o botão vem desabilitado ("sem diálogo").
 *
 * Uso: `<button type="button" class="paper" appTalkButton [silent]="…" [glyph]="…">Piloto</button>`.
 */
@Component({
  selector: 'button[appTalkButton]',
  host: { '[class.silent]': 'silent()' },
  template: `
    <span class="stamp">Conversar</span>
    <span class="name"><ng-content /></span>
    @if (glyph()) {
      <span class="pad-glyph" aria-hidden="true">{{ glyph() }}</span>
    }
  `,
  styles: `
    :host {
      right: 84px;
      bottom: 112px;
      width: 96px;
      height: 46px;
      transform: rotate(-3deg);
      animation: slap 0.25s ease-out both;
    }
    .stamp {
      padding: 1px 6px;
      border: 3px double var(--red);
      color: var(--red-text);
      font-family: var(--stencil);
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .name {
      margin-top: 2px;
      max-width: 90px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      line-height: 1.1;
    }
    /* sem diálogo: visível, mas apagado e sem toque */
    :host(.silent) .stamp {
      border-color: var(--muted-paper);
      color: var(--muted-paper);
      text-decoration: line-through;
    }
    :host(.silent) .name {
      font-style: italic;
    }
    .pad-glyph {
      position: absolute;
      top: -10px;
      left: -8px;
      min-width: 26px;
      height: 26px;
      padding: 0 6px;
      display: grid;
      place-items: center;
      border-radius: 13px;
      background: var(--ink-paper);
      color: var(--paper-light);
      border: 2px solid var(--paper-light);
      font-size: 14px;
      line-height: 1;
      box-shadow: 1px 2px 0 rgba(0, 0, 0, 0.35);
      pointer-events: none;
    }
    @keyframes slap {
      0% {
        opacity: 0;
        scale: 1.5;
      }
      100% {
        opacity: 1;
        scale: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
      }
    }
  `,
})
export class TalkButton {
  /** NPC sem diálogo: o papel aparece, mas bloqueado. */
  readonly silent = input(false);
  /** Símbolo do botão do controle (□), vazio sem controle ou quando outra ação usa o □. */
  readonly glyph = input('');
}
