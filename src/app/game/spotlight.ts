import * as THREE from 'three';

/** Camada do que fica em cor no destaque (quem está na vez, suspeitos e o raio). */
export const SPOTLIGHT_LAYER = 2;

/** Quanto tempo o tabuleiro leva para perder (ou recuperar) a cor, em segundos. */
const FADE_TIME = 0.25;

/**
 * Destaque em escala de cinza (modo de abordagem): o quadro inteiro perde a cor, menos o
 * que está na camada `SPOTLIGHT_LAYER`.
 *
 * Com o destaque ligado, cada quadro sai em três passes:
 * 1. a cena normal num alvo fora da tela;
 * 2. a máscara: a cena toda em preto (só para a profundidade) e, por cima, o que está na
 *    camada do destaque em branco. Quem fica atrás de uma árvore ou parede continua
 *    escondido, e quem está em pé sobre o raio (os colegas) cobre o chão colorido;
 * 3. a composição na tela: cor onde a máscara é branca, cinza no resto.
 *
 * Desligado (e depois de a cor voltar), o quadro é desenhado direto, sem custo extra.
 */
export class Spotlight {
  private on = false;
  /** 0 = colorido, 1 = cinza por inteiro (anima entre os dois). */
  private amount = 0;
  private color?: THREE.WebGLRenderTarget;
  private mask?: THREE.WebGLRenderTarget;
  private readonly black = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
  private readonly white = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
    depthFunc: THREE.LessEqualDepth,
  });
  private readonly quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly size = new THREE.Vector2();

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    /** Câmera que desenha a cena (troca na vista de inspeção). */
    public camera: THREE.Camera,
  ) {
    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: {
          tColor: { value: null },
          tMask: { value: null },
          texel: { value: new THREE.Vector2() },
          amount: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D tColor;
          uniform sampler2D tMask;
          uniform vec2 texel;
          uniform float amount;
          varying vec2 vUv;
          void main() {
            vec4 c = texture2D(tColor, vUv);
            // borda macia: média da máscara em volta do ponto
            float m = 0.0;
            for (int x = -1; x <= 1; x++) {
              for (int y = -1; y <= 1; y++) {
                m += texture2D(tMask, vUv + vec2(float(x), float(y)) * texel * 1.5).r;
              }
            }
            m /= 9.0;
            float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
            vec3 gray = vec3(l) * 0.7;
            gl_FragColor = vec4(mix(c.rgb, gray, amount * (1.0 - m)), 1.0);
            #include <colorspace_fragment>
          }`,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  /** Liga ou desliga o destaque (a cor some e volta com uma transição curta). */
  set(on: boolean): void {
    this.on = on;
  }

  get active(): boolean {
    return this.on || this.amount > 0;
  }

  /** Desenha o quadro (com ou sem o destaque). */
  render(dt: number): void {
    const target = this.on ? 1 : 0;
    const step = dt / FADE_TIME;
    this.amount = target > this.amount ? Math.min(target, this.amount + step) : Math.max(target, this.amount - step);
    if (this.amount <= 0) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const r = this.renderer;
    const { color, mask } = this.targets();

    r.setRenderTarget(color);
    r.render(this.scene, this.camera);

    // máscara: sem fundo, sem névoa, sem sombra
    const prev = {
      background: this.scene.background,
      override: this.scene.overrideMaterial,
      layers: this.camera.layers.mask,
      autoClear: r.autoClear,
      shadows: r.shadowMap.enabled,
      clear: r.getClearColor(new THREE.Color()),
      alpha: r.getClearAlpha(),
    };
    try {
      this.scene.background = null;
      r.shadowMap.enabled = false;
      r.setClearColor(0x000000, 1);
      r.setRenderTarget(mask);
      r.clear();
      r.autoClear = false;
      this.scene.overrideMaterial = this.black;
      r.render(this.scene, this.camera);
      this.camera.layers.set(SPOTLIGHT_LAYER);
      this.scene.overrideMaterial = this.white;
      r.render(this.scene, this.camera);
    } finally {
      this.scene.background = prev.background;
      this.scene.overrideMaterial = prev.override;
      this.camera.layers.mask = prev.layers;
      r.shadowMap.enabled = prev.shadows;
      r.setClearColor(prev.clear, prev.alpha);
      r.autoClear = prev.autoClear;
    }

    const u = this.quad.material.uniforms;
    u['tColor'].value = color.texture;
    u['tMask'].value = mask.texture;
    u['texel'].value.set(1 / mask.width, 1 / mask.height);
    u['amount'].value = this.amount;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCamera);
  }

  dispose(): void {
    this.color?.dispose();
    this.mask?.dispose();
    this.black.dispose();
    this.white.dispose();
    this.quad.geometry.dispose();
    this.quad.material.dispose();
  }

  /** Alvos do tamanho da tela (recriados quando ela muda). */
  private targets(): { color: THREE.WebGLRenderTarget; mask: THREE.WebGLRenderTarget } {
    const { x: w, y: h } = this.renderer.getDrawingBufferSize(this.size);
    if (!this.color || this.color.width !== w || this.color.height !== h) {
      this.color?.dispose();
      this.mask?.dispose();
      this.color = new THREE.WebGLRenderTarget(w, h, { samples: 4, type: THREE.HalfFloatType });
      this.mask = new THREE.WebGLRenderTarget(w, h);
    }
    return { color: this.color, mask: this.mask! };
  }
}
