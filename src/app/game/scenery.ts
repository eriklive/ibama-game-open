import * as THREE from 'three';
import { HexCoord, hexKey, hexToWorld } from './hex';
import { METER } from './character-model';

/**
 * Cenário montado por código: o hangar (paredes retas de chapa ondulada, portão,
 * telhado em arco, postes e lâmpadas) e o avião estacionado. Nada aqui tem regra de jogo — quem
 * bloqueia passagem e visão são os hexágonos marcados no mapa.
 */

/**
 * Altura das paredes do hangar: 5 m, pé-direito de galpão de avião. O telhado em arco nasce
 * no topo delas e sobe mais `ROOF_RISE` no meio (9 m no ponto mais alto).
 */
const WALL_HEIGHT = 5 * METER;
const ROOF_RISE = 4 * METER;
/** Altura das lâmpadas pendentes do hangar (bem acima da cabeça, abaixo do topo da parede). */
const LAMP_HEIGHT = 4.2 * METER;
/** Altura dos postes de luz do lado de fora do portão. */
const POLE_HEIGHT = 7 * METER;
const WALL_THICKNESS = 0.18;

/** Nome do grupo do telhado (chapa, oitões e arcos) dentro do hangar. */
export const HANGAR_ROOF = 'hangar-roof';
/** Nome do grupo do que fica dentro do hangar (lâmpadas pendentes). */
export const HANGAR_INTERIOR = 'hangar-interior';

/** Textura de chapa ondulada: faixas verticais claras e escuras. */
function corrugatedTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 32, 0);
    grad.addColorStop(0, '#8e9ba3');
    grad.addColorStop(0.5, '#c3ced4');
    grad.addColorStop(1, '#8e9ba3');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Caixa esticada entre dois pontos (viga, escora, perna do trem de pouso). */
function beam(a: THREE.Vector3, b: THREE.Vector3, thickness: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, a.distanceTo(b)), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.lookAt(b);
  mesh.castShadow = true;
  return mesh;
}

/** Junta trechos consecutivos (índices seguidos) em intervalos [início, fim]. */
function runs(indices: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const i of indices) {
    const last = out[out.length - 1];
    if (last && last[1] === i - 1) last[1] = i;
    else out.push([i, i]);
  }
  return out;
}

/**
 * Hangar retangular sobre os hexágonos de parede do perímetro `cols` × `rows`.
 * O telhado e as peças de dentro vêm em grupos com nome (`HANGAR_ROOF`, `HANGAR_INTERIOR`).
 * As paredes são retas (passam pelo meio dos hexágonos de parede) e se interrompem
 * onde o perímetro não tem parede: são as portas e o portão.
 */
export function buildHangar(
  rect: { cols: [number, number]; rows: [number, number] },
  walls: ReadonlySet<string>,
  size: number,
): THREE.Group {
  const group = new THREE.Group();
  const [c0, c1] = rect.cols;
  const [r0, r1] = rect.rows;
  const colX = (col: number) => hexToWorld({ col, row: 0 }, size).x;
  // as colunas ímpares ficam meio hexágono abaixo: a parede passa na média das duas
  const rowZ = (row: number) => hexToWorld({ col: 0, row }, size).z + (Math.sqrt(3) * size) / 4;
  const colZ = (col: number, row: number) => hexToWorld({ col, row }, size).z;
  const x0 = colX(c0);
  const x1 = colX(c1);
  const zBack = rowZ(r0);
  const zFront = rowZ(r1);
  const isWall = (col: number, row: number) => walls.has(hexKey({ col, row }));

  const texture = corrugatedTexture();
  const trim = new THREE.MeshStandardMaterial({ color: 0x3f4b52, roughness: 0.8 });
  const panel = (ax: number, az: number, bx: number, bz: number): void => {
    const length = Math.hypot(bx - ax, bz - az);
    const map = texture.clone();
    map.repeat.set(length * 3, 1);
    map.needsUpdate = true;
    const side = new THREE.MeshStandardMaterial({ map, roughness: 0.6, metalness: 0.25 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, WALL_HEIGHT, WALL_THICKNESS), [
      trim, trim, trim, trim, side, side,
    ]);
    mesh.position.set((ax + bx) / 2, WALL_HEIGHT / 2, (az + bz) / 2);
    mesh.rotation.y = Math.atan2(-(bz - az), bx - ax);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    // rodapé e cantoneira no topo
    for (const y of [0.06, WALL_HEIGHT]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(length + 0.06, 0.12, WALL_THICKNESS + 0.08), trim);
      cap.position.set(mesh.position.x, y, mesh.position.z);
      cap.rotation.y = mesh.rotation.y;
      group.add(cap);
    }
  };
  const post = (x: number, z: number, height = WALL_HEIGHT + 0.15): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, height, 0.3), trim);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    group.add(mesh);
  };

  // fundos e frente: um trecho por sequência de colunas com parede
  const half = 0.75 * size;
  const clampX = (x: number) => Math.min(x1, Math.max(x0, x));
  const cols = Array.from({ length: c1 - c0 + 1 }, (_, i) => c0 + i);
  for (const [row, z] of [[r0, zBack], [r1, zFront]] as const) {
    for (const [a, b] of runs(cols.filter((c) => isWall(c, row)))) {
      const ax = clampX(colX(a) - half);
      const bx = clampX(colX(b) + half);
      panel(ax, z, bx, z);
      post(ax, z);
      post(bx, z);
    }
  }
  // laterais
  const rows = Array.from({ length: r1 - r0 + 1 }, (_, i) => r0 + i);
  const halfRow = (Math.sqrt(3) * size) / 2;
  const clampZ = (z: number) => Math.min(zFront, Math.max(zBack, z));
  for (const [col, x] of [[c0, x0], [c1, x1]] as const) {
    for (const [a, b] of runs(rows.filter((r) => isWall(col, r)))) {
      panel(x, clampZ(colZ(col, a) - halfRow), x, clampZ(colZ(col, b) + halfRow));
    }
  }

  // portão: viga sobre o maior vão da frente
  const gate = runs(cols.filter((c) => !isWall(c, r1))).sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0];
  if (gate) {
    const ax = colX(gate[0]) - half;
    const bx = colX(gate[1]) + half;
    const y = WALL_HEIGHT + 0.55;
    group.add(beam(new THREE.Vector3(ax, y, zFront), new THREE.Vector3(bx, y, zFront), 0.28, trim));
    post(ax, zFront, y + 0.14);
    post(bx, zFront, y + 0.14);
  }

  // telhado: treliças em arco cobertas por chapa ondulada, com os oitões fechando a frente e os
  // fundos. Fica num grupo à parte: o tabuleiro esconde tudo quando um agente entra no hangar.
  const roof = new THREE.Group();
  roof.name = HANGAR_ROOF;
  group.add(roof);
  const steel = new THREE.MeshStandardMaterial({ color: 0x2c363c, roughness: 0.6, metalness: 0.4 });
  const rise = ROOF_RISE;
  const arcY = (t: number) => WALL_HEIGHT + Math.sin(Math.PI * t) * rise;
  const count = Math.max(2, Math.round((zFront - zBack) / 3.2) + 1);
  for (let i = 0; i < count; i++) {
    const z = zBack + ((zFront - zBack) * i) / (count - 1);
    const points = Array.from({ length: 25 }, (_, k) => {
      const t = k / 24;
      return new THREE.Vector3(x0 + (x1 - x0) * t, arcY(t), z);
    });
    const arch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.07, 5), steel);
    arch.castShadow = true;
    roof.add(arch);
  }
  // chapa: uma faixa curva de parede a parede, um pouco acima dos arcos e com beiral nas pontas
  const SEGMENTS = 32;
  const eave = 0.25;
  const zA = zBack - eave;
  const zB = zFront + eave;
  const sheetPos: number[] = [];
  const sheetUv: number[] = [];
  const sheetIdx: number[] = [];
  for (let k = 0; k <= SEGMENTS; k++) {
    const t = k / SEGMENTS;
    const x = x0 - 0.12 + (x1 - x0 + 0.24) * t;
    const y = arcY(t) + 0.1;
    sheetPos.push(x, y, zA, x, y, zB);
    // as ondas da chapa acompanham o arco (as faixas da textura correm ao longo do comprimento)
    sheetUv.push(0, t, (zB - zA) * 3, t);
    if (k < SEGMENTS) {
      const a = k * 2;
      sheetIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const sheetGeo = new THREE.BufferGeometry();
  sheetGeo.setAttribute('position', new THREE.Float32BufferAttribute(sheetPos, 3));
  sheetGeo.setAttribute('uv', new THREE.Float32BufferAttribute(sheetUv, 2));
  sheetGeo.setIndex(sheetIdx);
  sheetGeo.computeVertexNormals();
  const sheetMap = texture.clone();
  sheetMap.wrapT = THREE.RepeatWrapping;
  sheetMap.needsUpdate = true;
  const sheet = new THREE.Mesh(
    sheetGeo,
    new THREE.MeshStandardMaterial({ map: sheetMap, color: 0xb9c0c2, roughness: 0.65, metalness: 0.3, side: THREE.DoubleSide }),
  );
  sheet.castShadow = true;
  sheet.receiveShadow = true;
  roof.add(sheet);
  // oitões: a meia-lua entre o topo da parede e o arco, na frente e nos fundos
  const gableShape = new THREE.Shape();
  gableShape.moveTo(x0, WALL_HEIGHT);
  for (let k = 0; k <= SEGMENTS; k++) {
    const t = k / SEGMENTS;
    gableShape.lineTo(x0 + (x1 - x0) * t, arcY(t) + 0.06);
  }
  gableShape.closePath();
  const gableMap = texture.clone();
  gableMap.repeat.set(3, 1);
  gableMap.needsUpdate = true;
  const gableMat = new THREE.MeshStandardMaterial({ map: gableMap, roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide });
  const gableGeo = new THREE.ShapeGeometry(gableShape, 1);
  for (const z of [zBack, zFront]) {
    const gable = new THREE.Mesh(gableGeo, gableMat);
    gable.position.z = z;
    gable.castShadow = true;
    roof.add(gable);
  }

  // iluminação: dois postes do lado de fora, nos cantos da frente, e duas lâmpadas
  // pendentes do lado de dentro, penduradas no arco mais próximo do terço dos fundos
  const bulb = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd978, emissiveIntensity: 1.6 });
  const glow = (x: number, y: number, z: number, distance: number): void => {
    const light = new THREE.PointLight(0xffe2a0, 14, distance, 1.6);
    light.position.set(x, y, z);
    group.add(light);
  };
  // poste: encostado na face de fora da parede da frente (não ocupa hexágono livre)
  const poleHeight = POLE_HEIGHT;
  const poleZ = zFront + 0.55 * size;
  for (const [x, dir] of [[x0 + 1.5 * size, 1], [x1 - 1.5 * size, -1]] as const) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, poleHeight, 8), steel);
    pole.position.set(x, poleHeight / 2, poleZ);
    pole.castShadow = true;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.16, 8), trim);
    foot.position.set(x, 0.08, poleZ);
    // braço virado para o portão, com a luminária na ponta
    const tip = new THREE.Vector3(x + 0.9 * dir, poleHeight - 0.05, poleZ + 0.5);
    const arm = beam(new THREE.Vector3(x, poleHeight - 0.1, poleZ), tip, 0.08, steel);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.26), trim);
    head.position.copy(tip);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.18), bulb);
    lens.position.copy(tip).setY(tip.y - 0.07);
    group.add(pole, foot, arm, head, lens);
    glow(tip.x, tip.y - 0.3, tip.z, 24);
  }
  // lâmpada pendente: fio, cúpula e bulbo
  const lampZ = zBack + (zFront - zBack) / 3;
  const archZ = zBack + ((zFront - zBack) * Math.round(((lampZ - zBack) / (zFront - zBack)) * (count - 1))) / (count - 1);
  const shade = new THREE.MeshStandardMaterial({ color: 0x33524a, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
  // as peças ficam num grupo à parte (somem com o resto do interior); a luz continua acesa,
  // para a troca não mudar a contagem de luzes da cena
  const interior = new THREE.Group();
  interior.name = HANGAR_INTERIOR;
  group.add(interior);
  for (const t of [0.2, 0.8]) {
    const x = x0 + (x1 - x0) * t;
    const top = arcY(t);
    const y = LAMP_HEIGHT;
    interior.add(beam(new THREE.Vector3(x, top, archZ), new THREE.Vector3(x, y + 0.2, archZ), 0.03, steel));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 12, 1, true), shade);
    cone.position.set(x, y + 0.1, archZ);
    cone.castShadow = true;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), bulb);
    globe.position.set(x, y - 0.02, archZ);
    interior.add(cone, globe);
    glow(x, y - 0.15, archZ, 16);
  }
  return group;
}

/** Nome do grupo do telhado da casa (some quando um agente entra). */
export const HOUSE_ROOF = 'house-roof';
/** Altura das paredes da casa: 2,7 m (a porta de 2,1 m e a verga cabem embaixo). */
const HOUSE_WALL_HEIGHT = 2.7 * METER;

/** Textura de tábuas corridas na horizontal, com frestas escuras e veios. */
function plankTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const tones = ['#9a6b3e', '#8c5f35', '#a57446', '#93653a'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = tones[i];
      ctx.fillRect(0, i * 16, 64, 16);
      ctx.fillStyle = 'rgba(60, 36, 16, 0.25)';
      ctx.fillRect(0, i * 16 + 6 + (i % 2) * 3, 64, 1);
      ctx.fillStyle = '#4a3018';
      ctx.fillRect(0, i * 16 + 15, 64, 1);
      // emenda das tábuas, cada fileira num lugar
      ctx.fillRect((i * 23) % 64, i * 16, 1, 16);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Casa de tábuas sobre os hexágonos de parede do retângulo `cols` × `rows`: paredes retas
 * (como as do hangar) no perímetro e nas divisórias (colunas de parede dentro do retângulo),
 * interrompidas onde não há parede — as portas. O telhado de duas águas, de chapa
 * enferrujada, vem num grupo com nome (`HOUSE_ROOF`).
 */
export function buildHouse(
  rect: { cols: [number, number]; rows: [number, number] },
  walls: ReadonlySet<string>,
  size: number,
): THREE.Group {
  const group = new THREE.Group();
  const [c0, c1] = rect.cols;
  const [r0, r1] = rect.rows;
  const H = HOUSE_WALL_HEIGHT;
  const colX = (col: number) => hexToWorld({ col, row: 0 }, size).x;
  const rowZ = (row: number) => hexToWorld({ col: 0, row }, size).z + (Math.sqrt(3) * size) / 4;
  const colZ = (col: number, row: number) => hexToWorld({ col, row }, size).z;
  const x0 = colX(c0);
  const x1 = colX(c1);
  const zBack = rowZ(r0);
  const zFront = rowZ(r1);
  const isWall = (col: number, row: number) => walls.has(hexKey({ col, row }));

  const texture = plankTexture();
  const trim = new THREE.MeshStandardMaterial({ color: 0x5a3b1e, roughness: 0.9 });
  const panel = (ax: number, az: number, bx: number, bz: number): void => {
    const length = Math.hypot(bx - ax, bz - az);
    const map = texture.clone();
    map.repeat.set(length / 1.2, H / 1.2);
    map.needsUpdate = true;
    const side = new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, H, WALL_THICKNESS), [trim, trim, trim, trim, side, side]);
    mesh.position.set((ax + bx) / 2, H / 2, (az + bz) / 2);
    mesh.rotation.y = Math.atan2(-(bz - az), bx - ax);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  const post = (x: number, z: number): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, H + 0.1, 0.22), trim);
    mesh.position.set(x, (H + 0.1) / 2, z);
    mesh.castShadow = true;
    group.add(mesh);
  };

  const half = 0.75 * size;
  const clampX = (x: number) => Math.min(x1, Math.max(x0, x));
  const cols = Array.from({ length: c1 - c0 + 1 }, (_, i) => c0 + i);
  for (const [row, z] of [[r0, zBack], [r1, zFront]] as const) {
    for (const [a, b] of runs(cols.filter((c) => isWall(c, row)))) {
      const ax = clampX(colX(a) - half);
      const bx = clampX(colX(b) + half);
      panel(ax, z, bx, z);
      post(ax, z);
      post(bx, z);
    }
  }
  // laterais e divisórias: colunas com parede em todas (ou quase todas) as fileiras de dentro
  const rows = Array.from({ length: r1 - r0 + 1 }, (_, i) => r0 + i);
  const inner = rows.slice(1, -1);
  const halfRow = (Math.sqrt(3) * size) / 2;
  const clampZ = (z: number) => Math.min(zFront, Math.max(zBack, z));
  for (const col of cols) {
    const side = col === c0 || col === c1;
    if (!side && inner.filter((r) => isWall(col, r)).length < inner.length - 1) continue;
    const x = colX(col);
    for (const [a, b] of runs(rows.filter((r) => isWall(col, r)))) {
      const za = clampZ(colZ(col, a) - halfRow);
      const zb = clampZ(colZ(col, b) + halfRow);
      panel(x, za, x, zb);
      post(x, za);
      post(x, zb);
    }
  }

  // telhado de duas águas: cumeeira no sentido leste–oeste, oitões de tábua nas pontas
  const roof = new THREE.Group();
  roof.name = HOUSE_ROOF;
  group.add(roof);
  const eave = 0.35;
  const depth = (zFront - zBack) / 2;
  const rise = 1.5;
  const cz = (zBack + zFront) / 2;
  const cx = (x0 + x1) / 2;
  const slope = Math.hypot(depth + eave, rise * (1 + eave / depth));
  const tilt = Math.atan2(rise, depth);
  const sheetMap = corrugatedTexture();
  sheetMap.repeat.set((x1 - x0) * 2.5, 1);
  const sheetMat = new THREE.MeshStandardMaterial({ map: sheetMap, color: 0xc0714a, roughness: 0.75, metalness: 0.2 });
  for (const dir of [-1, 1]) {
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 2 * eave, 0.07, slope), sheetMat);
    sheet.rotation.x = dir * tilt;
    sheet.position.set(cx, H + rise / 2 - (eave * rise) / depth / 2, cz + (dir * (depth + eave)) / 2);
    sheet.castShadow = true;
    sheet.receiveShadow = true;
    roof.add(sheet);
  }
  const gable = new THREE.Shape();
  gable.moveTo(-depth, 0);
  gable.lineTo(depth, 0);
  gable.lineTo(0, rise);
  gable.closePath();
  const gableMap = texture.clone();
  gableMap.repeat.set(1.4, 1);
  gableMap.needsUpdate = true;
  const gableGeo = new THREE.ShapeGeometry(gable);
  const gableMat = new THREE.MeshStandardMaterial({ map: gableMap, roughness: 0.9, side: THREE.DoubleSide });
  for (const x of [x0, x1]) {
    const g = new THREE.Mesh(gableGeo, gableMat);
    g.rotation.y = Math.PI / 2;
    g.position.set(x, H, cz);
    g.castShadow = true;
    roof.add(g);
  }
  return group;
}

/**
 * Teco-teco de asa alta (estilo Cessna 152), feito de caixas e cilindros. O nariz
 * aponta para +Z; mede cerca de 6,2 (envergadura) × 5 (comprimento) unidades.
 */
export function buildPlane(): THREE.Group {
  const plane = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f1ea, roughness: 0.55 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1f5fa8, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1d2b33, roughness: 0.2, metalness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x22282c, roughness: 0.8 });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    plane.add(mesh);
    return mesh;
  };

  // fuselagem: cabine, capô e cone de cauda
  box(1.0, 1.0, 1.7, 0, 1.05, 0.3, white);
  box(0.86, 0.76, 0.9, 0, 0.95, 1.55, white);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.5, 2.4, 8), white);
  tail.rotation.x = -Math.PI / 2; // ponta fina para trás
  tail.position.set(0, 1.18, -1.72);
  tail.castShadow = true;
  plane.add(tail);
  // faixa azul
  box(1.02, 0.14, 1.72, 0, 0.9, 0.3, blue);
  box(0.88, 0.14, 0.92, 0, 0.9, 1.55, blue);
  // vidros
  box(1.03, 0.4, 1.15, 0, 1.32, 0.4, glass);
  box(0.9, 0.42, 0.06, 0, 1.33, 1.17, glass).rotation.x = -0.35;
  // hélice
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 8), dark);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.set(0, 0.97, 2.16);
  plane.add(spinner);
  box(1.6, 0.13, 0.04, 0, 0.97, 2.08, dark).rotation.z = 0.5;
  // asa alta e montantes
  box(6.2, 0.13, 1.05, 0, 1.66, 0.45, white);
  box(0.5, 0.14, 1.07, 2.85, 1.66, 0.45, blue);
  box(0.5, 0.14, 1.07, -2.85, 1.66, 0.45, blue);
  for (const s of [1, -1]) {
    plane.add(beam(new THREE.Vector3(0.5 * s, 0.62, 0.5), new THREE.Vector3(1.9 * s, 1.6, 0.5), 0.07, white));
  }
  // empenagem
  box(2.3, 0.08, 0.62, 0, 1.22, -2.62, white);
  box(0.08, 0.95, 0.7, 0, 1.68, -2.58, white).rotation.x = -0.25;
  box(0.09, 0.3, 0.72, 0, 2.02, -2.68, blue).rotation.x = -0.25;
  // trem de pouso triciclo
  const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.13, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[0, 1.55], [0.8, 0.1], [-0.8, 0.1]]) {
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.position.set(x, 0.2, z);
    wheel.castShadow = true;
    plane.add(wheel);
    plane.add(beam(new THREE.Vector3(x, 0.2, z), new THREE.Vector3(x * 0.5, 0.6, z), 0.07, white));
  }
  return plane;
}

// ---------------------------------------------------------------------------
// Carga do hangar (cobertura). Cada função monta o que ocupa UM hexágono, com a base
// em y = 0 e centrada na origem, cabendo num hexágono de raio ~0,9. As alturas seguem
// a regra: cobertura alta passa da cabeça de quem está agachado (> 1,6), a baixa fica
// abaixo da cintura (< 0,9). Quem decide o que bloqueia é o mapa (`COVER` em maps.ts).
// ---------------------------------------------------------------------------

/** Pseudoaleatório estável a partir de uma semente (a mesma pilha sai sempre igual). */
const seeded = (seed: number) => (i: number): number => {
  const x = Math.sin(seed * 91.7 + i * 37.3) * 43758.5453;
  return x - Math.floor(x);
};

let cargoMaterials: ReturnType<typeof makeCargoMaterials> | null = null;
/** Materiais da carga, criados uma vez e divididos por todas as pilhas. */
function cargo(): ReturnType<typeof makeCargoMaterials> {
  return (cargoMaterials ??= makeCargoMaterials());
}

function makeCargoMaterials() {
  const std = (color: number, roughness = 0.85, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  return {
    wood: std(0xb98a4e),
    woodDark: std(0x8a6236),
    pallet: std(0xa98552),
    cardboard: std(0xc79b62, 0.95),
    tape: std(0xe2c68f, 0.6),
    label: new THREE.MeshStandardMaterial({ map: starchLabel(), roughness: 0.8 }),
    sack: std(0xd6c49a, 1),
    cageFrame: std(0x7b868c, 0.5, 0.4),
    cageBar: std(0xc9d0d3, 0.4, 0.3),
    cageFloor: std(0x6b5a3e, 0.9),
    canRed: std(0xb3302a, 0.55),
    canCap: std(0x2a2a2a, 0.6),
    cylinder: std(0xe9e6dd, 0.4, 0.2),
    cylinderBand: std(0x2f6fb0, 0.5),
    brass: std(0xc9a440, 0.4, 0.7),
    plate: std(0xf1ede2, 0.35),
    rice: std(0xf6f1df, 0.9),
    beans: std(0x5b2f1c, 0.8),
    mug: std(0x2f6fb0, 0.45),
    jar: std(0xd8c27a, 0.3),
    tin: std(0x9aa3a8, 0.4, 0.6),
    rag: std(0x7d2f2a, 1),
    tarp: std(0x3f6b3a, 0.95),
    rope: std(0xcfb77a, 0.9),
    drum: std(0x2b5d9e, 0.5, 0.3),
    drumRim: std(0x1d3f6b, 0.5, 0.4),
    hose: std(0x1f2224, 0.7),
  };
}

/**
 * Rótulo genérico de amido de milho para as caixas de papelão: faixa amarela, espiga
 * desenhada e "AMIDO DE MILHO" (marca inventada, de fachada).
 */
function starchLabel(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c79b62';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(8, 10, 112, 44);
    ctx.fillStyle = '#1f4f8f';
    ctx.fillRect(8, 40, 112, 14);
    // espiga
    ctx.fillStyle = '#e8a417';
    ctx.beginPath();
    ctx.ellipse(24, 25, 6, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4e8a3a';
    ctx.beginPath();
    ctx.moveTo(16, 38);
    ctx.quadraticCurveTo(14, 22, 22, 14);
    ctx.quadraticCurveTo(20, 28, 24, 38);
    ctx.fill();
    ctx.fillStyle = '#7a2a12';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('AMIDO', 40, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('DE MILHO · 25 kg', 30, 51);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function solid(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Caixote de madeira: tábuas com moldura nas arestas e um "X" de reforço em duas faces. */
function woodenCrate(s: number): THREE.Group {
  const m = cargo();
  const g = new THREE.Group();
  g.add(solid(new THREE.BoxGeometry(s * 0.94, s * 0.94, s * 0.94), m.wood, 0, s / 2, 0));
  const t = s * 0.09;
  // moldura: 12 ripas nas arestas
  for (const y of [t / 2, s - t / 2]) {
    for (const z of [-1, 1]) g.add(solid(new THREE.BoxGeometry(s, t, t), m.woodDark, 0, y, (z * (s - t)) / 2));
    for (const x of [-1, 1]) g.add(solid(new THREE.BoxGeometry(t, t, s), m.woodDark, (x * (s - t)) / 2, y, 0));
  }
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    g.add(solid(new THREE.BoxGeometry(t, s, t), m.woodDark, (x * (s - t)) / 2, s / 2, (z * (s - t)) / 2));
  }
  // diagonal nas faces da frente e de trás
  const diag = Math.SQRT2 * (s - 2 * t);
  for (const z of [-1, 1]) {
    const brace = solid(new THREE.BoxGeometry(diag, t * 0.9, t * 0.5), m.woodDark, 0, s / 2, (z * s) / 2);
    brace.rotation.z = Math.PI / 4;
    g.add(brace);
  }
  return g;
}

/** Caixa de papelão com fita no topo e o rótulo de amido em duas faces. */
function cardboardBox(w: number, h: number, d: number): THREE.Group {
  const m = cargo();
  const g = new THREE.Group();
  // faces: +x, -x, +y, -y, +z, -z — o rótulo vai em +z e -x
  g.add(solid(new THREE.BoxGeometry(w, h, d), [m.cardboard, m.label, m.cardboard, m.cardboard, m.label, m.cardboard], 0, h / 2, 0));
  g.add(solid(new THREE.BoxGeometry(w * 0.18, 0.012, d * 1.01), m.tape, 0, h + 0.006, 0));
  return g;
}

/** Palete de madeira: três travessas e as tábuas por cima. */
function pallet(w: number, d: number): THREE.Group {
  const m = cargo();
  const g = new THREE.Group();
  for (const z of [-1, 0, 1]) g.add(solid(new THREE.BoxGeometry(w, 0.09, 0.12), m.woodDark, 0, 0.045, (z * (d - 0.12)) / 2));
  const boards = 5;
  for (let i = 0; i < boards; i++) {
    const x = -w / 2 + (w / boards) * (i + 0.5);
    g.add(solid(new THREE.BoxGeometry((w / boards) * 0.78, 0.04, d), m.pallet, x, 0.11, 0));
  }
  return g;
}

let sackGeometry: THREE.BufferGeometry | null = null;
/** Saco cheio: uma "almofada" achatada (esfera esticada e um pouco quadrada). */
function sack(): THREE.Mesh {
  if (!sackGeometry) {
    const geo = new THREE.SphereGeometry(0.5, 12, 8);
    const p = geo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      // puxa os pontos para fora nos cantos, para o saco ficar mais retangular
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + 0.35 * Math.abs(x * z) * 4;
      p.setXYZ(i, x * 0.62 * Math.min(k, 1.25), y * 0.22, z * 0.36 * Math.min(k, 1.25));
    }
    geo.computeVertexNormals();
    geo.translate(0, 0.1, 0);
    sackGeometry = geo;
  }
  return solid(sackGeometry, cargo().sack);
}

/** Gaiola de arame vazia: moldura escura, grades finas, fundo de madeira e um poleiro. */
function cage(w: number, h: number, d: number): THREE.Group {
  const m = cargo();
  const g = new THREE.Group();
  g.add(solid(new THREE.BoxGeometry(w, 0.05, d), m.cageFloor, 0, 0.025, 0));
  const f = 0.035;
  for (const y of [0.05, h]) {
    for (const z of [-1, 1]) g.add(solid(new THREE.BoxGeometry(w, f, f), m.cageFrame, 0, y, (z * d) / 2));
    for (const x of [-1, 1]) g.add(solid(new THREE.BoxGeometry(f, f, d), m.cageFrame, (x * w) / 2, y, 0));
  }
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(solid(new THREE.BoxGeometry(f, h, f), m.cageFrame, (x * w) / 2, h / 2, (z * d) / 2));
  const bar = new THREE.CylinderGeometry(0.011, 0.011, h - 0.05, 4);
  const bars = 6;
  for (let i = 1; i < bars; i++) {
    const x = -w / 2 + (w / bars) * i;
    const z = -d / 2 + (d / bars) * i;
    for (const s of [-1, 1]) {
      g.add(solid(bar, m.cageBar, x, h / 2 + 0.025, (s * d) / 2));
      g.add(solid(bar, m.cageBar, (s * w) / 2, h / 2 + 0.025, z));
    }
  }
  // tampo de grade e poleiro
  for (let i = 1; i < bars; i++) {
    const top = solid(new THREE.BoxGeometry(w, 0.012, 0.012), m.cageBar, 0, h, -d / 2 + (d / bars) * i);
    g.add(top);
  }
  const perch = solid(new THREE.CylinderGeometry(0.015, 0.015, w * 0.9, 5), m.woodDark, 0, h * 0.45, 0);
  perch.rotation.z = Math.PI / 2;
  g.add(perch);
  return g;
}

export type CoverKind = 'crates' | 'lowCrate' | 'boxes' | 'sacks' | 'cages' | 'table' | 'shelf' | 'supplies' | 'keys';

/**
 * Monta a carga de um hexágono. `seed` varia a arrumação (giro, quantas peças, quais
 * pilhas são mais altas) sem mudar a altura total de cada tipo.
 */
export function buildCover(kind: CoverKind, seed: number): THREE.Group {
  if (kind === 'table') return diningTable();
  if (kind === 'shelf') return shelf(seed);
  if (kind === 'keys') return keyBoard();
  if (kind === 'supplies') return supplyPile(seed);
  const rnd = seeded(seed);
  const g = new THREE.Group();
  if (kind === 'lowCrate') {
    // caixote de meia altura: dois caixotes lado a lado, sem nada em cima (dá para pular)
    const s = 0.62;
    ([[-0.33, -0.08], [0.35, 0.1]] as const).forEach(([x, z], i) => {
      const c = woodenCrate(s);
      c.position.set(x, 0, z);
      c.rotation.y = (rnd(i) - 0.5) * 0.25;
      g.add(c);
    });
  } else if (kind === 'crates') {
    // dois caixotes embaixo, um em cima (às vezes dois), levemente tortos
    const s = 0.82;
    const lower: [number, number][] = [[-0.36, -0.12], [0.4, 0.14]];
    lower.forEach(([x, z], i) => {
      const c = woodenCrate(s);
      c.position.set(x, 0, z);
      c.rotation.y = (rnd(i) - 0.5) * 0.3;
      g.add(c);
    });
    const tops = rnd(5) < 0.5 ? [[0, 0]] : [[-0.32, -0.1], [0.36, 0.14]];
    tops.forEach(([x, z], i) => {
      const c = woodenCrate(s * 0.92);
      c.position.set(x + (rnd(10 + i) - 0.5) * 0.1, s, z);
      c.rotation.y = (rnd(20 + i) - 0.5) * 0.5;
      g.add(c);
    });
  } else if (kind === 'boxes') {
    // pilhas de papelão sobre um palete: 3 a 4 andares, uma pilha mais baixa
    const p = pallet(1.3, 1.0);
    g.add(p);
    const w = 0.58, h = 0.42, d = 0.46;
    const spots: [number, number][] = [[-0.32, -0.24], [0.32, -0.24], [-0.32, 0.24], [0.32, 0.24]];
    spots.forEach(([x, z], i) => {
      const floors = 3 + (rnd(i) < 0.6 ? 1 : 0) - (i === Math.floor(rnd(9) * 4) ? 2 : 0);
      for (let f = 0; f < floors; f++) {
        const b = cardboardBox(w, h, d);
        b.position.set(x + (rnd(30 + i * 5 + f) - 0.5) * 0.05, 0.13 + f * h, z + (rnd(50 + i * 5 + f) - 0.5) * 0.05);
        b.rotation.y = (rnd(70 + i * 5 + f) - 0.5) * 0.12 + (f % 2 ? Math.PI : 0);
        g.add(b);
      }
    });
  } else if (kind === 'sacks') {
    // palete com duas camadas de sacos amarrados em "tijolinho"
    g.add(pallet(1.3, 1.0));
    const layers: [number, number, number][][] = [
      [[-0.32, 0.13, -0.24], [0.32, 0.13, -0.24], [-0.32, 0.13, 0.24], [0.32, 0.13, 0.24]],
      [[0, 0.33, -0.24], [-0.36, 0.33, 0.24], [0.36, 0.33, 0.24]],
    ];
    layers.flat().forEach(([x, y, z], i) => {
      const s = sack();
      s.position.set(x, y, z);
      s.rotation.y = (rnd(i) - 0.5) * 0.25;
      g.add(s);
    });
    // um saco solto encostado no palete
    if (rnd(40) < 0.6) {
      const s = sack();
      s.position.set(0.55 * (rnd(41) < 0.5 ? -1 : 1), 0, 0.55);
      s.rotation.y = rnd(42) * Math.PI;
      g.add(s);
    }
  } else {
    // gaiolas vazias: duas embaixo, uma ou duas por cima (dá para ver através)
    const w = 0.7, h = 0.4, d = 0.48;
    const base: [number, number][] = [[-0.38, -0.1], [0.38, 0.08]];
    base.forEach(([x, z], i) => {
      const c = cage(w, h, d);
      c.position.set(x, 0, z);
      c.rotation.y = (rnd(i) - 0.5) * 0.3;
      g.add(c);
    });
    const c = cage(w * 0.9, h * 0.9, d * 0.9);
    c.position.set((rnd(3) - 0.5) * 0.3, h + 0.02, 0);
    c.rotation.y = (rnd(4) - 0.5) * 0.6;
    g.add(c);
  }
  g.rotation.y = Math.floor(rnd(99) * 6) * (Math.PI / 3);
  return g;
}

/**
 * Mesa rústica com o almoço servido: prato de arroz com feijão, caneca e um pano. O prato
 * fica no lado oeste (−X), de quem come olhando para o leste.
 */
function diningTable(): THREE.Group {
  const m = cargo();
  const g = new THREE.Group();
  const top = 0.5;
  g.add(solid(new THREE.BoxGeometry(0.8, 0.06, 1.0), m.wood, 0, top, 0));
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    g.add(solid(new THREE.BoxGeometry(0.07, top, 0.07), m.woodDark, x * 0.32, top / 2, z * 0.42));
  }
  const y = top + 0.03;
  g.add(solid(new THREE.CylinderGeometry(0.17, 0.13, 0.03, 16), m.plate, -0.2, y + 0.015, 0.05));
  g.add(solid(new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), m.rice, -0.24, y + 0.03, 0.02));
  g.add(solid(new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), m.beans, -0.13, y + 0.03, 0.1));
  g.add(solid(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 10), m.mug, 0.05, y + 0.055, -0.3));
  const rag = solid(new THREE.BoxGeometry(0.22, 0.01, 0.18), m.rag, 0.18, y + 0.005, 0.28);
  rag.rotation.y = 0.4;
  g.add(rag);
  return g;
}

/**
 * Prateleira de tábuas encostada na parede do leste (+X), com potes, latas e um pano dobrado
 * — o que está escondido ali não aparece.
 */
function shelf(seed: number): THREE.Group {
  const rnd = seeded(seed);
  const m = cargo();
  const g = new THREE.Group();
  const x = 0.42;
  const h = 1.15;
  const w = 1.0;
  const d = 0.36;
  for (const z of [-1, 1]) g.add(solid(new THREE.BoxGeometry(d, h, 0.05), m.woodDark, x, h / 2, (z * w) / 2));
  g.add(solid(new THREE.BoxGeometry(0.03, h, w), m.woodDark, x + d / 2, h / 2, 0));
  const boards = [0.06, 0.42, 0.78, h];
  for (const y of boards) g.add(solid(new THREE.BoxGeometry(d, 0.04, w), m.wood, x, y, 0));
  // miudezas em cada prateleira
  boards.slice(0, 3).forEach((y, i) => {
    for (let k = 0; k < 3; k++) {
      const z = -0.32 + k * 0.32 + (rnd(i * 5 + k) - 0.5) * 0.1;
      const pick = rnd(20 + i * 5 + k);
      if (pick < 0.4) g.add(solid(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 10), m.jar, x, y + 0.11, z));
      else if (pick < 0.75) g.add(solid(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10), m.tin, x, y + 0.08, z));
      else g.add(solid(new THREE.BoxGeometry(0.22, 0.08, 0.22), m.rag, x, y + 0.06, z));
    }
  });
  return g;
}

/**
 * Quadro de chaves encostado na parede do fundo (norte, -Z): uma tábua com fileiras de
 * ganchos e chaves penduradas, uma delas com etiqueta vermelha.
 */
function keyBoard(): THREE.Group {
  const m = cargo();
  const g = new THREE.Group();
  const z = -0.42;
  g.add(solid(new THREE.BoxGeometry(0.95, 0.8, 0.05), m.woodDark, 0, 1.0, z));
  for (const y of [0.78, 1.16]) g.add(solid(new THREE.BoxGeometry(0.88, 0.03, 0.04), m.wood, 0, y, z + 0.04));
  const metal = m.tin;
  for (const [row, y] of [[0, 1.2], [1, 0.82]] as const) {
    for (let k = 0; k < 5; k++) {
      const x = -0.36 + k * 0.18;
      g.add(solid(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 6), metal, x, y + 0.14, z + 0.06));
      const key = solid(new THREE.BoxGeometry(0.035, 0.16, 0.012), metal, x, y, z + 0.07);
      g.add(key);
      // a chave do avião: etiqueta vermelha
      if (row === 1 && k === 2) g.add(solid(new THREE.BoxGeometry(0.09, 0.07, 0.015), new THREE.MeshStandardMaterial({ color: 0xc23a2e }), x, y - 0.1, z + 0.08));
    }
  }
  // base: mesinha de chapa sob o quadro, só para ocupar o hexágono
  g.add(solid(new THREE.BoxGeometry(0.95, 0.5, 0.3), m.woodDark, 0, 0.25, z + 0.17));
  return g;
}

/**
 * Decoração (não bloqueia nada): um galão de gasolina vermelho e, às vezes, um botijão
 * de gás, encostados num canto do hexágono para não esconder a peça de quem passa.
 */
/**
 * Suprimentos do garimpo (o que a equipe queima): caixotes sob uma lona verde amarrada,
 * tambores azuis de diesel para as dragas e um rolo de mangueira preta. Alta como os
 * caixotes (bloqueia a visão), mas com cara de "estoque" para chamar atenção.
 */
function supplyPile(seed: number): THREE.Group {
  const rnd = seeded(seed);
  const m = cargo();
  const g = new THREE.Group();
  g.add(pallet(1.3, 1.0));
  // caixotes por baixo da lona: só a lona aparece, com cordas cruzando
  const load = new THREE.Group();
  load.add(solid(new THREE.BoxGeometry(1.15, 1.05, 0.85), m.tarp, 0, 0.13 + 0.52, 0));
  for (const x of [-0.3, 0.25]) load.add(solid(new THREE.BoxGeometry(0.035, 1.09, 0.89), m.rope, x, 0.13 + 0.52, 0));
  load.position.set(-0.05, 0, -0.05);
  load.rotation.y = (rnd(1) - 0.5) * 0.2;
  g.add(load);
  // tambores de diesel na frente
  const drum = (x: number, z: number) => {
    const d = new THREE.Group();
    d.add(solid(new THREE.CylinderGeometry(0.2, 0.2, 0.62, 12), m.drum, 0, 0.31, 0));
    for (const y of [0.16, 0.46]) d.add(solid(new THREE.CylinderGeometry(0.205, 0.205, 0.035, 12), m.drumRim, 0, y, 0));
    d.position.set(x, 0, z);
    return d;
  };
  g.add(drum(0.42, 0.42));
  if (rnd(2) < 0.7) g.add(drum(0.0, 0.5));
  // rolo de mangueira em cima da lona
  const hose = solid(new THREE.TorusGeometry(0.22, 0.05, 6, 14), m.hose, 0.05, 1.24, 0);
  hose.rotation.x = Math.PI / 2;
  g.add(hose);
  g.rotation.y = Math.floor(rnd(9) * 6) * (Math.PI / 3);
  return g;
}

export function buildFuelProps(seed: number): THREE.Group {
  const rnd = seeded(seed);
  const m = cargo();
  const g = new THREE.Group();
  const can = new THREE.Group();
  can.add(solid(new THREE.BoxGeometry(0.3, 0.38, 0.16), m.canRed, 0, 0.19, 0));
  can.add(solid(new THREE.BoxGeometry(0.2, 0.05, 0.05), m.canRed, -0.02, 0.42, 0)); // alça
  can.add(solid(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 6), m.canCap, 0.11, 0.41, 0));
  can.position.set(0.45, 0, 0.3);
  can.rotation.y = rnd(1) * Math.PI;
  g.add(can);
  if (rnd(2) < 0.7) {
    const gas = new THREE.Group();
    gas.add(solid(new THREE.CylinderGeometry(0.17, 0.17, 0.42, 10), m.cylinder, 0, 0.23, 0));
    gas.add(solid(new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), m.cylinder, 0, 0.44, 0));
    gas.add(solid(new THREE.CylinderGeometry(0.175, 0.175, 0.05, 10), m.cylinderBand, 0, 0.12, 0));
    gas.add(solid(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6), m.brass, 0, 0.64, 0));
    gas.add(solid(new THREE.TorusGeometry(0.09, 0.015, 4, 10), m.cylinder, 0, 0.66, 0));
    gas.position.set(0.12, 0, 0.6);
    g.add(gas);
  }
  if (rnd(3) < 0.4) {
    const extra = can.clone();
    extra.position.set(0.62, 0, -0.05);
    extra.rotation.y = rnd(4) * Math.PI;
    g.add(extra);
  }
  g.rotation.y = Math.floor(rnd(9) * 6) * (Math.PI / 3);
  return g;
}
