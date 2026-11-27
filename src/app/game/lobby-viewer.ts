import * as THREE from 'three';
import { CharacterRig, ModelDef } from './character-model';

/** Distância entre os personagens no palco (unidades do mundo). */
export const LOBBY_SPACING = 2.1;
/** Quanto o personagem escolhido dá um passo à frente (unidades do mundo). */
const STEP_FORWARD = 0.45;
/** Velocidade das transições de destaque (1/s). */
const EASE = 7;
/** O que precisa caber na tela: a fila inteira de largura e um personagem de pé de altura. */
const frameOf = (count: number) => ({ width: count * LOBBY_SPACING + 0.4, height: 3.5 });
/** Fração da altura do palco, no pé, reservada para as plaquinhas de nome (HTML). */
const PLATE_SPACE = 0.17;

/** Um personagem no palco: modelo, disco com a cor dele e a luz de cima. */
interface Slot {
  group: THREE.Group;
  disc: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  spot: THREE.SpotLight;
  rig: CharacterRig | null;
  lift: number;
}

/** Posição x do personagem `i` numa fila de `count`, centrada no palco. */
export const slotX = (i: number, count: number): number => (i - (count - 1) / 2) * LOBBY_SPACING;

/**
 * Palco do lobby: os agentes da equipe lado a lado, parados respirando, cada um sobre um disco
 * com a sua cor. Escolher um (`select`) acende a luz dele, mostra o anel amarelo e o traz um passo
 * à frente; os outros ficam na penumbra. Quem escolhe é o HTML por cima (colunas tocáveis):
 * a fila ocupa a largura do palco, uma coluna por personagem.
 */
export class LobbyViewer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  private readonly clock = new THREE.Clock();
  private readonly resize: ResizeObserver;
  private readonly slots: Slot[] = [];
  private readonly ambient: THREE.HemisphereLight;
  private selected: number | null = null;
  private frame = 0;
  private disposed = false;

  /** Lança um erro se o WebGL não estiver disponível (quem chama mostra o desenho 2D). */
  constructor(
    private readonly host: HTMLElement,
    colors: readonly number[],
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    host.appendChild(this.renderer.domElement);

    this.ambient = new THREE.HemisphereLight('#fff6e0', '#2c2a22', 1.1);
    this.scene.add(this.ambient);
    const key = new THREE.DirectionalLight('#fff1d0', 1.6);
    key.position.set(-3, 6, 6);
    this.scene.add(key);

    colors.forEach((color, i) => {
      const group = new THREE.Group();
      group.position.x = slotX(i, colors.length);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.92, 0.12, 40),
        new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
      );
      disc.position.y = -0.06;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.98, 0.05, 8, 48),
        new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;
      const spot = new THREE.SpotLight('#fff3d6', 0, 9, 0.42, 0.55, 1);
      spot.position.set(0, 6, 1.5);
      spot.target = group;
      group.add(disc, ring);
      this.scene.add(group, spot);
      spot.position.x = group.position.x;
      this.slots.push({ group, disc, ring, spot, rig: null, lift: 0 });
    });

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(host);
    this.fit();
    this.frame = requestAnimationFrame(this.tick);
  }

  /** Carrega os modelos (na ordem das cores); cada um aparece quando termina de carregar. */
  async load(models: readonly (ModelDef | undefined)[]): Promise<void> {
    await Promise.all(
      models.map(async (def, i) => {
        const slot = this.slots[i];
        if (!def || !slot) return;
        const rig = await CharacterRig.load(def);
        if (this.disposed) {
          rig.dispose();
          return;
        }
        // cada um num ponto diferente do respirar, para não ficarem em uníssono
        rig.play('idle', 0);
        rig.update(i * 0.7);
        slot.rig = rig;
        slot.group.add(rig.object);
      }),
    );
  }

  /** Destaca um personagem (ou nenhum, com `null`). */
  select(index: number | null): void {
    this.selected = index;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    for (const s of this.slots) {
      if (s.rig) {
        s.group.remove(s.rig.object);
        s.rig.dispose();
      }
      s.disc.geometry.dispose();
      s.disc.material.dispose();
      s.ring.geometry.dispose();
      s.ring.material.dispose();
      s.spot.dispose();
    }
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private fit(): void {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const f = frameOf(this.slots.length);
    const tan = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const z = Math.max(f.height / tan, f.width / (tan * this.camera.aspect));
    // palco alto (celular em pé): a fila desce para o pé da tela (acima das plaquinhas) e
    // sobra o alto para o menu; num palco largo, a câmera fica um pouco acima, olhando a fila
    const half = (z * tan) / 2;
    const low = half * (1 - 2 * PLATE_SPACE);
    if (low > 1.2) {
      this.camera.position.set(0, low, z);
      this.camera.lookAt(0, low, 0);
    } else {
      this.camera.position.set(0, 1.9, z);
      this.camera.lookAt(0, 1.2, 0);
    }
    this.camera.updateProjectionMatrix();
  }

  private readonly tick = (): void => {
    this.frame = requestAnimationFrame(this.tick);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const k = Math.min(1, dt * EASE);
    const any = this.selected !== null;
    this.ambient.intensity += ((any ? 0.55 : 1.1) - this.ambient.intensity) * k;
    this.slots.forEach((s, i) => {
      const on = this.selected === i;
      s.lift += ((on ? 1 : 0) - s.lift) * k;
      s.group.position.z = s.lift * STEP_FORWARD;
      s.ring.material.opacity = s.lift;
      s.spot.intensity += ((on ? 60 : any ? 0 : 8) - s.spot.intensity) * k;
      s.rig?.update(dt);
    });
    this.renderer.render(this.scene, this.camera);
  };
}
