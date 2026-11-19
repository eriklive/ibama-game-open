import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const STORAGE_KEY = 'ibama.analytics';

export type Consent = 'granted' | 'denied';

type DataLayerWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

/**
 * Métricas de acesso pelo Google Tag Manager (script em `src/index.html`). Cada troca de tela
 * vira um evento `virtual_page_view` no `dataLayer`, com `page_path` limpo (sem o `#`), já que o
 * roteamento por hash não muda o caminho da página. Os cookies só valem depois do "Aceitar"
 * no aviso (modo de consentimento do Google); a escolha fica guardada no navegador.
 */
@Injectable({ providedIn: 'root' })
export class Analytics {
  private readonly router = inject(Router);
  /** `null` enquanto o jogador não respondeu ao aviso. */
  readonly consent = signal<Consent | null>(this.load());

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        // O título da rota é aplicado logo depois do NavigationEnd.
        setTimeout(() => this.pageView(e.urlAfterRedirects));
      });
  }

  setConsent(value: Consent): void {
    this.consent.set(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // sem armazenamento (aba anônima, por exemplo): vale só nesta sessão
    }
    this.win()?.gtag?.('consent', 'update', { analytics_storage: value });
  }

  /** Evento do jogo (ex.: `partida_iniciada`), para medir até onde as pessoas chegam. */
  event(name: string, params: Record<string, unknown> = {}): void {
    this.win()?.dataLayer?.push({ event: name, ...params });
  }

  private pageView(url: string): void {
    const w = this.win();
    if (!w) return;
    const base = w.location.pathname.replace(/\/?$/, '/');
    const path = base + url.replace(/^\//, '');
    this.event('virtual_page_view', {
      page_path: path,
      page_location: w.location.origin + path,
      page_title: w.document.title,
    });
  }

  private win(): DataLayerWindow | undefined {
    return typeof window === 'undefined' ? undefined : (window as DataLayerWindow);
  }

  private load(): Consent | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'granted' || v === 'denied' ? v : null;
    } catch {
      return null;
    }
  }
}
