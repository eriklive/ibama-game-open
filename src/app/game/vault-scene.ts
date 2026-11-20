import * as THREE from 'three';
import { CharacterRig, ModelDef } from './character-model';
import { MOVING_SHADOW_LAYER } from './static-shadow';
import { SPOTLIGHT_LAYER } from './spotlight';

/** O que o jogador escolhe no caixote de meia altura da perseguição. */
export type VaultPick = 'pular' | 'volta';

/** Pontos da cena, no mundo, com `y` no topo do hexágono (ver `HexBoard.showVaultChoice`). */
export interface VaultSceneSetup {
  /** Onde o agente está (pés). */
  agent: THREE.Vector3;
  /** Onde o garimpeiro está, parado na pose de corrida. */
  enemy: THREE.Vector3;
  /** Centro do hexágono do caixote. */
  crate: THREE.Vector3;
  /** Modelo da carga no hexágono do caixote: fica com cor e responde ao toque. */
  crateModel?: THREE.Object3D;
  /** A volta: a pista dele, da posição do agente até onde o atalho volta (com a origem). */
  around: THREE.Vector3[];
  /** O atalho: da posição do agente, por cima do caixote, de volta à pista (com a origem). */
  jump: THREE.Vector3[];
  /** Modelo do agente, para o fantasma. */
  model?: ModelDef;
}

/**
 * Números da cena de escolha no caixote. A câmera abre para enquadrar o agente, o caixote e a
 * pista dele; na prévia, fecha 3/4 de lado para ver o fantasma.
 */
const VAULT_SCENE = {
  /** Inclinação da câmera aberta (graus acima do horizonte). */
  widePitch: 56,
  /** Folga em volta do que precisa caber no quadro aberto. */
  widePad: 1.8,
  /** Inclinação e giro (graus) da câmera na prévia, e quanto ela fica da cena (fração da aberta). */
  closePitch: 38,
  closeTurn: 32,
  closeDist: 0.62,
  /** Velocidade do fantasma (unidades/s) e altura do arco por cima do caixote. */
  ghostSpeed: 5.2,
  ghostHop: 1.0,
  /** Segundos para o fantasma virar para o garimpeiro no fim. */
  ghostTurn: 0.45,
  /** Largura da faixa da volta e comprimento de cada seta dela. */
  ribbonWidth: 0.85,
  chevron: 0.95,
  /** Altura das etiquetas na tela (fração da altura, em paisagem). */
  chipSize: 0.075,
} as const;

const YELLOW = 0xffcf3a;
const INK = '#23201a';

/** Faixa amarela com setas (a textura repete ao longo da faixa e corre para a frente). */
function chevronTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = 'rgba(255,207,58,0.18)';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffcf3a';
    g.fillRect(0, 0, 128, 9);
    g.fillRect(0, 119, 128, 9);
    const chev = () => {
      g.beginPath();
      g.moveTo(44, 30);
      g.lineTo(84, 64);
      g.lineTo(44, 98);
      g.stroke();
    };
    g.lineCap = g.lineJoin = 'round';
    g.strokeStyle = 'rgba(35,32,26,0.55)';
    g.lineWidth = 26;
    chev();
    g.strokeStyle = '#ffcf3a';
    g.lineWidth = 16;
    chev();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Etiqueta de post-it (título em estêncil, linha datilografada embaixo), do tamanho fixo na tela. */
function chipSprite(title: string, sub: string): THREE.Sprite {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const titleFont = 'bold 46px "Stardos Stencil", "Arial Black", sans-serif';
  const subFont = '24px "Special Elite", "Courier New", monospace';
  const pad = 22;
  const tip = 16;
  let w = 260;
  if (g) {
    g.font = titleFont;
    const tw = g.measureText(title.toUpperCase()).width;
    g.font = subFont;
    w = Math.ceil(Math.max(tw, g.measureText(sub).width)) + pad * 2;
  }
  const h = 96;
  c.width = w + 8;
  c.height = h + tip + 8;
  if (g) {
    // sombra dura, como a papelada da tela
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(6, 6, w, h);
    g.fillStyle = '#f7e36a';
    g.strokeStyle = INK;
    g.lineWidth = 4;
    g.beginPath();
    g.rect(2, 2, w - 4, h - 4);
    g.fill();
    g.stroke();
    g.fillStyle = INK;
    g.beginPath();
    g.moveTo(w / 2 - tip, h - 2);
    g.lineTo(w / 2, h + tip);
    g.lineTo(w / 2 + tip, h - 2);
    g.fill();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = titleFont;
    g.fillText(title.toUpperCase(), w / 2, 38);
    g.font = subFont;
    g.fillText(sub, w / 2, 74);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, sizeAttenuation: false }));
  sprite.userData['aspect'] = c.width / c.height;
  sprite.center.set(0.5, 0);
  sprite.renderOrder = 10;
  return sprite;
}

/** Polilinha percorrida em velocidade constante (o fantasma). */
class Polyline {
  readonly length: number;
  private readonly cum: number[] = [0];
  constructor(readonly points: readonly THREE.Vector3[]) {
    for (let i = 1; i < points.length; i++) this.cum.push(this.cum[i - 1] + points[i].distanceTo(points[i - 1]));
    this.length = this.cum.at(-1) ?? 0;
  }
  /** Distância percorrida até o ponto `i`. */
  at(i: number): number {
    return this.cum[Math.max(0, Math.min(i, this.cum.length - 1))];
  }
  sample(s: number): { pos: THREE.Vector3; dir: THREE.Vector3 } {
    const pts = this.points;
    if (pts.length < 2) return { pos: (pts[0] ?? new THREE.Vector3()).clone(), dir: new THREE.Vector3(0, 0, 1) };
    let i = 1;
    while (i < pts.length - 1 && this.cum[i] < s) i++;
    const a = pts[i - 1];
    const b = pts[i];
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    const u = THREE.MathUtils.clamp((s - this.cum[i - 1]) / seg, 0, 1);
    return { pos: a.clone().lerp(b, u), dir: b.clone().sub(a).setY(0).normalize() };
  }
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const yawOf = (d: THREE.Vector3) => Math.atan2(d.x, d.z);
const turnTo = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

/**
 * Escolha de ação no caixote de meia altura (perseguição): o quadro fica cinza (o destaque do
 * tabuleiro, ver `Spotlight`), menos o caixote e a faixa da volta, que levam etiquetas tocáveis
 * ("Pular" e "Dar a volta"). Escolhida uma, a câmera fecha e um fantasma do agente faz a ação em
 * tempo real, com o mundo parado: pula por cima do caixote ou corre a volta, e no fim vira para o
 * garimpeiro.
 *
 * Só desenha e anima: o tabuleiro liga o cinza, mistura a câmera (`cameraGoal`) e repassa os
 * toques (`pick`); a tela decide o que vem depois.
 */
export class VaultScene {
  private readonly root = new THREE.Group();
  /** Etiquetas: desenhadas por cima do destaque (cena de etiquetas do tabuleiro). */
  readonly labels = new THREE.Group();
  private readonly chevron = chevronTexture();
  private readonly pathMat = new THREE.MeshBasicMaterial({
    map: this.chevron,
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    opacity: 0,
    fog: false,
  });
  private readonly dotMat = new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0, depthWrite: false, fog: false });
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false });
  private readonly ghostMat = new THREE.MeshStandardMaterial({
    color: 0x9fe9ff,
    emissive: 0x3fb8ff,
    emissiveIntensity: 1,
    roughness: 0.35,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private readonly hitMat = new THREE.MeshBasicMaterial({ visible: false });
  private setup: VaultSceneSetup | null = null;
  private stage: 'off' | 'choice' | 'preview' = 'off';
  private pickNow: VaultPick | null = null;
  /** 0..1: entrada do destaque (faixa, arco, anel, etiquetas). */
  private shown = 0;
  private ribbon?: THREE.Mesh;
  private ribbonHit?: THREE.Mesh;
  private arc?: THREE.Group;
  private ring?: THREE.Mesh;
  private chips: { pular?: THREE.Sprite; volta?: THREE.Sprite } = {};
  private litCrate: THREE.Object3D[] = [];
  private ghostRig?: CharacterRig;
  private ghostModel?: string;
  private readonly ghost = new THREE.Group();
  private ghostAlpha = 0;
  private run: { line: Polyline; hop?: [number, number]; t: number; done?: () => void; endYaw?: number; turnAt?: number } | null = null;
  private wide = { pos: new THREE.Vector3(), look: new THREE.Vector3(), dist: 10 };
  private close = { pos: new THREE.Vector3(), look: new THREE.Vector3(), dist: 6 };
  private disposed = false;

  constructor(private readonly scene: THREE.Scene) {
    this.scene.add(this.root);
    this.ghost.visible = false;
    this.root.add(this.ghost);
  }

  /** A cena está na tela (ou saindo). */
  get active(): boolean {
    return this.stage !== 'off' || this.shown > 0.01 || this.ghostAlpha > 0.01;
  }

  /** Esperando o toque no caixote ou na faixa. */
  get choosing(): boolean {
    return this.stage === 'choice';
  }

  /** Abre a escolha: monta a faixa, o arco e as etiquetas, e acende o caixote. */
  show(setup: VaultSceneSetup): void {
    this.clear();
    this.setup = setup;
    this.stage = 'choice';
    this.pickNow = null;
    const lift = (p: THREE.Vector3, y: number) => p.clone().setY(p.y + y);

    // faixa da volta (caminho dele), com as pontas esmaecidas
    if (setup.around.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(setup.around.map((p) => lift(p, 0.04)), false, 'centripetal');
      this.ribbon = this.buildRibbon(curve, VAULT_SCENE.ribbonWidth, this.pathMat);
      this.ribbon.renderOrder = 3;
      this.ribbonHit = this.buildRibbon(curve, 1.8, this.hitMat);
      this.root.add(this.ribbon, this.ribbonHit);
    }
    // arco pontilhado do pulo
    this.arc = this.buildArc(setup);
    this.root.add(this.arc);
    // anel hexagonal pulsando debaixo do caixote
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.92, 6), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.copy(lift(setup.crate, 0.03));
    this.root.add(this.ring);
    for (const o of [this.ribbon, this.arc, this.ring]) o?.traverse((m) => m.layers.enable(SPOTLIGHT_LAYER));
    // o caixote em cor
    setup.crateModel?.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh || o.layers.isEnabled(SPOTLIGHT_LAYER)) return;
      o.layers.enable(SPOTLIGHT_LAYER);
      this.litCrate.push(o);
    });

    // etiquetas: em cima do caixote e na "barriga" da volta (o ponto mais longe do atalho)
    this.chips.pular = chipSprite('Pular', 'corta caminho · teste');
    this.chips.pular.position.copy(lift(setup.crate, 1.55));
    this.chips.volta = chipSprite('Dar a volta', 'sem teste');
    this.chips.volta.position.copy(lift(this.bulge(setup), 0.45));
    this.labels.add(this.chips.pular, this.chips.volta);

    this.frame(setup);
    void this.loadGhost(setup.model);
  }

  /** Toque no caixote (ou na etiqueta dele) ou na faixa da volta. */
  pick(raycaster: THREE.Raycaster): VaultPick | null {
    if (this.stage !== 'choice') return null;
    const chip = raycaster.intersectObjects([this.chips.pular, this.chips.volta].filter((s): s is THREE.Sprite => !!s), false)[0];
    if (chip) return chip.object === this.chips.pular ? 'pular' : 'volta';
    const crate = this.setup?.crateModel ? raycaster.intersectObject(this.setup.crateModel, true)[0] : undefined;
    const path = this.ribbonHit ? raycaster.intersectObject(this.ribbonHit, false)[0] : undefined;
    if (crate && (!path || crate.distance <= path.distance)) return 'pular';
    if (path) return 'volta';
    // o caixote é pequeno: tocar no anel debaixo dele também vale
    const ring = this.ring ? raycaster.intersectObject(this.ring, false)[0] : undefined;
    return ring ? 'pular' : null;
  }

  /** Prévia: a câmera fecha e o fantasma faz a ação. Resolve quando ele termina (já virado para ele). */
  preview(pick: VaultPick): Promise<void> {
    const s = this.setup;
    if (!s) return Promise.resolve();
    this.stage = 'preview';
    this.pickNow = pick;
    const pts = this.ghostPath(pick === 'pular' ? s.jump : s.around, s.enemy);
    const line = new Polyline(pts.length ? pts : [s.agent]);
    // no pulo, o arco vai do hexágono antes do caixote ao de depois
    let hop: [number, number] | undefined;
    if (pick === 'pular') {
      const k = pts.findIndex((p) => Math.abs(p.x - s.crate.x) < 1e-3 && Math.abs(p.z - s.crate.z) < 1e-3);
      if (k > 0) hop = [line.at(k - 1), line.at(k + 1)];
    }
    this.ghost.position.copy(s.agent);
    this.ghost.rotation.y = yawOf(line.sample(0).dir);
    this.ghost.visible = true;
    this.ghostRig?.play('run', 0);
    this.ghostRig?.matchSpeed('run', VAULT_SCENE.ghostSpeed);
    return new Promise((done) => {
      this.run = { line, hop, t: 0, done };
    });
  }

  /** Volta para a escolha (o fantasma some). */
  back(): void {
    if (!this.setup) return;
    this.run?.done?.();
    this.run = null;
    this.stage = 'choice';
    this.pickNow = null;
  }

  /** Fecha a cena: a cor volta e as peças da cena somem com um fade. */
  hide(): void {
    this.run?.done?.();
    this.run = null;
    this.stage = 'off';
    this.pickNow = null;
  }

  /**
   * Para onde a câmera vai: aberta na escolha, de perto na prévia. `null` com a cena fechada.
   * `dist` é a distância até o ponto olhado (a névoa acompanha).
   */
  cameraGoal(): { pos: THREE.Vector3; look: THREE.Vector3; dist: number } | null {
    if (this.stage === 'off') return null;
    return this.stage === 'preview' ? this.close : this.wide;
  }

  /** Reenquadra (a tela mudou de tamanho ou de FOV). */
  refit(camera: THREE.PerspectiveCamera): void {
    if (this.setup) this.frame(this.setup, camera);
  }

  update(dt: number, t: number, camera: THREE.PerspectiveCamera): void {
    const on = this.stage !== 'off';
    this.shown += ((on ? 1 : 0) - this.shown) * (1 - Math.exp(-dt * 4));
    const ghostOn = this.stage === 'preview' && !!this.ghostRig;
    this.ghostAlpha += ((ghostOn ? 1 : 0) - this.ghostAlpha) * (1 - Math.exp(-dt * 7));
    if (!on && this.shown < 0.01 && this.ghostAlpha < 0.01 && this.setup) this.clear();
    if (this.setup) this.frame(this.setup, camera);

    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    // na prévia, o que não é a escolha esmaece
    const pathDim = this.pickNow === 'pular' ? 0.3 : 1;
    const arcDim = this.pickNow === 'volta' ? 0.25 : 1;
    this.pathMat.opacity = this.shown * 0.95 * pathDim;
    this.dotMat.opacity = this.shown * 0.9 * arcDim;
    this.ringMat.opacity = this.shown * (0.45 + 0.4 * pulse) * arcDim;
    this.ring?.scale.setScalar(1 + 0.05 * pulse);
    this.chevron.offset.x -= dt * 1.1;
    this.arc?.children.forEach((d, i) => {
      if (d.userData['dot']) d.scale.setScalar(1 + 0.6 * Math.max(0, Math.sin(t * 6 - i * 0.5)));
    });
    // tamanho fixo na tela (fração da altura); em retrato encolhe para as duas caberem lado a lado
    const size = VAULT_SCENE.chipSize * Math.min(1, camera.aspect * 1.3);
    for (const chip of [this.chips.pular, this.chips.volta]) {
      if (!chip) continue;
      chip.visible = this.stage === 'choice';
      chip.material.opacity = this.shown;
      chip.scale.set(size * chip.userData['aspect'], size, 1);
    }

    this.ghostMat.opacity = 0.55 * this.ghostAlpha;
    this.ghostMat.emissiveIntensity = 0.9 + 0.3 * pulse;
    this.ghost.visible = this.ghostAlpha > 0.01;
    this.stepGhost(dt);
    this.ghostRig?.update(dt);
  }

  dispose(): void {
    this.disposed = true;
    this.clear();
    this.scene.remove(this.root);
    this.ghostRig?.dispose();
    for (const m of [this.pathMat, this.dotMat, this.ringMat, this.ghostMat, this.hitMat]) m.dispose();
    this.chevron.dispose();
  }

  // ---------- por dentro ----------

  private stepGhost(dt: number): void {
    const r = this.run;
    const s = this.setup;
    if (!r || !s) return;
    r.t += dt;
    const rig = this.ghostRig;
    const travel = r.t * VAULT_SCENE.ghostSpeed;
    if (travel < r.line.length) {
      const { pos, dir } = r.line.sample(travel);
      let hop = 0;
      let tuck = 0;
      if (r.hop) {
        const u = (travel - r.hop[0]) / (r.hop[1] - r.hop[0] || 1);
        if (u > 0 && u < 1) {
          tuck = Math.sin(Math.PI * u);
          hop = VAULT_SCENE.ghostHop * tuck;
        }
      }
      this.ghost.position.copy(pos).setY(pos.y + hop);
      if (dir.lengthSq() > 0) this.ghost.rotation.y = turnTo(this.ghost.rotation.y, yawOf(dir), 1 - Math.exp(-dt * 14));
      if (rig) {
        rig.pose.thigh = -0.7 * tuck;
        rig.pose.calf = 1.6 * tuck;
        rig.pose.thighL = -1.1 * tuck;
        rig.pose.calfL = 1.4 * tuck;
        rig.pose.spine = 0.35 * tuck;
        rig.matchSpeed('run', VAULT_SCENE.ghostSpeed * (1 - 0.6 * tuck));
      }
      return;
    }
    // chegou: para e vira para o garimpeiro
    if (r.turnAt === undefined) {
      r.turnAt = r.t;
      const end = r.line.points.at(-1) ?? s.agent;
      this.ghost.position.copy(end);
      const d = s.enemy.clone().sub(end).setY(0);
      r.endYaw = d.lengthSq() > 0.01 ? yawOf(d) : this.ghost.rotation.y;
      rig?.play('idle', 0.25);
      if (rig) rig.pose.thigh = rig.pose.calf = rig.pose.thighL = rig.pose.calfL = rig.pose.spine = 0;
    }
    const u = Math.min(1, (r.t - r.turnAt) / VAULT_SCENE.ghostTurn);
    this.ghost.rotation.y = turnTo(this.ghost.rotation.y, r.endYaw ?? 0, smooth(u));
    if (u >= 1 && r.done) {
      const done = r.done;
      r.done = undefined;
      done();
    }
  }

  /** O caminho do fantasma, sem passar por cima do garimpeiro: para no hexágono antes dele. */
  private ghostPath(points: readonly THREE.Vector3[], enemy: THREE.Vector3): THREE.Vector3[] {
    const at = points.findIndex((p, i) => i > 0 && Math.hypot(p.x - enemy.x, p.z - enemy.z) < 0.5);
    return at > 0 ? points.slice(0, at) : [...points];
  }

  private async loadGhost(model?: ModelDef): Promise<void> {
    if (!model || this.ghostModel === model.url) return;
    this.ghostModel = model.url;
    try {
      const rig = await CharacterRig.load(model);
      if (this.disposed) return rig.dispose();
      rig.object.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.material = this.ghostMat;
        mesh.castShadow = false;
        mesh.layers.disable(MOVING_SHADOW_LAYER);
        mesh.layers.enable(SPOTLIGHT_LAYER);
        mesh.renderOrder = 6;
      });
      this.ghostRig?.dispose();
      this.ghost.clear();
      this.ghost.add(rig.object);
      this.ghostRig = rig;
      rig.play('idle', 0);
    } catch (err) {
      this.ghostModel = undefined;
      console.warn('Fantasma do agente não carregou.', err);
    }
  }

  /** Enquadramentos aberto e de perto, a partir dos pontos da cena. */
  private frame(s: VaultSceneSetup, camera?: THREE.PerspectiveCamera): void {
    const pts = [s.agent, s.enemy, s.crate, ...s.around, ...s.jump];
    const box = new THREE.Box3().setFromPoints(pts);
    const center = box.getCenter(new THREE.Vector3()).setY(0.4);
    let r = 0;
    for (const p of pts) r = Math.max(r, Math.hypot(p.x - center.x, p.z - center.z));
    r += VAULT_SCENE.widePad;
    // de trás do agente, olhando para o caixote
    const fwd = s.crate.clone().sub(s.agent).setY(0);
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
    fwd.normalize();
    const fov = THREE.MathUtils.degToRad(camera?.fov ?? 40);
    const aspect = camera?.aspect ?? 16 / 9;
    const halfV = fov / 2;
    const half = Math.min(halfV, Math.atan(Math.tan(halfV) * aspect));
    const dist = r / Math.sin(half);
    const view = (pitchDeg: number, turnDeg: number, d: number, look: THREE.Vector3, out: typeof this.wide) => {
      const p = THREE.MathUtils.degToRad(pitchDeg);
      const a = THREE.MathUtils.degToRad(turnDeg);
      const back = new THREE.Vector3(-fwd.x, 0, -fwd.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      out.look.copy(look);
      out.pos.copy(look).addScaledVector(back, Math.cos(p) * d);
      out.pos.y += Math.sin(p) * d;
      out.dist = d;
    };
    view(VAULT_SCENE.widePitch, 0, dist, center, this.wide);
    // de perto: gira para o lado em que a volta aparece
    const far = this.bulge(s);
    const side = Math.sign(fwd.x * (far.z - s.agent.z) - fwd.z * (far.x - s.agent.x)) || 1;
    const look = s.crate.clone().lerp(far, 0.35).setY(0.7);
    view(VAULT_SCENE.closePitch, -side * VAULT_SCENE.closeTurn, dist * VAULT_SCENE.closeDist, look, this.close);
  }

  /** O ponto da volta mais longe da reta do atalho (de onde o agente sai até onde ele cai). */
  private bulge(s: VaultSceneSetup): THREE.Vector3 {
    const a = s.jump[0] ?? s.agent;
    const b = s.jump.at(-1) ?? s.crate;
    const ab = new THREE.Vector2(b.x - a.x, b.z - a.z);
    const len = ab.length() || 1;
    let best = s.around[0] ?? s.crate;
    let bd = -1;
    for (const p of s.around) {
      const d = Math.abs(ab.x * (p.z - a.z) - ab.y * (p.x - a.x)) / len;
      if (d > bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  private buildRibbon(curve: THREE.Curve<THREE.Vector3>, width: number, material: THREE.Material): THREE.Mesh {
    const len = curve.getLength();
    const n = Math.max(24, Math.ceil(len * 12));
    const fade = 0.8;
    const pos: number[] = [];
    const uv: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      const side = new THREE.Vector3(t.z, 0, -t.x).normalize().multiplyScalar(width / 2);
      const s = u * len;
      const a = Math.max(0, Math.min(1, s / fade, (len - s) / fade));
      pos.push(p.x + side.x, p.y, p.z + side.z, p.x - side.x, p.y, p.z - side.z);
      const uu = s / VAULT_SCENE.chevron;
      uv.push(uu, 0, uu, 1);
      col.push(1, 1, 1, a, 1, 1, 1, a);
      if (i < n) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    return mesh;
  }

  /** Pontinhos do atalho: no chão até o caixote, num arco por cima dele, e uma ponta de seta no fim. */
  private buildArc(s: VaultSceneSetup): THREE.Group {
    const g = new THREE.Group();
    if (s.jump.length < 2) return g;
    const raised = s.jump.map((p) => {
      const over = Math.abs(p.x - s.crate.x) < 1e-3 && Math.abs(p.z - s.crate.z) < 1e-3;
      return p.clone().setY(p.y + (over ? 1.3 : 0.15));
    });
    const curve = new THREE.CatmullRomCurve3(raised, false, 'centripetal');
    const len = curve.getLength();
    const dot = new THREE.SphereGeometry(0.055, 8, 6);
    const n = Math.max(6, Math.floor(len / 0.28));
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(dot, this.dotMat);
      m.position.copy(curve.getPointAt(i / n));
      m.userData['dot'] = true;
      m.renderOrder = 4;
      g.add(m);
    }
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 12), this.dotMat);
    head.position.copy(curve.getPointAt(1));
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangentAt(1).normalize());
    head.renderOrder = 4;
    g.add(head);
    return g;
  }

  /** Desmonta a faixa, o arco, o anel e as etiquetas, e devolve o caixote ao cinza. */
  private clear(): void {
    for (const o of this.litCrate) o.layers.disable(SPOTLIGHT_LAYER);
    this.litCrate = [];
    for (const o of [this.ribbon, this.ribbonHit, this.arc, this.ring]) {
      if (!o) continue;
      this.root.remove(o);
      o.traverse((m) => (m as THREE.Mesh).geometry?.dispose());
    }
    this.ribbon = this.ribbonHit = this.arc = this.ring = undefined;
    for (const chip of [this.chips.pular, this.chips.volta]) {
      if (!chip) continue;
      this.labels.remove(chip);
      chip.material.map?.dispose();
      chip.material.dispose();
    }
    this.chips = {};
    this.setup = null;
    this.ghost.visible = false;
  }
}
