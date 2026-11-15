// Proporções cartoon: cabeça, mãos e pés maiores, braços menos musculosos.
//
// As animações (anims/humanoid-base.glb) gravam translação e escala de todos os ossos, então
// mexer no esqueleto não adianta: o clipe desfaz. A mudança é feita na malha, na pose de
// repouso. Cada vértice cresce (ou afina) em volta do osso que o move, na medida do peso desse
// osso. Como o vértice continua preso aos mesmos ossos, a animação segue igual.
//
// Vale para todas as malhas com pele (corpo, cabelo, olhos, sobrancelhas). O equipamento vem
// depois e é medido no corpo já deformado, então chapéu e luva acompanham sozinhos.

/** Predefinições. `head`, `hands`, `feet`: escala; `armSlim`: quanto o braço afina (0..1). */
export const PROPORTIONS = {
  none: { head: 1, hands: 1, feet: 1, armSlim: 0 },
  sutil: { head: 1.14, hands: 1.12, feet: 1.1, armSlim: 0.12 },
  chibi: { head: 1.3, hands: 1.24, feet: 1.18, armSlim: 0.22 },
};

const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * @param prims  primitivas com pele, já em metros (ver lib/glb-space.mjs)
 * @param names  nomes dos ossos, na ordem da pele
 * @param B      posição de cada osso na pose de repouso (bodyMetrics(skin).B)
 */
export function reproportion(prims, names, B, p) {
  if (p.head === 1 && p.hands === 1 && p.feet === 1 && !p.armSlim) return;
  const group = names.map((n) => {
    if (n === 'Head') return 'head';
    if (/^(hand|index|middle|ring|pinky|thumb)_/.test(n)) return 'hand_' + n.slice(-1);
    if (/^(foot|ball)_/.test(n)) return 'foot_' + n.slice(-1);
    if (/^(upperarm|lowerarm)_/.test(n)) return 'arm_' + n.slice(-1);
    return null;
  });
  // pivôs: a cabeça cresce a partir da base do crânio (sobe, não afunda no pescoço); a mão, do
  // punho; o pé, do chão sob o tornozelo (não atravessa o piso)
  const head = [B.Head[0], B.Head[1] - 0.02, B.Head[2]];
  const pivot = {
    head,
    hand_l: B.hand_l, hand_r: B.hand_r,
    foot_l: [B.foot_l[0], 0, B.foot_l[2]], foot_r: [B.foot_r[0], 0, B.foot_r[2]],
  };
  const scale = { head: p.head, hand_l: p.hands, hand_r: p.hands, foot_l: p.feet, foot_r: p.feet };
  // eixo do braço em T: do ombro ao punho
  const axis = (s) => ({ a: B[`upperarm_${s}`], b: B[`hand_${s}`] });

  const done = new Set();
  for (const prim of prims) {
    const acc = prim.getAttribute('POSITION');
    if (done.has(acc)) continue;
    done.add(acc);
    const P = acc.getArray().slice();
    const J = prim.getAttribute('JOINTS_0').getArray(), W = prim.getAttribute('WEIGHTS_0').getArray();
    for (let i = 0; i < P.length / 3; i++) {
      const w = {};
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        const g = group[J[i * 4 + k]], v = W[i * 4 + k];
        sum += v;
        if (g) w[g] = (w[g] ?? 0) + v;
      }
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      let dx = 0, dy = 0, dz = 0;
      for (const g in scale) {
        const wg = (w[g] ?? 0) / (sum || 1);
        if (!wg || scale[g] === 1) continue;
        const c = pivot[g], k = (scale[g] - 1) * wg;
        dx += (x - c[0]) * k; dy += (y - c[1]) * k; dz += (z - c[2]) * k;
      }
      // braço: aproxima do eixo (sem mudar o comprimento), mais no bíceps que no punho
      for (const s of ['l', 'r']) {
        const wa = (w['arm_' + s] ?? 0) / (sum || 1);
        if (!wa || !p.armSlim) continue;
        const { a, b } = axis(s);
        const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
        const t = ((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / len2;
        const q = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
        // perto do ombro afina menos (a junção com o tronco não pode abrir), e menos no punho
        const along = sstep(0.0, 0.18, t) * (1 - 0.4 * sstep(0.6, 1, t));
        const k = p.armSlim * wa * along;
        dx -= (x - q[0]) * k; dy -= (y - q[1]) * k; dz -= (z - q[2]) * k;
      }
      P[i * 3] = x + dx; P[i * 3 + 1] = y + dy; P[i * 3 + 2] = z + dz;
    }
    acc.setArray(P);
  }
}
