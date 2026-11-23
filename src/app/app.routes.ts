import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { StartScreen } from './screens/start/start-screen';
import { GameScreen } from './screens/game/game-screen';
import { RosterScreen } from './screens/roster/roster-screen';
import { findMap } from './game/maps';
import { RaceLab } from './lab/race-lab';

/** Só entra na partida se o mapa existir e estiver disponível. */
const mapAvailable: CanActivateFn = (route) =>
  findMap(route.paramMap.get('mapId')) ? true : inject(Router).createUrlTree(['/']);

export const routes: Routes = [
  { path: '', component: StartScreen, title: 'Jogo do Ibama' },
  {
    path: 'escalacao/:mapId',
    component: RosterScreen,
    canActivate: [mapAvailable],
    title: 'Jogo do Ibama · Ficha do agente',
  },
  { path: 'jogo/:mapId', component: GameScreen, canActivate: [mapAvailable], title: 'Jogo do Ibama · Partida' },
  { path: 'lab', component: RaceLab },
  { path: '**', redirectTo: '' },
];
