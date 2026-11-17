import * as THREE from 'three';

/**
 * Palco 3D de **um** dado, num canvas próprio com fundo transparente.
 *
 * Não há física de verdade: o dado segue uma trajetória roteirizada (queda, quiques, giro
 * que desacelera) que termina exatamente na orientação do resultado já sorteado. O que muda
 * de um dado para outro (geometria, numeração, cores, que parte fica para cima) vem do
 * `DieModel`; este palco só cuida de luz, sombra, câmera e animação.
 */

/** O que cada tipo de dado (d4, d20…) fornece ao palco. */
export interface DieModel {
  readonly geometry: THREE.BufferGeometry;
  /** Um material por grupo da geometria (uma face cada). */
  readonly materials: THREE.MeshStandardMaterial[];
  /** Vértices do sólido (no espaço do modelo): o mais baixo é apoiado na mesa. */
  readonly hull: readonly THREE.Vector3[];
  /** Raio circunscrito, para enquadrar a câmera. */
  readonly radius: number;
  /** Direção (no espaço do modelo) que fica apontando para cima quando o resultado é `value`. */
  up(value: number): THREE.Vector3;
  /**
   * Direção (no espaço do modelo) que deve apontar para o fundo da cena quando o resultado é
   * `value` — deixa o número em pé para quem olha. Sem ela, o giro final é aleatório.
   */
  reading?(value: number): THREE.Vector3;
  /** Redesenha as faces destacando (ou não) o valor sorteado. */
  highlight(value?: number): void;
  dispose(): void;
}

/** Cor do brilho quando o dado para. */
export type DieTone = 'gold' | 'pass' | 'fail';
const TONES: Record<DieTone, THREE.Color> = {
  gold: new THREE.Color('#ffcf5a'),
  pass: new THREE.Color('#7fe07a'),
  fail: new THREE.Color('#ff6a52'),
};

export interface ThrowOptions {
  /** Duração do lance, em ms; 0 = o dado aparece já parado. */
  duration: number;
  /** Espera antes de começar a cair, em ms. */
  delay?: number;
}

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

/** Altura do quique (sem o apoio) ao longo do lance normalizado t ∈ [0, 1]. */
const BOUNCES = [
  { from: 0, to: 0.3, h: 2.2, fall: true },
  { from: 0.3, to: 0.52, h: 0.8 },
  { from: 0.52, to: 0.66, h: 0.26 },
  { from: 0.66, to: 0.74, h: 0.06 },
];
const bounceHeight = (t: number): number => {
  for (const b of BOUNCES) {
    if (t < b.from || t >= b.to) continue;
    const u = (t - b.from) / (b.to - b.from);
    return b.fall ? b.h * (1 - u * u) : 4 * b.h * u * (1 - u);
  }
  return 0;
};

function glowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.45, 'rgba(255, 255, 255, .35)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const UP = new THREE.Vector3(0, 1, 0);

export class DieScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private readonly mesh: THREE.Mesh;
  private readonly glow: THREE.Mesh;
  private readonly glowMap = glowTexture();
  private readonly resize: ResizeObserver;
  private tone: THREE.Color = TONES.gold;

  private value = 0;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private final = new THREE.Quaternion();
  private axis = new THREE.Vector3(0, 1, 0);
  private spin = 0;
  private duration = 0;
  private delay = 0;
  private frame = 0;
  /** Relógio do lance: avança no máximo 1/30 s por quadro, para engasgos não pularem a animação. */
  private clock = 0;
  private lastFrame = 0;
  private settleAt = 0;
  private done?: () => void;
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpQ = new THREE.Quaternion();

  /** Lança um erro se o WebGL não estiver disponível (quem chama cai no desenho 2D). */
  constructor(
    private readonly host: HTMLElement,
    private readonly model: DieModel,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.cssText =
      'position:absolute;inset:0;display:block;width:100%;height:100%';
    host.appendChild(this.renderer.domElement);

    const r = model.radius;
    this.camera.position.set(0, 7.4 * r, 2.6 * r);
    this.camera.lookAt(0, 0.4 * r, 0.3 * r);

    this.scene.add(new THREE.HemisphereLight('#fff6e0', '#2c3a24', 0.85));
    const key = new THREE.DirectionalLight('#fff1d0', 2.6);
    key.position.set(-3, 9, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.radius = 5;
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25 });
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#ffd27a', 0.8);
    rim.position.set(4, 3, -5);
    this.scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.45 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4 * r, 3.4 * r),
      new THREE.MeshBasicMaterial({
        map: this.glowMap,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.01;
    this.scene.add(this.glow);

    this.mesh = new THREE.Mesh(model.geometry, model.materials);
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    this.scene.add(this.mesh);

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(host);
    this.fit();
  }

  /** Joga o dado; a promessa resolve quando ele para (com o resultado para cima). */
  throw(value: number, opts: ThrowOptions): Promise<void> {
    const r = this.model.radius;
    this.value = value;
    this.model.highlight();
    this.to.set((Math.random() - 0.5) * 0.3 * r, 0, (Math.random() - 0.5) * 0.3 * r);
    this.from.set((Math.random() - 0.5) * 1.2 * r, 0, (2.2 + Math.random() * 0.4) * r);
    // resultado para cima; o número em pé para a câmera (ou um giro qualquer, no d4)
    const up = this.model.up(value).clone().normalize();
    this.final.setFromUnitVectors(up, UP);
    let yaw = Math.random() * Math.PI * 2;
    const reading = this.model.reading?.(value);
    if (reading) {
      const d = reading.clone().applyQuaternion(this.final);
      // girar θ em volta de +Y tira θ do ângulo (medido de -Z para +X) da direção
      yaw = Math.atan2(d.x, -d.z) + (Math.random() - 0.5) * 0.4;
    }
    this.final.premultiply(this.tmpQ.setFromAxisAngle(UP, yaw));
    this.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    this.spin = Math.PI * (5 + Math.random() * 2);
    this.glow.position.set(this.to.x, 0.01, this.to.z);

    this.duration = Math.max(0, opts.duration) / 1000;
    this.delay = this.duration ? Math.max(0, opts.delay ?? 0) / 1000 : 0;
    this.clock = 0;
    this.lastFrame = performance.now();
    this.settleAt = 0;
    this.mesh.visible = true;
    cancelAnimationFrame(this.frame);
    return new Promise((resolve) => {
      this.done = resolve;
      this.tick();
    });
  }

  /** Troca a cor do brilho (ex.: verde quando o teste passa). */
  setTone(tone: DieTone): void {
    this.tone = TONES[tone];
    (this.glow.material as THREE.MeshBasicMaterial).color.copy(this.tone);
    this.model.materials.forEach((m) => m.emissive.copy(this.tone));
    if (this.settleAt && !this.frame) this.renderer.render(this.scene, this.camera);
  }

  /** A fonte do jogo chegou depois: redesenha as faces. */
  redraw(): void {
    this.model.highlight(this.settleAt ? this.value : undefined);
    if (!this.frame) this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    this.model.dispose();
    this.glowMap.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && o !== this.mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private readonly tick = (): void => {
    this.frame = 0;
    const now = performance.now();
    this.clock += Math.min((now - this.lastFrame) / 1000, 1 / 30);
    this.lastFrame = now;
    const p = this.duration ? clamp01((this.clock - this.delay) / this.duration) : 1;
    this.pose(p);
    if (p >= 1 && !this.settleAt) {
      this.settleAt = now;
      this.model.highlight(this.value);
      this.done?.();
      this.done = undefined;
    }
    // brilho ao parar: acende, pulsa e assenta
    const g = this.settleAt ? (now - this.settleAt) / 1000 : -1;
    const pulse = g < 0 ? 0 : g < 0.25 ? g / 0.25 : 0.55 + 0.45 * Math.exp(-(g - 0.25) * 3);
    this.model.materials.forEach((m) => (m.emissiveIntensity = 0.28 * pulse));
    (this.glow.material as THREE.MeshBasicMaterial).opacity = 0.9 * pulse;
    this.renderer.render(this.scene, this.camera);
    if (!this.settleAt || g < 2) this.frame = requestAnimationFrame(this.tick);
  };

  private pose(p: number): void {
    const { mesh } = this;
    const spin = this.spin * (1 - easeOutCubic(clamp01(p / 0.9)));
    mesh.quaternion.copy(this.final).multiply(this.tmpQ.setFromAxisAngle(this.axis, spin));
    // apoia o vértice mais baixo no chão: o dado nunca atravessa a mesa
    let minY = Infinity;
    for (const v of this.model.hull)
      minY = Math.min(minY, this.tmpV.copy(v).applyQuaternion(mesh.quaternion).y);
    const travel = 1 - (1 - clamp01(p / 0.8)) ** 2;
    mesh.position.lerpVectors(this.from, this.to, travel);
    mesh.position.y = bounceHeight(p) * this.model.radius - minY;
  }

  private fit(): void {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // palco estreito: afasta a câmera para o dado caber na largura
    this.camera.zoom = Math.min(1, (w / h) * 1.1);
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }
}
