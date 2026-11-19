import { Injectable, signal } from '@angular/core';
import { AmbiencePlayer, Zone, sameZone } from './audio/ambience';
import { AudioEngine, LoopHandle, MusicHandle } from './audio/engine';
import { Boot, Surface, step } from './audio/footsteps';
import { HIDDEN_RANGE, OCCLUDED, distanceGain } from './audio/positional';
import { SOUNDS, SoundId, fireLoop, spottedFallback } from './audio/sounds';
import { HexCoord, hexDistance } from './hex';

const STORAGE_KEY = 'ibama.sound';
/** Alerta de avistado (arquivo do dono do projeto; ver `public/assets/LICENSES.md`). */
export const ALERT_URL = 'assets/sounds/alerta-inimigo.mp3';
/** Faixa da perseguição (arquivo do dono do projeto; ver `public/assets/LICENSES.md`). */
export const CHASE_MUSIC_URL = 'assets/sounds/perseguicao.mp3';

/** A faixa da perseguição: volume, velocidade do "ultra slow" e tempos das rampas. */
export const CHASE_MUSIC = {
  level: 0.9,
  fadeIn: 0.3,
  fadeOut: 1.2,
  /** Curva, porta, escolha: a fita cai para isto (tempo e tom juntos). */
  slowRate: 0.25,
  slowRamp: 0.4,
  /** Na decisão a fita volta rápido, no mesmo ponto da faixa. */
  resumeRamp: 0.15,
  /** Distância (hexágonos) em que a faixa fica toda abafada; colado, toda aberta. */
  farDistance: 6,
} as const;

/** Volume de cada fogo, de perto. */
const FIRE_LEVEL = { plane: 1.2, other: 0.8 } as const;

interface Fire {
  hexes: readonly HexCoord[];
  base: number;
  handle: LoopHandle;
}

/**
 * Som do jogo: efeitos (`play`), passos (`step`), fogo em loop e o ambiente por zona. O áudio
 * só começa depois de um toque ou tecla (regra dos navegadores); sem Web Audio, tudo vira
 * silêncio. Pode ser desligado no menu, e a escolha fica guardada no navegador.
 */
@Injectable({ providedIn: 'root' })
export class Sound {
  readonly supported = AudioEngine.available();
  readonly enabled = signal<boolean>(this.load());

  private readonly engine = new AudioEngine();
  private readonly ambience = new AmbiencePlayer(this.engine);
  private alert: AudioBuffer | null = null;
  private alertLoading = false;
  private chaseTrack: AudioBuffer | null = null;
  private chaseLoading?: Promise<void>;
  private music?: MusicHandle;
  private listener?: HexCoord;
  private zone?: Zone;
  private readonly fires = new Map<string, Fire>();

  constructor() {
    if (typeof document === 'undefined') return;
    const unlock = () => this.unlock();
    document.addEventListener('pointerdown', unlock, { capture: true });
    document.addEventListener('keydown', unlock, { capture: true });
  }

  setEnabled(on: boolean): void {
    this.enabled.set(on);
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    } catch {
      // sem armazenamento (aba anônima, por exemplo): vale só nesta sessão
    }
    if (on) this.unlock();
    else this.silence();
  }

  /** Liga o áudio (precisa vir de um toque ou tecla na primeira vez). */
  unlock(): void {
    if (!this.supported || !this.enabled()) return;
    if (!this.engine.start()) return;
    this.engine.setMaster(1, 0.05);
    void this.loadAlert();
    void this.loadChase();
    if (this.zone && !this.ambience.on) this.ambience.start(this.zone);
  }

  /** Efeito do catálogo. `at`: de onde vem (fica mais baixo longe do agente da vez). */
  play(id: SoundId, opts: { at?: HexCoord; delay?: number } = {}): void {
    if (!this.ready()) return;
    const gain = this.gainAt(opts.at);
    if (gain <= 0) return;
    this.withScale(gain, () => SOUNDS[id](this.engine, this.engine.now() + (opts.delay ?? 0)));
  }

  /** Inimigo avistou alguém: o alerta (arquivo) e o ambiente abaixa um instante. */
  spotted(): void {
    if (!this.ready()) return;
    const t = this.engine.now();
    if (this.alert) this.engine.sample(this.alert, t, 'estado');
    else spottedFallback(this.engine, t);
    this.ambience.duck();
  }

  /** Abaixa o ambiente por um instante (abordagem, queimar). */
  duck(): void {
    if (this.ready()) this.ambience.duck();
  }

  /**
   * Uma pisada em `surface`, daqui a `delay` s. `hidden`: debaixo de um telhado que o jogador
   * não vê (abafado, e só de perto).
   */
  step(
    surface: Surface,
    opts: { delay?: number; boot?: Boot; gain?: number; at?: HexCoord; hidden?: boolean } = {},
  ): void {
    if (!this.ready()) return;
    const dist = opts.at && this.listener ? hexDistance(opts.at, this.listener) : 0;
    if (opts.hidden && dist > HIDDEN_RANGE) return;
    const gain = this.gainAt(opts.at);
    if (gain <= 0) return;
    const dest = opts.hidden ? this.engine.muffled('passos', OCCLUDED) : undefined;
    step(this.engine, surface, this.engine.now() + (opts.delay ?? 0), {
      boot: opts.boot,
      gain: (opts.gain ?? 1) * gain,
      dest,
    });
  }

  /** O agente da vez (o ouvinte) mudou de lugar: reavalia o volume dos fogos. */
  setListener(hex: HexCoord | undefined): void {
    this.listener = hex;
    for (const f of this.fires.values()) f.handle.setLevel(this.fireLevel(f), 0.8);
  }

  /** Zona do ambiente (bioma, interior, estado do jogo). */
  setZone(zone: Zone): void {
    if (this.zone && sameZone(this.zone, zone)) return;
    this.zone = zone;
    if (!this.ready()) return;
    if (!this.ambience.on) this.ambience.start(zone);
    else this.ambience.setZone(zone);
  }

  /** Modo abordagem: o ambiente abafa. */
  setApproach(on: boolean): void {
    if (this.ready()) this.ambience.setApproach(on);
  }

  // ---------- perseguição ----------

  /** Começou a perseguição: entra a faixa e o ambiente abafa. */
  async chaseStart(distance: number): Promise<void> {
    if (!this.ready()) return;
    await this.loadChase();
    if (!this.chaseTrack || !this.ready() || this.music) return;
    this.music = this.engine.music(this.chaseTrack, CHASE_MUSIC.level, CHASE_MUSIC.fadeIn);
    this.chaseDistance(distance, 0.05);
    this.ambience.setApproach(true);
  }

  /** Curva, porta ou escolha: a fita cai para o ultra slow (`true`) ou volta (`false`). */
  chaseSlow(on: boolean): void {
    this.music?.setRate(on ? CHASE_MUSIC.slowRate : 1, on ? CHASE_MUSIC.slowRamp : CHASE_MUSIC.resumeRamp);
  }

  /** A distância mudou: mais perto, a faixa abre. */
  chaseDistance(distance: number, ramp = 0.4): void {
    this.music?.setBrightness(1 - Math.min(distance, CHASE_MUSIC.farDistance) / CHASE_MUSIC.farDistance, ramp);
  }

  /** Fim da perseguição: a faixa some e o ambiente volta. */
  chaseEnd(): void {
    this.music?.stop(CHASE_MUSIC.fadeOut);
    this.music = undefined;
    if (this.ready()) this.ambience.setApproach(false);
  }

  /** Um alvo pegou fogo: fica queimando (em loop) até recomeçar ou sair. */
  ignite(id: string, hexes: readonly HexCoord[], plane: boolean): void {
    if (!this.ready() || this.fires.has(id)) return;
    const fire = { hexes, base: plane ? FIRE_LEVEL.plane : FIRE_LEVEL.other } as Fire;
    fire.handle = fireLoop(this.engine, this.fireLevel(fire), undefined, plane ? 1.4 : 1, 0.8);
    this.fires.set(id, fire);
  }

  clearFires(): void {
    for (const f of this.fires.values()) f.handle.stop(0.5);
    this.fires.clear();
  }

  /** Saiu da partida: para o ambiente e os loops. */
  stopAll(): void {
    this.clearFires();
    this.music = undefined;
    this.ambience.stop();
    this.engine.stopLoops();
    this.zone = undefined;
  }

  /** O som está ligado e destravado (há o que ouvir). */
  audible(): boolean {
    return this.ready() && this.engine.running;
  }

  private ready(): boolean {
    return this.supported && this.enabled() && this.engine.ctx !== null;
  }

  private silence(): void {
    this.engine.setMaster(0, 0.05);
  }

  private gainAt(at: HexCoord | undefined): number {
    return at && this.listener ? distanceGain(hexDistance(at, this.listener)) : 1;
  }

  private fireLevel(f: Fire): number {
    if (!this.listener) return f.base;
    const d = Math.min(...f.hexes.map((h) => hexDistance(h, this.listener!)));
    // o fogo grande ainda se ouve longe; o ambiente "fogo distante" cobre o resto
    return f.base * Math.max(0.08, distanceGain(d));
  }

  private withScale(k: number, fn: () => void): void {
    const prev = this.engine.scale;
    this.engine.scale = k;
    try {
      fn();
    } finally {
      this.engine.scale = prev;
    }
  }

  private async loadAlert(): Promise<void> {
    if (this.alert || this.alertLoading || typeof fetch === 'undefined') return;
    this.alertLoading = true;
    try {
      const res = await fetch(ALERT_URL);
      if (res.ok) this.alert = await this.engine.decode(await res.arrayBuffer());
    } catch {
      // sem o arquivo, o alerta sintetizado entra no lugar
    } finally {
      this.alertLoading = false;
    }
  }

  private loadChase(): Promise<void> {
    if (this.chaseTrack || typeof fetch === 'undefined' || !this.engine.ctx) return Promise.resolve();
    this.chaseLoading ??= (async () => {
      try {
        const res = await fetch(CHASE_MUSIC_URL);
        if (res.ok) this.chaseTrack = await this.engine.decode(await res.arrayBuffer());
      } catch {
        // sem o arquivo, a perseguição corre sem música
      } finally {
        this.chaseLoading = undefined;
      }
    })();
    return this.chaseLoading;
  }

  private load(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  }
}
