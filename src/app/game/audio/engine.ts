/**
 * Motor de som: um `AudioContext`, cinco barramentos e os blocos de síntese (ruído filtrado,
 * tons com envelope, rangido, baque…) com que as receitas de `sounds.ts` são montadas.
 * Tudo é gerado na hora com Web Audio; arquivos (MP3) entram por `sample`.
 *
 * Os barramentos e seus volumes vêm do caderno de som (rodada 6):
 * Ambiente, Mundo, Passos, Interface e Estados.
 */

export type BusId = 'amb' | 'mundo' | 'passos' | 'ui' | 'estado';
export type NoiseKind = 'white' | 'pink' | 'brown';

/** Volumes de cada barramento (0–1), acertados no caderno de som. */
export const BUS_VOLUMES: Readonly<Record<BusId, number>> = {
  amb: 1,
  mundo: 0.86,
  passos: 1,
  ui: 1,
  estado: 1,
};

/** Volume geral (antes do compressor). */
export const MASTER_VOLUME = 0.7;

export interface Voice {
  /** Quando começa (tempo do `AudioContext`); padrão: agora. */
  t?: number;
  dur?: number;
  gain?: number;
  /** Ataque (s). */
  a?: number;
  /** Sustentação depois do ataque (s). */
  hold?: number;
  bus?: BusId;
  pan?: number;
  /** Destino em vez do barramento (camada de ambiente, filtro de oclusão…). */
  dest?: AudioNode;
}

export interface NoiseOpts extends Voice {
  kind?: NoiseKind;
  type?: BiquadFilterType;
  f?: number;
  f2?: number;
  Q?: number;
  glide?: number;
}

export interface ToneOpts extends Voice {
  type?: OscillatorType;
  f?: number;
  f2?: number;
  glide?: number;
  detune?: number;
  lp?: number;
  lp2?: number;
  lpQ?: number;
}

/** Algo que toca até mandar parar (fogo, camada de ambiente). */
export interface LoopHandle {
  stop(fade?: number): void;
  setLevel(level: number, ramp?: number): void;
}

export const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
export const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const G = (v: number) => Math.max(v, 0.0002);

type AudioContextCtor = new () => AudioContext;
const contextCtor = (): AudioContextCtor | undefined =>
  typeof window === 'undefined'
    ? undefined
    : (window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext);

export class AudioEngine {
  ctx: AudioContext | null = null;
  /** Multiplica o volume das vozes criadas (som posicional: distância até a câmera). */
  scale = 1;
  private master?: GainNode;
  private readonly buses = new Map<BusId, GainNode>();
  private readonly noises = new Map<NoiseKind, AudioBuffer>();
  private readonly loops = new Set<LoopHandle>();
  private readonly filters = new Map<string, BiquadFilterNode>();

  static available(): boolean {
    return !!contextCtor();
  }

  /** Cria o contexto (na primeira vez) e tenta destravá-lo. Devolve se há som. */
  start(): boolean {
    if (!this.ctx) {
      const Ctor = contextCtor();
      if (!Ctor) return false;
      try {
        this.build(new Ctor());
      } catch {
        return false;
      }
    }
    if (this.ctx!.state === 'suspended') void this.ctx!.resume().catch(() => undefined);
    return true;
  }

  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  now(): number {
    return (this.ctx?.currentTime ?? 0) + 0.03;
  }

  bus(id: BusId): AudioNode {
    return this.buses.get(id)!;
  }

  setMaster(v: number, ramp = 0.05): void {
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, ramp);
  }

  /** Um passa-baixa ligado ao barramento: destino para som abafado (parede, porta fechada). */
  muffled(bus: BusId, freq: number): AudioNode {
    const key = `${bus}:${freq}`;
    const cached = this.filters.get(key);
    if (cached) return cached;
    const f = this.ctx!.createBiquadFilter();
    this.filters.set(key, f);
    f.type = 'lowpass';
    f.frequency.value = freq;
    f.Q.value = 0.5;
    f.connect(this.bus(bus));
    return f;
  }

  close(): void {
    for (const l of [...this.loops]) l.stop(0);
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.buses.clear();
    this.filters.clear();
  }

  /** Para todos os loops (fogo etc.). */
  stopLoops(fade = 0.3): void {
    for (const l of [...this.loops]) l.stop(fade);
  }

  // ---------- blocos ----------

  out(o: Voice): AudioNode {
    let dest: AudioNode = o.dest ?? this.bus(o.bus ?? 'mundo');
    if (o.pan) {
      const p = this.ctx!.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      p.connect(dest);
      dest = p;
    }
    return dest;
  }

  envelope(g: GainNode, t: number, o: Voice, dur: number): void {
    const a = o.a ?? 0.002;
    const hold = o.hold ?? 0;
    const peak = G((o.gain ?? 0.3) * this.scale);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    if (hold) g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + hold + 0.005));
  }

  noise(o: NoiseOpts): void {
    const c = this.ctx;
    if (!c) return;
    const t = o.t ?? this.now();
    const dur = o.dur ?? 0.1;
    const s = c.createBufferSource();
    s.buffer = this.noises.get(o.kind ?? 'white')!;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.Q.value = o.Q ?? 1;
    f.frequency.setValueAtTime(o.f ?? 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide ?? dur));
    const g = c.createGain();
    this.envelope(g, t, o, dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.out(o));
    s.start(t, Math.random() * 2);
    s.stop(t + dur + 0.05);
  }

  tone(o: ToneOpts): void {
    const c = this.ctx;
    if (!c) return;
    const t = o.t ?? this.now();
    const dur = o.dur ?? 0.2;
    const s = c.createOscillator();
    s.type = o.type ?? 'sine';
    s.frequency.setValueAtTime(o.f ?? 440, t);
    if (o.f2) s.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide ?? dur));
    if (o.detune) s.detune.value = o.detune;
    const g = c.createGain();
    this.envelope(g, t, o, dur);
    let node: AudioNode = s;
    if (o.lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = o.lpQ ?? 1;
      f.frequency.setValueAtTime(o.lp, t);
      if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + dur);
      s.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.out(o));
    s.start(t);
    s.stop(t + dur + 0.05);
  }

  /** Toca um arquivo já decodificado. */
  sample(buffer: AudioBuffer, t: number, bus: BusId, gain = 1, dest?: AudioNode): void {
    const c = this.ctx;
    if (!c) return;
    const s = c.createBufferSource();
    s.buffer = buffer;
    const g = c.createGain();
    g.gain.value = gain * this.scale;
    s.connect(g);
    g.connect(dest ?? this.bus(bus));
    s.start(t);
  }

  async decode(data: ArrayBuffer): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      return await this.ctx.decodeAudioData(data);
    } catch {
      return null;
    }
  }

  /**
   * Fonte de ruído em loop, filtrada, com volume fixo, ligada a `dest`. Devolve os nós (para
   * modular) e registra a fonte em `stoppers` para parar depois.
   */
  loopNoise(
    kind: NoiseKind,
    type: BiquadFilterType,
    f: number,
    Q: number,
    gain: number,
    dest: AudioNode,
    stoppers: AudioScheduledSourceNode[],
  ): { filter: BiquadFilterNode; gain: GainNode } {
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = this.noises.get(kind)!;
    s.loop = true;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = Q;
    const g = c.createGain();
    g.gain.value = gain;
    s.connect(fl);
    fl.connect(g);
    g.connect(dest);
    s.start(c.currentTime, Math.random() * 2);
    stoppers.push(s);
    return { filter: fl, gain: g };
  }

  /** Oscilador lento somado a um parâmetro (respiração, tremolo). */
  lfo(freq: number, amount: number, param: AudioParam, stoppers: AudioScheduledSourceNode[]): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = amount;
    o.connect(g);
    g.connect(param);
    o.start(c.currentTime);
    stoppers.push(o);
  }

  /** Tom contínuo (zumbido). */
  hum(freq: number, gain: number, dest: AudioNode, stoppers: AudioScheduledSourceNode[]): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = gain;
    o.connect(g);
    g.connect(dest);
    o.start(c.currentTime);
    stoppers.push(o);
  }

  /**
   * Monta um loop: `build` cria as fontes ligadas ao ganho do loop e pode devolver um
   * agendador chamado a cada 60 ms (estalos do fogo). O volume entra em `fadeIn` segundos.
   */
  loop(
    dest: AudioNode,
    level: number,
    build: (
      out: GainNode,
      stoppers: AudioScheduledSourceNode[],
    ) => ((out: GainNode) => void) | void,
    fadeIn = 0.5,
  ): LoopHandle {
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(G(level), c.currentTime + fadeIn);
    g.connect(dest);
    const stoppers: AudioScheduledSourceNode[] = [];
    const tick = build(g, stoppers);
    const iv = tick ? setInterval(() => this.ctx && tick(g), 60) : undefined;
    let dead = false;
    const handle: LoopHandle = {
      stop: (fade = 0.8) => {
        if (dead) return;
        dead = true;
        clearInterval(iv);
        this.loops.delete(handle);
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(G(g.gain.value), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, fade));
        for (const s of stoppers) {
          try {
            s.stop(t + fade + 0.1);
          } catch {
            // já parou
          }
        }
      },
      setLevel: (v, ramp = 0.5) => {
        if (dead || !this.ctx) return;
        const t = this.ctx.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(G(v), t, ramp / 3);
      },
    };
    this.loops.add(handle);
    return handle;
  }

  private build(c: AudioContext): void {
    this.ctx = c;
    this.master = c.createGain();
    this.master.gain.value = MASTER_VOLUME;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    this.master.connect(comp);
    comp.connect(c.destination);
    for (const [id, vol] of Object.entries(BUS_VOLUMES) as [BusId, number][]) {
      const g = c.createGain();
      g.gain.value = vol;
      g.connect(this.master);
      this.buses.set(id, g);
    }
    // 3 s de cada ruído; as fontes tocam em loop a partir de um ponto sorteado
    const len = c.sampleRate * 3;
    const mk = () => c.createBuffer(1, len, c.sampleRate);
    const w = mk();
    const p = mk();
    const br = mk();
    const wd = w.getChannelData(0);
    const pd = p.getChannelData(0);
    const bd = br.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0,
      last = 0;
    for (let i = 0; i < len; i++) {
      const x = Math.random() * 2 - 1;
      wd[i] = x;
      // ruído rosa (filtro de Paul Kellet) e marrom (passeio aleatório)
      b0 = 0.99886 * b0 + x * 0.0555179;
      b1 = 0.99332 * b1 + x * 0.0750759;
      b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856;
      b4 = 0.55 * b4 + x * 0.5329522;
      b5 = -0.7616 * b5 - x * 0.016898;
      pd[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11;
      b6 = x * 0.115926;
      last = (last + 0.02 * x) / 1.02;
      bd[i] = last * 3.5;
    }
    this.noises.set('white', w);
    this.noises.set('pink', p);
    this.noises.set('brown', br);
  }
}
