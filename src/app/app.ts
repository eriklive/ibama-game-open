import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Analytics } from './game/analytics';
import { ConsentBanner } from './ui/consent/consent-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConsentBanner],
  template: '<router-outlet /><app-consent-banner />',
})
export class App {
  // Instancia logo no início para registrar a primeira tela.
  private readonly analytics = inject(Analytics);
}
