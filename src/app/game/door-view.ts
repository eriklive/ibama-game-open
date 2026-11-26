import * as THREE from 'three';
import { Door, isOpen } from './door';
import { HexCoord, hexKey, hexToWorld } from './hex';
import { HexRect, inStructure } from './maps';
import { castsMovingShadow } from './static-shadow';
import { METER } from './character-model';

/**
 * Altura da folha da porta e do vão: 2,1 m, a porta comum, acima dos personagens (1,68–1,78 m).
 * A verga fica logo acima da folha, abaixo do topo das paredes (casa 2,7 m, hangar 5 m).
 */
const LEAF_HEIGHT = 2.1 * METER;
/** Altura da verga sobre o vão. */
const LINTEL_HEIGHT = 0.2;
const LEAF_THICKNESS = 0.08;
/** Folga entre a folha e os postes do batente. */
const POST_GAP = 0.14;
/** Abertura máxima: a folha bate na parede de dentro e quica. */
const MAX_SWING = 1.9;

/** Como a porta reage a um empurrão (ver `DoorViews.push`). */
export type DoorPush = 'swing' | 'slam' | 'rattle';

interface Leaf {
  key: string;
  /** Centro do vão, no chão. */
  center: THREE.Vector3;
  /** Normal da parede (unitária, no plano XZ). */
  normal: THREE.Vector3;
  pivot: THREE.Group;
  /** Rotação da folha fechada (0 = folha ao longo de +X; −π/2 = ao longo de +Z). */
  base: number;
  leaf: THREE.Mesh;
  lock: THREE.Object3D;
  planks: THREE.Object3D;
  /**
   * Casca da aura (ver `modelsOf`): uma caixa invisível do tamanho do vão inteiro (folha, verga
   * e tábuas), saliente dos dois lados da parede. O contorno sai dela, e não das peças da folha.
   */
  shell: THREE.Mesh;
  /** Para que lado a folha abre (+1 ou −1): longe de quem empurrou por último. */
  side: number;
  angle: number;
  vel: number;
  target: number;
  /** Mola: rigidez e amortecimento (o chute bate forte; abrir na mão é suave). */
  k: number;
  c: number;
}

/**
 * Folhas das portas comuns: cada uma gira na dobradiça presa no batente da parede da
 * estrutura (as paredes ficam a meio hexágono do centro, ver `buildHouse`). A folha anda com
 * uma mola, então abrir devagar, arrombar (bate na parede e quica) e forçar uma porta que
 * não cede (só treme) são a mesma física com empurrões diferentes.
 */
export class DoorViews {
  readonly group = new THREE.Group();
  private readonly leaves = new Map<string, Leaf>();

  constructor(doors: readonly HexCoord[], structures: readonly HexRect[], size: number) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x9a6a3e, roughness: 0.85 });
    const rail = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.9 });
    const frame = new THREE.MeshStandardMaterial({ color: 0x5a3b1e, roughness: 0.9 });
    const brass = new THREE.MeshStandardMaterial({
      color: 0xd9b44a,
      roughness: 0.35,
      metalness: 0.6,
    });
    const steel = new THREE.MeshStandardMaterial({
      color: 0xc9d3d6,
      roughness: 0.3,
      metalness: 0.8,
    });
    const plank = new THREE.MeshStandardMaterial({ color: 0x5b3d24, roughness: 0.95 });

    for (const hex of doors) {
      const rect = structures.find((r) => inStructure(hex, r));
      if (!rect) continue;
      const key = hexKey(hex);
      // paredes de fundo e de frente correm no sentido X; laterais e divisórias, no sentido Z
      const horizontal = hex.row === rect.rows[0] || hex.row === rect.rows[1];
      const p = hexToWorld(hex, size);
      const center = horizontal
        ? new THREE.Vector3(
            p.x,
            0,
            hexToWorld({ col: 0, row: hex.row }, size).z + (Math.sqrt(3) * size) / 4,
          )
        : new THREE.Vector3(p.x, 0, p.z);
      const gap = horizontal ? 1.5 * size : Math.sqrt(3) * size;
      const width = gap - 2 * POST_GAP;
      const base = horizontal ? 0 : -Math.PI / 2;
      const along = new THREE.Vector3(Math.cos(base), 0, -Math.sin(base));
      const normal = new THREE.Vector3(-along.z, 0, along.x);

      const holder = new THREE.Group();
      holder.position.copy(center);
      holder.rotation.y = base;
      this.group.add(holder);

      // verga sobre o vão (a parede se interrompe na porta) e soleira
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(gap, LINTEL_HEIGHT, 0.2), frame);
      lintel.position.y = LEAF_HEIGHT + 0.02 + LINTEL_HEIGHT / 2;
      lintel.castShadow = lintel.receiveShadow = true;
      holder.add(lintel);

      const pivot = new THREE.Group();
      pivot.position.x = -width / 2;
      holder.add(pivot);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(width, LEAF_HEIGHT, LEAF_THICKNESS), wood);
      leaf.position.set(width / 2, LEAF_HEIGHT / 2 + 0.02, 0);
      pivot.add(leaf);
      for (const f of [0.18, 0.5, 0.82]) {
        const r = new THREE.Mesh(
          new THREE.BoxGeometry(width - 0.08, 0.07, LEAF_THICKNESS + 0.04),
          rail,
        );
        r.position.y = LEAF_HEIGHT * f - LEAF_HEIGHT / 2;
        leaf.add(r);
      }
      for (const z of [-1, 1]) {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), brass);
        knob.position.set(width / 2 - 0.14, 0, z * 0.07);
        leaf.add(knob);
      }
      castsMovingShadow(leaf);

      // cadeado (trancada), dos dois lados
      const lock = new THREE.Group();
      for (const z of [-1, 1]) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.06), brass);
        const shackle = new THREE.Mesh(
          new THREE.TorusGeometry(0.055, 0.016, 6, 12, Math.PI),
          steel,
        );
        shackle.position.y = 0.08;
        const pad = new THREE.Group().add(body, shackle);
        pad.position.set(width / 2 - 0.14, -0.22, z * 0.1);
        lock.add(pad);
      }
      leaf.add(lock);

      // tábuas pregadas em X (bloqueada), dos dois lados da parede
      const planks = new THREE.Group();
      for (const z of [-1, 1]) {
        for (const [y, a] of [
          [0.65, 0.42],
          [1.4, -0.42],
        ] as const) {
          const b = new THREE.Mesh(new THREE.BoxGeometry(gap + 0.15, 0.2, 0.06), plank);
          b.position.set(0, y, z * 0.16);
          b.rotation.z = a;
          b.castShadow = true;
          planks.add(b);
        }
      }
      holder.add(planks);

      // casca da aura: não desenha nada (nem cor nem profundidade), só dá a forma ao contorno
      const shell = new THREE.Mesh(
        new THREE.BoxGeometry(gap, LEAF_HEIGHT + 0.02 + LINTEL_HEIGHT, 0.5),
        new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
      );
      shell.position.y = (LEAF_HEIGHT + 0.02 + LINTEL_HEIGHT) / 2;
      shell.userData['outlineShell'] = true;
      shell.raycast = () => undefined;
      holder.add(shell);

      this.leaves.set(key, {
        key,
        center,
        normal,
        pivot,
        base,
        leaf,
        lock,
        planks,
        shell,
        side: 1,
        angle: 0,
        vel: 0,
        target: 0,
        k: 30,
        c: 8,
      });
    }
  }

  has(key: string): boolean {
    return this.leaves.has(key);
  }

  /** Centro do vão da porta (no chão). */
  centerOf(key: string): THREE.Vector3 | undefined {
    return this.leaves.get(key)?.center.clone();
  }

  /** Normal da parede da porta (unitária, plano XZ). */
  normalOf(key: string): THREE.Vector3 | undefined {
    return this.leaves.get(key)?.normal.clone();
  }

  /** Chaves de todas as portas com folha. */
  keys(): IterableIterator<string> {
    return this.leaves.keys();
  }

  /**
   * Ponto do lado de quem está em `from`, a `dist` do plano da parede, alinhado com o vão:
   * onde o agente para para chutar, abrir ou mexer na fechadura.
   */
  frontOf(key: string, from: THREE.Vector3, dist: number): THREE.Vector3 | undefined {
    const l = this.leaves.get(key);
    if (!l) return undefined;
    const s = Math.sign(from.clone().sub(l.center).dot(l.normal)) || 1;
    return l.center.clone().addScaledVector(l.normal, s * dist);
  }

  /** Atualiza a aparência pelo estado (cadeado, tábuas e o ângulo de repouso). */
  setStates(doors: ReadonlyMap<string, Door>, instant = false): void {
    for (const [key, d] of doors) {
      const l = this.leaves.get(key);
      if (!l) continue;
      l.lock.visible = d.state === 'trancada' && !d.broken;
      l.planks.visible = d.state === 'bloqueada' && !d.broken;
      l.leaf.rotation.z = d.broken ? 0.05 : 0;
      l.target = (d.broken ? 1.8 : isOpen(d) ? 1.5 : d.state === 'encostada' ? 0.07 : 0) * l.side;
      if (instant) {
        l.angle = l.target;
        l.vel = 0;
      }
    }
  }

  /**
   * Empurra a porta a partir de `from` (quem empurra): ela abre para o outro lado.
   * `swing` abre devagar, `slam` (chute) bate na parede e quica, `rattle` só treme no batente.
   * Chame `setStates` antes, com o estado novo, para o alvo da mola já estar certo.
   */
  push(key: string, from: THREE.Vector3, mode: DoorPush): void {
    const l = this.leaves.get(key);
    if (!l) return;
    if (mode !== 'rattle') {
      // a ponta da folha anda, para θ > 0, no sentido (−sen b, −cos b); abre para longe de quem empurra
      const tip = new THREE.Vector3(-Math.sin(l.base), 0, -Math.cos(l.base));
      const away = l.center.clone().sub(from);
      const side = Math.sign(tip.dot(away)) || 1;
      if (side !== l.side) {
        l.target *= -1;
        l.side = side;
      }
    }
    if (mode === 'slam') {
      l.k = 34;
      l.c = 4.5;
      l.vel = 15 * l.side;
    } else if (mode === 'swing') {
      l.k = 16;
      l.c = 6.5;
      l.vel = 1.2 * l.side;
    } else {
      // sem ceder: tranco para o lado de lá, a mola puxa de volta
      const tip = new THREE.Vector3(-Math.sin(l.base), 0, -Math.cos(l.base));
      const s = Math.sign(tip.dot(l.center.clone().sub(from))) || 1;
      l.k = 60;
      l.c = 5;
      l.vel = 1.6 * s;
    }
  }

  /**
   * Peças que mostram a porta fechada (a folha e as tábuas da bloqueada): o que se toca para
   * escolher a porta, como o avião (ver `HexBoard.setTargetOutlines`). O contorno de "dá para
   * tocar" não sai delas (sairia picado, metido na parede): sai da casca, uma porta maior em volta
   * de tudo.
   */
  modelsOf(key: string): THREE.Object3D[] {
    const l = this.leaves.get(key);
    if (!l) return [];
    for (const part of [l.leaf, l.planks]) part.traverse((o) => (o.userData['noOutline'] = true));
    return [l.leaf, l.planks, l.shell];
  }

  update(dt: number): void {
    for (const l of this.leaves.values()) {
      const acc = l.k * (l.target - l.angle) - l.c * l.vel;
      l.vel += acc * dt;
      l.angle += l.vel * dt;
      // a folha não atravessa a parede de dentro nem o batente do outro lado
      if (Math.abs(l.angle) > MAX_SWING) {
        l.angle = Math.sign(l.angle) * MAX_SWING;
        l.vel *= -0.35;
      }
      l.pivot.rotation.y = l.angle;
    }
  }
}
