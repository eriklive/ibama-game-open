import * as THREE from 'three';
import { CharacterRig, ModelDef } from './character-model';

/** Quanto o botão "Girar modelo" gira o personagem (rad). */
const TURN_STEP = Math.PI / 4;
/** Arrasto horizontal: radianos por pixel. */
const DRAG_SPEED = 0.012;
/**
 * Enquadramentos do palco (unidades do mundo): o que precisa caber na tela e para onde a câmera
 * olha. `full`: o personagem de pé, com folga, e o disco. `bust`: da cintura para cima (o
 * quadrado da ficha no celular, antes de tocar nele).
 */
export type Framing = 'full' | 'bust';
const FRAMES: Record<Framing, { height: number; width: number; target: number; eye: number }> = {
  full: { height: 3.8, width: 3.0, target: 1.25, eye: 2.1 },
  bust: { height: 1.65, width: 1.5, target: 1.78, eye: 1.95 },
};
/** Velocidade da transição entre enquadramentos (1/s). */
const FRAME_EASE = 6;

/**
 * Visualizador do personagem na ficha do agente: o modelo 3D real (`CharacterRig`) parado
 * respirando sobre um disco, girável com o dedo/mouse ou pelo botão. Usa o mesmo modelo do
 * tabuleiro, só que num palco pequeno e transparente (o fundo quadriculado é CSS).
 */
export class AgentViewer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  private readonly turntable = new THREE.Group();
  private readonly clock = new THREE.Clock();
  private readonly resize: ResizeObserver;
  private rig: CharacterRig | null = null;
  private loading = 0;
  private frame = 0;
  private yaw = 0;
  private targetYaw = 0;
  private drag: { id: number; x: number; yaw: number } | null = null;
  private disposed = false;
  /** Enquadramento atual (interpolado até o pedido em `setFraming`). */
  private readonly view: { height: number; width: number; target: number; eye: number };
  private framing: Framing;

  /** Lança um erro se o WebGL não estiver disponível (quem chama mostra o desenho 2D). */
  constructor(
    private readonly host: HTMLElement,
    framing: Framing = 'full',
  ) {
    this.framing = framing;
    this.view = { ...FRAMES[framing] };
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.cssText =
      'display:block;width:100%;height:100%;touch-action:none';
    host.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight('#fff6e0', '#2c2a22', 1.4));
    const key = new THREE.DirectionalLight('#fff1d0', 2.4);
    key.position.set(-3, 6, 5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#ffd27a', 0.9);
    rim.position.set(4, 3, -5);
    this.scene.add(rim);

    // disco no chão, como a base das peças no tabuleiro
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.45, 0.12, 48),
      new THREE.MeshStandardMaterial({ color: '#3b3830', roughness: 0.9 }),
    );
    disc.position.y = -0.06;
    this.scene.add(disc, this.turntable);

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(host);
    this.fit();
    this.frame = requestAnimationFrame(this.tick);
  }

  /** Troca o personagem mostrado (o anterior sai quando o novo termina de carregar). */
  async show(def: ModelDef): Promise<void> {
    const ticket = ++this.loading;
    const rig = await CharacterRig.load(def);
    if (this.disposed || ticket !== this.loading) {
      rig.dispose();
      return;
    }
    this.clearRig();
    rig.play('idle', 0);
    this.rig = rig;
    this.turntable.add(rig.object);
    this.yaw = this.targetYaw = 0;
  }

  /** Troca o enquadramento (com uma transição curta; `instant` pula a transição). */
  setFraming(framing: Framing, instant = false): void {
    this.framing = framing;
    if (instant) {
      Object.assign(this.view, FRAMES[framing]);
      this.fit();
    }
  }

  /** Volta o personagem para a frente. */
  face(): void {
    this.targetYaw = Math.round(this.yaw / (2 * Math.PI)) * 2 * Math.PI;
  }

  /** Gira um passo (botão "Girar modelo"). */
  turn(dir = 1): void {
    this.targetYaw += dir * TURN_STEP;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointercancel', this.onUp);
    this.clearRig();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
    this.renderer.dispose();
    el.remove();
  }

  private clearRig(): void {
    if (!this.rig) return;
    this.turntable.remove(this.rig.object);
    this.rig.dispose();
    this.rig = null;
  }

  private fit(): void {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.place();
  }

  /** Põe a câmera no enquadramento atual: longe o bastante para caber altura e largura. */
  private place(): void {
    const v = this.view;
    const tan = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const z = Math.max(v.height / tan, v.width / (tan * this.camera.aspect));
    this.camera.position.set(0, v.eye, z);
    this.camera.lookAt(0, v.target, 0);
    this.camera.updateProjectionMatrix();
  }

  /** Aproxima o enquadramento atual do pedido; devolve se ainda estava mudando. */
  private easeFrame(dt: number): boolean {
    const goal = FRAMES[this.framing];
    const k = Math.min(1, dt * FRAME_EASE);
    let moving = false;
    for (const key of ['height', 'width', 'target', 'eye'] as const) {
      const d = goal[key] - this.view[key];
      if (Math.abs(d) < 1e-3) this.view[key] = goal[key];
      else {
        this.view[key] += d * k;
        moving = true;
      }
    }
    return moving;
  }

  private readonly tick = (): void => {
    this.frame = requestAnimationFrame(this.tick);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (!this.drag) this.yaw += (this.targetYaw - this.yaw) * Math.min(1, dt * 10);
    this.turntable.rotation.y = this.yaw;
    if (this.easeFrame(dt)) this.place();
    this.rig?.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private readonly onDown = (e: PointerEvent): void => {
    this.drag = { id: e.pointerId, x: e.clientX, yaw: this.yaw };
    this.renderer.domElement.setPointerCapture?.(e.pointerId);
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    this.yaw = this.targetYaw = this.drag.yaw + (e.clientX - this.drag.x) * DRAG_SPEED;
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (this.drag?.id === e.pointerId) this.drag = null;
  };
}
