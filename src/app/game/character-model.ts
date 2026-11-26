import * as THREE from 'three';
import { MOVING_SHADOW_LAYER } from './static-shadow';
import { ANIMS_VERSION } from './anims-version';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { buildCuffClips } from './cuff-poses';

/**
 * Clipes da biblioteca humanoide (`public/assets/anims/humanoid-base.glb`, gerada por
 * `tools/assets/build-anims.mjs`). Os loops tocam no relógio (`play`); os gestos do Modo Corrida
 * (`jump`, `slide`, `trip`, `crash`) são percorridos no tempo da regra (`scrub`). `cuffed` e `kneel`
 * (suspeito algemado, de pé e ajoelhado) não vêm do arquivo: são montados por código a partir do
 * `idle` (`cuff-poses.ts`). `kick` (o arrombamento, percorrido com `scrub`) e `look` (olha de um lado
 * para o outro, em loop) vêm de clipes CC0 avulsos (`tools/assets/cc0-clips`).
 */
export type ClipName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'crouch'
  | 'sprint'
  | 'jump'
  | 'slide'
  | 'trip'
  | 'crash'
  | 'cuffed'
  | 'kneel'
  | 'kick'
  | 'look';

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

/**
 * Biblioteca de clipes do esqueleto humanoide padrão (nomes de ossos da Quaternius UAL). O `?v=`
 * muda a cada build dos clipes: o navegador reusa o arquivo por até 10 min (GitHub Pages), e
 * código novo com clipes velhos deixaria os personagens congelados.
 */
export const HUMANOID_ANIMS = `assets/anims/humanoid-base.glb?v=${ANIMS_VERSION}`;

/** Se a biblioteca não tem o clipe (arquivo antigo), toca este no lugar, em vez de congelar. */
const CLIP_FALLBACK: Partial<Record<ClipName, ClipName>> = { sprint: 'run' };
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
const CLIP_SPEED: Partial<Record<ClipName, number>> = { walk: 0.97, run: 5.36, sprint: 8.25 };

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

/**
 * Camada procedural (`CharacterRig.pose`): cada entrada gira um osso no próprio eixo X local
 * (multiplicando depois do clipe), com os sinais medidos no `idle` da biblioteca:
 * - `thigh` < 0 levanta a coxa direita para a frente; `calf` > 0 dobra o joelho direito;
 *   `foot` < 0 puxa a ponta do pé direito para cima (bate de calcanhar);
 * - `thighL` / `calfL`: o mesmo na perna de apoio (esquerda);
 * - `spine` < 0 inclina o tronco para trás (> 0, para a frente);
 * - `armR` / `armL` > 0 levam o braço para a frente (< 0, para trás); `foreR` / `foreL` > 0
 *   dobram o cotovelo.
 */
const POSE_BONES = {
  thigh: 'thigh_r',
  calf: 'calf_r',
  foot: 'foot_r',
  thighL: 'thigh_l',
  calfL: 'calf_l',
  spine: 'spine_01',
  armR: 'upperarm_r',
  foreR: 'lowerarm_r',
  armL: 'upperarm_l',
  foreL: 'lowerarm_l',
} as const;
export type PoseKey = keyof typeof POSE_BONES;
export type Pose = Record<PoseKey, number>;
/** Pose neutra: nada por cima do clipe. */
export const restPose = (): Pose =>
  Object.fromEntries(Object.keys(POSE_BONES).map((k) => [k, 0])) as Pose;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const poseTurn = new THREE.Quaternion();

/** Quanto da cor de `tint` entra no material (0 = nada, 1 = cor cheia). */
const TINT_STRENGTH = 0.6;

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<GLTF>>();
/** Clipes do arquivo mais as poses algemadas, montadas uma vez por biblioteca. */
const clipCache = new WeakMap<GLTF, THREE.AnimationClip[]>();

function clipsOf(anims: GLTF): THREE.AnimationClip[] {
  let clips = clipCache.get(anims);
  if (!clips) {
    const idle = anims.animations.find((c) => c.name === 'idle');
    clips = [...anims.animations, ...(idle ? buildCuffClips(anims.scene, idle) : [])];
    clipCache.set(anims, clips);
  }
  return clips;
}

/** Algema: uma argola em cada pulso e a corrente entre elas, feitas uma vez e divididas. */
const CUFF_RING = new THREE.TorusGeometry(0.05, 0.013, 8, 20);
const CUFF_LINK = new THREE.CylinderGeometry(0.009, 0.009, 1, 6).translate(0, 0.5, 0);
const CUFF_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.85, roughness: 0.3 });

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
   * Camada procedural por cima do clipe (em radianos, aplicada depois do mixer; ver
   * `POSE_BONES`): a biblioteca de clipes não tem chute, então o arrombamento monta o golpe à
   * mão (pernas, tronco e braços).
   */
  readonly pose: Pose = restPose();
  private readonly bones: Partial<Record<PoseKey, THREE.Object3D>> = {};
  /** Ângulos aplicados no último quadro: desfeitos antes do mixer (osso sem trilha no clipe não acumula). */
  private readonly applied: Partial<Record<PoseKey, number>> = {};
  /** Argolas e corrente da algema (criadas no primeiro `setCuffed(true)`). */
  private cuffs: { rings: THREE.Mesh[]; link: THREE.Mesh } | null = null;

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
    for (const [key, name] of Object.entries(POSE_BONES) as [PoseKey, string][]) {
      const bone = object.getObjectByName(name);
      if (bone) this.bones[key] = bone;
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
    return new CharacterRig(root, scale, clipsOf(anims), owned);
  }

  /** Toca um clipe em loop, com crossfade a partir do atual. */
  play(name: ClipName, fade = 0.25): void {
    const next = this.action(name);
    if (!next || next === this.current) return;
    next.reset().setEffectiveWeight(1).play();
    if (this.current && fade > 0) next.crossFadeFrom(this.current, fade, true);
    else this.current?.stop();
    this.current = next;
  }

  /**
   * Para o clipe `name` no ponto `t` (0 a 1 da duração), com crossfade se ele ainda não era o
   * atual. Serve para gestos que precisam bater com o tempo da regra (o pulo dura o que o pulo
   * dura), em vez de correr no relógio. Devolve `false` se a biblioteca não tem o clipe.
   */
  scrub(name: ClipName, t: number, fade = 0.1): boolean {
    const action = this.actions.get(name);
    if (!action) return false;
    if (action !== this.current) {
      action.reset().setEffectiveWeight(1).play();
      action.timeScale = 0;
      // sem "warp": a velocidade deste clipe fica em 0, quem anda o tempo é `t`
      if (this.current && fade > 0) action.crossFadeFrom(this.current, fade, false);
      else this.current?.stop();
      this.current = action;
    }
    action.time = Math.min(0.999, Math.max(0, t)) * action.getClip().duration;
    return true;
  }

  /** O clipe `name`, ou o de reserva dele (`CLIP_FALLBACK`). */
  private action(name: ClipName): THREE.AnimationAction | undefined {
    const fallback = CLIP_FALLBACK[name];
    return this.actions.get(name) ?? (fallback ? this.actions.get(fallback) : undefined);
  }

  /** A biblioteca tem o clipe `name` (sem contar o de reserva). */
  has(name: ClipName): boolean {
    return this.actions.has(name);
  }

  /** O clipe em loop agora é `name`. */
  isPlaying(name: ClipName): boolean {
    const action = this.action(name);
    return !!action && action === this.current;
  }

  /** Velocidade de um clipe (negativa toca ao contrário: andar de costas). */
  setTimeScale(name: ClipName, scale: number): void {
    const action = this.action(name);
    if (action) action.timeScale = scale;
  }

  /** Ajusta a velocidade do clipe de locomoção à velocidade da peça (unidades do mundo/s). */
  matchSpeed(name: ClipName, worldSpeed: number): void {
    const action = this.actions.get(name);
    const clipSpeed = CLIP_SPEED[name];
    if (action && clipSpeed) action.timeScale = worldSpeed / (clipSpeed * this.scale);
  }

  /** Mostra ou esconde a algema nos pulsos (para as poses `cuffed` e `kneel`). */
  setCuffed(on: boolean): void {
    if (on && !this.cuffs) {
      const hands = ['hand_l', 'hand_r'].map((n) => this.object.getObjectByName(n));
      if (!hands[0] || !hands[1]) return;
      const rings = hands.map((hand) => {
        // argola em volta do pulso: o osso da mão aponta +Y ao longo do braço
        const ring = new THREE.Mesh(CUFF_RING, CUFF_MATERIAL);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.015;
        ring.layers.enable(MOVING_SHADOW_LAYER);
        hand!.add(ring);
        return ring;
      });
      const link = new THREE.Mesh(CUFF_LINK, CUFF_MATERIAL);
      link.layers.enable(MOVING_SHADOW_LAYER);
      this.object.add(link);
      this.cuffs = { rings, link };
    }
    if (!this.cuffs) return;
    for (const r of this.cuffs.rings) r.visible = on;
    this.cuffs.link.visible = on;
  }

  /** Estica a corrente da algema entre as argolas, na pose deste quadro. */
  private placeCuffLink(): void {
    const c = this.cuffs!;
    this.object.updateMatrixWorld(true);
    const [a, b] = c.rings.map((r) => this.object.worldToLocal(r.getWorldPosition(new THREE.Vector3())));
    const along = b.clone().sub(a);
    const length = along.length();
    c.link.position.copy(a);
    c.link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.divideScalar(length || 1));
    c.link.scale.set(this.scale, length, this.scale);
  }

  update(dt: number): void {
    for (const key in this.applied) {
      const k = key as PoseKey;
      this.bones[k]?.quaternion.multiply(poseTurn.setFromAxisAngle(X_AXIS, -this.applied[k]!));
      delete this.applied[k];
    }
    this.mixer.update(dt);
    for (const key in this.pose) {
      const k = key as PoseKey;
      const angle = this.pose[k];
      const bone = this.bones[k];
      if (!angle || !bone) continue;
      bone.quaternion.multiply(poseTurn.setFromAxisAngle(X_AXIS, angle));
      this.applied[k] = angle;
    }
    if (this.cuffs?.link.visible) this.placeCuffLink();
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.object);
    for (const m of this.ownMaterials) m.dispose();
  }
}
