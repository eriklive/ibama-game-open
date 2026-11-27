import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { StartScreen } from './screens/start/start-screen';
import { GameScreen } from './screens/game/game-screen';
import { RosterScreen } from './screens/roster/roster-screen';
import { findMap } from './game/maps';
import { RaceLab } from './lab/race-lab';
import { SaveGames } from './game/save-game';

/** Só entra na partida se o mapa existir e estiver disponível. */
const mapAvailable: CanActivateFn = (route) =>
  findMap(route.paramMap.get('mapId')) ? true : inject(Router).createUrlTree(['/']);

/**
 * Abrir a página (a primeira navegação do app) com um save automático na sessão: volta direto
 * para a partida, que carrega o save sozinha. Depois disso, a tela inicial abre normalmente
 * ("Sair", "Novo jogo").
 */
const resumeSave: CanActivateFn = () => {
  const router = inject(Router);
  if (router.navigated) return true;
  const mapId = inject(SaveGames).read('auto')?.mapId;
  return mapId && findMap(mapId) ? router.createUrlTree(['/jogo', mapId]) : true;
};

export const routes: Routes = [
  { path: '', component: StartScreen, canActivate: [resumeSave], title: 'Jogo do Ibama' },
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
