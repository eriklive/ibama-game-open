// Gera public/assets/characters/ana/ana.glb e public/assets/anims/humanoid-base.glb
// a partir dos pacotes CC0 da Quaternius (Universal Base Characters + Universal Animation Library).
// Uso: ver tools/assets/README.md
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, quantize, resample, meshopt, mergeDocuments, unpartition } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const [UBC, UAL, OUT] = process.argv.slice(2);
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

async function shrink(tex, size, quality = 82) {
  const img = tex.getImage(); if (!img) return;
  const buf = await sharp(Buffer.from(img)).resize(size, size, { fit: 'inside' }).jpeg({ quality, mozjpeg: true }).toBuffer();
  tex.setImage(new Uint8Array(buf)).setMimeType('image/jpeg').setURI('');
}

// ---------- personagem ----------
const base = path.join(UBC, 'Base Characters/Godot - UE');
// o .gltf da Quaternius aponta para T_Eye_Normal_png.png, que não existe no pacote
const eyeFix = path.join(base, 'T_Eye_Normal_png.png');
if (!fs.existsSync(eyeFix)) fs.copyFileSync(path.join(base, 'T_Eye_Normal.png'), eyeFix);
const doc = await io.read(path.join(base, 'Superhero_Female_FullBody.gltf'));
const hair = await io.read(path.join(UBC, 'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/Hair_Buns.gltf'));
mergeDocuments(doc, hair);
const root = doc.getRoot();
const [bodyScene, hairScene] = root.listScenes();
const bodySkin = root.listSkins()[0];
const byName = new Map(bodySkin.listJoints().map((j) => [j.getName(), j]));
// cabelo: passa a usar os ossos do corpo (mesmos nomes e mesma pose de repouso)
for (const skin of root.listSkins().slice(1)) {
  for (const node of root.listNodes()) {
    if (node.getSkin() !== skin) continue;
    node.setSkin(bodySkin);
    const remap = skin.listJoints().map((j) => bodySkin.listJoints().indexOf(byName.get(j.getName())));
    if (remap.some((i) => i < 0)) throw new Error('osso do cabelo sem par no corpo');
    for (const prim of node.getMesh().listPrimitives()) {
      const J = prim.getAttribute('JOINTS_0'); const a = J.getArray().slice();
      for (let i = 0; i < a.length; i++) a[i] = remap[a[i]];
      J.setArray(a);
    }
    for (const p of node.listParents()) if (p.propertyType === 'Node') p.removeChild(node);
    hairScene.removeChild(node);
    bodyScene.addChild(node);
  }
  skin.dispose();
}
hairScene.listChildren().forEach((n) => n.dispose());
hairScene.dispose();
root.setDefaultScene(bodyScene);
// atributos extras (vértices coloridos, UVs auxiliares) — COLOR_0 faria o three.js tingir o modelo
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives())
  for (const s of prim.listSemantics()) if (/^(COLOR_|TEXCOORD_[1-9])/.test(s)) prim.setAttribute(s, null);
// a textura do cabelo é neutra (a versão paga tinge por shader): castanho-escuro para a Ana
for (const m of root.listMaterials()) if (/Hair/.test(m.getName())) m.setBaseColorFactor([0.32, 0.2, 0.12, 1]);
for (const t of root.listTextures()) await shrink(t, /Eye/.test(t.getURI() || t.getName()) ? 256 : 1024);
await doc.transform(unpartition(), prune(), dedup(), weld(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
fs.mkdirSync(path.join(OUT, 'characters/ana'), { recursive: true });
await io.write(path.join(OUT, 'characters/ana/ana.glb'), doc);

// ---------- biblioteca de clipes ----------
const CLIPS = { Idle_Loop: 'idle', Walk_Loop: 'walk', Jog_Fwd_Loop: 'run' };
const anims = await io.read(path.join(UAL, 'Unreal-Godot/UAL1_Standard.glb'));
const ar = anims.getRoot();
for (const a of ar.listAnimations()) { if (CLIPS[a.getName()]) { a.setName(CLIPS[a.getName()]); continue; } a.listChannels().forEach((c) => c.dispose()); a.listSamplers().forEach((s) => s.dispose()); a.dispose(); }
for (const n of ar.listNodes()) { n.setMesh(null); n.setSkin(null); }
ar.listSkins().forEach((s) => s.dispose());
ar.listMeshes().forEach((m) => m.dispose());
await anims.transform(resample(), prune({ keepLeaves: true }), dedup(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
fs.mkdirSync(path.join(OUT, 'anims'), { recursive: true });
await io.write(path.join(OUT, 'anims/humanoid-base.glb'), anims);
console.log('ok');
