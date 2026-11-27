import * as THREE from 'three';
import { CharacterRig, ModelDef } from './character-model';

/** Distância entre os personagens no palco (unidades do mundo): ombro a ombro, com folga. */
export const LOBBY_SPACING = 1.3;
/** Velocidade das transições (luz e câmera; 1/s). */
const EASE = 5;
/**
 * Faixas do palco cobertas pelo HTML (px): o cabeçalho em cima; as plaquinhas de nome e o rodapé
 * embaixo. O palco ocupa a tela toda, por trás deles; a câmera enquadra só o que sobra no meio.
 */
export const LOBBY_INSETS = { top: 84, bottom: 196 };

/**
 * O que a câmera precisa mostrar: de `low` a `high` na vertical e `width` na horizontal, centrado
 * em `x` (unidades do mundo).
 */
interface Shot {
  x: number;
  low: number;
  high: number;
  width: number;
}
/** A fila inteira: dos pés ao topo do chapéu, e um pouco de cada lado. */
const lineupShot = (count: number): Shot => ({
  x: 0,
  low: -0.05,
  high: 2.5,
  width: (count - 1) * LOBBY_SPACING + 1.1,
});
/** Um personagem da cintura para cima. */
const bustShot = (x: number): Shot => ({ x, low: 1.05, high: 2.5, width: 1.3 });

/** Um personagem no palco: modelo e a luz de cima. */
interface Slot {
  group: THREE.Group;
  spot: THREE.SpotLight;
  rig: CharacterRig | null;
}

/** Posição x do personagem `i` numa fila de `count`, centrada no palco. */
export const slotX = (i: number, count: number): number => (i - (count - 1) / 2) * LOBBY_SPACING;

/**
 * Palco do lobby: os agentes da equipe lado a lado, parados respirando. Escolher um (`select`)
 * acende a luz dele, apaga a dos outros e leva a câmera até ele, da cintura para cima. O toque no
 * palco vira escolha por `hit`, e as plaquinhas de nome (HTML) seguem `onLayout`.
 */
export class LobbyViewer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  private readonly clock = new THREE.Clock();
  private readonly resize: ResizeObserver;
  private readonly slots: Slot[] = [];
  private readonly ambient: THREE.HemisphereLight;
  /** Onde a câmera está (x, altura do centro, distância), indo até `goal()`. */
  private readonly cam = { x: 0, y: 0, z: 0 };
  private placed = false;
  /** Última posição de cada personagem na tela (fração da largura), avisada em `onLayout`. */
  private xs: number[] = [];
  private readonly probe = new THREE.Vector3();
  /** Avisado quando os personagens mudam de lugar na tela (fração da largura, 0–1, por slot). */
  onLayout?: (xs: number[]) => void;
  private selected: number | null = null;
  /** Faixa à direita coberta pelo menu (px): o enquadramento centra no que sobra. */
  private rightInset = 0;
  private frame = 0;
  private disposed = false;

  /** Lança um erro se o WebGL não estiver disponível (quem chama mostra o desenho 2D). */
  constructor(
    private readonly host: HTMLElement,
    private readonly count: number,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    host.appendChild(this.renderer.domElement);

    this.ambient = new THREE.HemisphereLight('#fff6e0', '#2c2a22', 1.3);
    this.scene.add(this.ambient);
    const key = new THREE.DirectionalLight('#fff1d0', 1.8);
    key.position.set(-3, 6, 6);
    this.scene.add(key);

    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      group.position.x = slotX(i, count);
      const spot = new THREE.SpotLight('#fff3d6', 0, 9, 0.35, 0.6, 1);
      spot.position.set(group.position.x, 6, 2.5);
      spot.target = group;
      this.scene.add(group, spot);
      this.slots.push({ group, spot, rig: null });
    }

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(host);
    this.fit();
    this.frame = requestAnimationFrame(this.tick);
  }

  /** Carrega os modelos (na ordem da fila); cada um aparece quando termina de carregar. */
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

  /**
   * Qual personagem está sob o ponto tocado (coordenadas da tela), ou `null`: o mais próximo na
   * horizontal, desde que a menos de meio espaçamento dele.
   */
  hit(clientX: number, clientY: number): number | null {
    const r = this.host.getBoundingClientRect();
    const fx = (clientX - r.left) / (r.width || 1);
    const fy = (clientY - r.top) / (r.height || 1);
    let best: number | null = null;
    let bestD = Infinity;
    this.slots.forEach((s, i) => {
      const [x, top] = this.project(s.group.position.x, 2.45);
      const [, bottom] = this.project(s.group.position.x, 0);
      const [half] = this.project(s.group.position.x + LOBBY_SPACING / 2, 0);
      const d = Math.abs(fx - x);
      if (d < Math.abs(half - x) && fy >= top && fy <= bottom && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  }

  /** Destaca um personagem e aproxima a câmera dele (ou volta para a fila, com `null`). */
  select(index: number | null, rightInset = 0): void {
    this.selected = index;
    this.rightInset = rightInset;
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
      s.spot.dispose();
    }
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /**
   * Câmera para o enquadramento atual: longe o bastante para caber a altura (mais o espaço das
   * plaquinhas) e a largura. Se sobrar altura (palco em pé, no celular), o que se mostra desce para
   * o pé da tela, logo acima das plaquinhas, e o alto fica livre para o menu.
   */
  private goal(): { x: number; y: number; z: number } {
    const i = this.selected;
    const shot = i === null ? lineupShot(this.count) : bustShot(slotX(i, this.count));
    const px = this.host.clientHeight || 1;
    const top = Math.min(0.3, LOBBY_INSETS.top / px);
    const bottom = Math.min(0.4, LOBBY_INSETS.bottom / px);
    const right = Math.min(0.5, this.rightInset / (this.host.clientWidth || 1));
    const tan = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const tall = (shot.high - shot.low) / (1 - top - bottom);
    const z = Math.max(tall / tan, shot.width / (tan * this.camera.aspect * (1 - right)));
    const h = z * tan;
    // com o menu à direita, a câmera anda para a direita e o assunto fica no meio do que sobra
    const x = shot.x + (right / 2) * h * this.camera.aspect;
    return { x, y: shot.low - bottom * h + h / 2, z };
  }

  private fit(): void {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.placed) {
      Object.assign(this.cam, this.goal());
      this.placed = true;
    }
  }

  private readonly tick = (): void => {
    this.frame = requestAnimationFrame(this.tick);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const k = Math.min(1, dt * EASE);
    const any = this.selected !== null;

    const g = this.goal();
    this.cam.x += (g.x - this.cam.x) * k;
    this.cam.y += (g.y - this.cam.y) * k;
    this.cam.z += (g.z - this.cam.z) * k;
    this.camera.position.set(this.cam.x, this.cam.y, this.cam.z);
    this.camera.lookAt(this.cam.x, this.cam.y, 0);

    this.ambient.intensity += ((any ? 0.7 : 1.3) - this.ambient.intensity) * k;
    this.slots.forEach((s, i) => {
      const on = this.selected === i;
      s.spot.intensity += ((on ? 50 : any ? 0 : 6) - s.spot.intensity) * k;
      s.rig?.update(dt);
    });
    this.renderer.render(this.scene, this.camera);
    this.report();
  };

  /** Ponto do palco (x, altura; z = 0) na tela, em frações (0–1) da largura e da altura. */
  private project(x: number, y: number): [number, number] {
    this.probe.set(x, y, 0).project(this.camera);
    return [(this.probe.x + 1) / 2, (1 - this.probe.y) / 2];
  }

  /** Avisa onde cada personagem está na tela, se mudou (as plaquinhas de nome acompanham). */
  private report(): void {
    if (!this.onLayout) return;
    const xs = this.slots.map((s) => this.project(s.group.position.x, 0)[0]);
    if (xs.length === this.xs.length && xs.every((x, i) => Math.abs(x - this.xs[i]) < 5e-4)) return;
    this.xs = xs;
    this.onLayout(xs);
  }
}
