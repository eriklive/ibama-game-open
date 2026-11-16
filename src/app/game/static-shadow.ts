import * as THREE from 'three';

/** Camada dos objetos que se mexem e fazem sombra (personagens, inimigos, peças). */
export const MOVING_SHADOW_LAYER = 1;

/** Marca um objeto (e o que há dentro dele) como sombra que se mexe. */
export function castsMovingShadow(object: THREE.Object3D): void {
  object.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.layers.enable(MOVING_SHADOW_LAYER);
  });
}

/**
 * Sombra do sol em duas partes, no mesmo mapa de sombras:
 *
 * - **estática** (mata, chão, hangar, paredes — tudo com `castShadow`): desenhada pelo
 *   three.js só quando `shadowMap.needsUpdate` é ligado, e guardada numa cópia;
 * - **móvel** (objetos na camada `MOVING_SHADOW_LAYER`, que não têm `castShadow`):
 *   a cada quadro a cópia estática volta para o mapa (uma cópia de profundidade, sem
 *   desenhar nada) e só os objetos móveis são desenhados por cima.
 *
 * Funciona embrulhando `renderer.shadowMap.render`, que o three.js chama dentro de
 * `renderer.render` logo antes do passe principal.
 */
export class StaticShadow {
  private saved: THREE.WebGLRenderTarget | null = null;
  private readonly depthMat = new THREE.MeshDepthMaterial();
  private readonly original: THREE.WebGLShadowMap['render'];
  private inside = false;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly light: THREE.DirectionalLight,
  ) {
    const sm = renderer.shadowMap;
    sm.autoUpdate = false;
    this.original = sm.render.bind(sm);
    sm.render = (lights, sc, camera) => this.render(lights, sc, camera);
  }

  /** Pede que a parte estática seja redesenhada no próximo quadro. */
  invalidate(): void {
    this.renderer.shadowMap.needsUpdate = true;
  }

  dispose(): void {
    this.saved?.dispose();
    this.saved = null;
    this.depthMat.dispose();
  }

  private render(lights: THREE.Light[], scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.inside) return;
    const sm = this.renderer.shadowMap;
    const due = sm.needsUpdate;
    this.original(lights, scene, camera);
    const shadow = this.light.shadow;
    const map = shadow.map as THREE.WebGLRenderTarget | null;
    if (!this.light.castShadow || !map?.depthTexture) return;
    const r = this.renderer;
    if (due || !this.saved) {
      this.save(map);
    } else {
      r.copyTextureToTexture(this.saved.depthTexture!, map.depthTexture);
    }
    this.drawMoving(map, shadow.camera);
  }

  /** Guarda a profundidade da parte estática. */
  private save(map: THREE.WebGLRenderTarget): void {
    const { width, height } = map;
    if (!this.saved || this.saved.width !== width || this.saved.height !== height) {
      this.saved?.dispose();
      const depth = new THREE.DepthTexture(width, height, THREE.UnsignedIntType);
      depth.format = THREE.DepthFormat;
      this.saved = new THREE.WebGLRenderTarget(width, height, { depthTexture: depth, depthBuffer: true });
      this.renderer.initRenderTarget(this.saved);
    }
    this.renderer.copyTextureToTexture(map.depthTexture!, this.saved.depthTexture!);
  }

  /** Desenha só os objetos móveis no mapa de sombras, sem apagar o que já está lá. */
  private drawMoving(map: THREE.WebGLRenderTarget, cam: THREE.Camera): void {
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevClear = r.autoClear;
    const prevMask = cam.layers.mask;
    const prevOverride = this.scene.overrideMaterial;
    const prevBackground = this.scene.background;
    this.inside = true;
    try {
      cam.layers.set(MOVING_SHADOW_LAYER);
      // um fundo de cor faria o three.js apagar o alvo (e a profundidade estática)
      this.scene.background = null;
      this.scene.overrideMaterial = this.depthMat;
      r.autoClear = false;
      r.setRenderTarget(map);
      r.render(this.scene, cam);
    } finally {
      cam.layers.mask = prevMask;
      this.scene.overrideMaterial = prevOverride;
      this.scene.background = prevBackground;
      r.autoClear = prevClear;
      r.setRenderTarget(prevTarget);
      this.inside = false;
    }
  }
}
