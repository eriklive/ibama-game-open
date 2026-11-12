import * as THREE from 'three';
import { GameMap } from './maps';
import { HexCoord, hexKey, hexToWorld, sameHex, worldToHex } from './hex';
import { CharacterRig, ModelDef } from './character-model';

const HEX_SIZE = 1;
const HEX_HEIGHT = 0.35;
const HEX_GAP = 0.94; // raio visível em relação ao espaçamento → deixa uma fresta entre os hexágonos

/** Peças com modelo 3D: velocidade da corrida entre hexágonos (unidades do mundo/s ≈ 1,9 hex/s). */
const RUN_SPEED = 3.2;
/** Meia altura do disco da base: o disco apoia no hexágono e o modelo fica de pé sobre ele. */
const BASE_TOP = 0.07;

const COLORS = {
  background: 0x123039,
  outline: 0x0b1d24,
  hexA: 0x2f78c4,
  hexB: 0x2a6db3,
  hexC: 0x3482cf,
  reachable: 0xa9e4ff,
  selected: 0xffd23f,
  path: 0xfff4c2,
  activeRing: 0xffd23f,
  focusRing: 0xffffff,
};

export interface BoardUnit {
  id: string;
  color: number;
  start: HexCoord;
  /** Modelo 3D; enquanto carrega (ou se falhar) a peça simples continua no lugar. */
  model?: ModelDef;
}

interface UnitView {
  id: string;
  hex: HexCoord;
  group: THREE.Group;
  shadow: THREE.Mesh;
  hitbox: THREE.Mesh;
  /** 0 = parado, 1 = flutuando (personagem da vez); interpolado para suavizar a troca. */
  lift: number;
  hop: number;
  /** Peças da miniatura que somem quando o modelo 3D chega (miolo e alça de frente). */
  pieceOnly: THREE.Object3D[];
  rig?: CharacterRig;
  /** Direção para onde o modelo olha (rad em torno de Y; 0 = +Z, de frente para a câmera). */
  yaw: number;
}

interface HexTile {
  coord: HexCoord;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
  /** Altura-alvo do hexágono (a animação aproxima `mesh.position.y` dela). */
  lift: number;
}

export interface HexBoardCallbacks {
  /** Toque num hexágono vazio (ou fora do tabuleiro, com `null`). */
  onHexTap(hex: HexCoord | null): void;
  /** Toque numa peça de personagem (ou no hexágono em que ela está). */
  onUnitTap(id: string): void;
}

/**
 * Cena 3D do tabuleiro: hexágonos em prisma, câmera em perspectiva inclinada
 * (vista "de cima e de trás"), peças dos personagens e entrada por toque/mouse
 * (tocar seleciona, arrastar move a câmera, pinça ou roda do mouse aproxima).
 *
 * O tabuleiro só desenha e anima: as regras (turnos, dados, alcance) ficam na tela.
 */
export class HexBoard {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  private readonly raycaster = new THREE.Raycaster();
  private readonly tiles = new Map<string, HexTile>();
  private readonly pickables: THREE.Object3D[] = [];
  private readonly units = new Map<string, UnitView>();
  private readonly activeMarker: THREE.Mesh;
  private readonly focusMarker: THREE.Mesh;
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private frameId = 0;

  private reachable = new Set<string>();
  private selected: HexCoord | null = null;
  /** Caminho até o destino (sem a origem, com o destino), na ordem em que será percorrido. */
  private path: string[] = [];
  private activeId: string | null = null;
  private focusId: string | null = null;
  private moving = false;
  private inputEnabled = true;
  private disposed = false;

  // câmera
  private readonly camTarget = new THREE.Vector3();
  private readonly camGoal = new THREE.Vector3();
  private zoom = 1;
  private readonly bounds = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };

  // ponteiros
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private tapStart: { x: number; y: number; t: number } | null = null;
  private dragged = false;
  private pinchDist = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly map: GameMap,
    units: BoardUnit[],
    private readonly callbacks: HexBoardCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = new THREE.Fog(COLORS.background, 22, 48);

    this.setupLights();
    this.buildBoard();
    for (const u of units) this.buildUnit(u);
    this.activeMarker = this.buildMarker(COLORS.activeRing, 0.62, 0.09);
    this.focusMarker = this.buildMarker(COLORS.focusRing, 0.72, 0.05);

    const first = units[0]?.start ?? { col: 0, row: 0 };
    this.camTarget.copy(this.worldOf(first));
    this.camGoal.copy(this.camTarget);
    this.paintTiles();

    this.bindInput();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.loop();
  }

  // ---------- API pública ----------

  get busy(): boolean {
    return this.moving;
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
  }

  /** Personagem da vez: flutua e ganha o anel amarelo. */
  setActive(id: string | null): void {
    this.activeId = id;
  }

  /** Personagem em foco (anel branco) — a câmera vai até ele. */
  focus(id: string | null, moveCamera = true): void {
    this.focusId = id;
    const u = id ? this.units.get(id) : undefined;
    if (u && moveCamera) {
      this.camGoal.copy(this.worldOf(u.hex));
      this.clampGoal();
    }
  }

  /** Hexágonos destacados como destino possível. */
  setReachable(keys: Iterable<string>): void {
    this.reachable = new Set(keys);
    this.paintTiles();
  }

  /** Destino escolhido e o caminho até ele (sem a origem), que brilha e flutua. */
  setSelected(hex: HexCoord | null, path: HexCoord[] = []): void {
    this.selected = hex;
    this.path = hex ? path.map(hexKey) : [];
    this.paintTiles();
  }

  /** Coloca todas as peças nas posições dadas (sem animação). */
  placeUnits(positions: ReadonlyMap<string, HexCoord>): void {
    for (const [id, hex] of positions) {
      const u = this.units.get(id);
      if (!u) continue;
      u.hex = { ...hex };
      const p = this.worldOf(hex);
      u.group.position.x = p.x;
      u.group.position.z = p.z;
    }
    if (this.focusId) this.focus(this.focusId);
  }

  /** Anda com a peça pelo caminho (passo a passo, sem a origem). Resolve ao terminar. */
  async moveUnit(id: string, path: HexCoord[]): Promise<void> {
    const u = this.units.get(id);
    if (!u || this.moving || !path.length) return;
    this.moving = true;
    // o caminho continua aceso durante a caminhada e cada hexágono "pousa" quando a peça passa
    this.selected = path[path.length - 1];
    this.path = path.map(hexKey);
    this.reachable.clear();
    this.paintTiles();
    u.rig?.matchSpeed('run', RUN_SPEED);
    u.rig?.play('run', 0.15);
    for (const step of path) {
      await (u.rig ? this.runTo(u, step) : this.hopTo(u, step));
      u.hex = step;
      this.path.shift();
      this.paintTiles();
    }
    u.rig?.play('idle', 0.3);
    this.selected = null;
    this.path = [];
    this.paintTiles();
    this.moving = false;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    for (const u of this.units.values()) u.rig?.dispose();
    this.resizeObserver.disconnect();
    this.unbindInput();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
  }

  // ---------- construção da cena ----------

  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xdff4ff, 0x1a3a44, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-8, 16, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const ext = Math.max(this.map.cols, this.map.rows) * HEX_SIZE * 1.2;
    Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 60 });
    const center = this.boardCenter();
    sun.position.add(center);
    sun.target.position.copy(center);
    this.scene.add(sun, sun.target);
  }

  private buildBoard(): void {
    const geo = new THREE.CylinderGeometry(HEX_SIZE * HEX_GAP, HEX_SIZE * HEX_GAP, HEX_HEIGHT, 6);
    geo.rotateY(Math.PI / 6); // vértice apontando para +X → hexágono "flat-top"
    geo.translate(0, -HEX_HEIGHT / 2, 0); // topo em y = 0
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ color: COLORS.outline });
    const palette = [COLORS.hexA, COLORS.hexB, COLORS.hexC];

    for (let col = 0; col < this.map.cols; col++) {
      for (let row = 0; row < this.map.rows; row++) {
        const coord = { col, row };
        const baseColor = new THREE.Color(palette[(col * 31 + row * 17) % 3]);
        const material = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.85, metalness: 0 });
        const mesh = new THREE.Mesh(geo, material);
        const p = hexToWorld(coord, HEX_SIZE);
        mesh.position.set(p.x, 0, p.z);
        mesh.receiveShadow = true;
        mesh.userData['hex'] = coord;
        mesh.add(new THREE.LineSegments(edges, lineMat));
        this.scene.add(mesh);
        this.pickables.push(mesh);
        this.tiles.set(hexKey(coord), { coord, mesh, material, baseColor, lift: 0 });
      }
    }

    const last = hexToWorld({ col: this.map.cols - 1, row: this.map.rows - 1 }, HEX_SIZE);
    Object.assign(this.bounds, { minX: 0, maxX: last.x, minZ: 0, maxZ: last.z + HEX_SIZE });

    // "mesa" escura sob o tabuleiro
    const c = this.boardCenter();
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(last.x + 30, last.z + 30),
      new THREE.MeshStandardMaterial({ color: 0x0e2830, roughness: 1 }),
    );
    base.rotation.x = -Math.PI / 2;
    base.position.set(c.x, -HEX_HEIGHT - 0.01, c.z);
    base.receiveShadow = true;
    this.scene.add(base);
  }

  private buildUnit(unit: BoardUnit): void {
    const group = new THREE.Group();
    const body = new THREE.Color(unit.color);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.14, 40),
      new THREE.MeshStandardMaterial({ color: body, roughness: 0.5 }),
    );
    disc.castShadow = true;
    const light = body.clone().lerp(new THREE.Color(0xffffff), 0.55);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.07, 12, 40),
      new THREE.MeshStandardMaterial({ color: light, roughness: 0.4 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.16, 24),
      new THREE.MeshStandardMaterial({ color: light, roughness: 0.4 }),
    );
    // alça que marca a "frente" da peça — mostra a rotação de quem está na vez
    const nub = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.12, 0.22),
      new THREE.MeshStandardMaterial({ color: light, roughness: 0.4 }),
    );
    nub.position.set(0, 0, 0.42);
    group.add(disc, ring, dot, nub);

    // área de toque generosa (invisível) para facilitar selecionar com o dedo
    const hitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.6, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    // o hexágono da peça também conta como toque nela (ver handleTap), então a caixa
    // só precisa cobrir a própria peça, sem roubar toques dos hexágonos de trás
    hitbox.userData['unitId'] = unit.id;
    group.add(hitbox);
    this.scene.add(group);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    this.scene.add(shadow);

    const p = this.worldOf(unit.start);
    group.position.set(p.x, 0.3, p.z);
    const view: UnitView = {
      id: unit.id, hex: { ...unit.start }, group, shadow, hitbox, lift: 0, hop: 0,
      pieceOnly: [dot, nub], yaw: 0,
    };
    this.units.set(unit.id, view);
    if (unit.model) this.attachModel(view, unit.model);
  }

  /** Troca o miolo da peça pelo personagem animado, que fica de pé sobre o disco. */
  private async attachModel(u: UnitView, def: ModelDef): Promise<void> {
    let rig: CharacterRig;
    try {
      rig = await CharacterRig.load(def);
    } catch (err) {
      console.warn(`Modelo de ${u.id} não carregou; mantendo a peça simples.`, err);
      return;
    }
    if (this.disposed) {
      rig.dispose();
      return;
    }
    rig.object.position.y = BASE_TOP;
    u.group.add(rig.object);
    for (const o of u.pieceOnly) o.visible = false;
    // a área de toque passa a cobrir o corpo todo
    u.hitbox.scale.set(0.8, def.height / 0.6, 0.8);
    u.hitbox.position.y = def.height / 2;
    rig.play(this.moving ? 'run' : 'idle', 0);
    u.rig = rig;
  }

  private buildMarker(color: number, radius: number, tube: number): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 10, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    this.scene.add(m);
    return m;
  }

  // ---------- estado / pintura ----------

  private paintTiles(): void {
    for (const [key, tile] of this.tiles) {
      const isSel = sameHex(tile.coord, this.selected);
      const onPath = !isSel && this.path.includes(key);
      const isReach = this.reachable.has(key);
      tile.material.color.set(
        isSel ? COLORS.selected : onPath ? COLORS.path : isReach ? COLORS.reachable : tile.baseColor,
      );
      tile.material.emissive.set(isSel ? 0x6b5200 : onPath ? 0x5a4a14 : 0x000000);
      tile.lift = isSel ? 0.2 : onPath ? 0.1 : 0;
    }
  }

  // ---------- peças ----------

  private worldOf(h: HexCoord): THREE.Vector3 {
    const p = hexToWorld(h, HEX_SIZE);
    return new THREE.Vector3(p.x, 0, p.z);
  }

  private hopTo(u: UnitView, h: HexCoord): Promise<void> {
    const from = u.group.position.clone();
    const to = this.worldOf(h);
    this.camGoal.copy(to);
    const duration = 260;
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        u.group.position.x = from.x + (to.x - from.x) * e;
        u.group.position.z = from.z + (to.z - from.z) * e;
        u.hop = Math.sin(Math.PI * t) * 0.6;
        if (t < 1) requestAnimationFrame(step);
        else {
          u.hop = 0;
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  /** Corre em linha reta até o hexágono, em velocidade constante, virando para onde vai. */
  private runTo(u: UnitView, h: HexCoord): Promise<void> {
    const from = u.group.position.clone();
    const to = this.worldOf(h);
    this.camGoal.copy(to);
    u.yaw = Math.atan2(to.x - from.x, to.z - from.z);
    const duration = (Math.hypot(to.x - from.x, to.z - from.z) / RUN_SPEED) * 1000;
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now: number) => {
        const t = this.disposed ? 1 : Math.min(1, (now - start) / duration);
        u.group.position.x = from.x + (to.x - from.x) * t;
        u.group.position.z = from.z + (to.z - from.z) * t;
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  /** Altura do topo do hexágono sob um ponto (os hexágonos do caminho flutuam). */
  private groundAt(x: number, z: number): number {
    const tile = this.tiles.get(hexKey(worldToHex(x, z, HEX_SIZE)));
    return tile ? tile.mesh.position.y : 0;
  }

  // ---------- câmera / loop ----------

  private boardCenter(): THREE.Vector3 {
    const last = hexToWorld({ col: this.map.cols - 1, row: this.map.rows - 1 }, HEX_SIZE);
    return new THREE.Vector3(last.x / 2, 0, last.z / 2);
  }

  private resize(): void {
    const parent = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private updateCamera(dt: number): void {
    const k = 1 - Math.exp(-dt * 6);
    this.camTarget.lerp(this.camGoal, k);
    // Em retrato a câmera recua para enxergar o mesmo número de colunas.
    const portrait = this.camera.aspect < 1 ? 1 / Math.max(this.camera.aspect, 0.45) : 1;
    const dist = 11.5 * this.zoom * Math.min(portrait, 2.3);
    const pitch = THREE.MathUtils.degToRad(55);
    this.camera.position.set(
      this.camTarget.x,
      this.camTarget.y + Math.sin(pitch) * dist,
      this.camTarget.z + Math.cos(pitch) * dist,
    );
    // mira um pouco "abaixo" do jogador: ele fica acima do centro e o painel inferior não cobre o alcance
    const lead = this.camera.aspect < 1 ? 1.4 : 0.3;
    this.camera.position.z += lead;
    this.camera.lookAt(this.camTarget.x, this.camTarget.y, this.camTarget.z + lead);
  }

  private loop = (): void => {
    this.frameId = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;

    const bob = Math.sin(t * 2.4) * 0.08;
    const lk = 1 - Math.exp(-dt * 8);
    for (const u of this.units.values()) {
      const active = u.id === this.activeId;
      if (u.rig) {
        // personagem com modelo: fica de pé sobre o hexágono (acompanha a flutuação do caminho)
        // e vira suavemente para onde vai; quem está na vez é marcado só pelo anel
        u.rig.update(dt);
        const ground = this.groundAt(u.group.position.x, u.group.position.z);
        u.group.position.y += (ground + BASE_TOP - u.group.position.y) * (1 - Math.exp(-dt * 14));
        const turn = Math.atan2(Math.sin(u.yaw - u.group.rotation.y), Math.cos(u.yaw - u.group.rotation.y));
        u.group.rotation.y += turn * (1 - Math.exp(-dt * 12));
        u.shadow.position.set(u.group.position.x, u.group.position.y - BASE_TOP + 0.01, u.group.position.z);
        u.shadow.scale.setScalar(1.1);
        continue;
      }
      u.lift += ((active ? 1 : 0) - u.lift) * lk;
      // quem está na vez flutua e gira; os outros descansam baixos e parados
      const float = 0.3 + u.lift * (0.45 + bob);
      u.group.position.y = float + u.hop;
      if (active) u.group.rotation.y += dt * 0.8;
      u.shadow.position.set(u.group.position.x, 0.01, u.group.position.z);
      u.shadow.scale.setScalar(1 - (float - 0.3 + u.hop) * 0.6);
    }

    this.updateMarker(this.activeMarker, this.activeId, 0.03, 1 + Math.sin(t * 4) * 0.06);
    this.updateMarker(
      this.focusMarker,
      this.focusId !== this.activeId ? this.focusId : null,
      0.04,
      1 + Math.sin(t * 5) * 0.04,
    );

    // pulso suave nos hexágonos alcançáveis
    const pulse = 0.12 + Math.sin(t * 3) * 0.08;
    const tk = 1 - Math.exp(-dt * 12);
    for (const [key, tile] of this.tiles) {
      const step = this.path.indexOf(key);
      const isSel = sameHex(tile.coord, this.selected);
      if (step >= 0 && !isSel) {
        // caminho: brilho quente que "corre" da peça até o destino, e uma onda de flutuação
        const wave = Math.sin(t * 5 - step * 0.9);
        const glow = 0.4 + wave * 0.12;
        tile.material.emissive.setRGB(glow, glow * 0.8, glow * 0.25);
        tile.mesh.position.y += (tile.lift + wave * 0.035 - tile.mesh.position.y) * tk;
        continue;
      }
      if (isSel) {
        tile.mesh.position.y += (tile.lift + Math.sin(t * 3) * 0.03 - tile.mesh.position.y) * tk;
        continue;
      }
      if (this.reachable.has(key)) tile.material.emissive.setRGB(pulse * 0.3, pulse * 0.6, pulse);
      tile.mesh.position.y += (tile.lift - tile.mesh.position.y) * tk;
    }

    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private updateMarker(m: THREE.Mesh, id: string | null, y: number, scale: number): void {
    const u = id ? this.units.get(id) : undefined;
    m.visible = !!u;
    if (!u) return;
    m.position.set(u.group.position.x, y, u.group.position.z);
    m.scale.setScalar(scale);
  }

  // ---------- entrada (touch / mouse) ----------

  private bindInput(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private unbindInput(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.dragged = false;
    } else {
      this.tapStart = null;
      this.pinchDist = this.currentPinchDistance();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    this.pointers.set(e.pointerId, cur);

    if (this.pointers.size >= 2) {
      const d = this.currentPinchDistance();
      if (this.pinchDist > 0 && d > 0) this.setZoom(this.zoom * (this.pinchDist / d));
      this.pinchDist = d;
      return;
    }

    if (this.tapStart && Math.hypot(cur.x - this.tapStart.x, cur.y - this.tapStart.y) > 10) {
      this.dragged = true;
    }
    if (this.dragged) {
      // arrastar desloca a câmera (proporcional à distância atual)
      const h = this.canvas.clientHeight || 1;
      const scale = (22 * this.zoom) / h;
      this.camGoal.x -= (cur.x - prev.x) * scale;
      this.camGoal.z -= (cur.y - prev.y) * scale * 1.3;
      this.clampGoal();
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    const wasTap = this.pointers.size === 1 && this.tapStart && !this.dragged &&
      performance.now() - this.tapStart.t < 600;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (wasTap) this.handleTap(e.clientX, e.clientY);
    if (this.pointers.size === 0) this.tapStart = null;
  };

  private onPointerCancel = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    this.tapStart = null;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.setZoom(this.zoom * (e.deltaY > 0 ? 1.1 : 0.9));
  };

  private currentPinchDistance(): number {
    const pts = [...this.pointers.values()];
    return pts.length < 2 ? 0 : Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  private setZoom(z: number): void {
    this.zoom = THREE.MathUtils.clamp(z, 0.55, 1.8);
  }

  private clampGoal(): void {
    const b = this.bounds;
    this.camGoal.x = THREE.MathUtils.clamp(this.camGoal.x, b.minX, b.maxX);
    this.camGoal.z = THREE.MathUtils.clamp(this.camGoal.z, b.minZ, b.maxZ);
  }

  private handleTap(clientX: number, clientY: number): void {
    if (!this.inputEnabled || this.moving) return;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);

    // peças primeiro: tocar perto da peça (ou no hexágono dela) seleciona o personagem
    const hitboxes = [...this.units.values()].map((u) => u.hitbox);
    const unitHit = this.raycaster.intersectObjects(hitboxes, false)[0];
    if (unitHit) {
      this.callbacks.onUnitTap(unitHit.object.userData['unitId'] as string);
      return;
    }
    // Os hexágonos do caminho flutuam: o toque vale tanto para onde o hexágono aparece
    // (malha) quanto para onde ele fica em repouso (plano y = 0). O destino já escolhido
    // ganha o desempate, para o segundo toque confirmar mesmo na borda do hexágono.
    const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
    const meshHex = hit?.object.userData['hex'] as HexCoord | undefined;
    const ground = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    const groundHex = ground ? worldToHex(ground.x, ground.z, HEX_SIZE) : undefined;
    const onBoard = (h?: HexCoord) => !!h && this.tiles.has(hexKey(h));
    const hex = [meshHex, groundHex].find((h) => onBoard(h) && sameHex(h!, this.selected)) ??
      (onBoard(groundHex) ? groundHex : meshHex);
    const owner = hex && [...this.units.values()].find((u) => sameHex(u.hex, hex));
    if (owner) this.callbacks.onUnitTap(owner.id);
    else this.callbacks.onHexTap(hex ?? null);
  }
}
