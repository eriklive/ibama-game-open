import * as THREE from 'three';
import { HexCoord, hexKey, hexToWorld } from './hex';

/**
 * Cenário montado por código: o hangar (paredes retas de chapa ondulada, portão e
 * treliças do telhado) e o avião estacionado. Nada aqui tem regra de jogo — quem
 * bloqueia passagem e visão são os hexágonos marcados no mapa.
 */

const WALL_HEIGHT = 1.5;
const WALL_THICKNESS = 0.18;

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

  // telhado: só as treliças em arco, para a câmera enxergar o interior
  const steel = new THREE.MeshStandardMaterial({ color: 0x2c363c, roughness: 0.6, metalness: 0.4 });
  const rise = 2.4;
  const count = Math.max(2, Math.round((zFront - zBack) / 3.2) + 1);
  for (let i = 0; i < count; i++) {
    const z = zBack + ((zFront - zBack) * i) / (count - 1);
    const points = Array.from({ length: 25 }, (_, k) => {
      const t = k / 24;
      return new THREE.Vector3(x0 + (x1 - x0) * t, WALL_HEIGHT + Math.sin(Math.PI * t) * rise, z);
    });
    const arch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.07, 5), steel);
    arch.castShadow = true;
    group.add(arch);
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
