import { HexCoord, hexKey } from '../hex';
import { GameMap, inStructure } from '../maps';
import { AudioEngine, BusId, rnd } from './engine';
import { creak } from './sounds';

/**
 * Passos por tipo de chão. O símbolo do mapa diz o chão (`~` terra, `=` asfalto, `:` pátio);
 * o piso `_` é o mesmo no hangar e na casa, então quem decide é a estrutura em que o hexágono
 * fica: concreto no hangar, tábuas na casa.
 */
export type Surface = 'terra' | 'asfalto' | 'patio' | 'hangar' | 'madeira' | 'mato';

/** Calçado: bota do agente ou galocha do garimpeiro (mais macia, menos grão). */
export type Boot = 'agente' | 'galocha';

export function surfaceAt(map: GameMap, hex: HexCoord): Surface {
  const ground = map.ground?.get(hexKey(hex));
  switch (ground) {
    case 'dirt':
      return 'terra';
    case 'runway':
      return 'asfalto';
    case 'apron':
      return 'patio';
    case 'floor': {
      const st = map.structures?.find((s) => inStructure(hex, s.rect));
      return st?.kind === 'house' ? 'madeira' : 'hangar';
    }
    case 'grass':
      return 'mato';
    default:
      // tabuleiro de teste (sem chão definido): terra
      return 'terra';
  }
}

export interface StepOpts {
  boot?: Boot;
  /** Volume (1 = passo de perto). */
  gain?: number;
  pan?: number;
  bus?: BusId;
  dest?: AudioNode;
}

/** Uma pisada. */
export function step(e: AudioEngine, surface: Surface, t: number, o: StepOpts = {}): void {
  const galocha = o.boot === 'galocha';
  const g = (o.gain ?? 1) * (galocha ? 0.75 : 1);
  const P = { bus: o.bus ?? ('passos' as BusId), pan: o.pan ?? 0, dest: o.dest };
  const grit = galocha ? 0.4 : 1;
  switch (surface) {
    case 'terra':
      e.noise({
        ...P,
        t,
        kind: 'pink',
        type: 'lowpass',
        f: rnd(500, 800),
        Q: 0.7,
        dur: rnd(0.07, 0.1),
        gain: 0.55 * g,
      });
      e.tone({ ...P, t, f: rnd(85, 100), f2: 45, dur: 0.07, gain: 0.4 * g });
      for (let i = 0; i < 3; i++)
        e.noise({
          ...P,
          t: t + rnd(0.005, 0.04),
          type: 'highpass',
          f: 2500,
          dur: 0.012,
          gain: 0.08 * g * grit,
        });
      break;
    case 'mato':
      e.noise({
        ...P,
        t,
        kind: 'pink',
        type: 'bandpass',
        f: 2200,
        Q: 0.5,
        dur: 0.17,
        a: 0.02,
        gain: 0.2 * g,
      });
      for (let i = 0; i < 8; i++)
        e.noise({
          ...P,
          t: t + rnd(0, 0.14),
          type: 'highpass',
          f: 3000,
          dur: 0.009,
          gain: rnd(0.04, 0.1) * g,
        });
      e.tone({ ...P, t, f: 80, f2: 45, dur: 0.05, gain: 0.2 * g });
      break;
    case 'asfalto':
      e.noise({ ...P, t, type: 'highpass', f: 1800, dur: 0.045, gain: 0.22 * g * grit });
      e.noise({
        ...P,
        t: t + 0.012,
        type: 'bandpass',
        f: 4000,
        Q: 1,
        dur: 0.03,
        gain: 0.1 * g * grit,
      });
      e.tone({ ...P, t, f: 120, f2: 70, dur: 0.05, gain: 0.3 * g });
      break;
    case 'patio':
      e.noise({ ...P, t, type: 'bandpass', f: 1600, Q: 1.2, dur: 0.04, gain: 0.3 * g });
      e.noise({
        ...P,
        t: t + 0.01,
        kind: 'pink',
        type: 'highpass',
        f: 3000,
        dur: 0.05,
        gain: 0.06 * g * grit,
      });
      e.tone({ ...P, t, f: 150, f2: 90, dur: 0.05, gain: 0.3 * g });
      break;
    case 'hangar':
      e.tone({ ...P, t, f: 140, f2: 85, dur: 0.06, gain: 0.32 * g });
      e.noise({ ...P, t, type: 'bandpass', f: 2200, Q: 1.5, dur: 0.03, gain: 0.22 * g * grit });
      e.noise({
        ...P,
        t: t + 0.02,
        kind: 'pink',
        type: 'bandpass',
        f: 900,
        Q: 4,
        dur: 0.25,
        a: 0.01,
        gain: 0.03 * g,
      });
      break;
    case 'madeira':
      e.tone({ ...P, t, type: 'triangle', f: rnd(190, 220), f2: 150, dur: 0.1, gain: 0.3 * g });
      e.tone({ ...P, t, f: 95, f2: 60, dur: 0.09, gain: 0.3 * g });
      e.noise({ ...P, t, type: 'bandpass', f: 900, Q: 3, dur: 0.05, gain: 0.2 * g });
      if (Math.random() < 0.3) creak(e, t + 0.04, 0.22, { f: rnd(500, 700), gain: 0.08 * g, ...P });
      break;
  }
}
