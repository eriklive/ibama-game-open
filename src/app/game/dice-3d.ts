import * as THREE from 'three';

/**
 * Bandeja de dados 3D (d4) desenhada num canvas próprio, por cima do tabuleiro.
 *
 * Não há física de verdade: cada dado segue uma trajetória roteirizada (queda, quiques,
 * giro que desacelera) que termina exatamente na orientação do resultado já sorteado —
 * o vértice com o valor sorteado fica apontando para cima, como num d4 de mesa.
 */

const R = 1; // raio circunscrito do tetraedro
const TEX = 256;
// cantos do triângulo equilátero na textura (coordenadas do canvas, y para baixo)
const CORNERS: readonly [number, number][] = [
  [128, 22],
  [17, 214],
  [239, 214],
];
const INK = '#23201a';
const RED = '#b8231a';
const IVORY = '#f4ecd6';
const GOLD = new THREE.Color('#ffcf5a');

const VERTS = [
  new THREE.Vector3(1, 1, 1),
  new THREE.Vector3(-1, -1, 1),
  new THREE.Vector3(-1, 1, -1),
  new THREE.Vector3(1, -1, -1),
].map((v) => v.normalize().multiplyScalar(R));

/** Faces externas (sentido anti-horário visto de fora); a face i não contém o vértice i. */
const FACES: [number, number, number][] = [0, 1, 2, 3].map((skip) => {
  const [a, b, c] = [0, 1, 2, 3].filter((i) => i !== skip);
  const n = new THREE.Vector3()
    .subVectors(VERTS[b], VERTS[a])
    .cross(new THREE.Vector3().subVectors(VERTS[c], VERTS[a]));
  return n.dot(VERTS[a]) > 0 ? [a, b, c] : [a, c, b];
});

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

/** Altura do quique (sem o apoio) ao longo do lance normalizado t ∈ [0, 1]. */
const BOUNCES = [
  { from: 0, to: 0.3, h: 3.4, fall: true },
  { from: 0.3, to: 0.52, h: 1.0 },
  { from: 0.52, to: 0.66, h: 0.32 },
  { from: 0.66, to: 0.74, h: 0.08 },
];
const bounceHeight = (t: number): number => {
  for (const b of BOUNCES) {
    if (t < b.from || t >= b.to) continue;
    const u = (t - b.from) / (b.to - b.from);
    return b.fall ? b.h * (1 - u * u) : 4 * b.h * u * (1 - u);
  }
  return 0;
};

interface FaceTexture {
  texture: THREE.CanvasTexture;
  /** Redesenha destacando (ou não) o número sorteado. */
  draw(highlight?: number): void;
}

function faceTexture(numbers: readonly number[]): FaceTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEX;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const draw = (highlight?: number) => {
    const g = canvas.getContext('2d')!;
    g.fillStyle = IVORY;
    g.fillRect(0, 0, TEX, TEX);
    // filete interno: dá a impressão de quina chanfrada
    const center = CORNERS.reduce(([x, y], [cx, cy]) => [x + cx / 3, y + cy / 3], [0, 0]);
    g.beginPath();
    CORNERS.forEach(([x, y], i) => {
      const px = x + (center[0] - x) * 0.08;
      const py = y + (center[1] - y) * 0.08;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    });
    g.closePath();
    g.strokeStyle = 'rgba(35, 32, 26, .22)';
    g.lineWidth = 5;
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `700 64px "Stardos Stencil", "Arial Black", sans-serif`;
    CORNERS.forEach(([x, y], i) => {
      const px = x + (center[0] - x) * 0.4;
      const py = y + (center[1] - y) * 0.4;
      g.save();
      g.translate(px, py);
      // o "topo" do número aponta para o seu vértice
      g.rotate(Math.atan2(x - center[0], -(y - center[1])));
      const hit = numbers[i] === highlight;
      g.fillStyle = hit ? RED : INK;
      g.shadowColor = hit ? 'rgba(255, 170, 40, .9)' : 'transparent';
      g.shadowBlur = hit ? 14 : 0;
      g.fillText(String(numbers[i]), 0, 4);
      g.restore();
    });
    texture.needsUpdate = true;
  };
  draw();
  return { texture, draw };
}

function d4Geometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const geo = new THREE.BufferGeometry();
  FACES.forEach((face, f) => {
    face.forEach((vi, k) => {
      pos.push(VERTS[vi].x, VERTS[vi].y, VERTS[vi].z);
      uv.push(CORNERS[k][0] / TEX, 1 - CORNERS[k][1] / TEX);
    });
    geo.addGroup(f * 3, 3, f);
  });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

function glowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 214, 110, 1)');
  grad.addColorStop(0.45, 'rgba(255, 190, 70, .35)');
  grad.addColorStop(1, 'rgba(255, 180, 60, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Throw {
  value: number;
  faces: FaceTexture[];
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  materials: THREE.MeshStandardMaterial[];
  from: THREE.Vector3;
  to: THREE.Vector3;
  final: THREE.Quaternion;
  axis: THREE.Vector3;
  spin: number;
  delay: number;
}

export interface DiceTrayOptions {
  /** Sem animação: os dados aparecem já parados no resultado. */
  instant?: boolean;
}

export class DiceTray {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  private readonly geometry = d4Geometry();
  private readonly glowMap = glowTexture();
  private readonly resize: ResizeObserver;
  private throws: Throw[] = [];
  private frame = 0;
  /** Relógio do lance: avança no máximo 1/30 s por quadro, para engasgos não pularem a animação. */
  private clock = 0;
  private lastFrame = 0;
  private duration = 1500;
  private settleAt = 0;
  private done?: () => void;
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpQ = new THREE.Quaternion();

  /** Lança um erro se o WebGL não estiver disponível (quem chama cai no desenho 2D). */
  constructor(private readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    host.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 10, 7.6);
    this.camera.lookAt(0, 0, 0.3);

    this.scene.add(new THREE.HemisphereLight('#fff6e0', '#2c3a24', 0.85));
    const key = new THREE.DirectionalLight('#fff1d0', 2.6);
    key.position.set(-3, 9, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 6;
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 });
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#ffd27a', 0.8);
    rim.position.set(4, 3, -5);
    this.scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.45 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(host);
    this.fit();
  }

  /** Joga os dados; a promessa resolve quando todos param (com o resultado para cima). */
  roll(values: readonly number[], opts: DiceTrayOptions = {}): Promise<void> {
    this.clearDice();
    const n = values.length;
    const spacing = 2.3;
    this.throws = values.map((value, i) => {
      // numeração clássica: o vértice i vale i + 1 e aparece nas três faces que o tocam
      const faces = FACES.map((face) => faceTexture(face.map((v) => v + 1)));
      const materials = faces.map(
        ({ texture: map }) =>
          new THREE.MeshStandardMaterial({
            map,
            roughness: 0.42,
            metalness: 0.05,
            emissive: GOLD,
            emissiveIntensity: 0,
          }),
      );
      const mesh = new THREE.Mesh(this.geometry, materials);
      mesh.castShadow = true;
      this.scene.add(mesh);

      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 3.4),
        new THREE.MeshBasicMaterial({
          map: this.glowMap,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.01;
      this.scene.add(glow);

      const to = new THREE.Vector3(
        (i - (n - 1) / 2) * spacing,
        0,
        0.2 + (Math.random() - 0.5) * 0.5,
      );
      const from = new THREE.Vector3(
        to.x * 0.3 + (Math.random() - 0.5) * 2,
        0,
        5.5 + Math.random(),
      );
      // vértice sorteado para cima, com um giro aleatório em volta do eixo vertical
      const up = VERTS[(value - 1) % VERTS.length].clone().normalize();
      const final = new THREE.Quaternion()
        .setFromUnitVectors(up, new THREE.Vector3(0, 1, 0))
        .premultiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            Math.random() * Math.PI * 2,
          ),
        );
      const axis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      glow.position.x = to.x;
      glow.position.z = to.z;
      return {
        value,
        faces,
        mesh,
        glow,
        materials,
        from,
        to,
        final,
        axis,
        spin: Math.PI * (5 + Math.random() * 2),
        delay: i * 0.08,
      };
    });

    // a fonte do jogo pode chegar depois: redesenha quando estiver pronta
    const thrown = this.throws;
    document.fonts?.ready
      .then(() =>
        thrown.forEach((t) => t.faces.forEach((f) => f.draw(this.settleAt ? t.value : undefined))),
      )
      .catch(() => undefined);

    this.duration = opts.instant ? 0 : 1500;
    this.clock = 0;
    this.lastFrame = performance.now();
    this.settleAt = 0;
    cancelAnimationFrame(this.frame);
    return new Promise((resolve) => {
      this.done = resolve;
      this.tick();
    });
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    this.clearDice();
    this.geometry.dispose();
    this.glowMap.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private clearDice(): void {
    for (const t of this.throws) {
      this.scene.remove(t.mesh, t.glow);
      t.materials.forEach((m) => m.dispose());
      t.faces.forEach((f) => f.texture.dispose());
      t.glow.geometry.dispose();
      (t.glow.material as THREE.Material).dispose();
    }
    this.throws = [];
  }

  private readonly tick = (): void => {
    const now = performance.now();
    this.clock += Math.min((now - this.lastFrame) / 1000, 1 / 30);
    this.lastFrame = now;
    const elapsed = this.clock;
    let settled = true;
    for (const t of this.throws) {
      const span = this.duration / 1000;
      const p = span ? clamp01((elapsed - t.delay) / span) : 1;
      if (p < 1) settled = false;
      this.pose(t, p);
    }
    if (settled && !this.settleAt) {
      this.settleAt = now;
      this.throws.forEach((t) => t.faces.forEach((f) => f.draw(t.value)));
      this.done?.();
      this.done = undefined;
    }
    // brilho dourado ao parar: acende, pulsa e assenta
    const g = this.settleAt ? (now - this.settleAt) / 1000 : -1;
    for (const t of this.throws) {
      const pulse = g < 0 ? 0 : g < 0.25 ? g / 0.25 : 0.55 + 0.45 * Math.exp(-(g - 0.25) * 3);
      t.materials.forEach((m) => (m.emissiveIntensity = 0.28 * pulse));
      (t.glow.material as THREE.MeshBasicMaterial).opacity = 0.9 * pulse;
    }
    this.renderer.render(this.scene, this.camera);
    if (!this.settleAt || g < 2) this.frame = requestAnimationFrame(this.tick);
  };

  private pose(t: Throw, p: number): void {
    const { mesh } = t;
    const spin = t.spin * (1 - easeOutCubic(clamp01(p / 0.9)));
    mesh.quaternion.copy(t.final).multiply(this.tmpQ.setFromAxisAngle(t.axis, spin));
    // apoia o vértice mais baixo no chão: o dado nunca atravessa a mesa
    let minY = Infinity;
    for (const v of VERTS)
      minY = Math.min(minY, this.tmpV.copy(v).applyQuaternion(mesh.quaternion).y);
    const travel = 1 - (1 - clamp01(p / 0.8)) ** 2;
    mesh.position.lerpVectors(t.from, t.to, travel);
    mesh.position.y = bounceHeight(p) - minY;
  }

  private fit(): void {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // telas em retrato: afasta a câmera para os dados caberem na largura
    this.camera.zoom = Math.min(1, (w / h) * 1.5);
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }
}
