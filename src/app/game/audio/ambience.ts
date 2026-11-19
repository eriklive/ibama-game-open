import { HexCoord } from '../hex';
import { GameMap, StructureKind, inStructure } from '../maps';
import { AudioEngine, rnd } from './engine';
import { creak, metalClank } from './sounds';

/**
 * Ambiente em três níveis, do mais geral ao mais específico:
 * 1. **Bioma**: o lado de fora (hoje, mata de terra firme; depois várzea, beira de rio…).
 *    Tem camas (loops) e eventos (sons soltos em intervalo aleatório).
 * 2. **Zona**: onde o agente da vez está. Aponta o bioma, um interior opcional (hangar,
 *    casa), quanto o lado de fora fica abafado e ajustes por camada.
 * 3. **Estado do jogo**: por cima de tudo. O fogo soma camadas; a abordagem abafa tudo.
 *
 * Os sons ficam em `AMBIENT_SOUNDS`; bioma, interior e estado só dizem quais usar e em que nível.
 * Novos biomas e interiores entram como dados, sem mexer no `AmbiencePlayer`.
 */

export type LayerKind = 'bed' | 'event';

export interface AmbientLayer {
  id: string;
  kind: LayerKind;
  /** Chave em `AMBIENT_SOUNDS`; `null` é uma vaga reservada (ainda sem som). */
  sound: string | null;
  /** 0–1. */
  level: number;
  /** Intervalo entre eventos (s). */
  every?: readonly [number, number];
}

export interface Biome {
  layers: readonly AmbientLayer[];
}
export interface Interior {
  layers: readonly AmbientLayer[];
  /** Passa-baixa (Hz) no lado de fora, ouvido de dentro. */
  muffle: number;
}
export interface GameState {
  layers: readonly AmbientLayer[];
}

export const BIOMES: Readonly<Record<string, Biome>> = {
  mata: {
    layers: [
      { id: 'coro', kind: 'bed', sound: 'coroMata', level: 0.09 },
      { id: 'copa', kind: 'bed', sound: 'copa', level: 0.19 },
      { id: 'brisa', kind: 'bed', sound: 'brisa', level: 0.04 },
      { id: 'cigarra', kind: 'event', sound: 'cigarra', level: 0.27, every: [14, 32] },
      { id: 'passaros', kind: 'event', sound: 'passaro', level: 0.89, every: [4, 12] },
      { id: 'gotas', kind: 'event', sound: 'gota', level: 0.35, every: [1.5, 6] },
      { id: 'galhos', kind: 'event', sound: 'galho', level: 0.7, every: [7, 18] },
      // vaga reservada para a versão final (bugio, tucano, sapo…)
      { id: 'animais', kind: 'event', sound: null, level: 0, every: [20, 60] },
    ],
  },
};

export const INTERIORS: Readonly<Record<StructureKind, Interior>> = {
  hangar: {
    muffle: 900,
    layers: [
      { id: 'zumbido', kind: 'bed', sound: 'zumbidoHangar', level: 0.75 },
      { id: 'chapa', kind: 'event', sound: 'chapa', level: 0.6, every: [3.5, 9] },
    ],
  },
  house: {
    muffle: 1500,
    layers: [{ id: 'talheres', kind: 'event', sound: 'talheres', level: 0.7, every: [2, 6] }],
  },
};

export const GAME_STATES: Readonly<Record<'fogo', GameState>> = {
  fogo: {
    layers: [
      { id: 'fogo', kind: 'bed', sound: 'fogoLonge', level: 0.8 },
      { id: 'estalos', kind: 'event', sound: 'estalo', level: 0.8, every: [0.12, 0.4] },
    ],
  },
};

export type GameStateId = keyof typeof GAME_STATES;

/** Ajustes do bioma visto de dentro de cada interior (multiplicam o nível da camada). */
export const INTERIOR_ADJUST: Readonly<Record<StructureKind, Readonly<Record<string, number>>>> = {
  hangar: { passaros: 0.5, galhos: 0, gotas: 0.3 },
  house: { galhos: 0, gotas: 0.5 },
};
/** Ajustes do bioma com o fogo: os pássaros fogem. */
export const STATE_ADJUST: Readonly<Record<GameStateId, Readonly<Record<string, number>>>> = {
  fogo: { passaros: 0, cigarra: 0.4, gotas: 0.6 },
};

/** Abordagem: o ambiente inteiro passa por este passa-baixa (Hz). */
export const APPROACH_MUFFLE = 800;
/** Lado de fora sem filtro. */
export const OPEN_AIR = 18000;

export interface Zone {
  biome: string;
  interior?: StructureKind;
  states: readonly GameStateId[];
}

/** A zona de um hexágono: o bioma do mapa, a estrutura em que ele fica e o estado do jogo. */
export function zoneAt(
  map: GameMap,
  hex: HexCoord | undefined,
  states: readonly GameStateId[] = [],
): Zone {
  const interior = hex ? map.structures?.find((s) => inStructure(hex, s.rect))?.kind : undefined;
  return { biome: 'mata', interior, states };
}

export const sameZone = (a: Zone, b: Zone): boolean =>
  a.biome === b.biome && a.interior === b.interior && a.states.join() === b.states.join();

/** Camada com a origem (o que fica do lado de fora passa pelo abafamento do interior). */
export interface PlacedLayer extends AmbientLayer {
  key: string;
  outside: boolean;
}

/** Todas as camadas que um conjunto de biomas, interiores e estados pode tocar. */
export function allLayers(): PlacedLayer[] {
  const out: PlacedLayer[] = [];
  for (const [b, biome] of Object.entries(BIOMES))
    for (const l of biome.layers) out.push({ ...l, key: `bioma:${b}:${l.id}`, outside: true });
  for (const [i, int] of Object.entries(INTERIORS))
    for (const l of int.layers) out.push({ ...l, key: `interior:${i}:${l.id}`, outside: false });
  for (const [s, st] of Object.entries(GAME_STATES))
    for (const l of st.layers) out.push({ ...l, key: `estado:${s}:${l.id}`, outside: true });
  return out;
}

/** Nível de cada camada (pela `key`) numa zona; camadas de fora da zona ficam em 0. */
export function zoneLevels(zone: Zone): Map<string, number> {
  const levels = new Map<string, number>();
  const adjust = (id: string) =>
    (zone.interior ? (INTERIOR_ADJUST[zone.interior][id] ?? 1) : 1) *
    zone.states.reduce((k, s) => k * (STATE_ADJUST[s][id] ?? 1), 1);
  for (const l of allLayers()) {
    const [origin, group] = l.key.split(':');
    const on =
      (origin === 'bioma' && group === zone.biome) ||
      (origin === 'interior' && group === zone.interior) ||
      (origin === 'estado' && zone.states.includes(group as GameStateId));
    levels.set(l.key, on && l.sound ? l.level * (origin === 'bioma' ? adjust(l.id) : 1) : 0);
  }
  return levels;
}

/** Abafamento (Hz) do lado de fora numa zona. */
export const zoneMuffle = (zone: Zone): number =>
  zone.interior ? INTERIORS[zone.interior].muffle : OPEN_AIR;

// ---------- sons ----------

type Stoppers = AudioScheduledSourceNode[];

/** Camas: criam fontes em loop ligadas a `dest`. Eventos: tocam uma vez em `t`. */
export const AMBIENT_SOUNDS: Readonly<{
  beds: Readonly<Record<string, (e: AudioEngine, dest: AudioNode, s: Stoppers) => void>>;
  events: Readonly<Record<string, (e: AudioEngine, t: number, dest: AudioNode) => void>>;
}> = {
  beds: {
    coroMata: (e, d, s) => {
      for (const [f, Q, v, r] of [
        [2900, 5, 0.16, 0.031],
        [3900, 6, 0.12, 0.047],
        [5200, 6, 0.08, 0.023],
        [7400, 4, 0.04, 0.061],
      ]) {
        const n = e.loopNoise('white', 'bandpass', f, Q, v, d, s);
        e.lfo(r, v * 0.45, n.gain.gain, s);
        e.lfo(r * 0.7, f * 0.015, n.filter.frequency, s);
      }
      const z = e.loopNoise('white', 'bandpass', 4400, 8, 0.05, d, s);
      e.lfo(19, 0.02, z.gain.gain, s);
      e.lfo(0.04, 0.025, z.gain.gain, s);
      e.loopNoise('brown', 'lowpass', 140, 0.7, 0.12, d, s);
    },
    copa: (e, d, s) => {
      const n = e.loopNoise('pink', 'bandpass', 2200, 0.45, 0.1, d, s);
      e.lfo(0.05, 0.05, n.gain.gain, s);
      e.lfo(0.035, 500, n.filter.frequency, s);
    },
    brisa: (e, d, s) => {
      const n = e.loopNoise('pink', 'lowpass', 320, 0.5, 0.25, d, s);
      e.lfo(0.045, 120, n.filter.frequency, s);
      e.lfo(0.06, 0.08, n.gain.gain, s);
    },
    zumbidoHangar: (e, d, s) => {
      e.hum(100, 0.05, d, s);
      e.hum(200, 0.02, d, s);
      e.loopNoise('brown', 'lowpass', 180, 0.7, 0.35, d, s);
    },
    fogoLonge: (e, d, s) => {
      e.loopNoise('brown', 'lowpass', 220, 0.7, 0.7, d, s);
      e.loopNoise('pink', 'bandpass', 500, 0.7, 0.1, d, s);
    },
  },
  events: {
    passaro: (e, t, dest) => {
      const pan = rnd(-0.85, 0.85);
      const k = Math.floor(rnd(0, 4));
      if (k === 0) {
        e.tone({ t, f: rnd(2600, 3100), f2: 2000, dur: 0.25, gain: 0.07, dest, pan });
        e.tone({ t: t + 0.28, f: 2100, f2: 2700, dur: 0.16, gain: 0.06, dest, pan });
      } else if (k === 1) {
        const b = rnd(3200, 3900);
        for (let i = 0; i < 7; i++)
          e.tone({ t: t + i * 0.045, f: i % 2 ? b : b * 0.9, dur: 0.04, gain: 0.045, dest, pan });
      } else if (k === 2) {
        [0, 0.22, 0.44].forEach((d, i) =>
          e.tone({
            t: t + d,
            f: 2400 - i * 250,
            f2: 1900 - i * 250,
            dur: 0.18,
            gain: 0.06,
            dest,
            pan,
          }),
        );
      } else {
        e.tone({ t, f: 1100, f2: 1500, dur: 0.35, gain: 0.05, dest, pan, type: 'triangle' });
        e.tone({
          t: t + 0.4,
          f: 1500,
          f2: 900,
          dur: 0.5,
          gain: 0.045,
          dest,
          pan,
          type: 'triangle',
        });
      }
    },
    cigarra: (e, t, dest) => {
      // cresce, canta uns segundos e some
      const c = e.ctx!;
      const dur = rnd(6, 10);
      const stoppers: AudioScheduledSourceNode[] = [];
      const env = c.createGain();
      e.envelope(env, t, { a: dur * 0.35, hold: dur * 0.3, gain: 0.3 }, dur);
      const pan = c.createStereoPanner();
      pan.pan.value = rnd(-0.8, 0.8);
      env.connect(pan);
      pan.connect(dest);
      const am = c.createGain();
      am.gain.value = 0.5;
      am.connect(env);
      e.loopNoise('white', 'bandpass', rnd(4300, 5300), 10, 1, am, stoppers);
      e.lfo(rnd(24, 34), 0.5, am.gain, stoppers);
      for (const s of stoppers) s.stop(t + dur + 0.1);
    },
    gota: (e, t, dest) => {
      const f = rnd(900, 1700);
      const pan = rnd(-0.7, 0.7);
      e.tone({ t, f, f2: f * 1.6, dur: 0.05, gain: rnd(0.03, 0.06), dest, pan });
      if (Math.random() < 0.4)
        e.tone({
          t: t + rnd(0.15, 0.4),
          f: f * 1.1,
          f2: f * 1.7,
          dur: 0.04,
          gain: 0.025,
          dest,
          pan,
        });
    },
    galho: (e, t, dest) => {
      const pan = rnd(-0.9, 0.9);
      const n = Math.floor(rnd(2, 6));
      for (let i = 0; i < n; i++)
        e.noise({
          t: t + rnd(0, 0.35),
          type: 'bandpass',
          f: rnd(1500, 3500),
          Q: 2,
          dur: rnd(0.006, 0.015),
          gain: rnd(0.05, 0.14),
          dest,
          pan,
        });
      e.noise({
        t: t + 0.2,
        kind: 'pink',
        type: 'bandpass',
        f: 2600,
        Q: 0.6,
        dur: 0.3,
        a: 0.08,
        gain: 0.03,
        dest,
        pan,
      });
    },
    chapa: (e, t, dest) => metalClank(e, t, 0.03, 'amb', rnd(300, 600), dest),
    talheres: (e, t, dest) => {
      if (Math.random() < 0.75) {
        const n = Math.random() < 0.5 ? 1 : 2;
        for (let i = 0; i < n; i++) {
          const f = rnd(2800, 4200);
          e.tone({ t: t + i * 0.16, f, dur: 0.18, gain: 0.05, dest });
          e.tone({ t: t + i * 0.16, f: f * 1.47, dur: 0.1, gain: 0.025, dest });
          e.noise({
            t: t + i * 0.16,
            type: 'bandpass',
            f: 5000,
            Q: 3,
            dur: 0.01,
            gain: 0.08,
            dest,
          });
        }
      } else creak(e, t, 0.35, { f: rnd(450, 650), gain: 0.07, dest });
    },
    estalo: (e, t, dest) => {
      for (let i = 0; i < 5; i++)
        e.noise({
          t: t + rnd(0, 0.3),
          type: 'bandpass',
          f: rnd(1200, 2600),
          Q: 1,
          dur: 0.01,
          gain: rnd(0.05, 0.15),
          dest,
        });
    },
  },
};

/**
 * Toca o ambiente: monta todas as camadas uma vez (em silêncio) e, a cada troca de zona,
 * leva cada uma ao nível da zona nova em `ramp` segundos.
 */
export class AmbiencePlayer {
  private layers: { def: PlacedLayer; gain: GainNode }[] = [];
  private stoppers: AudioScheduledSourceNode[] = [];
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private muffle?: BiquadFilterNode;
  private post?: BiquadFilterNode;
  private levels = new Map<string, number>();
  private zone?: Zone;
  private approach = false;
  private running = false;

  constructor(private readonly e: AudioEngine) {}

  get on(): boolean {
    return this.running;
  }

  start(zone: Zone): void {
    const c = this.e.ctx;
    if (this.running || !c) return;
    this.running = true;
    this.post = c.createBiquadFilter();
    this.post.type = 'lowpass';
    this.post.Q.value = 0.5;
    this.post.frequency.value = OPEN_AIR;
    this.post.connect(this.e.bus('amb'));
    this.muffle = c.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.Q.value = 0.5;
    this.muffle.frequency.value = OPEN_AIR;
    this.muffle.connect(this.post);
    for (const def of allLayers()) {
      const gain = c.createGain();
      gain.gain.value = 0.0001;
      gain.connect(def.outside ? this.muffle : this.post);
      this.layers.push({ def, gain });
      if (!def.sound) continue;
      if (def.kind === 'bed') AMBIENT_SOUNDS.beds[def.sound]?.(this.e, gain, this.stoppers);
      else this.schedule(def, gain);
    }
    this.setZone(zone, 2);
  }

  setZone(zone: Zone, ramp = 0.6): void {
    this.zone = zone;
    this.levels = zoneLevels(zone);
    this.apply(ramp);
  }

  /** Modo abordagem: o ambiente inteiro abafa. */
  setApproach(on: boolean): void {
    if (this.approach === on) return;
    this.approach = on;
    this.apply(0.3);
  }

  /** Abaixa o ambiente por um instante (avistado, abordagem, queimar): −8 dB por 1,5 s. */
  duck(seconds = 1.5): void {
    const c = this.e.ctx;
    if (!this.running || !c || !this.post) return;
    const t = c.currentTime;
    const amb = this.e.bus('amb') as GainNode;
    const base = amb.gain.value;
    amb.gain.cancelScheduledValues(t);
    amb.gain.setTargetAtTime(base * 0.4, t, 0.05);
    amb.gain.setTargetAtTime(base, t + seconds, 0.3);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    const t = this.e.ctx?.currentTime ?? 0;
    for (const { gain } of this.layers) {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0.0001, t, 0.15);
    }
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    const st = this.stoppers;
    this.stoppers = [];
    this.layers = [];
    setTimeout(() => {
      for (const s of st) {
        try {
          s.stop();
        } catch {
          // já parou
        }
      }
    }, 900);
  }

  private apply(ramp: number): void {
    const c = this.e.ctx;
    if (!this.running || !c || !this.zone) return;
    const t = c.currentTime;
    for (const { def, gain } of this.layers) {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(Math.max(this.levels.get(def.key) ?? 0, 0.0001), t, ramp / 3);
    }
    this.muffle!.frequency.cancelScheduledValues(t);
    this.muffle!.frequency.setTargetAtTime(zoneMuffle(this.zone), t, ramp / 3);
    this.post!.frequency.cancelScheduledValues(t);
    this.post!.frequency.setTargetAtTime(this.approach ? APPROACH_MUFFLE : OPEN_AIR, t, 0.1);
  }

  private schedule(def: PlacedLayer, gain: GainNode): void {
    const [min, max] = def.every ?? [5, 10];
    const play = AMBIENT_SOUNDS.events[def.sound!];
    if (!play) return;
    const next = (seconds: number) => {
      const id = setTimeout(() => {
        this.timers.delete(id);
        if (!this.running || !this.e.ctx) return;
        if ((this.levels.get(def.key) ?? 0) > 0.01)
          play(this.e, this.e.ctx.currentTime + 0.05, gain);
        next(rnd(min, max));
      }, seconds * 1000);
      this.timers.add(id);
    };
    next(rnd(min * 0.2, max * 0.6));
  }
}
