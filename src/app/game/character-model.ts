import * as THREE from 'three';
import { MOVING_SHADOW_LAYER } from './static-shadow';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/** Clipes da biblioteca humanoide (`public/assets/anims/humanoid-base.glb`). */
export type ClipName = 'idle' | 'walk' | 'run' | 'crouch';

/** Modelo 3D de um personagem (ver docs/esqueletos-e-movimentacao.md). */
export interface ModelDef {
  /** GLB com malha + esqueleto (sem animações). */
  url: string;
  /** GLB só com clipes, no mesmo esqueleto. */
  anims: string;
  /**
   * Altura do corpo no tabuleiro, em unidades do mundo (raio do hexágono = 1; ver `METER`).
   * Chapéu e cabelo ficam por cima disso: quem usa chapéu não encolhe.
   */
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
/**
 * Altura no tabuleiro de uma pessoa com `meters` de altura (1,70 m ≈ 2,27 unidades). Os
 * personagens ficam na escala real, a mesma do cenário (portas, paredes, árvores).
 */
export const heightOf = (meters: number): number => meters * METER;

/**
 * Velocidade de deslocamento de cada clipe de locomoção no tamanho original (m/s),
 * medida na versão com root motion da Universal Animation Library. Serve para casar a
 * velocidade da animação com a velocidade real da peça, sem os pés "patinarem".
 */
const CLIP_SPEED: Partial<Record<ClipName, number>> = { walk: 0.97, run: 5.36 };

/** Do osso da cabeça ao topo do crânio, em metros, nos corpos da Quaternius. */
const HEAD_TOP = 0.21;

/** Modelo em `public/assets/characters/<id>/<id>.glb`, com a altura da pessoa em metros. */
const human = (id: string, meters: number): ModelDef => ({
  url: `assets/characters/${id}/${id}.glb`,
  anims: HUMANOID_ANIMS,
  height: heightOf(meters),
});

/**
 * Catálogo de modelos de personagem (gerados por `tools/assets`, a partir de
 * `tools/assets/characters.mjs`). Quem usa cada um fica em `maps.ts`.
 */
export const MODELS = {
  // agentes do Ibama
  ana: human('ana', 1.7),
  bruno: human('bruno', 1.78),
  clara: human('clara', 1.68),
  kaua: human('kaua', 1.76),
  // inimigos
  garimpeiro: human('garimpeiro', 1.72),
  garimpeiroPa: human('garimpeiro-pa', 1.74),
  piloto: human('piloto', 1.77),
} satisfies Record<string, ModelDef>;

/** Ossos que a camada procedural (`CharacterRig.pose`) mexe. */
const POSE_BONES = ['thigh_r', 'calf_r', 'thigh_l', 'calf_l', 'spine_01'] as const;
type PoseBone = (typeof POSE_BONES)[number];

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
  /**
   * Camada procedural por cima do clipe (em radianos, somada depois do mixer): a biblioteca
   * de clipes não tem chute, então o arrombamento dobra a perna direita e a coluna à mão.
   * `thigh` < 0 levanta a coxa para a frente; `calf` > 0 dobra o joelho; `spine` < 0 inclina para trás.
   * `thighL`/`calfL` fazem o mesmo com a perna esquerda (o pulo do caixote encolhe as duas).
   */
  readonly pose = { thigh: 0, calf: 0, thighL: 0, calfL: 0, spine: 0 };
  private readonly bones: Partial<Record<PoseBone, THREE.Object3D>> = {};

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
    for (const name of POSE_BONES) {
      const bone = object.getObjectByName(name);
      if (bone) this.bones[name] = bone;
    }
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
      // sombra móvel: desenhada a cada quadro por cima da sombra estática (ver StaticShadow)
      mesh.layers.enable(MOVING_SHADOW_LAYER);
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

  /** Velocidade de um clipe (negativa toca ao contrário: andar de costas). */
  setTimeScale(name: ClipName, scale: number): void {
    const action = this.actions.get(name);
    if (action) action.timeScale = scale;
  }

  /** Ajusta a velocidade do clipe de locomoção à velocidade da peça (unidades do mundo/s). */
  matchSpeed(name: ClipName, worldSpeed: number): void {
    const action = this.actions.get(name);
    const clipSpeed = CLIP_SPEED[name];
    if (action && clipSpeed) action.timeScale = worldSpeed / (clipSpeed * this.scale);
  }

  update(dt: number): void {
    this.mixer.update(dt);
    const { thigh, calf, thighL, calfL, spine } = this.pose;
    if (thigh && this.bones.thigh_r) this.bones.thigh_r.rotation.x += thigh;
    if (calf && this.bones.calf_r) this.bones.calf_r.rotation.x += calf;
    if (thighL && this.bones.thigh_l) this.bones.thigh_l.rotation.x += thighL;
    if (calfL && this.bones.calf_l) this.bones.calf_l.rotation.x += calfL;
    if (spine && this.bones.spine_01) this.bones.spine_01.rotation.x += spine;
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.object);
    for (const m of this.ownMaterials) m.dispose();
  }
}
