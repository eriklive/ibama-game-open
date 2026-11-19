import * as THREE from 'three';
import { DieModel } from './die-scene';

/**
 * Modelos dos dados: geometria, numeração e cores de cada um. Os dois usam faces
 * triangulares; cada face tem a sua textura (um canvas), redesenhada quando o dado para
 * para destacar o número sorteado.
 */

const TEX = 256;
/** Cantos do triângulo equilátero na textura (coordenadas do canvas, y para baixo). */
const CORNERS: readonly [number, number][] = [
  [128, 22],
  [17, 214],
  [239, 214],
];
const CENTER: [number, number] = [128, (22 + 214 + 214) / 3];
const FONT = '"Stardos Stencil", "Arial Black", sans-serif';

/** Cores de um dado: corpo, número, destaque e o brilho do destaque. */
export interface DiePalette {
  body: string;
  /** Filete interno da face (imita a quina chanfrada). */
  bevel: string;
  ink: string;
  hit: string;
  hitGlow: string;
}

export const D4_PALETTE: DiePalette = {
  body: '#f4ecd6',
  bevel: 'rgba(35, 32, 26, .22)',
  ink: '#23201a',
  hit: '#b8231a',
  hitGlow: 'rgba(255, 170, 40, .9)',
};

export const D20_PALETTE: DiePalette = {
  body: '#2f5a3b',
  bevel: 'rgba(244, 236, 214, .28)',
  ink: '#f4ecd6',
  hit: '#ffd772',
  hitGlow: 'rgba(255, 200, 80, .95)',
};

/** d20 do garimpeiro: vermelho, para não confundir com o da equipe. */
export const D20_RED_PALETTE: DiePalette = {
  body: '#8e2119',
  bevel: 'rgba(244, 236, 214, .28)',
  ink: '#f4ecd6',
  hit: '#ffd772',
  hitGlow: 'rgba(255, 200, 80, .95)',
};

interface Face {
  texture: THREE.CanvasTexture;
  material: THREE.MeshStandardMaterial;
  draw(highlight?: number): void;
}

/** Uma face com o seu canvas; `paint` escreve os números por cima do fundo. */
function face(
  palette: DiePalette,
  paint: (g: CanvasRenderingContext2D, highlight?: number) => void,
): Face {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEX;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const draw = (highlight?: number) => {
    const g = canvas.getContext('2d')!;
    g.fillStyle = palette.body;
    g.fillRect(0, 0, TEX, TEX);
    g.beginPath();
    CORNERS.forEach(([x, y], i) => {
      const px = x + (CENTER[0] - x) * 0.08;
      const py = y + (CENTER[1] - y) * 0.08;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    });
    g.closePath();
    g.strokeStyle = palette.bevel;
    g.lineWidth = 5;
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    paint(g, highlight);
    texture.needsUpdate = true;
  };
  draw();
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.42,
    metalness: 0.05,
    emissive: new THREE.Color('#ffcf5a'),
    emissiveIntensity: 0,
  });
  return { texture, material, draw };
}

function ink(g: CanvasRenderingContext2D, palette: DiePalette, hit: boolean): void {
  g.fillStyle = hit ? palette.hit : palette.ink;
  g.shadowColor = hit ? palette.hitGlow : 'transparent';
  g.shadowBlur = hit ? 14 : 0;
}

/** Monta a geometria com um grupo (e um material) por face; `faces` vêm em sentido anti-horário. */
function triangles(
  verts: readonly THREE.Vector3[],
  faces: readonly (readonly number[])[],
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const geo = new THREE.BufferGeometry();
  faces.forEach((f, i) => {
    f.forEach((vi, k) => {
      pos.push(verts[vi].x, verts[vi].y, verts[vi].z);
      uv.push(CORNERS[k][0] / TEX, 1 - CORNERS[k][1] / TEX);
    });
    geo.addGroup(i * 3, 3, i);
  });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

/** Todas as faces triangulares de um sólido convexo (três vértices à distância `edge`), viradas para fora. */
function hullFaces(verts: readonly THREE.Vector3[], edge: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const near = (a: number, b: number) => Math.abs(verts[a].distanceTo(verts[b]) - edge) < 1e-4;
  for (let a = 0; a < verts.length; a++)
    for (let b = a + 1; b < verts.length; b++)
      for (let c = b + 1; c < verts.length; c++) {
        if (!near(a, b) || !near(b, c) || !near(a, c)) continue;
        const n = new THREE.Vector3()
          .subVectors(verts[b], verts[a])
          .cross(new THREE.Vector3().subVectors(verts[c], verts[a]));
        out.push(n.dot(verts[a]) > 0 ? [a, b, c] : [a, c, b]);
      }
  return out;
}

const normalOf = (verts: readonly THREE.Vector3[], [a, b, c]: readonly number[]): THREE.Vector3 =>
  new THREE.Vector3()
    .subVectors(verts[b], verts[a])
    .cross(new THREE.Vector3().subVectors(verts[c], verts[a]))
    .normalize();

function model(
  verts: readonly THREE.Vector3[],
  faces: readonly (readonly number[])[],
  textures: Face[],
  radius: number,
  extra: Pick<DieModel, 'up' | 'reading'>,
): DieModel {
  const geometry = triangles(verts, faces);
  return {
    geometry,
    materials: textures.map((t) => t.material),
    hull: verts,
    radius,
    ...extra,
    highlight: (value) => textures.forEach((t) => t.draw(value)),
    dispose: () => {
      geometry.dispose();
      textures.forEach((t) => {
        t.texture.dispose();
        t.material.dispose();
      });
    },
  };
}

// ---------- d4: tetraedro, o resultado é o vértice de cima ----------

/**
 * d4 de mesa: o vértice `i` vale `i + 1` e o número aparece, perto dele, nas três faces que
 * o tocam; o que fica apontando para cima é o resultado.
 */
export function d4Model(palette: DiePalette = D4_PALETTE): DieModel {
  const R = 1;
  const verts = [
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(-1, -1, 1),
    new THREE.Vector3(-1, 1, -1),
    new THREE.Vector3(1, -1, -1),
  ].map((v) => v.normalize().multiplyScalar(R));
  const faces = hullFaces(verts, verts[0].distanceTo(verts[1]));
  const textures = faces.map((f) => {
    const numbers = f.map((v) => v + 1);
    return face(palette, (g, highlight) => {
      g.font = `700 64px ${FONT}`;
      CORNERS.forEach(([x, y], i) => {
        const px = x + (CENTER[0] - x) * 0.4;
        const py = y + (CENTER[1] - y) * 0.4;
        g.save();
        g.translate(px, py);
        // o "topo" do número aponta para o seu vértice
        g.rotate(Math.atan2(x - CENTER[0], -(y - CENTER[1])));
        ink(g, palette, numbers[i] === highlight);
        g.fillText(String(numbers[i]), 0, 4);
        g.restore();
      });
    });
  });
  return model(verts, faces, textures, R, { up: (value) => verts[(value - 1) % verts.length] });
}

// ---------- d20: icosaedro, o resultado é a face de cima ----------

/**
 * d20: um número por face, centrado e em pé (com o topo para a aresta oposta ao primeiro vértice);
 * faces opostas somam 21, como num d20 de verdade. O 6 e o 9 ganham um traço embaixo.
 */
export function d20Model(palette: DiePalette = D20_PALETTE): DieModel {
  const R = 1.15;
  const phi = (1 + Math.sqrt(5)) / 2;
  const raw: [number, number, number][] = [];
  for (const s of [-1, 1])
    for (const t of [-1, 1]) raw.push([0, s, t * phi], [s, t * phi, 0], [t * phi, 0, s]);
  const verts = raw.map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize().multiplyScalar(R));
  const faces = hullFaces(verts, minEdge(verts));
  const normals = faces.map((f) => normalOf(verts, f));

  // numeração: cada face sem número recebe n, e a oposta 21 − n
  const numbers: number[] = Array(faces.length).fill(0);
  let n = 1;
  normals.forEach((nv, i) => {
    if (numbers[i]) return;
    const opposite = normals.findIndex((o, j) => !numbers[j] && j !== i && o.dot(nv) < -0.999);
    numbers[i] = n;
    numbers[opposite] = 21 - n;
    n++;
  });
  const faceOf = (value: number) => Math.max(0, numbers.indexOf(value));

  const textures = numbers.map((num) =>
    face(palette, (g, highlight) => {
      const hit = num === highlight;
      g.font = `700 ${num >= 10 ? 70 : 80}px ${FONT}`;
      ink(g, palette, hit);
      // de cabeça para baixo na textura: o topo do número aponta para a aresta oposta ao
      // primeiro vértice (assim esse vértice fica de frente para a câmera; veja `reading`)
      g.save();
      g.translate(CENTER[0], CENTER[1] - 4);
      g.rotate(Math.PI);
      g.fillText(String(num), 0, 0);
      if (num === 6 || num === 9) g.fillRect(-18, 30, 36, 6);
      g.restore();
    }),
  );

  const centroid = (f: readonly number[]) =>
    f.reduce((acc, vi) => acc.add(verts[vi]), new THREE.Vector3()).multiplyScalar(1 / 3);
  return model(verts, faces, textures, R, {
    up: (value) => normals[faceOf(value)],
    // o topo do número vai para o fundo da cena; o primeiro vértice, para quem olha. Com
    // um vértice (e não uma aresta) virado para a câmera, as faces vizinhas ficam mais
    // inclinadas e a face de cima é a que se lê
    reading: (value) => {
      const f = faces[faceOf(value)];
      return new THREE.Vector3().subVectors(centroid(f), verts[f[0]]);
    },
  });
}

function minEdge(verts: readonly THREE.Vector3[]): number {
  let best = Infinity;
  for (let a = 0; a < verts.length; a++)
    for (let b = a + 1; b < verts.length; b++) best = Math.min(best, verts[a].distanceTo(verts[b]));
  return best;
}
