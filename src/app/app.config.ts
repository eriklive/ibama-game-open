import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  // Hash location: funciona em qualquer hospedagem estática (ex.: GitHub Pages).
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes, withHashLocation())],
};
