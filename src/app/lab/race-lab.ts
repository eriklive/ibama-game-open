/**
 * Laboratório do Modo Corrida (protótipo, só para renders). `#/lab?m=tatico|A|B`.
 * Monta um `HexBoard` real e expõe `window.__lab` para o script de captura.
 */
import { AfterViewInit, Component, ElementRef, OnDestroy, viewChild } from '@angular/core';
import * as THREE from 'three';
import { HexBoard } from '../game/hex-board';
import { CHARACTERS, MAPS, GameMap } from '../game/maps';
import { MODELS } from '../game/character-model';
import { hexToWorld, HexCoord, hexKey } from '../game/hex';
import { spawnDoors } from '../game/door';
import { buildFuelProps } from '../game/scenery';
import { RaceMap, raceA, raceB } from './race-maps';

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

/** Porta de enrolar meio aberta (fundos do hangar): passa só deslizando. */
function shutter(width: number): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x8b969c, roughness: 0.55, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3d4447, roughness: 0.8 });
  const gap = 1.0 * M;
  const top = 2.8 * M;
  for (let i = 0; i < 14; i++) {
    const y = gap + (i + 0.5) * ((top - gap) / 14);
    const slat = new THREE.Mesh(new THREE.BoxGeometry(width, (top - gap) / 14 - 0.02, 0.08), metal);
    slat.position.y = y;
    slat.castShadow = true;
    g.add(slat);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 0.16), dark);
  bar.position.y = gap;
  g.add(bar);
  const stripes = new THREE.MeshStandardMaterial({ color: 0xffc21a, roughness: 0.6 });
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(width / 16, 0.1, 0.17), stripes);
    s.position.set(-width / 2 + (i * 2 + 0.5) * (width / 16), gap, 0.005);
    g.add(s);
  }
  return g;
}

@Component({
  selector: 'app-race-lab',
  template: '<div class="host"><canvas #c></canvas></div>',
  styles: [':host{position:fixed;inset:0;display:block;background:#2f4526}.host{position:absolute;inset:0}canvas{display:block;width:100%;height:100%}'],
})
export class RaceLab implements AfterViewInit, OnDestroy {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('c');
  private board?: HexBoard;

  ngAfterViewInit(): void {
    const q = new URLSearchParams(location.hash.split('?')[1] ?? '');
    const m = q.get('m') ?? 'A';
    let map: GameMap;
    let race: RaceMap | undefined;
    if (m === 'tatico') map = MAPS.find((x) => x.id === 'aeroporto')!;
    else {
      race = m === 'B' ? raceB() : raceA();
      map = race.map;
    }
    const ana = q.get('ana')?.split(',').map(Number) ?? [12, 124];
    const vig = q.get('vig')?.split(',').map(Number) ?? [12, 117];
    const extraUnits = q.get('team') === '1';
    const units = [{ id: 'ana', color: CHARACTERS[0].color, model: MODELS.ana, start: { col: ana[0], row: ana[1] } }];
    if (extraUnits) {
      units.push({ id: 'bruno', color: CHARACTERS[1].color, model: MODELS.bruno, start: { col: ana[0] - 1, row: ana[1] + 1 } });
      units.push({ id: 'clara', color: CHARACTERS[2].color, model: MODELS.clara, start: { col: ana[0] + 1, row: ana[1] + 1 } });
    }
    const enemies = [{ id: 'vigia', start: { col: vig[0], row: vig[1] }, facing: 0, model: MODELS.garimpeiro }];
    if (m === 'tatico' && q.get('all') === '1') {
      for (const e of map.enemies) {
        if (e.id === 'vigia-pista') continue;
        enemies.push({ id: e.id, start: e.patrol[0], facing: 0, model: e.model! });
      }
    }
    const board = new HexBoard(this.canvas().nativeElement, map, units, { onHexTap: () => {}, onUnitTap: () => {} }, {
      walls: map.walls,
      enemies,
    });
    this.board = board;
    board.setDoors(spawnDoors(map.doors ?? [], map.doorStates), true);
    board.setBurnTargets([]);
    const b = board as unknown as Record<string, any>;
    const scene: THREE.Scene = b['scene'];
    const extras: THREE.Object3D[] = [];
    for (const o of race?.obstacles ?? []) {
      const span = o.span ?? 1;
      const p0 = hexToWorld(o, 1);
      const p1 = hexToWorld({ col: o.col + span - 1, row: o.row }, 1);
      const x = (p0.x + p1.x) / 2;
      const z = hexToWorld({ col: 12, row: o.row }, 1).z;
      const len = Math.abs(p1.x - p0.x) + 1.6;
      let obj: THREE.Object3D | null = null;
      if (o.kind === 'log') obj = log(len);
      else if (o.kind === 'branch') obj = branch(len);
      else if (o.kind === 'tarp') obj = tarp(len);
      else if (o.kind === 'shutter') obj = shutter(len + 0.4);
      else if (o.kind === 'fuel') {
        obj = buildFuelProps(o.col * 7 + o.row);
        obj.position.set(p0.x, 0, p0.z);
        scene.add(obj);
        extras.push(obj);
        continue;
      }
      if (!obj) continue;
      obj.position.set(x, 0, z);
      scene.add(obj);
      extras.push(obj);
    }

    const renderer: THREE.WebGLRenderer = b['renderer'];
    const camera: THREE.PerspectiveCamera = b['camera'];
    (window as any).__lab = {
      board,
      b,
      THREE,
      map,
      race,
      hexToWorld,
      hexKey,
      extras,
      /** Gira os hexágonos (flip): `fn(tile) → ângulo` (0 = assentado, π/2 = de lado, ≥ π = escondido). */
      flip(fn: (t: { x: number; z: number; coord: HexCoord }) => number, liftK = 0.9) {
        const field = b['field'];
        const mat = new THREE.Matrix4();
        const rot = new THREE.Matrix4();
        const lines = field['linePos'].array as Float32Array;
        const seg = field['segment'] as Float32Array;
        for (const t of field.list) {
          const a = fn(t);
          if (a <= 0) continue;
          if (a >= Math.PI / 2 + 0.6) {
            field.mesh.setMatrixAt(t.index, new THREE.Matrix4().makeScale(0, 0, 0));
          } else {
            rot.makeRotationX(-a);
            mat.makeTranslation(t.x, t.y + Math.sin(Math.min(a, Math.PI / 2)) * liftK, t.z).multiply(rot);
            field.mesh.setMatrixAt(t.index, mat);
          }
          const o = t.index * seg.length;
          for (let k = 0; k < seg.length; k += 3) lines[o + k + 1] = -1000;
        }
        field.mesh.instanceMatrix.needsUpdate = true;
        field['linePos'].needsUpdate = true;
        for (const d of field['decals']) d.mesh.visible = false;
      },
      /** Renderiza já (com recorte opcional em z) e devolve PNG. `mask` = branco no que foi desenhado. */
      snap(opts: { keep?: 'near' | 'far'; z?: number; mask?: boolean } = {}) {
        const planes = opts.keep
          ? [opts.keep === 'near' ? new THREE.Plane(new THREE.Vector3(0, 0, 1), -opts.z!) : new THREE.Plane(new THREE.Vector3(0, 0, -1), opts.z!)]
          : [];
        renderer.clippingPlanes = planes;
        const bg = scene.background;
        const fog = scene.fog;
        if (opts.mask) {
          scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
          scene.background = new THREE.Color(0);
          scene.fog = null;
        }
        camera.updateMatrixWorld();
        b['stream'].cull(camera, b['sun']);
        renderer.render(scene, camera);
        const url = renderer.domElement.toDataURL('image/png');
        scene.overrideMaterial = null;
        scene.background = bg;
        scene.fog = fog;
        renderer.clippingPlanes = [];
        return url;
      },
      setCam(pos: number[], look: number[], fov?: number) {
        camera.position.set(pos[0], pos[1], pos[2]);
        camera.lookAt(look[0], look[1], look[2]);
        if (fov) camera.fov = fov;
        camera.far = 1200;
        camera.updateProjectionMatrix();
      },
      camera,
      renderer,
      scene,
    };
  }

  ngOnDestroy(): void {
    this.board?.dispose();
  }
}
