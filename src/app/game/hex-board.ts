import * as THREE from 'three';
import { GameMap } from './maps';
import { HexCoord, hexKey, hexLine, hexToWorld, hexesInRange, sameHex } from './hex';

const HEX_SIZE = 1;
const HEX_HEIGHT = 0.35;
const HEX_GAP = 0.94; // raio visível em relação ao espaçamento → deixa uma fresta entre os hexágonos

const COLORS = {
  background: 0x123039,
  outline: 0x0b1d24,
  hexA: 0x2f78c4,
  hexB: 0x2a6db3,
  hexC: 0x3482cf,
  reachable: 0xa9e4ff,
  selected: 0xffd23f,
  playerBody: 0x2f6b3f,
  playerRing: 0xffd23f,
};

interface HexTile {
  coord: HexCoord;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
}

export interface HexBoardCallbacks {
  /** Chamado quando o jogador toca num hexágono válido (ou limpa a seleção com `null`). */
  onSelect(hex: HexCoord | null): void;
}

/**
 * Cena 3D do tabuleiro: hexágonos em prisma, câmera em perspectiva inclinada
 * (vista "de cima e de trás", como nos tabuleiros de For the King), um
 * jogador flutuante e entrada por toque/mouse (tocar seleciona, arrastar move
 * a câmera, pinça ou roda do mouse aproxima).
 */
export class HexBoard {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  private readonly raycaster = new THREE.Raycaster();
  private readonly tiles = new Map<string, HexTile>();
  private readonly pickables: THREE.Object3D[] = [];
  private readonly player = new THREE.Group();
  private readonly playerShadow: THREE.Mesh;
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private frameId = 0;

  private playerHex: HexCoord;
  private reachable = new Set<string>();
  private selected: HexCoord | null = null;
  private moving = false;
  private inputEnabled = true;

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
    private readonly range: number,
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
    this.playerShadow = this.buildPlayer();

    this.playerHex = { ...map.start };
    this.placePlayer(this.playerHex);
    this.camTarget.copy(this.worldOf(this.playerHex));
    this.camGoal.copy(this.camTarget);
    this.refreshReachable();

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

  clearSelection(): void {
    this.select(null);
  }

  /** Move o jogador até o hexágono selecionado. Resolve quando a animação termina. */
  async confirmMove(): Promise<HexCoord | null> {
    const target = this.selected;
    if (!target || this.moving) return null;
    this.moving = true;
    this.select(null, false);
    this.reachable.clear();
    this.paintTiles();

    const path = hexLine(this.playerHex, target).slice(1);
    for (const step of path) {
      await this.hopTo(step);
      this.playerHex = step;
    }
    this.moving = false;
    this.refreshReachable();
    return this.playerHex;
  }

  /** Volta o jogador ao início do mapa. */
  reset(): void {
    this.playerHex = { ...this.map.start };
    this.placePlayer(this.playerHex);
    this.camGoal.copy(this.worldOf(this.playerHex));
    this.select(null, false);
    this.refreshReachable();
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId);
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
        this.tiles.set(hexKey(coord), { coord, mesh, material, baseColor });
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

  private buildPlayer(): THREE.Mesh {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.14, 40),
      new THREE.MeshStandardMaterial({ color: COLORS.playerBody, roughness: 0.5 }),
    );
    disc.castShadow = true;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.07, 12, 40),
      new THREE.MeshStandardMaterial({ color: COLORS.playerRing, roughness: 0.4 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.16, 24),
      new THREE.MeshStandardMaterial({ color: COLORS.playerRing, roughness: 0.4 }),
    );
    this.player.add(disc, ring, dot);
    this.scene.add(this.player);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    this.scene.add(shadow);
    return shadow;
  }

  // ---------- estado / pintura ----------

  private refreshReachable(): void {
    this.reachable = new Set(
      hexesInRange(this.playerHex, this.range, this.map.cols, this.map.rows).map(hexKey),
    );
    this.paintTiles();
  }

  private select(hex: HexCoord | null, notify = true): void {
    this.selected = hex;
    this.paintTiles();
    if (notify) this.callbacks.onSelect(hex);
  }

  private paintTiles(): void {
    for (const [key, tile] of this.tiles) {
      const isSel = sameHex(tile.coord, this.selected);
      const isReach = this.reachable.has(key);
      tile.material.color.set(isSel ? COLORS.selected : isReach ? COLORS.reachable : tile.baseColor);
      tile.material.emissive.set(isSel ? 0x6b5200 : 0x000000);
      tile.mesh.position.y = isSel ? 0.12 : 0;
    }
  }

  // ---------- jogador ----------

  private worldOf(h: HexCoord): THREE.Vector3 {
    const p = hexToWorld(h, HEX_SIZE);
    return new THREE.Vector3(p.x, 0, p.z);
  }

  private placePlayer(h: HexCoord): void {
    const p = this.worldOf(h);
    this.player.position.set(p.x, 0, p.z);
    this.playerShadow.position.set(p.x, 0.01, p.z);
  }

  private hopTo(h: HexCoord): Promise<void> {
    const from = this.player.position.clone();
    const to = this.worldOf(h);
    this.camGoal.copy(to);
    const duration = 320;
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        this.player.position.x = from.x + (to.x - from.x) * e;
        this.player.position.z = from.z + (to.z - from.z) * e;
        this.player.userData['hop'] = Math.sin(Math.PI * t) * 0.6;
        this.playerShadow.position.set(this.player.position.x, 0.01, this.player.position.z);
        if (t < 1) requestAnimationFrame(step);
        else {
          this.player.userData['hop'] = 0;
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
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
    const hop = (this.player.userData['hop'] as number | undefined) ?? 0;
    this.player.position.y = 0.75 + bob + hop;
    this.player.rotation.y += dt * 0.8;
    const s = 1 - (bob + hop) * 0.6;
    this.playerShadow.scale.setScalar(s);

    // pulso suave nos hexágonos alcançáveis
    const pulse = 0.12 + Math.sin(t * 3) * 0.08;
    for (const [key, tile] of this.tiles) {
      if (this.reachable.has(key) && !sameHex(tile.coord, this.selected)) {
        tile.material.emissive.setRGB(pulse * 0.3, pulse * 0.6, pulse);
      }
    }

    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  };

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
    const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
    const hex = hit?.object.userData['hex'] as HexCoord | undefined;
    if (hex && this.reachable.has(hexKey(hex))) this.select(hex);
    else this.select(null);
  }
}
