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
import { RaceMap, raceA, raceB } from '../game/runner-maps';
import { buildRunnerProps } from '../game/runner-props';

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
      const v = q.get('v') === 'esquerda' ? 'esquerda' : 'direita';
      race = m === 'B' ? raceB(v) : raceA(v);
      map = race.map;
    }
    const ana = q.get('ana')?.split(',').map(Number) ?? [19, 124];
    const vig = q.get('vig')?.split(',').map(Number) ?? [20, 117];
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
    const extras = race ? buildRunnerProps(race) : [];
    board.addProps(extras);
    if (race?.plane) board.posePlane(race.plane.x, race.plane.z, race.plane.sink);
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
