import { Component, inject } from '@angular/core';
import { Analytics } from '../../game/analytics';

/** Aviso de cookies (LGPD): aparece até o jogador aceitar ou recusar as métricas de acesso. */
@Component({
  selector: 'app-consent-banner',
  template: `
    @if (analytics.consent() === null) {
      <aside class="consent" role="dialog" aria-live="polite" aria-label="Aviso de cookies">
        <p>
          Usamos cookies do Google Analytics só para contar acessos e saber como o jogo é usado.
          Nada de anúncios.
        </p>
        <div class="actions">
          <button type="button" class="btn btn-ghost" (click)="analytics.setConsent('denied')">
            Recusar
          </button>
          <button type="button" class="btn btn-primary" (click)="analytics.setConsent('granted')">
            Aceitar
          </button>
        </div>
      </aside>
    }
  `,
  styles: `
    .consent {
      position: fixed;
      z-index: 1000;
      left: calc(16px + var(--safe-left));
      right: calc(16px + var(--safe-right));
      bottom: calc(16px + var(--safe-bottom));
      max-width: 560px;
      margin: 0 auto;
      padding: 14px 16px;
      border: 4px solid var(--ink);
      border-radius: 16px;
      background: var(--panel);
      box-shadow: 0 5px 0 var(--ink);
      color: var(--text);
    }
    p {
      margin: 0 0 12px;
      font-size: 15px;
      line-height: 1.35;
      color: var(--muted);
    }
    .actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .btn {
      min-height: 44px;
      font-size: 18px;
    }
  `,
})
export class ConsentBanner {
  protected readonly analytics = inject(Analytics);
}
