import { AudioEngine, BusId, LoopHandle, pick, rnd } from './engine';

/**
 * Receitas de som aprovadas no caderno de som (rodada 6). Cada uma recebe o motor e o tempo
 * de início; nenhuma tem voz. Os ids seguem os do caderno (`ui.hex`, `porta.gazua`…).
 */

// ---------- blocos compartilhados ----------

export function click(e: AudioEngine, t: number, gain = 0.2, bus: BusId = 'ui', f = 2200): void {
  e.noise({ t, type: 'bandpass', f, Q: 2, dur: 0.012, gain, bus });
}

export function marimba(
  e: AudioEngine,
  t: number,
  f: number,
  gain = 0.15,
  bus: BusId = 'ui',
): void {
  e.tone({ t, f, dur: 0.45, gain, bus });
  e.tone({ t, f: f * 4, dur: 0.07, gain: gain * 0.25, bus });
}

export function thud(e: AudioEngine, t: number, gain = 0.7, bus: BusId = 'mundo', f = 90): void {
  e.tone({ t, f, f2: f * 0.45, dur: 0.25, gain, bus });
  e.noise({ t, kind: 'brown', type: 'lowpass', f: 500, dur: 0.15, gain: gain * 0.6, bus });
}

export function rattle(
  e: AudioEngine,
  t: number,
  n = 4,
  gain = 0.2,
  bus: BusId = 'mundo',
  f = 2200,
): void {
  for (let i = 0; i < n; i++) {
    e.noise({
      t: t + i * rnd(0.025, 0.04),
      type: 'bandpass',
      f: f * rnd(0.85, 1.15),
      Q: 3,
      dur: 0.025,
      gain: gain * (1 - i / (n + 1)),
      bus,
    });
  }
}

export function metalClank(
  e: AudioEngine,
  t: number,
  gain = 0.07,
  bus: BusId = 'mundo',
  base = 600,
  dest?: AudioNode,
): void {
  for (const m of [1, 2.41, 3.87, 5.6])
    e.tone({
      t,
      f: base * m * rnd(0.98, 1.02),
      dur: rnd(0.25, 0.5),
      gain: (gain / m) * 1.6,
      bus,
      dest,
    });
  e.noise({ t, type: 'bandpass', f: 3000, Q: 1.5, dur: 0.03, gain: gain * 3, bus, dest });
}

export function whoosh(
  e: AudioEngine,
  t: number,
  f1: number,
  f2: number,
  dur: number,
  gain = 0.2,
  bus: BusId = 'estado',
): void {
  e.noise({ t, kind: 'pink', type: 'bandpass', f: f1, f2, Q: 0.9, dur, a: dur * 0.55, gain, bus });
}

/** Rangido por atrito (dobradiça, tábua): estalinhos que fazem dois filtros estreitos ressoarem. */
export function creak(
  e: AudioEngine,
  t: number,
  dur: number,
  o: {
    f?: number;
    gain?: number;
    rate0?: number;
    rate1?: number;
    bus?: BusId;
    pan?: number;
    dest?: AudioNode;
  } = {},
): void {
  const c = e.ctx;
  if (!c) return;
  const f = o.f ?? 650;
  const inp = c.createGain();
  const b1 = c.createBiquadFilter();
  b1.type = 'bandpass';
  b1.frequency.value = f;
  b1.Q.value = 14;
  const b2 = c.createBiquadFilter();
  b2.type = 'bandpass';
  b2.frequency.value = f * 2.13;
  b2.Q.value = 10;
  const g = c.createGain();
  g.gain.value = 9;
  inp.connect(b1);
  inp.connect(b2);
  b1.connect(g);
  b2.connect(g);
  g.connect(e.out({ bus: o.bus, pan: o.pan, dest: o.dest }));
  const r0 = o.rate0 ?? 35;
  const r1 = o.rate1 ?? 95;
  let tt = t;
  while (tt < t + dur) {
    const k = Math.sin(((tt - t) / dur) * Math.PI);
    e.noise({
      t: tt,
      type: 'highpass',
      f: 300,
      dur: 0.004,
      gain: (o.gain ?? 0.25) * (0.4 + 0.6 * k),
      dest: inp,
    });
    tt += (1 / (r0 + (r1 - r0) * k)) * rnd(0.8, 1.2);
  }
}

export function chimeUp(e: AudioEngine, t: number, bus: BusId = 'estado', gain = 0.1): void {
  [523, 659, 784, 1047].forEach((f, i) => {
    e.tone({ t: t + i * 0.06, type: 'triangle', f, dur: 0.4, gain, bus });
    e.tone({ t: t + i * 0.06, f: f * 2, dur: 0.25, gain: gain * 0.3, bus });
  });
}

export function chimeDown(e: AudioEngine, t: number, bus: BusId = 'estado', gain = 0.12): void {
  e.tone({ t, type: 'triangle', f: 330, dur: 0.25, gain, bus, lp: 1200 });
  e.tone({ t: t + 0.14, type: 'triangle', f: 247, dur: 0.4, gain, bus, lp: 900 });
  e.tone({ t: t + 0.14, f: 70, f2: 50, dur: 0.2, gain: 0.25, bus });
}

export function sparkle(e: AudioEngine, t: number, bus: BusId = 'estado'): void {
  [1568, 2093, 2637, 3136, 4186].forEach((f, i) =>
    e.tone({ t: t + i * 0.05, f, dur: 0.5, gain: 0.045, bus }),
  );
  e.noise({ t, type: 'highpass', f: 7500, dur: 0.5, a: 0.12, gain: 0.03, bus });
}

function radioSquelch(e: AudioEngine, t: number, short = false, bus: BusId = 'ui'): void {
  e.tone({ t, f: 1250, dur: 0.06, gain: 0.06, bus });
  e.noise({
    t: t + 0.07,
    type: 'bandpass',
    f: 1800,
    Q: 1.4,
    dur: short ? 0.09 : 0.2,
    a: 0.003,
    hold: short ? 0.05 : 0.14,
    gain: 0.14,
    bus,
  });
  click(e, t + (short ? 0.17 : 0.28), 0.18, bus, 2600);
}

/** Rádio do agente: aperta o botão, chiado, bipe de duas notas e solta. */
function radioTurn(e: AudioEngine, t: number): void {
  click(e, t, 0.22, 'ui', 1800);
  e.noise({
    t: t + 0.02,
    type: 'bandpass',
    f: 1900,
    Q: 1.3,
    dur: 0.16,
    a: 0.004,
    hold: 0.1,
    gain: 0.09,
    bus: 'ui',
  });
  e.tone({ t: t + 0.2, type: 'square', f: 1200, dur: 0.07, gain: 0.035, bus: 'ui', lp: 3000 });
  e.tone({ t: t + 0.27, type: 'square', f: 1600, dur: 0.09, gain: 0.035, bus: 'ui', lp: 3000 });
  e.noise({ t: t + 0.36, type: 'bandpass', f: 1900, Q: 1.3, dur: 0.06, gain: 0.06, bus: 'ui' });
  click(e, t + 0.42, 0.16, 'ui', 2400);
}

/**
 * Dados caindo em papel. Cada dado tem "energia": quica, tomba (batidas duplas de quina e
 * face), às vezes desliza, e no fim balança na quina antes de assentar. O tamanho do dado
 * decide o peso (d4 = 1, d20 ≈ 2,2: mais grave e mais lento). Devolve a duração.
 */
export function diceRoll(e: AudioEngine, t0: number, n: number, sides: number): number {
  const bus: BusId = 'ui';
  const mass = Math.sqrt(sides / 4);
  const hit = (t: number, amp: number, pan: number) => {
    e.noise({
      t,
      type: 'bandpass',
      f: rnd(1400, 2600) / mass,
      Q: rnd(1.2, 2.2),
      dur: rnd(0.012, 0.025) * mass,
      gain: 0.3 * amp,
      bus,
      pan,
    });
    e.tone({
      t,
      f: rnd(240, 330) / mass,
      f2: rnd(170, 220) / mass,
      dur: 0.05 + 0.02 * mass,
      gain: 0.4 * amp,
      bus,
      pan,
    });
    if (Math.random() < 0.5)
      e.tone({ t, f: rnd(1000, 1700) / Math.sqrt(mass), dur: 0.025, gain: 0.04 * amp, bus, pan });
  };
  let end = t0;
  for (let k = 0; k < n; k++) {
    const pan = n > 1 ? (k ? 0.25 : -0.25) : 0;
    let t = t0 + k * rnd(0.03, 0.14);
    let energy = rnd(0.85, 1);
    hit(t, energy, pan);
    while (energy > 0.12) {
      const r = Math.random();
      if (r < 0.45) {
        t += Math.sqrt(energy) * rnd(0.08, 0.2) * (0.85 + mass * 0.15);
        hit(t, energy * rnd(0.7, 1), pan);
      } else if (r < 0.8) {
        t += rnd(0.04, 0.11) * (0.85 + mass * 0.15);
        const m = Math.random() < 0.5 ? 2 : 3;
        for (let i = 0; i < m; i++) hit(t + i * rnd(0.018, 0.05), energy * rnd(0.45, 0.9), pan);
        t += m * 0.03;
      } else {
        t += rnd(0.03, 0.08);
        e.noise({
          t,
          kind: 'pink',
          type: 'bandpass',
          f: rnd(900, 1600) / mass,
          Q: 0.8,
          dur: rnd(0.05, 0.12),
          a: 0.01,
          gain: 0.1 * energy,
          bus,
          pan,
        });
        t += 0.06;
      }
      energy *= rnd(0.55, 0.85);
    }
    let gap = rnd(0.06, 0.09);
    let amp = energy * 1.6 + 0.08;
    for (let i = 0; i < Math.floor(rnd(3, 6)); i++) {
      t += gap;
      hit(t, amp, pan);
      gap *= rnd(0.55, 0.75);
      amp *= 0.6;
    }
    end = Math.max(end, t);
  }
  if (sides > 4)
    e.noise({
      t: t0,
      kind: 'pink',
      type: 'bandpass',
      f: 1400 / mass,
      Q: 0.8,
      dur: (end - t0) * 0.8 + 0.1,
      a: 0.05,
      gain: 0.04,
      bus,
    });
  return end - t0;
}

function unlockClack(e: AudioEngine, t: number): void {
  e.tone({ t, f: 1800, f2: 1200, dur: 0.04, gain: 0.18 });
  e.noise({ t, type: 'bandpass', f: 2500, Q: 2, dur: 0.03, gain: 0.3 });
  e.tone({ t: t + 0.09, f: 1500, f2: 1000, dur: 0.04, gain: 0.15 });
  e.noise({ t: t + 0.09, type: 'bandpass', f: 2200, Q: 2, dur: 0.03, gain: 0.25 });
  e.tone({ t: t + 0.1, f: 160, f2: 100, dur: 0.07, gain: 0.25 });
}

/** Uma tentativa na maçaneta; `f` (0–1) é a força. */
function knobTry(e: AudioEngine, t: number, f: number): void {
  e.noise({
    t,
    type: 'bandpass',
    f: 3200,
    f2: 2200,
    Q: 2,
    dur: 0.07,
    a: 0.01,
    gain: 0.05 + 0.05 * f,
  });
  e.tone({ t: t + 0.06, f: 1250, dur: 0.07, gain: 0.05 + 0.06 * f, lp: 2600 });
  e.tone({ t: t + 0.06, f: 3100, dur: 0.04, gain: 0.02 + 0.02 * f });
  e.noise({ t: t + 0.06, type: 'bandpass', f: 1500, Q: 2.5, dur: 0.03, gain: 0.2 + 0.25 * f });
  thud(e, t + 0.07, 0.12 + 0.25 * f, 'mundo', 120);
  rattle(e, t + 0.09, 2 + Math.round(f * 3), 0.08 + 0.14 * f, 'mundo', 900);
  e.noise({ t: t + 0.2, type: 'bandpass', f: 2600, Q: 2, dur: 0.05, gain: 0.03 + 0.03 * f });
}

function kickHit(e: AudioEngine, t: number): void {
  thud(e, t, 0.85, 'mundo', 95);
  e.noise({ t, type: 'bandpass', f: 1200, Q: 0.8, dur: 0.15, gain: 0.55 });
}

function ignite(e: AudioEngine, t: number, big: boolean): void {
  e.noise({
    t,
    kind: 'pink',
    type: 'bandpass',
    f: 250,
    f2: big ? 2600 : 1800,
    Q: 0.8,
    dur: big ? 1.5 : 0.9,
    a: 0.25,
    gain: big ? 0.7 : 0.5,
  });
  e.tone({ t, f: 72, f2: 34, dur: big ? 1.3 : 0.6, a: 0.02, gain: big ? 0.6 : 0.4 });
  e.noise({ t: t + 0.05, kind: 'brown', type: 'lowpass', f: 400, dur: 1.2, a: 0.15, gain: 0.4 });
}

function explosion(e: AudioEngine, t: number, gain = 0.8): void {
  e.tone({ t, f: 62, f2: 28, dur: 1, gain, a: 0.004 });
  e.noise({ t, kind: 'brown', type: 'lowpass', f: 1400, f2: 140, dur: 1.2, a: 0.004, gain });
  e.noise({ t, type: 'bandpass', f: 900, Q: 0.6, dur: 0.25, gain: gain * 0.5 });
  for (let i = 0; i < 10; i++)
    e.noise({
      t: t + rnd(0.1, 0.9),
      type: 'highpass',
      f: rnd(2000, 5000),
      dur: rnd(0.005, 0.02),
      gain: rnd(0.05, 0.2),
    });
}

/** Metal gemendo no calor. */
function groan(e: AudioEngine, t: number, dur = 2, gain = 0.12): void {
  const c = e.ctx;
  if (!c) return;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(rnd(48, 62), t);
  o.frequency.linearRampToValueAtTime(rnd(38, 46), t + dur);
  const lfo = c.createOscillator();
  lfo.frequency.value = rnd(3, 6);
  const lg = c.createGain();
  lg.gain.value = 25;
  lfo.connect(lg);
  lg.connect(o.detune);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 420;
  f.Q.value = 7;
  const g = c.createGain();
  e.envelope(g, t, { a: dur * 0.4, gain }, dur);
  o.connect(f);
  f.connect(g);
  g.connect(e.bus('mundo'));
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + 0.1);
  lfo.stop(t + dur + 0.1);
}

function pencil(e: AudioEngine, t: number, dur = 0.45): void {
  let tt = t;
  while (tt < t + dur) {
    e.noise({
      t: tt,
      type: 'highpass',
      f: rnd(2500, 4000),
      dur: rnd(0.02, 0.05),
      a: 0.006,
      gain: rnd(0.04, 0.1),
      bus: 'ui',
    });
    tt += rnd(0.03, 0.06);
  }
}

/** Lápis em traço contínuo, com a pressão variando aos poucos. */
function pencilSoft(e: AudioEngine, t: number, dur = 0.4): void {
  const c = e.ctx;
  if (!c) return;
  const stoppers: AudioScheduledSourceNode[] = [];
  const g = c.createGain();
  g.gain.value = 0;
  g.connect(e.bus('ui'));
  const { filter } = e.loopNoise('pink', 'bandpass', 2600, 0.8, 1, g, stoppers);
  const N = 64;
  const curve = new Float32Array(N);
  let v = 0.5;
  for (let i = 0; i < N; i++) {
    v = Math.min(1, Math.max(0.15, v + rnd(-0.25, 0.25)));
    const edge = Math.min(1, i / 6, (N - 1 - i) / 6);
    curve[i] = 0.05 * v * edge * e.scale + 0.0001;
  }
  g.gain.setValueCurveAtTime(curve, t, dur);
  filter.frequency.setValueCurveAtTime(
    Float32Array.from(curve, (x) => 1800 + x * 20000),
    t,
    dur,
  );
  for (const s of stoppers) s.stop(t + dur + 0.05);
}

function paperFlip(e: AudioEngine, t: number): void {
  e.noise({
    t,
    type: 'bandpass',
    f: 3600,
    f2: 1600,
    Q: 0.6,
    dur: 0.14,
    a: 0.015,
    gain: 0.22,
    bus: 'ui',
  });
  e.noise({ t: t + 0.1, type: 'bandpass', f: 1400, Q: 0.8, dur: 0.06, gain: 0.1, bus: 'ui' });
}

function stamp(e: AudioEngine, t: number): void {
  e.tone({ t, f: 130, f2: 55, dur: 0.16, gain: 0.6, bus: 'estado' });
  e.noise({ t, kind: 'pink', type: 'lowpass', f: 2200, dur: 0.08, gain: 0.5, bus: 'estado' });
  e.noise({
    t: t + 0.01,
    kind: 'pink',
    type: 'bandpass',
    f: 1100,
    Q: 0.5,
    dur: 0.22,
    gain: 0.1,
    bus: 'estado',
  });
}

function mystery(e: AudioEngine, t: number): void {
  for (const [f, d] of [
    [440, 0],
    [523, 0.16],
    [622, 0.32],
    [740, 0.5],
  ]) {
    e.tone({ t: t + d, type: 'triangle', f, dur: 1.1, a: 0.01, gain: 0.07, bus: 'estado' });
    e.tone({ t: t + d, f: f * 2, dur: 0.5, gain: 0.02, bus: 'estado' });
  }
  e.tone({ t, type: 'triangle', f: 110, dur: 1.6, a: 0.4, gain: 0.12, bus: 'estado' });
  e.noise({ t: t + 0.2, type: 'highpass', f: 6000, dur: 1.2, a: 0.5, gain: 0.015, bus: 'estado' });
}

function solved(e: AudioEngine, t: number): void {
  for (const [f, d] of [
    [440, 0],
    [523, 0.09],
    [622, 0.18],
  ])
    e.tone({ t: t + d, type: 'triangle', f, dur: 0.3, gain: 0.06, bus: 'estado' });
  for (const [f, d] of [
    [440, 0.3],
    [554, 0.3],
    [659, 0.3],
    [880, 0.42],
  ]) {
    e.tone({ t: t + d, type: 'triangle', f, dur: 1.2, a: 0.01, gain: 0.07, bus: 'estado' });
    e.tone({ t: t + d, f: f * 2, dur: 0.6, gain: 0.025, bus: 'estado' });
  }
  sparkle(e, t + 0.45);
}

/**
 * Fim de capítulo: a tensão sobe ao contrário até o golpe, impacto duplo grave e seco, golpe
 * saturado com corte abrupto, prato longo, eco metálico de um lado ao outro e um ronco que
 * segura a cena congelada. Sem notas. `t` é o golpe (a subida começa 0,5 s antes).
 */
function novelaFreeze(e: AudioEngine, t: number): void {
  const c = e.ctx;
  if (!c) return;
  const B: BusId = 'estado';
  const stoppers: AudioScheduledSourceNode[] = [];
  {
    const g = c.createGain();
    g.connect(e.bus(B));
    const { filter } = e.loopNoise('pink', 'bandpass', 300, 0.9, 1, g, stoppers);
    filter.frequency.setValueAtTime(300, t - 0.5);
    filter.frequency.exponentialRampToValueAtTime(3500, t);
    g.gain.setValueAtTime(0.0001, t - 0.5);
    g.gain.exponentialRampToValueAtTime(0.35 * e.scale, t - 0.005);
    g.gain.linearRampToValueAtTime(0, t);
    for (const s of stoppers) s.stop(t + 0.02);
    e.tone({ t: t - 0.5, f: 40, f2: 70, dur: 0.5, a: 0.45, gain: 0.25, bus: B });
  }
  for (const [d, k] of [
    [0, 1],
    [0.06, 0.6],
  ]) {
    e.tone({ t: t + d, f: 58, f2: 28, dur: 0.9, a: 0.002, gain: 0.9 * k, bus: B });
    e.tone({
      t: t + d,
      type: 'triangle',
      f: 115,
      f2: 50,
      dur: 0.4,
      a: 0.002,
      gain: 0.55 * k,
      bus: B,
    });
    e.noise({
      t: t + d,
      kind: 'brown',
      type: 'lowpass',
      f: 3200,
      f2: 250,
      dur: 0.35,
      a: 0.002,
      gain: 0.8 * k,
      bus: B,
    });
  }
  const ws = c.createWaveShaper();
  const N = 1024;
  const curve = new Float32Array(N);
  for (let i = 0; i < N; i++) curve[i] = Math.tanh(((i / (N - 1)) * 2 - 1) * 9);
  ws.curve = curve;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 6000;
  const g = c.createGain();
  const peak = 0.28 * e.scale;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.003);
  g.gain.setValueAtTime(Math.max(peak, 0.0002), t + 0.16);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  const pre = c.createGain();
  pre.gain.value = 0.7;
  pre.connect(ws);
  ws.connect(lp);
  lp.connect(g);
  g.connect(e.bus(B));
  for (const f of [55, 73, 97, 131, 158, 211, 277]) {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f * rnd(0.98, 1.02);
    o.connect(pre);
    o.start(t);
    o.stop(t + 0.3);
  }
  const scale = e.scale;
  e.scale = 1;
  e.noise({
    t,
    type: 'bandpass',
    f: 1200,
    Q: 0.5,
    dur: 0.24,
    a: 0.002,
    hold: 0.14,
    gain: 0.9,
    dest: pre,
  });
  e.scale = scale;
  e.noise({ t, type: 'highpass', f: 4500, dur: 1.6, a: 0.003, gain: 0.12, bus: B });
  e.noise({ t, type: 'bandpass', f: 6500, Q: 1.5, dur: 1.1, a: 0.003, gain: 0.08, bus: B });
  for (let i = 1; i <= 8; i++) {
    const tt = t + i * 0.11;
    const k = Math.pow(0.62, i);
    const pan = i % 2 ? -0.6 : 0.6;
    e.noise({
      t: tt,
      type: 'bandpass',
      f: 2700 - i * 180,
      Q: 6,
      dur: 0.12,
      a: 0.002,
      gain: 0.4 * k,
      bus: B,
      pan,
    });
    e.tone({ t: tt, f: 1870, dur: 0.14, gain: 0.06 * k, bus: B, pan });
    e.tone({ t: tt, f: 2950, dur: 0.1, gain: 0.04 * k, bus: B, pan });
    e.tone({ t: tt, f: 70, f2: 45, dur: 0.2, gain: 0.25 * k, bus: B });
  }
  e.noise({
    t: t + 0.1,
    kind: 'brown',
    type: 'lowpass',
    f: 160,
    dur: 2.2,
    a: 0.2,
    gain: 0.35,
    bus: B,
  });
}

function gasoline(e: AudioEngine, t: number, dur = 1.6): void {
  let tt = t;
  while (tt < t + dur) {
    const f = rnd(180, 320);
    e.tone({ t: tt, f, f2: f * 2.2, dur: 0.05, gain: 0.18 });
    tt += rnd(0.08, 0.16);
  }
  e.noise({
    t: t + 0.05,
    kind: 'pink',
    type: 'bandpass',
    f: 1300,
    Q: 0.6,
    dur,
    a: 0.15,
    hold: dur * 0.6,
    gain: 0.12,
  });
  for (let i = 0; i < dur * 50; i++)
    e.noise({
      t: t + rnd(0.1, dur),
      type: 'bandpass',
      f: rnd(2500, 6000),
      Q: 3,
      dur: 0.01,
      gain: rnd(0.02, 0.06),
    });
}

function strikeTry(e: AudioEngine, t: number, gain: number, len: number, spark: boolean): void {
  e.noise({ t, type: 'bandpass', f: 3800, f2: 2200, Q: 1.5, dur: len, gain });
  if (spark)
    for (let i = 0; i < 3; i++)
      e.noise({ t: t + rnd(0, len), type: 'highpass', f: 5000, dur: 0.006, gain: 0.1 });
}

/** Mata fechada: muitas folhas grandes e galhos quebrando. */
export function foliage(e: AudioEngine, t: number, dur: number, gain = 0.25, pan = 0): void {
  const bus: BusId = 'passos';
  e.noise({
    t,
    kind: 'pink',
    type: 'bandpass',
    f: 1800,
    Q: 0.5,
    dur,
    a: dur * 0.3,
    hold: dur * 0.3,
    gain: gain * 0.5,
    bus,
    pan,
  });
  e.noise({
    t,
    kind: 'pink',
    type: 'bandpass',
    f: 3800,
    Q: 0.7,
    dur,
    a: dur * 0.25,
    gain: gain * 0.3,
    bus,
    pan,
  });
  for (let i = 0; i < dur * 110; i++)
    e.noise({
      t: t + rnd(0, dur),
      type: 'bandpass',
      f: rnd(1800, 5000),
      Q: 1,
      dur: rnd(0.006, 0.02),
      gain: rnd(0.03, 0.1) * gain * 3,
      bus,
      pan,
    });
  for (let i = 0; i < Math.ceil(dur * 3); i++) {
    const tt = t + rnd(0, dur);
    e.noise({
      t: tt,
      type: 'bandpass',
      f: rnd(900, 1600),
      Q: 2,
      dur: 0.02,
      gain: gain * 0.9,
      bus,
      pan,
    });
    e.tone({ t: tt, f: rnd(250, 400), f2: 150, dur: 0.04, gain: gain * 0.3, bus, pan });
  }
}

/** Alerta sintetizado: só toca se o arquivo `alerta-inimigo.mp3` ainda não carregou. */
export function spottedFallback(e: AudioEngine, t: number): void {
  const c = e.ctx;
  if (!c) return;
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.3 * e.scale + 0.0002, t + 0.002);
  env.gain.setValueAtTime(0.3 * e.scale + 0.0002, t + 0.1);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  env.connect(e.bus('estado'));
  for (const [type, det] of [
    ['sawtooth', 0],
    ['sawtooth', 12],
  ] as const) {
    const o = c.createOscillator();
    o.type = type;
    o.detune.value = det;
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.02);
    o.frequency.setValueAtTime(880, t + 0.03);
    o.frequency.exponentialRampToValueAtTime(1320, t + 0.045);
    o.frequency.setValueAtTime(1320, t + 0.055);
    o.frequency.exponentialRampToValueAtTime(1980, t + 0.07);
    const g = c.createGain();
    g.gain.value = 0.6;
    o.connect(g);
    g.connect(env);
    o.start(t);
    o.stop(t + 0.6);
  }
}

// ---------- loops ----------

/** Fogo queimando: ronco grave, chiado e estalos. `level` 1 é o avião de perto. */
export function fireLoop(
  e: AudioEngine,
  level = 1,
  dest?: AudioNode,
  crackle = 1,
  fadeIn = 0.5,
): LoopHandle {
  return e.loop(
    dest ?? e.bus('mundo'),
    level,
    (out, stoppers) => {
      e.loopNoise('brown', 'lowpass', 260, 0.7, 0.55, out, stoppers);
      const roar = e.loopNoise('pink', 'bandpass', 600, 0.7, 0.14, out, stoppers);
      e.loopNoise('white', 'highpass', 5500, 0.7, 0.02, out, stoppers);
      e.lfo(0.6, 0.08, roar.gain.gain, stoppers);
      return (g) => {
        const base = e.ctx!.currentTime + 0.05;
        const scale = e.scale;
        e.scale = 1;
        for (let k = 0; k < 3; k++)
          if (Math.random() < 0.4 * crackle)
            e.noise({
              t: base + rnd(0, 0.06),
              type: 'highpass',
              f: rnd(1500, 5000),
              dur: rnd(0.003, 0.02),
              gain: rnd(0.05, 0.35),
              dest: g,
            });
        if (Math.random() < 0.05 * crackle) {
          e.noise({ t: base, type: 'bandpass', f: 700, Q: 1, dur: 0.04, gain: 0.3, dest: g });
          e.tone({ t: base, f: 180, f2: 90, dur: 0.04, gain: 0.15, dest: g });
        }
        e.scale = scale;
      };
    },
    fadeIn,
  );
}

// ---------- catálogo ----------

export type SoundId =
  | 'ui.hex'
  | 'ui.caminho'
  | 'ui.mira'
  | 'ui.confirmar'
  | 'ui.invalido'
  | 'ui.vez-agente'
  | 'ui.vez-inimigo'
  | 'ui.passar'
  | 'ui.retrato'
  | 'ui.relogio'
  | 'dado.2d4'
  | 'dado.d20'
  | 'teste.passou'
  | 'teste.falhou'
  | 'teste.20'
  | 'porta.abrir'
  | 'porta.trancada'
  | 'porta.gazua'
  | 'porta.destrancou'
  | 'porta.chute-ok'
  | 'porta.chute-falha'
  | 'ini.encurralado'
  | 'ini.rende'
  | 'ini.foge'
  | 'abo.modo'
  | 'abo.onda'
  | 'abo.carimbo'
  | 'abo.cancelar'
  | 'eq.agrupar'
  | 'eq.desagrupar'
  | 'eq.vasculhar'
  | 'eq.percebeu'
  | 'eq.chave'
  | 'eq.aviao-trancado'
  | 'eq.closeup'
  | 'eq.anotar'
  | 'eq.confessou'
  | 'fogo.riscar'
  | 'fogo.pegar'
  | 'fogo.aviao'
  | 'fogo.tambor'
  | 'fogo.encerrar';

/** Duração do "Queimar!" (gasolina, três riscadas e o sucesso) até o fogo pegar. */
export const STRIKE_SECONDS = 3.4;
/**
 * Quando cada riscada do `fogo.riscar` toca (s desde o "Queimar!"): a primeira falha, a segunda
 * solta faísca e a terceira acende. A animação do fósforo em tela cheia segue os mesmos tempos.
 */
export const STRIKE_BEATS = { fail: 1.9, spark: 2.35, lit: 2.8 } as const;

export const SOUNDS: Readonly<Record<SoundId, (e: AudioEngine, t: number) => void>> = {
  'ui.hex': (e, t) => {
    e.tone({ t, f: 1400, dur: 0.05, gain: 0.08, bus: 'ui' });
    e.tone({ t, f: 2800, dur: 0.03, gain: 0.025, bus: 'ui' });
  },
  'ui.caminho': (e, t) =>
    [880, 988, 1175, 1319].forEach((f, i) =>
      e.tone({ t: t + i * 0.04, type: 'triangle', f, dur: 0.14, gain: 0.04, bus: 'ui' }),
    ),
  // alvo tocado uma vez: "trava-mira" — dois bipes agudos e um tom que sobe
  'ui.mira': (e, t) => {
    e.tone({ t, type: 'square', f: 1760, dur: 0.035, gain: 0.035, bus: 'ui', lp: 4000 });
    e.tone({ t: t + 0.06, type: 'square', f: 1760, dur: 0.035, gain: 0.035, bus: 'ui', lp: 4000 });
    e.tone({ t: t + 0.12, type: 'triangle', f: 880, f2: 1320, dur: 0.18, gain: 0.07, bus: 'ui' });
  },
  'ui.confirmar': (e, t) => {
    e.tone({ t, type: 'triangle', f: 660, dur: 0.09, gain: 0.13, bus: 'ui' });
    e.tone({ t: t + 0.07, type: 'triangle', f: 990, dur: 0.16, gain: 0.13, bus: 'ui' });
  },
  'ui.invalido': (e, t) => {
    e.tone({ t, type: 'triangle', f: 220, dur: 0.08, gain: 0.1, bus: 'ui', lp: 900 });
    e.tone({ t: t + 0.08, type: 'triangle', f: 196, dur: 0.12, gain: 0.1, bus: 'ui', lp: 900 });
  },
  'ui.vez-agente': radioTurn,
  'ui.vez-inimigo': (e, t) => {
    e.tone({ t, f: 72, f2: 48, dur: 0.45, gain: 0.5, bus: 'estado' });
    marimba(e, t + 0.05, 392, 0.14, 'estado');
    marimba(e, t + 0.25, 370, 0.14, 'estado');
    e.noise({
      t,
      kind: 'pink',
      type: 'lowpass',
      f: 500,
      dur: 0.8,
      a: 0.2,
      gain: 0.08,
      bus: 'estado',
    });
  },
  'ui.passar': (e, t) => {
    marimba(e, t, 659, 0.11);
    marimba(e, t + 0.14, 494, 0.11);
  },
  'ui.retrato': (e, t) => {
    e.noise({ t, type: 'bandpass', f: 3000, Q: 1, dur: 0.03, gain: 0.18, bus: 'ui' });
    e.tone({ t, f: 1000, dur: 0.03, gain: 0.03, bus: 'ui' });
  },
  // relógio do aviso de curva no Modo Corrida: tique-taque de 1 s (4 batidas, a última mais aguda)
  'ui.relogio': (e, t) =>
    [0, 0.25, 0.5, 0.75].forEach((dt, i) => {
      e.noise({ t: t + dt, type: 'bandpass', f: i % 2 ? 2600 : 3400, Q: 6, dur: 0.025, gain: 0.22, bus: 'ui' });
      e.tone({ t: t + dt, f: i === 3 ? 1760 : i % 2 ? 1100 : 1320, dur: 0.035, gain: 0.05, bus: 'ui' });
    }),
  'dado.2d4': (e, t) => void diceRoll(e, t, 2, 4),
  'dado.d20': (e, t) => void diceRoll(e, t, 1, 20),
  'teste.passou': (e, t) => chimeUp(e, t),
  'teste.falhou': (e, t) => chimeDown(e, t),
  'teste.20': (e, t) => {
    chimeUp(e, t);
    sparkle(e, t + 0.25);
  },
  'porta.abrir': (e, t) => {
    unlockClack(e, t);
    creak(e, t + 0.12, 0.9, { f: 620, gain: 0.22, rate0: 25, rate1: 70 });
    thud(e, t + 1.05, 0.15, 'mundo', 110);
  },
  'porta.trancada': (e, t) => {
    knobTry(e, t, 0.2);
    knobTry(e, t + 0.55, 0.7);
    knobTry(e, t + 0.95, 0.85);
    thud(e, t + 1.45, 0.8, 'mundo', 85);
    e.noise({ t: t + 1.45, kind: 'pink', type: 'lowpass', f: 1200, dur: 0.12, gain: 0.35 });
    rattle(e, t + 1.47, 7, 0.25, 'mundo', 750);
    rattle(e, t + 1.5, 4, 0.1, 'mundo', 1500);
  },
  'porta.gazua': (e, t) => {
    // gazua sólida dentro do trinco: poucas batidas abafadas pela madeira, espaçamento irregular
    const n = Math.floor(rnd(4, 6));
    let tt = t;
    for (let i = 0; i < n; i++) {
      const g = rnd(0.6, 1);
      const f = rnd(850, 1350);
      e.tone({ t: tt, f, dur: rnd(0.06, 0.11), gain: 0.09 * g, lp: 2200 });
      e.tone({ t: tt, f: f * 2.71, dur: 0.04, gain: 0.025 * g, lp: 2600 });
      e.tone({ t: tt, f: rnd(170, 210), f2: 140, dur: 0.06, gain: 0.12 * g });
      e.noise({
        t: tt,
        kind: 'pink',
        type: 'bandpass',
        f: 1400,
        Q: 1.5,
        dur: 0.02,
        gain: 0.12 * g,
      });
      if (Math.random() < 0.3)
        e.noise({
          t: tt + 0.04,
          kind: 'pink',
          type: 'bandpass',
          f: 1600,
          Q: 2,
          dur: rnd(0.06, 0.12),
          a: 0.02,
          gain: 0.04,
        });
      tt += pick([rnd(0.12, 0.2), rnd(0.25, 0.4), rnd(0.4, 0.55)]);
    }
  },
  'porta.destrancou': (e, t) => {
    unlockClack(e, t);
    creak(e, t + 0.2, 0.6, { f: 640, gain: 0.18 });
  },
  'porta.chute-ok': (e, t) => {
    kickHit(e, t);
    for (let i = 0; i < 8; i++)
      e.noise({
        t: t + rnd(0.01, 0.12),
        type: 'highpass',
        f: rnd(2500, 5000),
        dur: rnd(0.006, 0.02),
        gain: rnd(0.08, 0.2),
      });
    creak(e, t + 0.04, 0.25, { f: 560, gain: 0.2, rate0: 80, rate1: 160 });
    thud(e, t + 0.32, 0.75, 'mundo', 75);
    rattle(e, t + 0.34, 5, 0.22);
  },
  'porta.chute-falha': (e, t) => {
    kickHit(e, t);
    rattle(e, t + 0.03, 6, 0.25, 'mundo', 1600);
  },
  'ini.encurralado': (e, t) => {
    thud(e, t, 0.4, 'estado', 80);
    thud(e, t + 0.18, 0.35, 'estado', 72);
    e.tone({
      t: t + 0.1,
      type: 'sawtooth',
      f: 220,
      f2: 233,
      dur: 0.8,
      gain: 0.06,
      bus: 'estado',
      lp: 900,
    });
  },
  'ini.rende': (e, t) => {
    metalClank(e, t, 0.08, 'mundo', 520);
    metalClank(e, t + 0.19, 0.035, 'mundo', 540);
    novelaFreeze(e, t + 1);
  },
  'ini.foge': (e, t) => {
    foliage(e, t, 0.8, 0.2, 0.5);
    foliage(e, t + 0.45, 1.2, 0.3, 0.85);
  },
  'abo.modo': (e, t) => {
    e.noise({
      t,
      kind: 'pink',
      type: 'lowpass',
      f: 3200,
      f2: 380,
      Q: 0.7,
      dur: 1.3,
      a: 0.05,
      gain: 0.18,
      bus: 'estado',
    });
    e.tone({ t, f: 55, dur: 1.5, a: 0.5, gain: 0.25, bus: 'estado' });
  },
  'abo.onda': (e, t) => {
    whoosh(e, t, 400, 2000, 0.5, 0.22);
    for (let i = 0; i < 4; i++) {
      const tt = t + 0.08 + i * 0.09;
      e.tone({
        t: tt,
        f: 180 + i * 45,
        f2: (180 + i * 45) * 0.8,
        dur: 0.12,
        gain: 0.18,
        bus: 'estado',
      });
      e.noise({ t: tt, type: 'highpass', f: 3000, dur: 0.01, gain: 0.06, bus: 'estado' });
    }
  },
  'abo.carimbo': stamp,
  'abo.cancelar': (e, t) => {
    whoosh(e, t, 2000, 400, 0.35, 0.15);
    e.tone({ t, f: 440, f2: 330, dur: 0.18, gain: 0.05, bus: 'estado' });
  },
  'eq.agrupar': (e, t) => {
    radioSquelch(e, t);
    for (let i = 0; i < 3; i++)
      e.noise({
        t: t + 0.4 + i * 0.08,
        kind: 'pink',
        type: 'bandpass',
        f: 1500,
        Q: 0.6,
        dur: 0.08,
        a: 0.01,
        gain: 0.15,
        bus: 'ui',
      });
  },
  'eq.desagrupar': (e, t) => radioSquelch(e, t, true),
  'eq.vasculhar': (e, t) => {
    for (let i = 0; i < 9; i++)
      e.noise({
        t: t + i * rnd(0.08, 0.14),
        kind: Math.random() < 0.5 ? 'pink' : 'white',
        type: 'bandpass',
        f: rnd(1200, 4000),
        Q: rnd(0.5, 2),
        dur: rnd(0.04, 0.12),
        a: 0.01,
        gain: rnd(0.06, 0.18),
      });
    thud(e, t + 0.55, 0.2, 'mundo', 130);
  },
  'eq.percebeu': mystery,
  'eq.chave': (e, t) => {
    for (let i = 0; i < 6; i++) {
      const tt = t + rnd(0, 0.22);
      e.tone({ t: tt, f: rnd(3000, 6200), dur: rnd(0.08, 0.2), gain: 0.04 });
      e.noise({ t: tt, type: 'bandpass', f: 7000, Q: 3, dur: 0.01, gain: 0.06 });
    }
    solved(e, t + 0.25);
  },
  'eq.aviao-trancado': (e, t) => {
    for (let i = 0; i < 3; i++) {
      e.noise({ t: t + i * 0.08, type: 'bandpass', f: 1100, Q: 3, dur: 0.035, gain: 0.25 });
      e.tone({ t: t + i * 0.08, f: 520, dur: 0.06, gain: 0.05 });
    }
    thud(e, t + 0.02, 0.2, 'mundo', 120);
  },
  'eq.closeup': (e, t) => {
    whoosh(e, t, 300, 1200, 0.7, 0.14);
    e.tone({ t, f: 60, dur: 1.1, a: 0.35, gain: 0.1, bus: 'estado' });
  },
  'eq.anotar': (e, t) => {
    paperFlip(e, t);
    pencilSoft(e, t + 0.2, 0.35);
    pencilSoft(e, t + 0.62, 0.25);
    pencilSoft(e, t + 0.95, 0.4);
  },
  'eq.confessou': (e, t) => {
    pencil(e, t, 0.35);
    e.noise({ t: t + 0.42, type: 'highpass', f: 2200, dur: 0.28, a: 0.02, gain: 0.14, bus: 'ui' });
    marimba(e, t + 0.5, 294, 0.14);
  },
  'fogo.riscar': (e, t) => {
    gasoline(e, t, 1.6);
    strikeTry(e, t + STRIKE_BEATS.fail, 0.2, 0.05, false);
    strikeTry(e, t + STRIKE_BEATS.spark, 0.26, 0.07, true);
    strikeTry(e, t + STRIKE_BEATS.lit, 0.32, 0.09, true);
    e.noise({
      t: t + 2.88,
      kind: 'pink',
      type: 'bandpass',
      f: 1300,
      Q: 0.7,
      dur: 0.55,
      a: 0.04,
      gain: 0.2,
    });
    chimeUp(e, t + 3.5);
  },
  'fogo.pegar': (e, t) => ignite(e, t, false),
  'fogo.aviao': (e, t) => {
    ignite(e, t, true);
    groan(e, t + 1, 2.5);
    explosion(e, t + 2.6, 0.7);
    groan(e, t + 3.6, 2);
  },
  'fogo.tambor': (e, t) => explosion(e, t),
  'fogo.encerrar': (e, t) => {
    radioSquelch(e, t, false, 'estado');
    [262, 330, 392, 494].forEach((f, i) => {
      e.tone({
        t: t + 0.45 + i * 0.12,
        type: 'triangle',
        f,
        dur: 2.8,
        a: 0.6,
        gain: 0.05,
        bus: 'estado',
      });
      e.tone({ t: t + 0.45 + i * 0.12, f: f / 2, dur: 2.8, a: 0.8, gain: 0.04, bus: 'estado' });
    });
  },
};
