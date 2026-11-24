// Gera public/assets/anims/humanoid-base.glb (só esqueleto + clipes) a partir das duas
// bibliotecas CC0 da Quaternius: Universal Animation Library (UAL1) e Universal Animation
// Library 2 (UAL2). As duas usam o mesmo esqueleto de 65 ossos dos nossos personagens, então os
// clipes ligam pelo nome do osso, sem retarget.
// Uso: ver tools/assets/README.md
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, resample, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';

const [UAL1, UAL2, OUT] = process.argv.slice(2);
if (!UAL1 || !UAL2 || !OUT) {
  console.error('uso: node build-anims.mjs <Universal Animation Library> <Universal Animation Library 2> <saída>');
  process.exit(1);
}
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

/** Clipes em loop, inteiros, só renomeados. */
const LOOPS = { Idle_Loop: 'idle', Walk_Loop: 'walk', Jog_Fwd_Loop: 'run', Crouch_Idle_Loop: 'crouch', Sprint_Loop: 'sprint' };

/**
 * Gestos do Modo Corrida: pedaços de clipes (`[início, fim]` em segundos) emendados num clipe só.
 * O jogo não toca esses clipes no relógio: ele os percorre do começo ao fim no tempo do gesto
 * (`CharacterRig.scrub`), então a duração aqui só define o ritmo relativo entre os pedaços.
 * `gap` é o tempo da transição entre um pedaço e o próximo (as poses se misturam nesse trecho).
 */
const GESTURES = {
  // pulo encolhido (ninja) e o pouso agachado: o pouso chega no fim, quando o pulo do jogo acaba
  jump: [
    ['ual2', 'NinjaJump_Start', 0.08, 0.6],
    ['ual2', 'NinjaJump_Land', 0.0, 0.22],
  ],
  // deita de lado deslizando e levanta já correndo
  slide: [
    ['ual2', 'Slide_Start', 0.12, 0.5],
    ['ual2', 'Slide_Exit', 0.05, 0.49],
  ],
  // tropeço no obstáculo: agacha com as mãos perto do chão e se recupera
  trip: [['ual1', 'Jump_Land', 0.1, 0.75]],
  // bateu na parede da curva: voa para trás, cai de costas e levanta correndo
  crash: [
    ['ual2', 'Hit_Knockback', 0.0, 0.45],
    ['ual2', 'Slide_Exit', 0.0, 0.49],
  ],
};
const GAP = 0.08;

const docs = {
  ual1: await io.read(path.join(UAL1, 'Unreal-Godot/UAL1_Standard.glb')),
  ual2: await io.read(path.join(UAL2, 'Unreal-Godot/UAL2_Standard.glb')),
};

// ---------- trilhas como dados ----------

/** Valor de uma trilha em `t` (linear; rotação por nlerp no caminho curto). */
function sampleAt(track, t) {
  const { times, values, size, rotation } = track;
  const n = times.length;
  const at = (i) => values.slice(i * size, i * size + size);
  if (t <= times[0]) return at(0);
  if (t >= times[n - 1]) return at(n - 1);
  let i = 1;
  while (times[i] < t) i++;
  const a = at(i - 1);
  const b = at(i);
  const k = (t - times[i - 1]) / (times[i] - times[i - 1]);
  if (!rotation) return a.map((v, j) => v + (b[j] - v) * k);
  const dot = a.reduce((s, v, j) => s + v * b[j], 0);
  const sign = dot < 0 ? -1 : 1;
  const q = a.map((v, j) => v + (sign * b[j] - v) * k);
  const len = Math.hypot(...q) || 1;
  return q.map((v) => v / len);
}

/** Trilhas de um clipe, por `osso/caminho`. */
function tracksOf(doc, name) {
  const anim = doc.getRoot().listAnimations().find((a) => a.getName() === name);
  if (!anim) throw new Error(`clipe ${name} não encontrado`);
  const out = new Map();
  for (const ch of anim.listChannels()) {
    const s = ch.getSampler();
    if (s.getInterpolation() !== 'LINEAR') throw new Error(`${name}: interpolação ${s.getInterpolation()} não suportada`);
    const node = ch.getTargetNode().getName();
    const p = ch.getTargetPath();
    out.set(`${node}/${p}`, {
      node,
      path: p,
      times: Array.from(s.getInput().getArray()),
      values: Array.from(s.getOutput().getArray()),
      size: s.getOutput().getElementSize(),
      rotation: p === 'rotation',
    });
  }
  return out;
}

/** Pose de repouso de um osso (para trilhas que um pedaço não tem). */
function restOf(doc, node, p) {
  const n = doc.getRoot().listNodes().find((x) => x.getName() === node);
  return p === 'rotation' ? n.getRotation() : p === 'scale' ? n.getScale() : n.getTranslation();
}

/** Emenda os pedaços num clipe só: `{ chave: { node, path, times, values, size } }`. */
function compose(parts) {
  const pieces = parts.map(([src, clip, t0, t1]) => ({ doc: docs[src], tracks: tracksOf(docs[src], clip), t0, t1 }));
  const keys = new Set(pieces.flatMap((p) => [...p.tracks.keys()]));
  const out = new Map();
  for (const key of keys) {
    const [node, p] = key.split('/');
    const size = p === 'rotation' ? 4 : 3;
    const times = [];
    const values = [];
    let offset = 0;
    for (const piece of pieces) {
      const tr = piece.tracks.get(key);
      const push = (t, v) => {
        times.push(offset + t - piece.t0);
        values.push(...v);
      };
      if (!tr) {
        const rest = restOf(piece.doc, node, p);
        push(piece.t0, rest);
        push(piece.t1, rest);
      } else {
        push(piece.t0, sampleAt(tr, piece.t0));
        for (let i = 0; i < tr.times.length; i++) {
          if (tr.times[i] > piece.t0 + 1e-4 && tr.times[i] < piece.t1 - 1e-4) push(tr.times[i], sampleAt(tr, tr.times[i]));
        }
        push(piece.t1, sampleAt(tr, piece.t1));
      }
      offset += piece.t1 - piece.t0 + GAP;
    }
    out.set(key, { node, path: p, times, values, size });
  }
  return out;
}

// ---------- saída: a UAL1 sem boneco, com os clipes escolhidos ----------

const doc = docs.ual1;
const root = doc.getRoot();
const buffer = root.listBuffers()[0];
for (const a of root.listAnimations()) {
  if (LOOPS[a.getName()]) {
    a.setName(LOOPS[a.getName()]);
    continue;
  }
  if (Object.values(GESTURES).some((parts) => parts.some(([src, clip]) => src === 'ual1' && clip === a.getName()))) {
    // ainda serve de fonte para um gesto: sai depois
    continue;
  }
  a.listChannels().forEach((c) => c.dispose());
  a.listSamplers().forEach((s) => s.dispose());
  a.dispose();
}

const nodeByName = new Map(root.listNodes().map((n) => [n.getName(), n]));
for (const [name, parts] of Object.entries(GESTURES)) {
  const anim = doc.createAnimation(name);
  for (const tr of compose(parts).values()) {
    const target = nodeByName.get(tr.node);
    if (!target) continue;
    const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(tr.times)).setBuffer(buffer);
    const output = doc
      .createAccessor()
      .setType(tr.size === 4 ? 'VEC4' : 'VEC3')
      .setArray(new Float32Array(tr.values))
      .setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
    anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(target).setTargetPath(tr.path).setSampler(sampler));
  }
}

const keep = new Set([...Object.values(LOOPS), ...Object.keys(GESTURES)]);
for (const a of root.listAnimations()) {
  if (keep.has(a.getName())) continue;
  a.listChannels().forEach((c) => c.dispose());
  a.listSamplers().forEach((s) => s.dispose());
  a.dispose();
}
for (const n of root.listNodes()) {
  n.setMesh(null);
  n.setSkin(null);
}
root.listSkins().forEach((s) => s.dispose());
root.listMeshes().forEach((m) => m.dispose());
await doc.transform(resample(), prune({ keepLeaves: true }), dedup(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
fs.mkdirSync(path.join(OUT, 'anims'), { recursive: true });
const file = path.join(OUT, 'anims/humanoid-base.glb');
await io.write(file, doc);
for (const a of root.listAnimations()) {
  const end = Math.max(...a.listSamplers().map((s) => s.getInput().getMax([])[0]));
  console.log(`${a.getName().padEnd(8)} ${end.toFixed(2)} s`);
}
console.log(`${file}: ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
