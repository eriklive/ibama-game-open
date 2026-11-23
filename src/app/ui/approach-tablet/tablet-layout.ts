/**
 * Rabiscos do tablet de campo (auto de abordagem): onde vai cada retícula, círculo de caneta,
 * seta de fuga e anotação, em px da tela (as mesmas coordenadas do canvas do tabuleiro).
 *
 * As anotações procuram um lugar livre ao redor do suspeito (abaixo, ao lado, acima) para não
 * cobrir as outras; quem está fora da tela fica preso na borda, com uma seta para onde está.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Anchor = 'start' | 'middle' | 'end';

/** Um suspeito do auto: quem é, o que fez e onde está na tela (`null`: atrás da câmera). */
export interface TabletMarkIn {
  id: string;
  name: string;
  result: 'surrender' | 'flee';
  /** Conta do teste de fuga ("d20 16+1=17"), quando rolou. */
  roll: string | null;
  at: Pt | null;
}

export interface TabletMark {
  id: string;
  name: string;
  result: 'surrender' | 'flee';
  roll: string | null;
  /** Centro dos rabiscos (preso dentro da tela). */
  at: Pt;
  /** Fora da tela: seta na borda apontando para onde ele está. */
  pointer: string | null;
  reticle: string;
  circle: string;
  /** Segundo traço, mais fino, em quem vai correr. */
  ghost: string | null;
  /** Seta de fuga (para longe de quem abordou). */
  escape: { shaft: string; head: string } | null;
  label: Pt & { anchor: Anchor };
  note: Pt & { anchor: Anchor; text: string };
}

/** Faixas da tela (cabeçalho e rodapé do aparelho) que os rabiscos evitam. */
export interface TabletInsets {
  top: number;
  bottom: number;
}

/** Mesmo gerador pseudoaleatório para o mesmo `seed`: o traço não muda a cada quadro. */
function seeded(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 233280;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

/**
 * Círculo à mão: oscila um pouco, cresce no fim e passa do ponto de partida (não fecha certinho).
 * `sweep` em radianos (2π é uma volta).
 */
export function roughLoop(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  start: number,
  sweep: number,
): string {
  const rnd = seeded(seed);
  const a1 = rnd() * 6.28;
  const a2 = rnd() * 6.28;
  const k1 = 0.05 + rnd() * 0.04;
  const k2 = 0.03 + rnd() * 0.03;
  const n = 60;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = start + sweep * (i / n);
    const grow = 1 + 0.1 * (i / n) - 0.04;
    const wob = 1 + k1 * Math.sin(t * 2 + a1) + k2 * Math.sin(t * 3 + a2);
    pts.push({ x: cx + Math.cos(t) * rx * wob * grow, y: cy + Math.sin(t) * ry * wob * grow });
  }
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q${f(pts[i].x)} ${f(pts[i].y)} ${f(mx)} ${f(my)}`;
  }
  return d;
}

/** Quatro cantos de mira em volta de `p`. */
export function reticlePath(p: Pt, s = 14): string {
  const a = s / 2;
  return (
    `M${p.x - s} ${p.y - a}v${-a}h${a}` +
    `M${p.x + a} ${p.y - s}h${a}v${a}` +
    `M${p.x + s} ${p.y + a}v${a}h${-a}` +
    `M${p.x - a} ${p.y + s}h${-a}v${-a}`
  );
}

/** Polígono fechado (o alcance da voz de prisão, projetado no chão). */
export function ringPath(pts: readonly Pt[]): string {
  if (pts.length < 3) return '';
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('') + 'Z';
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: Box, r: Rect): boolean =>
  a.x >= r.x && a.y >= r.y && a.x + a.w <= r.x + r.w && a.y + a.h <= r.y + r.h;

/** Caixa de um texto pela âncora (`y` é a linha de base). */
function textBox(x: number, y: number, w: number, h: number, anchor: Anchor, ascent = 12): Box {
  const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return { x: left, y: y - ascent, w, h };
}

/** Largura aproximada dos textos (fonte do GPS e letra de caneta). */
export const TEXT = { gps: 6, marker: 9, small: 6.2 } as const;

/**
 * Posições de tudo o que a caneta desenha. `agent` é quem deu a voz de prisão (as setas de fuga
 * apontam para longe dele); `rect` é a tela do tablet em px da tela.
 */
export function layoutTablet(
  marks: readonly TabletMarkIn[],
  agent: Pt | null,
  rect: Rect,
  insets: TabletInsets = { top: 40, bottom: 30 },
): TabletMark[] {
  const margin = 24;
  const area: Rect = {
    x: rect.x + 4,
    y: rect.y + insets.top + 2,
    w: rect.w - 8,
    h: rect.h - insets.top - insets.bottom - 4,
  };
  const inner = {
    x0: rect.x + margin,
    x1: rect.x + rect.w - margin,
    y0: rect.y + insets.top + margin,
    y1: rect.y + rect.h - insets.bottom - margin,
  };
  const clampPt = (p: Pt): Pt => ({
    x: Math.min(Math.max(p.x, inner.x0), Math.max(inner.x0, inner.x1)),
    y: Math.min(Math.max(p.y, inner.y0), Math.max(inner.y0, inner.y1)),
  });

  const placed: Box[] = [];
  const shown = marks.filter((m): m is TabletMarkIn & { at: Pt } => !!m.at);
  const centers = shown.map((m) => clampPt(m.at));
  // quem ficou preso na borda escorrega ao longo dela até não cobrir os outros
  const near = (p: Pt, i: number) =>
    centers.some(
      (c, j) => j !== i && (j < i || !isOff(j)) && Math.hypot(c.x - p.x, c.y - p.y) < 44,
    );
  const isOff = (i: number) =>
    Math.hypot(shown[i].at.x - centers[i].x, shown[i].at.y - centers[i].y) > 1;
  centers.forEach((c0, i) => {
    if (!isOff(i) || !near(c0, i)) return;
    const alongY = shown[i].at.x !== c0.x;
    for (let k = 1; k <= 16; k++) {
      const step = 44 * Math.ceil(k / 2) * (k % 2 ? 1 : -1);
      const cand = clampPt(alongY ? { x: c0.x, y: c0.y + step } : { x: c0.x + step, y: c0.y });
      if (!near(cand, i)) {
        centers[i] = cand;
        return;
      }
    }
  });
  // as retículas e quem abordou ocupam lugar antes de qualquer texto
  for (const c of centers) placed.push({ x: c.x - 16, y: c.y - 16, w: 32, h: 32 });
  if (agent) placed.push({ x: agent.x - 10, y: agent.y - 34, w: 20, h: 22 });

  const pick = (cands: { box: Box }[]): number => {
    const free = cands.findIndex(
      (c) => inside(c.box, area) && !placed.some((b) => overlaps(b, c.box)),
    );
    if (free >= 0) return free;
    const fits = cands.findIndex((c) => inside(c.box, area));
    return fits >= 0 ? fits : 0;
  };

  return shown.map((m, i) => {
    const at = centers[i];
    const flee = m.result === 'flee';
    const off = Math.hypot(m.at.x - at.x, m.at.y - at.y) > 1;

    let pointer: string | null = null;
    if (off) {
      const dx = m.at.x - at.x;
      const dy = m.at.y - at.y;
      const l = Math.hypot(dx, dy);
      const ux = dx / l;
      const uy = dy / l;
      const tip = { x: at.x + ux * 30, y: at.y + uy * 30 };
      const base = { x: at.x + ux * 22, y: at.y + uy * 22 };
      pointer = `M${(base.x - uy * 6).toFixed(1)} ${(base.y + ux * 6).toFixed(1)}L${tip.x.toFixed(1)} ${tip.y.toFixed(1)}L${(base.x + uy * 6).toFixed(1)} ${(base.y - ux * 6).toFixed(1)}Z`;
    }

    // seta de fuga: para longe de quem abordou (sem agente na tela, para cima)
    let escape: TabletMark['escape'] = null;
    let up = false;
    if (flee) {
      let ux = 0;
      let uy = -1;
      if (agent) {
        const vx = at.x - agent.x;
        const vy = at.y - agent.y;
        const l = Math.hypot(vx, vy);
        if (l > 1) {
          ux = vx / l;
          uy = vy / l;
        }
      }
      up = uy < 0;
      const s = { x: at.x + ux * 26, y: at.y + uy * 26 };
      const e = { x: at.x + ux * 62, y: at.y + uy * 62 };
      const c = { x: (s.x + e.x) / 2 - uy * 10, y: (s.y + e.y) / 2 + ux * 10 };
      const h = { x: e.x - ux * 9, y: e.y - uy * 9 };
      const f = (v: number) => v.toFixed(1);
      escape = {
        shaft: `M${f(s.x)} ${f(s.y)} Q${f(c.x)} ${f(c.y)} ${f(e.x)} ${f(e.y)}`,
        head: `M${f(h.x - uy * 7)} ${f(h.y + ux * 7)} L${f(e.x)} ${f(e.y)} L${f(h.x + uy * 7)} ${f(h.y - ux * 7)}`,
      };
      placed.push({
        x: Math.min(s.x, e.x) - 6,
        y: Math.min(s.y, e.y) - 6,
        w: Math.abs(e.x - s.x) + 12,
        h: Math.abs(e.y - s.y) + 12,
      });
    }

    // nome (letra do GPS): em cima da retícula, ou embaixo quando a seta sobe
    const nw = m.name.length * TEXT.gps + 4;
    const nx = Math.min(Math.max(at.x, area.x + nw / 2), area.x + area.w - nw / 2);
    const nameCands = [
      { x: nx, y: at.y - 22, box: textBox(nx, at.y - 22, nw, 13, 'middle', 10) },
      { x: nx, y: at.y + 33, box: textBox(nx, at.y + 33, nw, 13, 'middle', 10) },
    ];
    if (up) nameCands.reverse();
    const nc = nameCands[pick(nameCands)];
    placed.push(nc.box);

    // anotação de caneta ("rendido" / "CORRE!" e a conta do d20)
    const text = flee ? 'CORRE!' : 'rendido';
    const ww = Math.max(text.length * TEXT.marker, m.roll ? m.roll.length * TEXT.small : 0);
    const hh = m.roll ? 28 : 16;
    const near: readonly (readonly [number, number, Anchor])[] = [
      [20, 26, 'start'],
      [-20, 26, 'end'],
      [26, 4, 'start'],
      [-26, 4, 'end'],
      [20, -28, 'start'],
      [-20, -28, 'end'],
    ];
    // sem lugar perto, tenta um pouco mais longe
    const noteCands = [...near, ...near.map(([dx, dy, a]) => [dx * 1.6, dy * 1.9, a] as const)].map(
      ([dx, dy, anchor]) => ({
        x: at.x + dx,
        y: at.y + dy,
        anchor,
        box: textBox(at.x + dx, at.y + dy, ww, hh, anchor),
      }),
    );
    const note = noteCands[pick(noteCands)];
    placed.push(note.box);

    return {
      id: m.id,
      name: m.name,
      result: m.result,
      roll: m.roll,
      at,
      pointer,
      reticle: reticlePath(at),
      circle: roughLoop(at.x, at.y, 21, 18, 7 + i * 13, -2.5, Math.PI * 2 * 1.12),
      ghost: flee ? roughLoop(at.x, at.y, 25, 22, 31 + i * 7, -2.2, Math.PI * 2 * 0.55) : null,
      escape,
      label: { x: nc.x, y: nc.y, anchor: 'middle' },
      note: { x: note.x, y: note.y, anchor: note.anchor, text },
    };
  });
}
