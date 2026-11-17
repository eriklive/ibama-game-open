import * as THREE from 'three';

/** Camada do que fica em cor no destaque (quem está na vez, suspeitos e o raio). */
export const SPOTLIGHT_LAYER = 2;

/** Quanto tempo o tabuleiro leva para perder (ou recuperar) a cor, em segundos. */
const FADE_TIME = 0.25;

/** A máscara sai em uma fração da resolução da tela (ela é borrada de qualquer jeito). */
const MASK_SCALE = 0.5;

/**
 * Destaque em escala de cinza (modo de abordagem): o quadro inteiro perde a cor, menos o
 * que está na camada `SPOTLIGHT_LAYER`.
 *
 * Com o destaque ligado, cada quadro sai assim:
 * 1. a cena normal, direto na tela (como sempre), copiada depois para uma textura;
 * 2. a máscara, em meia resolução: a cena toda em preto (só para a profundidade) e, por
 *    cima, o que está na camada do destaque em branco. Quem fica atrás de uma árvore ou
 *    parede continua escondido, e quem está em pé sobre o raio (os colegas) cobre o chão
 *    colorido;
 * 3. a composição na tela: cor onde a máscara é branca, cinza no resto.
 *
 * A cena não é desenhada num alvo fora da tela de propósito: isso mudaria o espaço de cor
 * da saída e obrigaria o three.js a recompilar o shader de cada material visível no
 * primeiro quadro do destaque (o engasgo ao abrir a abordagem). Os únicos shaders novos
 * (máscara e composição) são compilados antes, em `warm`.
 *
 * Desligado (e depois de a cor voltar), o quadro é desenhado direto, sem custo extra.
 */
export class Spotlight {
  private on = false;
  /** 0 = colorido, 1 = cinza por inteiro (anima entre os dois). */
  private amount = 0;
  private color?: THREE.FramebufferTexture;
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
    private readonly camera: THREE.Camera,
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
          // a cópia da tela já vem em sRGB: o cinza é calculado em linear e volta para sRGB
          vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
          vec3 toSRGB(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }
          void main() {
            vec4 c = texture2D(tColor, vUv);
            // borda macia: média da máscara em volta do ponto
            float m = 0.0;
            for (int x = -1; x <= 1; x++) {
              for (int y = -1; y <= 1; y++) {
                m += texture2D(tMask, vUv + vec2(float(x), float(y)) * texel).r;
              }
            }
            m /= 9.0;
            vec3 lin = toLinear(c.rgb);
            float l = dot(lin, vec3(0.2126, 0.7152, 0.0722));
            vec3 gray = vec3(l) * 0.7;
            gl_FragColor = vec4(toSRGB(mix(lin, gray, amount * (1.0 - m))), 1.0);
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

  /**
   * Desenha o destaque uma vez na tela, sem cinza, para a GPU compilar e preparar tudo o que
   * ele usa (shaders da máscara e da composição, texturas, estados de desenho). Quem chama
   * desenha o quadro normal logo em seguida, por cima, então nada aparece. Sem isso, o
   * primeiro quadro do destaque engasga.
   */
  warm(): void {
    if (this.amount > 0) return;
    this.renderer.copyFramebufferToTexture(this.targets().color);
    this.composite(0);
  }

  /** Desenha o quadro (com ou sem o destaque). */
  render(dt: number): void {
    const target = this.on ? 1 : 0;
    // um quadro lento não pode pular a transição inteira
    const step = Math.min(dt, 1 / 30) / FADE_TIME;
    this.amount = target > this.amount ? Math.min(target, this.amount + step) : Math.max(target, this.amount - step);
    const r = this.renderer;
    r.render(this.scene, this.camera);
    if (this.amount <= 0) return;

    r.copyFramebufferToTexture(this.targets().color);
    this.composite(this.amount);
  }

  /** Máscara e composição na tela, com `amount` de cinza. */
  private composite(amount: number): void {
    const r = this.renderer;
    const { color, mask } = this.targets();
    this.renderMask(mask);
    const u = this.quad.material.uniforms;
    u['tColor'].value = color;
    u['tMask'].value = mask.texture;
    u['texel'].value.set(1 / mask.width, 1 / mask.height);
    u['amount'].value = amount;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCamera);
  }

  /** Máscara do destaque: sem fundo, sem névoa, sem sombra. */
  private renderMask(mask: THREE.WebGLRenderTarget): void {
    const r = this.renderer;
    const prev = {
      target: r.getRenderTarget(),
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
      r.setRenderTarget(prev.target);
    }
  }

  dispose(): void {
    this.color?.dispose();
    this.mask?.dispose();
    this.black.dispose();
    this.white.dispose();
    this.quad.geometry.dispose();
    this.quad.material.dispose();
  }

  /** Cópia da tela e máscara (recriadas quando a tela muda de tamanho). */
  private targets(): { color: THREE.FramebufferTexture; mask: THREE.WebGLRenderTarget } {
    const { x: w, y: h } = this.renderer.getDrawingBufferSize(this.size);
    if (!this.color || this.color.image.width !== w || this.color.image.height !== h) {
      this.color?.dispose();
      this.mask?.dispose();
      this.color = new THREE.FramebufferTexture(w, h);
      this.mask = new THREE.WebGLRenderTarget(
        Math.max(1, Math.round(w * MASK_SCALE)),
        Math.max(1, Math.round(h * MASK_SCALE)),
      );
    }
    return { color: this.color, mask: this.mask! };
  }
}
