import * as THREE from 'three';

/**
 * Poses de suspeito algemado, montadas por código em cima do `idle` da biblioteca humanoide (os
 * pacotes grátis da Quaternius não têm rendição nem algema; ver `public/assets/README.md`).
 *
 * Cada quadro do `idle` é posto no esqueleto e corrigido à mão: os braços vão para trás das costas
 * por IK de dois ossos (os pulsos juntos, onde fica a algema) e, no `kneel`, as pernas dobram com
 * os joelhos no chão. O resultado vira um `AnimationClip` comum, então troca com os outros por
 * crossfade e continua respirando como o `idle`.
 *
 * - `cuffed`: de pé, mãos algemadas nas costas, ombros caídos e cabeça baixa.
 * - `kneel`: ajoelhado, sentado nos calcanhares, mãos algemadas nas costas e cabeça baixa.
 */
export type CuffClip = 'cuffed' | 'kneel';

/** Quadros por segundo das poses geradas. */
const FPS = 15;

/** Distância entre os pulsos algemados (m): a corrente entre as duas argolas. */
export const CUFF_GAP = 0.07;

/** Ossos sobrescritos pelas poses (o resto continua com o `idle`). */
const POSED = [
  'pelvis',
  'spine_01',
  'spine_02',
  'spine_03',
  'neck_01',
  'Head',
  'clavicle_l',
  'clavicle_r',
  'upperarm_l',
  'upperarm_r',
  'lowerarm_l',
  'lowerarm_r',
  'hand_l',
  'hand_r',
  'thigh_l',
  'thigh_r',
  'calf_l',
  'calf_r',
  'foot_l',
  'foot_r',
  'ball_l',
  'ball_r',
] as const;
type Bone = (typeof POSED)[number];

const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const worldPos = (o: THREE.Object3D) => o.getWorldPosition(v());

/**
 * Gira `bone` (no mundo) para que o caminho até `tip` aponte para `dir`. `twist`, se dado, gira
 * ainda em torno dessa direção (rad).
 */
function aim(bone: THREE.Object3D, tip: THREE.Object3D, dir: THREE.Vector3, twist = 0): void {
  bone.updateWorldMatrix(true, true);
  const from = worldPos(tip).sub(worldPos(bone)).normalize();
  const to = dir.clone().normalize();
  const turn = new THREE.Quaternion().setFromUnitVectors(from, to);
  if (twist) turn.premultiply(new THREE.Quaternion().setFromAxisAngle(to, twist));
  rotateWorld(bone, turn);
}

/** Aplica uma rotação de mundo a um osso (antes da rotação que ele já tem). */
function rotateWorld(bone: THREE.Object3D, turn: THREE.Quaternion): void {
  bone.updateWorldMatrix(true, false);
  const world = bone.getWorldQuaternion(new THREE.Quaternion());
  const parent = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(parent.invert().multiply(turn.multiply(world)));
  bone.updateWorldMatrix(false, true);
}

/** Gira o osso em torno de um eixo do mundo. */
const tilt = (bone: THREE.Object3D, axis: THREE.Vector3, angle: number) =>
  rotateWorld(bone, new THREE.Quaternion().setFromAxisAngle(axis, angle));

/**
 * IK de dois ossos: põe a ponta de `lower` (o pulso, origem de `hand`) em `target`, com o
 * cotovelo dobrando para o lado de `pole`.
 */
function reach(
  upper: THREE.Object3D,
  lower: THREE.Object3D,
  hand: THREE.Object3D,
  target: THREE.Vector3,
  pole: THREE.Vector3,
): void {
  upper.updateWorldMatrix(true, true);
  const s = worldPos(upper);
  const a = worldPos(lower).distanceTo(s);
  const b = worldPos(hand).distanceTo(worldPos(lower));
  const toT = target.clone().sub(s);
  const c = THREE.MathUtils.clamp(toT.length(), Math.abs(a - b) + 1e-3, a + b - 1e-3);
  const axis = toT.normalize();
  const x = (a * a - b * b + c * c) / (2 * c);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  const side = pole.clone().sub(axis.clone().multiplyScalar(pole.dot(axis))).normalize();
  const elbow = s.clone().add(axis.clone().multiplyScalar(x)).add(side.multiplyScalar(h));
  aim(upper, lower, elbow.clone().sub(s));
  aim(lower, hand, s.clone().add(axis.multiplyScalar(c)).sub(elbow));
}

/**
 * Corrige um quadro do esqueleto (já com o `idle` aplicado) para a pose `clip`. O personagem olha
 * para +Z; `left` é o lado da mão esquerda (+X ou −X, medido no esqueleto).
 */
function pose(b: Record<Bone, THREE.Object3D>, clip: CuffClip, left: number, root: THREE.Object3D): void {
  const X = v(1, 0, 0);
  const up = v(0, 1, 0);
  const fwd = v(0, 0, 1);

  if (clip === 'kneel') {
    // pernas: coxa quase de pé, canela deitada para trás e o peito do pé no chão
    for (const [thigh, calf, foot, ball, s] of [
      [b.thigh_l, b.calf_l, b.foot_l, b.ball_l, 1],
      [b.thigh_r, b.calf_r, b.foot_r, b.ball_r, -1],
    ] as const) {
      aim(thigh, calf, v(0.1 * s * left, -1, 0.18));
      aim(calf, foot, v(0.04 * s * left, -0.08, -1));
      aim(foot, ball, v(0, -0.25, -1));
      aim(ball, ball.children[0] ?? ball, v(0, -0.1, -1));
    }
    // baixa a bacia até os joelhos (e os pés) encostarem no chão
    root.updateWorldMatrix(true, true);
    const ground = Math.min(...[b.calf_l, b.calf_r, b.foot_l, b.foot_r].map((o) => worldPos(o).y)) - 0.06;
    const pelvisParent = b.pelvis.parent!;
    const at = worldPos(b.pelvis).add(v(0, -ground, 0));
    b.pelvis.position.copy(pelvisParent.worldToLocal(at));
    b.pelvis.updateWorldMatrix(false, true);
    // tronco um pouco para a frente, cabeça baixa
    tilt(b.spine_01, X, 0.05);
    tilt(b.spine_02, X, 0.04);
  } else {
    // de pé: peito caído, peso numa perna
    tilt(b.spine_02, X, 0.08);
  }
  tilt(b.neck_01, X, 0.1);
  tilt(b.Head, X, clip === 'kneel' ? 0.22 : 0.16);
  // ombros puxados para trás (as mãos vão às costas)
  tilt(b.clavicle_l, up, -0.18 * left);
  tilt(b.clavicle_r, up, 0.18 * left);

  // braços: pulsos juntos atrás da lombar, cotovelos para trás e para fora
  b.pelvis.updateWorldMatrix(true, true);
  const p = worldPos(b.pelvis);
  const back = fwd.clone().negate();
  const wrist = p.clone().add(v(0, 0.1, 0)).add(back.clone().multiplyScalar(0.2));
  for (const [upper, lower, hand, s] of [
    [b.upperarm_l, b.lowerarm_l, b.hand_l, 1],
    [b.upperarm_r, b.lowerarm_r, b.hand_r, -1],
  ] as const) {
    const side = v(left * s, 0, 0);
    const target = wrist.clone().add(side.clone().multiplyScalar(CUFF_GAP / 2));
    reach(upper, lower, hand, target, side.clone().multiplyScalar(0.8).add(back).add(v(0, 0.1, 0)));
    // mão seguindo o antebraço, com a palma para dentro (de frente para a outra mão)
    hand.quaternion.identity();
    hand.updateWorldMatrix(false, true);
    aim(hand, hand.children.find((c) => c.name.startsWith('middle_01')) ?? hand, v(0, -1, -0.15));
  }
}

/**
 * Gera as poses algemadas a partir do `idle`, num esqueleto qualquer da biblioteca humanoide.
 * `skeleton` é a cena do GLB de clipes (não é alterada: o trabalho é feito numa cópia).
 */
export function buildCuffClips(skeleton: THREE.Object3D, idle: THREE.AnimationClip): THREE.AnimationClip[] {
  const root = skeleton.clone(true);
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  const bones = {} as Record<Bone, THREE.Object3D>;
  for (const name of POSED) {
    const o = root.getObjectByName(name);
    if (!o) return [];
    bones[name] = o;
  }
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(idle).play();
  root.updateWorldMatrix(true, true);
  const left = Math.sign(worldPos(bones.hand_l).x - worldPos(bones.hand_r).x) || 1;

  const frames = Math.max(2, Math.round(idle.duration * FPS) + 1);
  const times = new Float32Array(frames);
  const clips: THREE.AnimationClip[] = [];
  for (const clip of ['cuffed', 'kneel'] as const) {
    const quats = Object.fromEntries(POSED.map((n) => [n, new Float32Array(frames * 4)])) as Record<Bone, Float32Array>;
    const pelvisPos = new Float32Array(frames * 3);
    for (let i = 0; i < frames; i++) {
      const t = (i / (frames - 1)) * idle.duration;
      times[i] = t;
      mixer.setTime(t);
      root.updateWorldMatrix(true, true);
      pose(bones, clip, left, root);
      for (const n of POSED) bones[n].quaternion.toArray(quats[n], i * 4);
      bones.pelvis.position.toArray(pelvisPos, i * 3);
    }
    const tracks = idle.tracks
      .filter((tr) => {
        const [node, prop] = tr.name.split('.');
        if (node === 'pelvis' && prop === 'position') return false;
        return !(POSED as readonly string[]).includes(node) || prop !== 'quaternion';
      })
      .map((tr) => tr.clone());
    for (const n of POSED) tracks.push(new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, times.slice(), quats[n]));
    tracks.push(new THREE.VectorKeyframeTrack('pelvis.position', times.slice(), pelvisPos));
    clips.push(new THREE.AnimationClip(clip, idle.duration, tracks));
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(root);
  return clips;
}
