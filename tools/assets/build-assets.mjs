// Gera public/assets/characters/<id>/<id>.glb (um por personagem de characters.mjs) e
// public/assets/anims/humanoid-base.glb a partir dos pacotes CC0 da Quaternius
// (Universal Base Characters + Universal Animation Library).
// Uso: ver tools/assets/README.md
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, quantize, resample, meshopt, mergeDocuments, unpartition } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { CHARACTERS } from './characters.mjs';
import { dressBody, bodyMetrics, hex } from './lib/bake.mjs';
import { Gear, PIECES, measure } from './lib/gear.mjs';

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const [UBC, UAL, OUT] = args.filter((a) => !a.startsWith('--'));
if (!UBC || !UAL || !OUT) {
  console.error('uso: node build-assets.mjs <Universal Base Characters> <Universal Animation Library> <saída> [--only=id,id]');
  process.exit(1);
}
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const BASE = path.join(UBC, 'Base Characters/Godot - UE');
const HAIR = path.join(UBC, 'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)');
// os .gltf da Quaternius apontam para algumas texturas "*_png.png" que não vêm no pacote
for (const dir of [BASE, HAIR]) {
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.gltf'))) {
    for (const img of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).images ?? []) {
      const want = path.join(dir, img.uri);
      const have = path.join(dir, img.uri.replace('_png.png', '.png'));
      if (!fs.existsSync(want) && fs.existsSync(have)) fs.copyFileSync(have, want);
    }
  }
}

async function shrink(tex, size, quality = 82) {
  const img = tex.getImage(); if (!img) return;
  const buf = await sharp(Buffer.from(img)).resize(size, size, { fit: 'inside' }).jpeg({ quality, mozjpeg: true }).toBuffer();
  tex.setImage(new Uint8Array(buf)).setMimeType('image/jpeg').setURI('');
}

/** Caixa da cabeça (vértices só do osso Head), para ajustar penteados feitos para outro corpo. */
function headBox(prim, skin) {
  const pos = prim.getAttribute('POSITION').getArray();
  const J = prim.getAttribute('JOINTS_0').getArray(), W = prim.getAttribute('WEIGHTS_0').getArray();
  const head = skin.listJoints().findIndex((j) => j.getName() === 'Head');
  const box = { min: [9, 9, 9], max: [-9, -9, -9] };
  for (let i = 0; i < pos.length / 3; i++) {
    let w = 0, sum = 0;
    for (let k = 0; k < 4; k++) { sum += W[i * 4 + k]; if (J[i * 4 + k] === head) w += W[i * 4 + k]; }
    if (w / sum < 0.95) continue;
    for (let k = 0; k < 3; k++) { box.min[k] = Math.min(box.min[k], pos[i * 3 + k]); box.max[k] = Math.max(box.max[k], pos[i * 3 + k]); }
  }
  return box;
}
const HEADS = {};
for (const sex of ['Male', 'Female']) {
  const d = await io.read(path.join(BASE, `Superhero_${sex}_FullBody.gltf`));
  const skin = d.getRoot().listSkins()[0];
  const prim = d.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).find((p) => /Superhero/.test(p.getMaterial().getName()));
  HEADS[sex] = headBox(prim, skin);
}
/** Os penteados vêm modelados para uma das duas cabeças; descobre qual pela altura do topo. */
function hairMadeFor(prim) {
  const pos = prim.getAttribute('POSITION').getArray();
  let top = -9;
  for (let i = 1; i < pos.length; i += 3) top = Math.max(top, pos[i]);
  return Math.abs(top - HEADS.Male.max[1]) < Math.abs(top - HEADS.Female.max[1]) ? 'Male' : 'Female';
}

async function buildCharacter(def) {
  const doc = await io.read(path.join(BASE, `Superhero_${def.body}_FullBody.gltf`));
  const root = doc.getRoot();
  const bodyScene = root.listScenes()[0];
  const bodySkin = root.listSkins()[0];
  const joints = bodySkin.listJoints();
  const byName = new Map(joints.map((j) => [j.getName(), j]));
  const armature = root.listNodes().find((n) => n.getMesh())?.getParentNode();

  // ---- cabelo: passa a usar os ossos do corpo (mesmos nomes e mesma pose de repouso) ----
  const hairPrims = [];
  for (const style of def.hair?.styles ?? []) {
    const hair = await io.read(path.join(HAIR, `${style}.gltf`));
    mergeDocuments(doc, hair);
    const hairScene = root.listScenes().at(-1);
    for (const skin of root.listSkins().slice(1)) {
      for (const node of root.listNodes()) {
        if (node.getSkin() !== skin) continue;
        node.setSkin(bodySkin);
        const remap = skin.listJoints().map((j) => joints.indexOf(byName.get(j.getName())));
        if (remap.some((i) => i < 0)) throw new Error('osso do cabelo sem par no corpo');
        for (const prim of node.getMesh().listPrimitives()) {
          const J = prim.getAttribute('JOINTS_0'); const a = J.getArray().slice();
          for (let i = 0; i < a.length; i++) a[i] = remap[a[i]];
          J.setArray(a);
          // penteado feito para a outra cabeça: leva de uma caixa de cabeça para a outra
          const from = hairMadeFor(prim);
          if (from !== def.body) {
            const A = HEADS[from], B = HEADS[def.body];
            const P = prim.getAttribute('POSITION'); const p = P.getArray().slice();
            for (let i = 0; i < p.length; i++) {
              const k = i % 3;
              p[i] = B.min[k] + ((p[i] - A.min[k]) / (A.max[k] - A.min[k])) * (B.max[k] - B.min[k]);
            }
            P.setArray(p);
          }
          hairPrims.push(prim);
        }
        for (const p of node.listParents()) if (p.propertyType === 'Node') p.removeChild(node);
        hairScene.removeChild(node);
        armature.addChild(node);
      }
      skin.dispose();
    }
    hairScene.listChildren().forEach((n) => n.dispose());
    hairScene.dispose();
  }
  root.setDefaultScene(bodyScene);

  // atributos extras (vértices coloridos, UVs auxiliares) — COLOR_0 faria o three.js tingir o modelo
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives())
    for (const s of prim.listSemantics()) if (/^(COLOR_|TEXCOORD_[1-9])/.test(s)) prim.setAttribute(s, null);
  // na escala do tabuleiro, mapas de normal e de rugosidade não aparecem e pesam no download
  for (const m of root.listMaterials()) {
    m.setNormalTexture(null).setMetallicRoughnessTexture(null).setMetallicFactor(0);
    if (/Superhero/.test(m.getName())) m.setRoughnessFactor(0.85);
    // a textura do cabelo é neutra (a versão paga tinge por shader)
    if (/Hair/.test(m.getName())) m.setBaseColorFactor([...hex(def.hair.color).map((v) => Math.pow(v / 255, 2.2)), 1]);
  }

  // ---- roupa pintada no corpo ----
  const prims = root.listMeshes().flatMap((m) => m.listPrimitives());
  const body = prims.find((p) => /Superhero/.test(p.getMaterial().getName()));
  const eyes = prims.find((p) => /Eyes/.test(p.getMaterial().getName()));
  const brows = root.listNodes().find((n) => /Eyebrows/.test(n.getName())).getMesh().listPrimitives()[0];
  const bbox = (p) => { const a = p.getAttribute('POSITION'); return { min: a.getMin([]), max: a.getMax([]) }; };
  const eyeY = (bbox(eyes).min[1] + bbox(eyes).max[1]) / 2;
  const tex = body.getMaterial().getBaseColorTexture();
  const jpeg = await dressBody({ prim: body, skin: bodySkin, baseImage: tex.getImage(), outfit: def.outfit, skinTone: def.skin, eyeY });
  tex.setImage(new Uint8Array(jpeg)).setMimeType('image/jpeg').setURI('');

  // ---- acessórios ----
  const M = bodyMetrics(bodySkin);
  const pos = body.getAttribute('POSITION').getArray(), nor = body.getAttribute('NORMAL').getArray();
  const J = body.getAttribute('JOINTS_0').getArray(), W = body.getAttribute('WEIGHTS_0').getArray();
  const nv = pos.length / 3;
  const headW = new Float32Array(nv), torsoW = new Float32Array(nv);
  for (let i = 0; i < nv; i++) {
    let sum = 0;
    for (let k = 0; k < 4; k++) {
      const name = joints[J[i * 4 + k]].getName(), w = W[i * 4 + k];
      sum += w;
      if (name === 'Head') headW[i] += w;
      if (/^(pelvis|spine|clavicle|neck)/.test(name)) torsoW[i] += w;
    }
    headW[i] /= sum; torsoW[i] /= sum;
  }
  const H = measure(pos, headW, torsoW, M, bbox(brows).max[1]);
  // ponto da superfície do tronco mais próximo de p, um pouco para fora (para o colar)
  const surface = (p) => {
    // média dos 3 vértices mais próximos (pelo inverso da distância), para as contas não "pularem"
    const near = [];
    for (let i = 0; i < nv; i++) {
      if (torsoW[i] < 0.5) continue;
      const d = Math.hypot(pos[i * 3] - p[0], pos[i * 3 + 1] - p[1], pos[i * 3 + 2] - p[2]);
      if (near.length < 3 || d < near[2][0]) { near.push([d, i]); near.sort((a, b) => a[0] - b[0]); near.length = Math.min(3, near.length); }
    }
    const out = [0, 0, 0];
    let sum = 0;
    for (const [d, i] of near) {
      const w = 1 / (d + 1e-4); sum += w;
      for (let k = 0; k < 3; k++) out[k] += w * (pos[i * 3 + k] + nor[i * 3 + k] * 0.007);
    }
    return out.map((v) => v / sum);
  };
  const gear = new Gear(joints.map((j) => j.getName()));
  let hatLine = null;
  for (const [piece, opts] of def.gear ?? []) {
    const r = PIECES[piece](gear, H, M, { ...opts, surface });
    if (typeof r === 'number') hatLine = r;
  }
  if (!gear.empty) {
    const mat = doc.createMaterial('Gear').setRoughnessFactor(0.8).setMetallicFactor(0).setDoubleSided(true);
    const node = doc.createNode('Gear').setMesh(doc.createMesh('Gear').addPrimitive(gear.toPrimitive(doc, mat))).setSkin(bodySkin);
    armature.addChild(node);
  }
  // com chapéu, o cabelo acima da aba some (ele atravessaria a copa)
  if (hatLine !== null) {
    for (const prim of hairPrims) {
      const p = prim.getAttribute('POSITION').getArray();
      const idx = prim.getIndices().getArray();
      const keep = [];
      for (let t = 0; t < idx.length; t += 3) {
        const y = (p[idx[t] * 3 + 1] + p[idx[t + 1] * 3 + 1] + p[idx[t + 2] * 3 + 1]) / 3;
        if (y < hatLine) keep.push(idx[t], idx[t + 1], idx[t + 2]);
      }
      prim.getIndices().setArray(new idx.constructor(keep));
    }
  }

  for (const t of root.listTextures()) {
    if (t === tex) continue;
    await shrink(t, /Eye/.test(t.getURI() || t.getName()) ? 256 : 512);
  }
  await doc.transform(unpartition(), prune(), dedup(), weld(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const dir = path.join(OUT, 'characters', def.id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${def.id}.glb`);
  await io.write(file, doc);
  const tris = root.listMeshes().flatMap((m) => m.listPrimitives()).reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
  console.log(`${def.id.padEnd(12)} ${(fs.statSync(file).size / 1024).toFixed(0).padStart(5)} KB  ${Math.round(tris)} triângulos`);
}

for (const def of CHARACTERS) if (!only || only.includes(def.id)) await buildCharacter(def);

// ---------- biblioteca de clipes ----------
if (!only) {
  const CLIPS = { Idle_Loop: 'idle', Walk_Loop: 'walk', Jog_Fwd_Loop: 'run', Crouch_Idle_Loop: 'crouch' };
  const anims = await io.read(path.join(UAL, 'Unreal-Godot/UAL1_Standard.glb'));
  const ar = anims.getRoot();
  for (const a of ar.listAnimations()) { if (CLIPS[a.getName()]) { a.setName(CLIPS[a.getName()]); continue; } a.listChannels().forEach((c) => c.dispose()); a.listSamplers().forEach((s) => s.dispose()); a.dispose(); }
  for (const n of ar.listNodes()) { n.setMesh(null); n.setSkin(null); }
  ar.listSkins().forEach((s) => s.dispose());
  ar.listMeshes().forEach((m) => m.dispose());
  await anims.transform(resample(), prune({ keepLeaves: true }), dedup(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  fs.mkdirSync(path.join(OUT, 'anims'), { recursive: true });
  await io.write(path.join(OUT, 'anims/humanoid-base.glb'), anims);
}
console.log('ok');
