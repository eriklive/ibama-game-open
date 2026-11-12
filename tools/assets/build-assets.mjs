// Gera public/assets/characters/<id>/<id>.glb e public/assets/anims/humanoid-base.glb
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

// ---------- personagens ----------
// Cada personagem é um corpo base + penteados (cabelo, barba) ligados aos mesmos ossos.
const CHARACTERS = [
  { id: 'ana', body: 'Superhero_Female_FullBody', hair: ['Hair_Buns'], hairColor: [0.32, 0.2, 0.12] },
  { id: 'clara', body: 'Superhero_Female_FullBody', hair: ['Hair_Long'], hairColor: [0.07, 0.06, 0.06] },
  { id: 'bruno', body: 'Superhero_Male_FullBody', hair: ['Hair_SimpleParted'], hairColor: [0.16, 0.11, 0.08] },
  { id: 'inimigo', body: 'Superhero_Male_FullBody', hair: ['Hair_Buzzed', 'Hair_Beard'], hairColor: [0.1, 0.08, 0.07] },
];
const base = path.join(UBC, 'Base Characters/Godot - UE');
const hairDir = path.join(UBC, 'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)');
// os .gltf da Quaternius apontam para algumas texturas "*_png.png" que não existem no pacote
for (const dir of [base, hairDir]) for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.gltf'))) {
  for (const img of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).images ?? []) {
    const want = path.join(dir, img.uri);
    const have = path.join(dir, img.uri.replace('_png.png', '.png'));
    if (!fs.existsSync(want) && fs.existsSync(have)) fs.copyFileSync(have, want);
  }
}

async function buildCharacter({ id, body, hair, hairColor }) {
  const doc = await io.read(path.join(base, `${body}.gltf`));
  const root = doc.getRoot();
  const bodyScene = root.listScenes()[0];
  const bodySkin = root.listSkins()[0];
  const byName = new Map(bodySkin.listJoints().map((j) => [j.getName(), j]));
  for (const name of hair) mergeDocuments(doc, await io.read(path.join(hairDir, `${name}.gltf`)));
  // penteados: passam a usar os ossos do corpo (mesmos nomes e mesma pose de repouso)
  for (const skin of root.listSkins().slice(1)) {
    for (const node of root.listNodes()) {
      if (node.getSkin() !== skin) continue;
      node.setSkin(bodySkin);
      const remap = skin.listJoints().map((j) => bodySkin.listJoints().indexOf(byName.get(j.getName())));
      if (remap.some((i) => i < 0)) throw new Error(`${id}: osso do cabelo sem par no corpo`);
      for (const prim of node.getMesh().listPrimitives()) {
        const J = prim.getAttribute('JOINTS_0'); const a = J.getArray().slice();
        for (let i = 0; i < a.length; i++) a[i] = remap[a[i]];
        J.setArray(a);
      }
      for (const p of node.listParents()) if (p.propertyType === 'Node') p.removeChild(node);
      for (const sc of root.listScenes()) sc.removeChild(node);
      bodyScene.addChild(node);
    }
    skin.dispose();
  }
  for (const sc of root.listScenes().slice(1)) { sc.listChildren().forEach((n) => n.dispose()); sc.dispose(); }
  root.setDefaultScene(bodyScene);
  // atributos extras (vértices coloridos, UVs auxiliares) — COLOR_0 faria o three.js tingir o modelo
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives())
    for (const s of prim.listSemantics()) if (/^(COLOR_|TEXCOORD_[1-9])/.test(s)) prim.setAttribute(s, null);
  // a textura do cabelo é neutra (a versão paga tinge por shader): a cor entra pelo material
  for (const m of root.listMaterials()) if (/Hair/.test(m.getName())) m.setBaseColorFactor([...hairColor, 1]);
  for (const t of root.listTextures()) await shrink(t, /Eye/.test(t.getURI() || t.getName()) ? 256 : 1024);
  await doc.transform(unpartition(), prune(), dedup(), weld(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  fs.mkdirSync(path.join(OUT, 'characters', id), { recursive: true });
  await io.write(path.join(OUT, 'characters', id, `${id}.glb`), doc);
}
for (const c of CHARACTERS) await buildCharacter(c);

// ---------- biblioteca de clipes ----------
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
console.log('ok');
