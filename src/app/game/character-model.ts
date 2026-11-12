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
  /**
   * Altura do corpo no tabuleiro, em unidades do mundo (raio do hexágono = 1). Chapéu e
   * cabelo ficam por cima disso: quem usa chapéu não encolhe.
   */
  height: number;
}

/** Biblioteca de clipes do esqueleto humanoide padrão (nomes de ossos da Quaternius UAL). */
export const HUMANOID_ANIMS = 'assets/anims/humanoid-base.glb';
/** Altura de um humano adulto no tabuleiro. */
export const HUMAN_HEIGHT = 1.15;
/** Do osso da cabeça ao topo do crânio, em metros, nos corpos da Quaternius. */
const HEAD_TOP = 0.21;

const human = (id: string): ModelDef => ({
  url: `assets/characters/${id}/${id}.glb`,
  anims: HUMANOID_ANIMS,
  height: HUMAN_HEIGHT,
});

/**
 * Catálogo de modelos de personagem (gerados por `tools/assets`, a partir de
 * `tools/assets/characters.mjs`). Quem usa cada um fica em `maps.ts`.
 */
export const MODELS = {
  // agentes do Ibama
  ana: human('ana'),
  bruno: human('bruno'),
  clara: human('clara'),
  kaua: human('kaua'),
  // inimigos
  madeireiro: human('madeireiro'),
  garimpeiro: human('garimpeiro'),
  cacador: human('cacador'),
} satisfies Record<string, ModelDef>;

/**
 * Velocidade de deslocamento de cada clipe de locomoção no tamanho original (m/s),
 * medida na versão com root motion da Universal Animation Library. Serve para casar a
 * velocidade da animação com a velocidade real da peça, sem os pés "patinarem".
 */
const CLIP_SPEED: Partial<Record<ClipName, number>> = { walk: 0.97, run: 5.36 };

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
  ) {
    this.mixer = new THREE.AnimationMixer(object);
    for (const clip of clips) this.actions.set(clip.name as ClipName, this.mixer.clipAction(clip));
  }

  static async load(def: ModelDef): Promise<CharacterRig> {
    const [model, anims] = await Promise.all([loadGltf(def.url), loadGltf(def.anims)]);
    const inner = cloneSkinned(model.scene);
    inner.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      // a caixa de colisão da malha é a da pose de repouso; animada, ela pode sair
      // dela e sumir na borda da tela
      mesh.frustumCulled = false;
    });
    const box = new THREE.Box3().setFromObject(inner);
    // a altura do corpo vem do esqueleto (osso da cabeça), não da caixa da malha: assim
    // chapéu, coque e mochila não mudam o tamanho de ninguém
    inner.updateWorldMatrix(true, true);
    const head = inner.getObjectByName('Head');
    const bodyHeight = head
      ? head.getWorldPosition(new THREE.Vector3()).y - box.min.y + HEAD_TOP
      : box.getSize(new THREE.Vector3()).y;
    const scale = def.height / (bodyHeight || 1);
    inner.scale.setScalar(scale);
    inner.position.y = -box.min.y * scale;
    const root = new THREE.Group();
    root.name = 'character';
    root.add(inner);
    return new CharacterRig(root, scale, anims.animations);
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
  }
}
