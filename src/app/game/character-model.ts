import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/** Clipes da biblioteca humanoide (`public/assets/anims/humanoid-base.glb`). */
export type ClipName = 'idle' | 'walk' | 'run';

/** Modelo 3D de um personagem (ver docs/esqueletos-e-movimentacao.md). */
export interface ModelDef {
  /** GLB com malha + esqueleto (sem animações). */
  url: string;
  /** GLB só com clipes, no mesmo esqueleto. */
  anims: string;
  /** Altura final no tabuleiro, em unidades do mundo (raio do hexágono = 1; ver `METER`). */
  height: number;
  /** Cor que tinge a roupa/corpo (olhos e cabelo ficam como são), para distinguir cópias do mesmo modelo. */
  tint?: number;
}

/** Biblioteca de clipes do esqueleto humanoide padrão (nomes de ossos da Quaternius UAL). */
export const HUMANOID_ANIMS = 'assets/anims/humanoid-base.glb';
/**
 * Escala do tabuleiro: o hexágono cabe num quadrado de 1,5 m × 1,5 m, isto é, mede 1,5 m de
 * ponta a ponta (2 × raio). Com raio 1, um metro vale 2 / 1,5 ≈ 1,33 unidade do mundo.
 */
export const HEX_WIDTH_METERS = 1.5;
export const METER = 2 / HEX_WIDTH_METERS;
/** Altura de um humano adulto no tabuleiro (1,70 m ≈ 2,27 unidades). */
export const HUMAN_HEIGHT = 1.7 * METER;

/**
 * Velocidade de deslocamento de cada clipe de locomoção no tamanho original (m/s),
 * medida na versão com root motion da Universal Animation Library. Serve para casar a
 * velocidade da animação com a velocidade real da peça, sem os pés "patinarem".
 */
const CLIP_SPEED: Partial<Record<ClipName, number>> = { walk: 0.97, run: 5.36 };

/** Quanto da cor de `tint` entra no material (0 = nada, 1 = cor cheia). */
const TINT_STRENGTH = 0.6;

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<GLTF>>();

function loadGltf(url: string): Promise<GLTF> {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url);
    cache.set(url, p);
    p.catch(() => cache.delete(url)); // permite tentar de novo depois de uma falha
  }
  return p;
}

/**
 * Instância animada de um personagem: uma cópia do modelo (malhas compartilhadas,
 * esqueleto próprio), um `AnimationMixer` e troca de clipes com crossfade.
 */
export class CharacterRig {
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<ClipName, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;

  private constructor(
    /** Raiz do modelo já na escala do tabuleiro, com os pés em y = 0 e de frente para +Z. */
    readonly object: THREE.Object3D,
    /** Fator entre o modelo original (metros) e o tabuleiro. */
    readonly scale: number,
    clips: THREE.AnimationClip[],
    /** Materiais tingidos, só desta instância. */
    private readonly ownMaterials: THREE.Material[] = [],
  ) {
    this.mixer = new THREE.AnimationMixer(object);
    for (const clip of clips) this.actions.set(clip.name as ClipName, this.mixer.clipAction(clip));
  }

  static async load(def: ModelDef): Promise<CharacterRig> {
    const [model, anims] = await Promise.all([loadGltf(def.url), loadGltf(def.anims)]);
    const inner = cloneSkinned(model.scene);
    const tint = def.tint === undefined ? null : new THREE.Color(0xffffff).lerp(new THREE.Color(def.tint), TINT_STRENGTH);
    const owned: THREE.Material[] = [];
    inner.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (tint && !Array.isArray(mat) && !/eye|hair/i.test(mat.name)) {
        // material próprio desta cópia: os clones dividem os materiais do modelo em cache
        const own = mat.clone();
        own.color.multiply(tint);
        mesh.material = own;
        owned.push(own);
      }
      mesh.castShadow = true;
      // a caixa de colisão da malha é a da pose de repouso; animada, ela pode sair
      // dela e sumir na borda da tela
      mesh.frustumCulled = false;
    });
    const box = new THREE.Box3().setFromObject(inner);
    const size = box.getSize(new THREE.Vector3());
    const scale = def.height / (size.y || 1);
    inner.scale.setScalar(scale);
    inner.position.y = -box.min.y * scale;
    const root = new THREE.Group();
    root.name = 'character';
    root.add(inner);
    return new CharacterRig(root, scale, anims.animations, owned);
  }

  /** Toca um clipe em loop, com crossfade a partir do atual. */
  play(name: ClipName, fade = 0.25): void {
    const next = this.actions.get(name);
    if (!next || next === this.current) return;
    next.reset().setEffectiveWeight(1).play();
    if (this.current && fade > 0) next.crossFadeFrom(this.current, fade, true);
    else this.current?.stop();
    this.current = next;
  }

  /** Ajusta a velocidade do clipe de locomoção à velocidade da peça (unidades do mundo/s). */
  matchSpeed(name: ClipName, worldSpeed: number): void {
    const action = this.actions.get(name);
    const clipSpeed = CLIP_SPEED[name];
    if (action && clipSpeed) action.timeScale = worldSpeed / (clipSpeed * this.scale);
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.object);
    for (const m of this.ownMaterials) m.dispose();
  }
}
