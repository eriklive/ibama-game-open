/**
 * Modo Corrida — objetos que só existem nos mapas de corrida (ver `runner-maps.ts`): a tora no
 * chão (pular), o galho atravessado no peito e a lona azul (deslizar) e os galões (pular). A carga, o hangar, o avião e as
 * árvores são os do jogo; estes são feitos de caixas e cilindros, no mesmo estilo.
 */
import * as THREE from 'three';
import { buildFuelProps } from './scenery';
import { RaceMap, obstacleAt } from './runner-maps';
import { LANE_WIDTH, pathPose } from './runner-path';

const M = 4 / 3; // 1 m em unidades do mundo

function log(len: number, lift = 0): THREE.Group {
  const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x5e4128, roughness: 1 });
  const cut = new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, len, 9), [bark, cut, cut]);
  trunk.rotation.z = Math.PI / 2;
  trunk.position.y = 0.42 + lift;
  trunk.castShadow = trunk.receiveShadow = true;
  g.add(trunk);
  for (const s of [-0.3, 0.15, 0.38]) {
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.6, 5), bark);
    stub.position.set(s * len, 0.42 + lift + 0.4, 0.1);
    stub.rotation.z = 0.5 * Math.sign(s);
    stub.castShadow = true;
    g.add(stub);
  }
  return g;
}

/** Galho/tora atravessada na altura do peito, apoiada em dois tocos: só passa deslizando. */
function branch(len: number): THREE.Group {
  const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a3d26, roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2f6b2c, roughness: 1, flatShading: true });
  const h = 1.15 * M;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, len + 1.2, 8), bark);
  beam.rotation.z = Math.PI / 2 + 0.06;
  beam.position.y = h;
  beam.castShadow = true;
  g.add(beam);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, h + 0.3, 7), bark);
    post.position.set((s * (len + 0.8)) / 2, (h + 0.3) / 2 - 0.1, 0);
    post.castShadow = true;
    g.add(post);
  }
  for (let i = 0; i < 6; i++) {
    const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 + (i % 3) * 0.08, 0), leaf);
    tuft.position.set((i / 5 - 0.5) * len, h + 0.18 + (i % 2) * 0.12, (i % 2 ? 0.15 : -0.12));
    tuft.castShadow = true;
    g.add(tuft);
  }
  return g;
}

/** Lona azul esticada entre dois paus (barraca do garimpo): deslizar por baixo. */
function tarp(len: number): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x2b63b8, roughness: 0.7, side: THREE.DoubleSide });
  const h = 1.05 * M;
  for (const s of [-1, 1]) {
    for (const z of [-0.6, 0.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, h + 0.5, 5), wood);
      post.position.set((s * (len + 0.6)) / 2, (h + 0.5) / 2, z);
      post.castShadow = true;
      g.add(post);
    }
  }
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.9, 1.5, 6, 2), blue);
  const pos = sheet.geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) pos.setZ(i, -0.18 * Math.cos((pos.getX(i) / (len + 0.9)) * Math.PI));
  sheet.geometry.computeVertexNormals();
  sheet.rotation.x = -Math.PI / 2 + 0.25;
  sheet.position.y = h + 0.25;
  sheet.castShadow = true;
  g.add(sheet);
  // a aba que pende na frente
  const flap = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.9, 0.55), blue);
  flap.position.set(0, h - 0.05, 0.78);
  flap.castShadow = true;
  g.add(flap);
  return g;
}

/** Monta os objetos próprios da corrida de um mapa, já no lugar e virados para o caminho. */
export function buildRunnerProps(race: RaceMap): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const o of race.obstacles) {
    const at = obstacleAt(race, o);
    const mid = (Math.min(...o.lanes) + Math.max(...o.lanes)) / 2;
    const c = pathPose(race.path, at, mid);
    const len = (Math.max(...o.lanes) - Math.min(...o.lanes)) * LANE_WIDTH + LANE_WIDTH + 0.6;
    let obj: THREE.Object3D | null = null;
    if (o.kind === 'log') obj = log(len);
    else if (o.kind === 'branch') obj = branch(len);
    else if (o.kind === 'tarp') obj = tarp(len);
    else if (o.kind === 'fuel') obj = buildFuelProps(Math.round(at * 7));
    if (!obj) continue;
    obj.position.set(c.x, 0, c.z);
    // feitos ao longo de x: atravessam a pista de quem corre para o norte; giram com ela
    obj.rotation.y += c.yaw - Math.PI;
    out.push(obj);
  }
  return out;
}
