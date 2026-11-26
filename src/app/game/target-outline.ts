import * as THREE from 'three';

/** Camada das silhuetas dos alvos tocáveis: a câmera normal não a vê, só a máscara do contorno. */
export const OUTLINE_LAYER = 3;

/** Larguras do contorno em pixels de CSS (multiplicadas pela densidade da tela). */
const WIDTH = 4;
const ARMED_WIDTH = 6.5;
/** Borda escura por fora da faixa amarela (o traço de desenho animado). */
const EDGE = 2;

/** Amostras do contorno: anéis em volta do ponto × direções em cada anel. */
const RINGS = 7;
const DIRS = 12;

/**
 * Contorno de desenho animado em volta dos alvos tocáveis (o avião, as portas, o quadro de
 * chaves, os NPCs com interação): uma faixa amarela grossa com um traço escuro por fora,
 * seguindo a silhueta inteira do alvo na tela (sem as emendas das peças por dentro).
 *
 * Cada alvo tem cópias das suas malhas na camada `OUTLINE_LAYER` (ver `HexBoard.setTargetOutlines`),
 * com `mask` (alvo comum, canal vermelho) ou `armedMask` (tocado uma vez, canal verde). A cada
 * quadro:
 * 1. a máscara: só essas cópias, numa textura do tamanho da tela (o resto da cena fica de fora,
 *    então o contorno aparece mesmo com algo na frente do alvo);
 * 2. a composição na tela, só no retângulo dos alvos: fora da silhueta, perto dela, amarelo;
 *    um pouco mais longe, o traço escuro.
 */
export class TargetOutline {
  /** Material da cópia de um alvo comum. */
  readonly mask = new THREE.MeshBasicMaterial({ color: 0xff0000, fog: false, toneMapped: false, side: THREE.DoubleSide });
  /** Material da cópia do alvo tocado uma vez. */
  readonly armedMask = new THREE.MeshBasicMaterial({ color: 0x00ff00, fog: false, toneMapped: false, side: THREE.DoubleSide });
  private target?: THREE.WebGLRenderTarget;
  private readonly quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly size = new THREE.Vector2();
  private readonly box = new THREE.Box3();
  private readonly part = new THREE.Box3();
  private readonly corner = new THREE.Vector3();

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: {
          tMask: { value: null },
          px: { value: new THREE.Vector2() },
          width: { value: new THREE.Vector2(WIDTH, ARMED_WIDTH) },
          edge: { value: EDGE },
          color: { value: new THREE.Color(0xffd23a) },
          armedColor: { value: new THREE.Color(0xffe066) },
          ink: { value: new THREE.Color(0x2a1d08) },
          alpha: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D tMask;
          uniform vec2 px;      // um pixel da tela, em coordenadas da textura
          uniform vec2 width;   // largura da faixa: comum, armado (pixels da tela)
          uniform float edge;   // largura do traço escuro (pixels da tela)
          uniform vec3 color;
          uniform vec3 armedColor;
          uniform vec3 ink;
          uniform float alpha;
          varying vec2 vUv;
          const int RINGS = ${RINGS};
          const int DIRS = ${DIRS};
          void main() {
            vec2 here = texture2D(tMask, vUv).rg;
            // dentro da silhueta: o próprio modelo aparece
            if (max(here.r, here.g) > 0.5) discard;
            float reach = max(width.x, width.y) + edge;
            // cobertura mais perto que a faixa (a) e que a faixa mais o traço (b), por canal
            vec2 a = vec2(0.0);
            vec2 b = vec2(0.0);
            for (int i = 1; i <= RINGS; i++) {
              float r = reach * float(i) / float(RINGS);
              vec2 c = vec2(0.0);
              for (int j = 0; j < DIRS; j++) {
                float ang = (float(j) + 0.5 * float(i)) * 6.2831853 / float(DIRS);
                c = max(c, texture2D(tMask, vUv + vec2(cos(ang), sin(ang)) * r * px).rg);
              }
              a = max(a, c * step(r, width + 0.5));
              b = max(b, c * step(r, width + edge + 0.5));
            }
            float band = max(a.r, a.g);
            float outer = max(b.r, b.g);
            if (outer < 0.01) discard;
            vec3 fill = a.g > a.r * 0.5 ? armedColor : color;
            gl_FragColor = vec4(mix(ink, fill, smoothstep(0.15, 0.6, band)), outer * alpha);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  /**
   * Desenha o contorno por cima do quadro já na tela. `hulls` são as cópias acesas (para o
   * retângulo onde vale a pena calcular). `pulse` (0–1) respira a cor do alvo tocado uma vez.
   */
  render(hulls: readonly THREE.Mesh[], pulse: number, armedPulse: number): void {
    const r = this.renderer;
    const { x: w, y: h } = r.getDrawingBufferSize(this.size);
    if (!w || !h) return;
    const dpr = r.getPixelRatio();
    const reach = (ARMED_WIDTH + EDGE) * dpr + 2;
    const rect = this.screenRect(hulls, w, h, reach);
    if (!rect) return;

    const mask = this.maskTarget(w, h);
    this.renderMask(mask);

    const u = this.quad.material.uniforms;
    u['tMask'].value = mask.texture;
    u['px'].value.set(1 / w, 1 / h);
    u['width'].value.set(WIDTH * dpr, ARMED_WIDTH * dpr);
    u['edge'].value = EDGE * dpr;
    u['alpha'].value = 0.82 + pulse * 0.18;
    (u['armedColor'].value as THREE.Color).setRGB(1, 0.8 + armedPulse * 0.18, 0.15 + armedPulse * 0.55);

    const prevScissor = r.getScissorTest();
    const prevAutoClear = r.autoClear;
    const scissor = new THREE.Vector4();
    r.getScissor(scissor);
    try {
      r.setRenderTarget(null);
      r.autoClear = false;
      // o retângulo é em pixels de CSS (o three.js multiplica pela densidade)
      r.setScissor(rect.x / dpr, rect.y / dpr, rect.w / dpr, rect.h / dpr);
      r.setScissorTest(true);
      r.render(this.quadScene, this.quadCamera);
    } finally {
      r.setScissor(scissor);
      r.setScissorTest(prevScissor);
      r.autoClear = prevAutoClear;
    }
  }

  /** Retângulo (pixels da tela, origem embaixo) que cobre os alvos e o contorno, ou `null`. */
  private screenRect(
    hulls: readonly THREE.Mesh[],
    w: number,
    h: number,
    pad: number,
  ): { x: number; y: number; w: number; h: number } | null {
    this.box.makeEmpty();
    for (const hull of hulls) {
      if (!this.shown(hull)) continue;
      const geo = hull.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      this.part.copy(geo.boundingBox!);
      // o corpo animado sai da pose de origem: folga de meio metro
      if ((hull as THREE.SkinnedMesh).isSkinnedMesh) this.part.expandByScalar(0.5);
      this.box.union(this.part.applyMatrix4(hull.matrixWorld));
    }
    if (this.box.isEmpty()) return null;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const { min, max } = this.box;
    for (let i = 0; i < 8; i++) {
      this.corner.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).project(this.camera);
      // um canto atrás da câmera: a projeção não vale, usa a tela inteira
      if (this.corner.z > 1 || this.corner.z < -1) return { x: 0, y: 0, w, h };
      x0 = Math.min(x0, this.corner.x);
      x1 = Math.max(x1, this.corner.x);
      y0 = Math.min(y0, this.corner.y);
      y1 = Math.max(y1, this.corner.y);
    }
    const left = Math.max(0, Math.floor(((x0 + 1) / 2) * w - pad));
    const right = Math.min(w, Math.ceil(((x1 + 1) / 2) * w + pad));
    const bottom = Math.max(0, Math.floor(((y0 + 1) / 2) * h - pad));
    const top = Math.min(h, Math.ceil(((y1 + 1) / 2) * h + pad));
    if (right <= left || top <= bottom) return null;
    return { x: left, y: bottom, w: right - left, h: top - bottom };
  }

  /** A cópia e todos os pais visíveis (um modelo escondido não ganha contorno). */
  private shown(o: THREE.Object3D): boolean {
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
    return true;
  }

  /** Máscara: só a camada do contorno, sem fundo, sem névoa, sem sombra. */
  private renderMask(mask: THREE.WebGLRenderTarget): void {
    const r = this.renderer;
    const prev = {
      target: r.getRenderTarget(),
      background: this.scene.background,
      fog: this.scene.fog,
      override: this.scene.overrideMaterial,
      layers: this.camera.layers.mask,
      autoClear: r.autoClear,
      shadows: r.shadowMap.enabled,
      clear: r.getClearColor(new THREE.Color()),
      alpha: r.getClearAlpha(),
    };
    try {
      this.scene.background = null;
      this.scene.fog = null;
      this.scene.overrideMaterial = null;
      r.shadowMap.enabled = false;
      r.setClearColor(0x000000, 1);
      r.setRenderTarget(mask);
      r.clear();
      r.autoClear = false;
      this.camera.layers.set(OUTLINE_LAYER);
      r.render(this.scene, this.camera);
    } finally {
      this.scene.background = prev.background;
      this.scene.fog = prev.fog;
      this.scene.overrideMaterial = prev.override;
      this.camera.layers.mask = prev.layers;
      r.shadowMap.enabled = prev.shadows;
      r.setClearColor(prev.clear, prev.alpha);
      r.autoClear = prev.autoClear;
      r.setRenderTarget(prev.target);
    }
  }

  /** Máscara na resolução da tela (com filtro linear: as bordas do contorno saem suaves). */
  private maskTarget(w: number, h: number): THREE.WebGLRenderTarget {
    const mw = w;
    const mh = h;
    if (!this.target || this.target.width !== mw || this.target.height !== mh) {
      this.target?.dispose();
      this.target = new THREE.WebGLRenderTarget(mw, mh, {
        depthBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
    }
    return this.target;
  }

  dispose(): void {
    this.target?.dispose();
    this.mask.dispose();
    this.armedMask.dispose();
    this.quad.geometry.dispose();
    this.quad.material.dispose();
  }
}
