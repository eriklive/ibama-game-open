import * as THREE from 'three';
import { CharacterRig, ModelDef } from './character-model';

/** Quanto o botão "Girar modelo" gira o personagem (rad). */
const TURN_STEP = Math.PI / 4;
/** Arrasto horizontal: radianos por pixel. */
const DRAG_SPEED = 0.012;
/** O que precisa caber na tela (unidades do mundo): personagem de pé com folga e o disco. */
const FRAME = { height: 3.8, width: 3.4 };

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

  /** Lança um erro se o WebGL não estiver disponível (quem chama mostra o desenho 2D). */
  constructor(private readonly host: HTMLElement) {
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

    this.camera.position.set(0, 2.1, 7);
    this.camera.lookAt(0, 1.25, 0);

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
    // distância para caber o personagem de pé (altura) e o disco (largura)
    const view = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.position.z = Math.max(
      FRAME.height / view,
      FRAME.width / (view * this.camera.aspect),
    );
    this.camera.updateProjectionMatrix();
  }

  private readonly tick = (): void => {
    this.frame = requestAnimationFrame(this.tick);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (!this.drag) this.yaw += (this.targetYaw - this.yaw) * Math.min(1, dt * 10);
    this.turntable.rotation.y = this.yaw;
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
