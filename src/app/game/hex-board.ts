import * as THREE from 'three';
import { GameMap } from './maps';
import { HexCoord, hexKey, hexToWorld, sameHex, worldToHex } from './hex';
import { CharacterRig, METER, ModelDef } from './character-model';

const HEX_SIZE = 1;
const HEX_HEIGHT = 0.35;
const HEX_GAP = 0.94; // raio visível em relação ao espaçamento → deixa uma fresta entre os hexágonos

/** Peças com modelo 3D: velocidade da corrida entre hexágonos (3,6 m/s ≈ 2,8 hex/s). */
const RUN_SPEED = 3.6 * METER;
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
  wall: 0x56626a,
  wallTop: 0x7d8a90,
  vision: 0xd8735f,
  visionReach: 0xf3b7a4,
  enemy: 0xc8323c,
  enemyAlert: 0xff8a1f,
  enemySurrendered: 0xe9eef0,
  approachSurrender: 0x8fe08a,
  approachFlee: 0xffb067,
};

const WALL_HEIGHT = 0.9;

export interface BoardUnit {
  id: string;
  color: number;
  start: HexCoord;
  /** Modelo 3D; enquanto carrega (ou se falhar) a peça simples continua no lugar. */
  model?: ModelDef;
}

export interface BoardEnemy {
  id: string;
  start: HexCoord;
  /** Ângulo para onde olha, no plano XZ (atan2(dz, dx)). */
  facing: number;
  /** Modelo 3D; enquanto carrega (ou se falhar) a peça simples continua no lugar. */
  model?: ModelDef;
}

/** Peça que anda pelo tabuleiro (agente ou inimigo). */
interface Mover {
  hex: HexCoord;
  group: THREE.Group;
  shadow: THREE.Mesh;
  hop: number;
  /** Muda quando a peça é recolocada à força: interrompe a animação em curso. */
  epoch: number;
  rig?: CharacterRig;
}

interface UnitView extends Mover {
  id: string;
  hitbox: THREE.Mesh;
  /** 0 = parado, 1 = flutuando (personagem da vez); interpolado para suavizar a troca. */
  lift: number;
  /** Peças da miniatura que somem quando o modelo 3D chega (miolo e alça de frente). */
  pieceOnly: THREE.Object3D[];
  /** Direção para onde o modelo olha (rad em torno de Y; 0 = +Z, de frente para a câmera). */
  yaw: number;
}

interface EnemyView extends Mover {
  id: string;
  /** Para onde a peça aponta agora e para onde está girando. */
  facing: number;
  facingGoal: number;
  alert: boolean;
  surrendered: boolean;
  bodyMaterial: THREE.MeshStandardMaterial;
  alertSprite: THREE.Sprite;
  flagSprite: THREE.Sprite;
  /** 1 = no tabuleiro, 0 = sumiu (fugiu); anima a saída. */
  presence: number;
  gone: boolean;
  /** Altura de repouso do grupo (muda quando o modelo 3D substitui a peça). */
  baseY: number;
  /** Altura do "!" sobre a cabeça. */
  signY: number;
  /** Correndo entre hexágonos: o clipe de corrida tem prioridade sobre o do estado. */
  running?: boolean;
}

/** Diferença angular em (-π, π]. */
const angleDelta = (from: number, to: number): number =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

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
  private readonly enemies = new Map<string, EnemyView>();
  private readonly activeMarker: THREE.Mesh;
  private readonly focusMarker: THREE.Mesh;
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private frameId = 0;

  private reachable = new Set<string>();
  private vision = new Set<string>();
  /** Pré-visualização da abordagem: zona de rendição e zona de fuga. */
  private approach: { surrender: Set<string>; flee: Set<string> } | null = null;
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
  /** Giro da câmera em torno do tabuleiro (radianos); `yawGoal` é para onde ela vai. */
  private yaw = 0;
  private yawGoal = 0;
  private readonly bounds = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };

  // ponteiros
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private tapStart: { x: number; y: number; t: number } | null = null;
  private dragged = false;
  private pinchDist = 0;
  private pinchAngle = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly map: GameMap,
    units: BoardUnit[],
    private readonly callbacks: HexBoardCallbacks,
    extras: { walls?: HexCoord[]; enemies?: BoardEnemy[] } = {},
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = new THREE.Fog(COLORS.background, 22, 48);

    this.setupLights();
    this.buildBoard();
    this.buildWalls(extras.walls ?? []);
    for (const u of units) this.buildUnit(u);
    for (const e of extras.enemies ?? []) this.buildEnemy(e);
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

  /** Gira o mapa (positivo = sentido horário visto de cima). */
  rotate(radians: number): void {
    this.yawGoal += radians;
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

  /** Hexágonos vistos pelos inimigos (pintados de vermelho). */
  setVision(keys: Iterable<string>): void {
    this.vision = new Set(keys);
    this.paintTiles();
  }

  /** Mostra (ou esconde, com `null`) as zonas da abordagem. */
  setApproachZones(zones: { surrender: Iterable<string>; flee: Iterable<string> } | null): void {
    this.approach = zones && { surrender: new Set(zones.surrender), flee: new Set(zones.flee) };
    this.paintTiles();
  }

  /** Leva a câmera até um hexágono. */
  focusHex(hex: HexCoord): void {
    this.camGoal.copy(this.worldOf(hex));
    this.clampGoal();
  }

  /** Recoloca os inimigos (sem animação): posição, direção, alerta e presença. */
  placeEnemies(
    states: Iterable<{ id: string; hex: HexCoord; facing: number; alert: boolean; surrendered: boolean; gone: boolean }>,
  ): void {
    for (const st of states) {
      const e = this.enemies.get(st.id);
      if (!e) continue;
      e.epoch++;
      e.hop = 0;
      e.hex = { ...st.hex };
      const p = this.worldOf(st.hex);
      e.group.position.x = p.x;
      e.group.position.z = p.z;
      e.facing = e.facingGoal = st.facing;
      e.gone = st.gone;
      e.presence = st.gone ? 0 : 1;
      this.setEnemyAlert(st.id, st.alert);
      this.setEnemySurrendered(st.id, st.surrendered);
    }
  }

  /** Vira o inimigo para um ângulo (com animação). */
  setEnemyFacing(id: string, facing: number): void {
    const e = this.enemies.get(id);
    if (e) e.facingGoal = facing;
  }

  /** Inimigo em alerta: fica laranja e mostra um "!" sobre a cabeça. */
  setEnemyAlert(id: string, alert: boolean): void {
    const e = this.enemies.get(id);
    if (!e) return;
    e.alert = alert;
    if (alert) e.surrendered = false;
    this.paintEnemy(e);
  }

  /** Inimigo rendido: fica branco, abaixado, com uma bandeira branca. */
  setEnemySurrendered(id: string, surrendered: boolean): void {
    const e = this.enemies.get(id);
    if (!e) return;
    e.surrendered = surrendered;
    if (surrendered) e.alert = false;
    this.paintEnemy(e);
  }

  private paintEnemy(e: EnemyView): void {
    // com modelo 3D, o rendido se agacha (a peça simples só afunda um pouco)
    if (!e.running) e.rig?.play(e.surrendered ? 'crouch' : 'idle', 0.3);
    e.bodyMaterial.color.set(e.surrendered ? COLORS.enemySurrendered : e.alert ? COLORS.enemyAlert : COLORS.enemy);
    e.alertSprite.visible = e.alert;
    e.flagSprite.visible = e.surrendered;
  }

  /**
   * Anda com o inimigo pelo caminho, virando para cada passo. `onStep` roda a cada
   * hexágono alcançado; se devolver `false` o inimigo para ali.
   */
  async moveEnemy(id: string, path: HexCoord[], onStep?: (hex: HexCoord) => boolean | void, speed = 1): Promise<void> {
    const e = this.enemies.get(id);
    if (!e || this.moving || !path.length) return;
    this.moving = true;
    const epoch = e.epoch;
    e.running = true;
    for (const step of path) {
      const from = this.worldOf(e.hex);
      const to = this.worldOf(step);
      e.facingGoal = Math.atan2(to.z - from.z, to.x - from.x);
      if (e.rig) {
        e.rig.matchSpeed('run', RUN_SPEED * speed);
        e.rig.play('run', 0.15);
        await this.runTo(e, step, RUN_SPEED * speed);
      } else await this.hopTo(e, step, 300 / speed);
      if (e.epoch !== epoch) break;
      e.hex = step;
      if (onStep?.(step) === false) break;
    }
    e.running = false;
    e.rig?.play(e.surrendered ? 'crouch' : 'idle', 0.3);
    this.moving = false;
  }

  /** O inimigo sai do tabuleiro (fugiu). */
  async removeEnemy(id: string): Promise<void> {
    const e = this.enemies.get(id);
    if (!e) return;
    e.gone = true;
    await new Promise((r) => setTimeout(r, 450));
  }

  /** Coloca todas as peças nas posições dadas (sem animação). */
  placeUnits(positions: ReadonlyMap<string, HexCoord>): void {
    for (const [id, hex] of positions) {
      const u = this.units.get(id);
      if (!u) continue;
      u.epoch++;
      u.hop = 0;
      u.hex = { ...hex };
      const p = this.worldOf(hex);
      u.group.position.x = p.x;
      u.group.position.z = p.z;
    }
    if (this.focusId) this.focus(this.focusId);
  }

  /**
   * Anda com a peça pelo caminho (passo a passo, sem a origem). Resolve ao terminar.
   * `onStep` roda a cada hexágono alcançado.
   */
  async moveUnit(id: string, path: HexCoord[], onStep?: (hex: HexCoord) => void): Promise<void> {
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
    const epoch = u.epoch;
    for (const step of path) {
      if (u.rig) {
        const from = u.group.position;
        const to = this.worldOf(step);
        u.yaw = Math.atan2(to.x - from.x, to.z - from.z);
        await this.runTo(u, step, RUN_SPEED);
      } else await this.hopTo(u, step);
      if (u.epoch !== epoch) break;
      u.hex = step;
      this.path.shift();
      this.paintTiles();
      onStep?.(step);
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
    for (const u of [...this.units.values(), ...this.enemies.values()]) u.rig?.dispose();
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

  private buildWalls(walls: HexCoord[]): void {
    if (!walls.length) return;
    const r = HEX_SIZE * HEX_GAP * 0.92;
    const geo = new THREE.CylinderGeometry(r * 0.9, r, WALL_HEIGHT, 6);
    geo.rotateY(Math.PI / 6);
    geo.translate(0, WALL_HEIGHT / 2, 0);
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ color: COLORS.outline });
    const mats = [
      new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: COLORS.wallTop, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.95 }),
    ];
    for (const h of walls) {
      const tile = this.tiles.get(hexKey(h));
      if (!tile) continue;
      tile.baseColor.set(0x3b4a50);
      const wall = new THREE.Mesh(geo, mats);
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.add(new THREE.LineSegments(edges, lineMat));
      // um pouco de variação de altura para parecer pedra/tronco
      wall.scale.y = 0.85 + ((h.col * 13 + h.row * 7) % 5) * 0.07;
      tile.mesh.add(wall);
    }
  }

  private buildEnemy(enemy: BoardEnemy): void {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: COLORS.enemy, roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a1014, roughness: 0.6 });
    // corpo hexagonal + "cabeça" e um nariz apontando para onde olha (+X local)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.3, 6), bodyMaterial);
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), bodyMaterial);
    head.position.y = 0.3;
    head.castShadow = true;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 16), dark);
    nose.rotation.z = -Math.PI / 2;
    nose.position.set(0.42, 0.08, 0);
    nose.castShadow = true;
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.24), dark);
    eyes.position.set(0.18, 0.34, 0);
    group.add(body, head, nose, eyes);
    // base redonda que aparece sob o modelo 3D e mostra a cor do estado (alerta, rendido)
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, BASE_TOP * 2, 40), bodyMaterial);
    disc.castShadow = true;
    disc.visible = false;
    group.add(disc);

    const alertSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.bangTexture(), depthTest: false }));
    alertSprite.scale.set(0.6, 0.6, 1);
    alertSprite.position.y = 1.05;
    alertSprite.visible = false;
    alertSprite.renderOrder = 10;
    const flagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flagTexture(), depthTest: false }));
    flagSprite.scale.set(0.7, 0.7, 1);
    flagSprite.position.y = 1.0;
    flagSprite.visible = false;
    flagSprite.renderOrder = 10;
    group.add(alertSprite, flagSprite);
    this.scene.add(group);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    this.scene.add(shadow);

    const p = this.worldOf(enemy.start);
    group.position.set(p.x, 0.15, p.z);
    this.enemies.set(enemy.id, {
      id: enemy.id,
      hex: { ...enemy.start },
      group,
      shadow,
      hop: 0,
      epoch: 0,
      facing: enemy.facing,
      facingGoal: enemy.facing,
      alert: false,
      surrendered: false,
      bodyMaterial,
      alertSprite,
      flagSprite,
      presence: 1,
      gone: false,
      baseY: 0.15,
      signY: 1.05,
    });
    if (enemy.model) this.attachEnemyModel(this.enemies.get(enemy.id)!, enemy.model, [body, head, nose, eyes], disc);
  }

  /** Troca a peça do inimigo pelo personagem animado, de pé sobre uma base da cor do estado. */
  private async attachEnemyModel(
    e: EnemyView,
    def: ModelDef,
    piece: THREE.Object3D[],
    disc: THREE.Object3D,
  ): Promise<void> {
    const rig = await this.loadRig(e.id, def);
    if (!rig) return;
    // o grupo aponta +X para onde o inimigo olha; o modelo tem a frente em +Z
    rig.object.rotation.y = Math.PI / 2;
    rig.object.position.y = BASE_TOP;
    e.group.add(rig.object);
    for (const o of piece) o.visible = false;
    disc.visible = true;
    e.baseY = BASE_TOP;
    e.signY = BASE_TOP + def.height + 0.45;
    e.alertSprite.scale.set(0.9, 0.9, 1);
    e.flagSprite.scale.set(1, 1, 1);
    // a bandeira só aparece com o inimigo agachado, então fica mais baixa que o "!"
    e.flagSprite.position.y = BASE_TOP + def.height * 0.68 + 0.45;
    rig.play(e.surrendered ? 'crouch' : 'idle', 0);
    e.rig = rig;
  }

  private async loadRig(id: string, def: ModelDef): Promise<CharacterRig | null> {
    try {
      const rig = await CharacterRig.load(def);
      if (!this.disposed) return rig;
      rig.dispose();
    } catch (err) {
      console.warn(`Modelo de ${id} não carregou; mantendo a peça simples.`, err);
    }
    return null;
  }

  /** Bandeira branca (desenhada num canvas). */
  private flagTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    if (g) {
      g.lineJoin = 'round';
      g.strokeStyle = '#0b1d24';
      g.lineWidth = 10;
      // mastro
      g.beginPath();
      g.moveTo(34, 14);
      g.lineTo(34, 118);
      g.stroke();
      // pano ondulado
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(34, 16);
      g.bezierCurveTo(60, 4, 80, 30, 112, 18);
      g.lineTo(112, 66);
      g.bezierCurveTo(80, 78, 60, 52, 34, 64);
      g.closePath();
      g.fill();
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Balão amarelo com "!" (desenhado num canvas). */
  private bangTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = '#ffd23f';
      g.strokeStyle = '#0b1d24';
      g.lineWidth = 10;
      g.beginPath();
      g.arc(64, 64, 52, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#0b1d24';
      g.font = 'bold 84px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('!', 64, 70);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
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
      id: unit.id, hex: { ...unit.start }, group, shadow, hitbox, lift: 0, hop: 0, epoch: 0,
      pieceOnly: [dot, nub], yaw: 0,
    };
    this.units.set(unit.id, view);
    if (unit.model) this.attachModel(view, unit.model);
  }

  /** Troca o miolo da peça pelo personagem animado, que fica de pé sobre o disco. */
  private async attachModel(u: UnitView, def: ModelDef): Promise<void> {
    const rig = await this.loadRig(u.id, def);
    if (!rig) return;
    rig.object.position.y = BASE_TOP;
    u.group.add(rig.object);
    for (const o of u.pieceOnly) o.visible = false;
    // a área de toque passa a cobrir o corpo todo
    u.hitbox.scale.set(0.8, def.height / 0.6, 0.8);
    u.hitbox.position.y = def.height / 2;
    rig.play('idle', 0);
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
      const seen = this.vision.has(key);
      const reachColor = seen ? COLORS.visionReach : COLORS.reachable;
      const zone = this.approach?.surrender.has(key)
        ? COLORS.approachSurrender
        : this.approach?.flee.has(key)
          ? COLORS.approachFlee
          : null;
      tile.material.color.set(
        zone ?? (isSel ? COLORS.selected : onPath ? COLORS.path : isReach ? reachColor : seen ? COLORS.vision : tile.baseColor),
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

  private hopTo(u: Mover, h: HexCoord, duration = 260): Promise<void> {
    const from = u.group.position.clone();
    const to = this.worldOf(h);
    this.camGoal.copy(to);
    this.clampGoal();
    const start = performance.now();
    const epoch = u.epoch;
    return new Promise((resolve) => {
      const step = (now: number) => {
        if (u.epoch !== epoch) return resolve();
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

  /** Corre em linha reta até o hexágono, em velocidade constante (quem chama vira a peça). */
  private runTo(u: Mover, h: HexCoord, speed: number): Promise<void> {
    const from = u.group.position.clone();
    const to = this.worldOf(h);
    this.camGoal.copy(to);
    this.clampGoal();
    const duration = (Math.hypot(to.x - from.x, to.z - from.z) / speed) * 1000;
    const start = performance.now();
    const epoch = u.epoch;
    return new Promise((resolve) => {
      const step = (now: number) => {
        if (u.epoch !== epoch) return resolve();
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
    this.yaw += (this.yawGoal - this.yaw) * k;
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    // Em retrato a câmera recua para enxergar o mesmo número de colunas.
    const portrait = this.camera.aspect < 1 ? 1 / Math.max(this.camera.aspect, 0.45) : 1;
    const dist = 11.5 * this.zoom * Math.min(portrait, 2.3);
    const pitch = THREE.MathUtils.degToRad(55);
    const back = Math.cos(pitch) * dist;
    this.camera.position.set(
      this.camTarget.x + sy * back,
      this.camTarget.y + Math.sin(pitch) * dist,
      this.camTarget.z + cy * back,
    );
    // mira um pouco "abaixo" do jogador: ele fica acima do centro e o painel inferior não cobre o alcance
    const lead = this.camera.aspect < 1 ? 1.4 : 0.3;
    // "à frente" da câmera no chão é (-sin, -cos); o foco fica um pouco atrás do alvo
    this.camera.position.x += sy * lead;
    this.camera.position.z += cy * lead;
    this.camera.lookAt(this.camTarget.x + sy * lead, this.camTarget.y, this.camTarget.z + cy * lead);
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

    for (const e of this.enemies.values()) {
      e.rig?.update(dt);
      e.facing += angleDelta(e.facing, e.facingGoal) * (1 - Math.exp(-dt * 12));
      e.group.rotation.y = -e.facing;
      e.presence += ((e.gone ? 0 : 1) - e.presence) * (1 - Math.exp(-dt * 7));
      const visible = e.presence > 0.02;
      e.group.visible = e.shadow.visible = visible;
      // ao fugir, a peça encolhe e afunda
      e.group.scale.setScalar(Math.max(0.001, e.presence));
      const jitter = e.alert ? Math.abs(Math.sin(t * 9)) * 0.06 : 0;
      // rendido fica abaixado
      const crouch = e.surrendered && !e.rig ? -0.08 : 0;
      e.group.position.y = e.baseY + crouch + e.hop + jitter - (1 - e.presence) * 0.5;
      e.alertSprite.position.y = e.signY + Math.sin(t * 6) * 0.06;
      e.shadow.position.set(e.group.position.x, 0.01, e.group.position.z);
      e.shadow.scale.setScalar(Math.max(0.001, e.presence * (1 - e.hop * 0.6)));
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
      if (this.approach && (this.approach.surrender.has(key) || this.approach.flee.has(key))) {
        const g = 0.08 + Math.sin(t * 4) * 0.06;
        tile.material.emissive.setRGB(g, g * 0.8, g * 0.3);
      } else if (this.reachable.has(key)) {
        if (this.vision.has(key)) tile.material.emissive.setRGB(pulse, pulse * 0.4, pulse * 0.3);
        else tile.material.emissive.setRGB(pulse * 0.3, pulse * 0.6, pulse);
      }
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
      this.pinchAngle = this.currentPinchAngle();
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
      // girar os dois dedos gira o mapa junto
      const a = this.currentPinchAngle();
      this.yawGoal += angleDelta(this.pinchAngle, a);
      this.pinchAngle = a;
      return;
    }

    if (this.tapStart && Math.hypot(cur.x - this.tapStart.x, cur.y - this.tapStart.y) > 10) {
      this.dragged = true;
    }
    if (this.dragged) {
      // arrastar desloca a câmera (proporcional à distância atual)
      const h = this.canvas.clientHeight || 1;
      const scale = (22 * this.zoom) / h;
      const dx = (cur.x - prev.x) * scale;
      const dy = (cur.y - prev.y) * scale * 1.3;
      const sy = Math.sin(this.yawGoal);
      const cy = Math.cos(this.yawGoal);
      // direita da tela = (cos, -sin); "para cima" da tela = (-sin, -cos)
      this.camGoal.x += -dx * cy - dy * sy;
      this.camGoal.z += dx * sy - dy * cy;
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

  private currentPinchAngle(): number {
    const pts = [...this.pointers.values()];
    return pts.length < 2 ? 0 : Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
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
