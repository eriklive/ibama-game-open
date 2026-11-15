// Acrescenta o kit de equipamento com volume (lib/kit.mjs) aos personagens já vestidos.
//
// Entrada: base/characters/<id>/<id>.glb, a saída de build-assets.mjs (corpo, cabelo, roupa
// pintada e os acessórios antigos). Saída: ../../public/assets/characters/<id>/<id>.glb.
// Como a base fica no repositório, dá para mexer no kit sem baixar os pacotes da Quaternius.
//
// Uso: node refit.mjs [--only=ana,bruno]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTERS } from './characters.mjs';
import { bodyMetrics } from './lib/bake.mjs';
import { PIECES, measure } from './lib/gear.mjs';
import { BodyShape, Kit, KIT, relaxLegs } from './lib/kit.mjs';
import { dequantizeSkinned } from './lib/glb-space.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const BASE = path.join(here, 'base');
const OUT = args.find((a) => a.startsWith('--out='))?.slice(6) ?? path.join(here, '../../public/assets');

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

async function refit(def) {
  const doc = await io.read(path.join(BASE, 'characters', def.id, `${def.id}.glb`));
  const root = doc.getRoot();
  dequantizeSkinned(doc);
  // os acessórios antigos são refeitos aqui
  for (const n of root.listNodes()) if (n.getName() === 'Gear') { n.getMesh()?.dispose(); n.dispose(); }
  for (const m of root.listMaterials()) if (m.getName() === 'Gear') m.dispose();

  const skin = root.listSkins()[0];
  const joints = skin.listJoints();
  const prims = root.listMeshes().flatMap((m) => m.listPrimitives());
  const bodyPrim = prims.find((p) => /Superhero/.test(p.getMaterial()?.getName() ?? ''));
  const brows = root.listNodes().find((n) => /Eyebrows/.test(n.getName())).getMesh().listPrimitives()[0];
  const M = bodyMetrics(skin);
  if (def.outfit?.pants) relaxLegs(bodyPrim, joints.map((j) => j.getName()), { y0: 0.12, y1: M.waistY + 0.02 });
  const body = new BodyShape(bodyPrim, joints.map((j) => j.getName()));
  const headW = new Float32Array(body.nv), torsoW = new Float32Array(body.nv);
  for (let i = 0; i < body.nv; i++) { headW[i] = body.part(i, 'head'); torsoW[i] = body.part(i, 'torso'); }
  // `measure` quer o peso só do osso Head (não do pescoço)
  const headIdx = joints.findIndex((j) => j.getName() === 'Head');
  for (let i = 0; i < body.nv; i++) { let w = 0, s = 0; for (let k = 0; k < 4; k++) { s += body.W[i * 4 + k]; if (body.J[i * 4 + k] === headIdx) w += body.W[i * 4 + k]; } headW[i] = w / (s || 1); }
  const H = measure(body.pos, headW, torsoW, M, brows.getAttribute('POSITION').getMax([])[1]);
  const kit = new Kit(body);
  const ctx = { body, M, H };
  for (const [piece, opts] of def.kit ?? []) {
    if (!KIT[piece]) throw new Error(`peça de kit desconhecida: ${piece}`);
    const before = kit.idx.length;
    KIT[piece](kit, ctx, opts ?? {});
    if (process.env.KIT_DEBUG) console.log(`  ${piece}: ${(kit.idx.length - before) / 3} tri`);
  }
  for (const [piece, opts] of def.gear ?? []) {
    if (KIT[piece] && def.kit?.some(([k]) => k === piece)) continue;
    PIECES[piece](kit, H, M, { ...opts, surface: opts?.surface ?? surfaceNear(body) });
  }
  if (!kit.empty) {
    const armature = root.listNodes().find((n) => n.getMesh() && n.getSkin())?.getParentNode();
    const mat = doc.createMaterial('Gear').setRoughnessFactor(0.78).setMetallicFactor(0).setDoubleSided(true);
    const node = doc.createNode('Gear').setMesh(doc.createMesh('Gear').addPrimitive(kit.toPrimitive(doc, mat))).setSkin(skin);
    armature.addChild(node);
  }
  await doc.transform(prune(), dedup(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const dir = path.join(OUT, 'characters', def.id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${def.id}.glb`);
  await io.write(file, doc);
  const tris = root.listMeshes().flatMap((m) => m.listPrimitives()).reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
  const gearTris = root.listMeshes().find((m) => m.getName() === 'Gear')?.listPrimitives()[0].getIndices().getCount() / 3 || 0;
  console.log(`${def.id.padEnd(12)} ${(fs.statSync(file).size / 1024).toFixed(0).padStart(5)} KB  ${Math.round(tris)} triângulos (kit: ${Math.round(gearTris)})`);
}

/** Ponto da superfície do tronco mais próximo de p, um pouco para fora (colar de miçangas). */
function surfaceNear(body) {
  const set = body.select((i) => body.part(i, 'torso') > 0.5);
  return (p) => {
    const near = [];
    for (const i of set) {
      const d = Math.hypot(body.pos[i * 3] - p[0], body.pos[i * 3 + 1] - p[1], body.pos[i * 3 + 2] - p[2]);
      if (near.length < 3 || d < near[2][0]) { near.push([d, i]); near.sort((a, b) => a[0] - b[0]); near.length = Math.min(3, near.length); }
    }
    const out = [0, 0, 0]; let sum = 0;
    for (const [d, i] of near) { const w = 1 / (d + 1e-4); sum += w; for (let k = 0; k < 3; k++) out[k] += w * (body.pos[i * 3 + k] + body.nor[i * 3 + k] * 0.007); }
    return out.map((v) => v / sum);
  };
}

for (const def of CHARACTERS) if (!only || only.includes(def.id)) await refit(def);
// a biblioteca de clipes não muda no refit: se o build a gerou em base/, só copia
const anims = path.join(BASE, 'anims/humanoid-base.glb');
if (!only && fs.existsSync(anims)) {
  fs.mkdirSync(path.join(OUT, 'anims'), { recursive: true });
  fs.copyFileSync(anims, path.join(OUT, 'anims/humanoid-base.glb'));
}
console.log('ok');
