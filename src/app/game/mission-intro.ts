import { HexCoord } from './hex';
import { GameMap, HexRect, StructureKind, inStructure } from './maps';
import { Objective } from './mission';
import { METER } from './character-model';

/**
 * Abertura da missão (tutorial, passo 1): no início de cada partida, antes da primeira
 * rolagem, a câmera começa alta e afastada sobre as estruturas que têm objetivo, o jogo escurece o
 * resto, circula cada uma a caneta vermelha com o que há para fazer lá e espera o toque em
 * **Iniciar missão**. Aí a câmera desce em linha reta até a equipe, voltando à inclinação
 * de sempre no caminho.
 *
 * Aqui ficam as regras puras (o que circular, a forma do traço, onde vai a anotação);
 * a câmera está em `HexBoard` (`frameIntro`, `panFromIntro`) e a camada em `ui/mission-intro`.
 */
export const INTRO = {
  /** Inclinação da câmera na abertura (graus acima do chão; 90 = de cima). A de jogo é `BASE_PITCH`. */
  pitch: 85,
  /** Folga em volta das estruturas no enquadramento (1 = encostado na borda da tela). */
  framePad: 1.6,
  /** Aproximação de entrada: a câmera começa este tanto mais longe e chega devagar. */
  settleFrom: 1.1,
  settleMs: 1200,
  /** Duração do pan até a equipe. */
  panMs: 2600,
} as const;

/** Inclinação da câmera de jogo (graus). */
export const BASE_PITCH = 55;

/** Altura do ponto mais alto de cada estrutura (o arco do hangar, a cumeeira da casa), em unidades do mundo. */
export const STRUCTURE_TOP: Record<StructureKind, number> = {
  hangar: 9 * METER,
  house: 4.6 * METER,
};

export const STRUCTURE_LABEL: Record<StructureKind, string> = {
  hangar: 'Hangar',
  house: 'Casa',
};

/** Uma estrutura a circular, com os objetivos que ficam nela. */
export interface IntroTarget {
  kind: StructureKind;
  rect: HexRect;
  label: string;
  notes: string[];
}

/** Onde fica um objetivo no mapa (hexágonos); vazio se o mapa não diz. */
export function objectiveHexes(map: GameMap, o: Objective): HexCoord[] {
  if ('burn' in o) return map.burnables?.find((b) => b.id === o.burn)?.hexes ?? [];
  if ('surrender' in o) {
    const start = map.enemies.find((e) => e.id === o.surrender)?.patrol[0];
    return start ? [start] : [];
  }
  const id = 'notice' in o ? o.notice : o.find;
  const spot = map.hidden?.find((h) => h.id === id)?.spot;
  return spot ? [spot] : [];
}

/**
 * Estruturas que a abertura circula: as que têm ao menos um dos objetivos visíveis dentro
 * (na ordem do mapa), cada uma com o texto desses objetivos.
 */
export function introTargets(map: GameMap, objectives: readonly Objective[]): IntroTarget[] {
  return (map.structures ?? [])
    .map((s) => ({
      kind: s.kind,
      rect: s.rect,
      label: STRUCTURE_LABEL[s.kind],
      notes: objectives
        .filter((o) => objectiveHexes(map, o).some((h) => inStructure(h, s.rect)))
        .map((o) => o.text),
    }))
    .filter((t) => t.notes.length > 0);
}

// ---------- câmera ----------

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Zoom (multiplicador da distância padrão `baseDist`) para caber um retângulo de chão de
 * `w` × `h` (largura na tela × profundidade) numa câmera quase de cima com campo vertical
 * `fovDeg` e proporção `aspect`.
 */
export function introZoom(
  w: number,
  h: number,
  aspect: number,
  fovDeg: number,
  baseDist: number,
): number {
  const visible = Math.max(h, w / aspect) * INTRO.framePad;
  return visible / (2 * Math.tan((fovDeg * Math.PI) / 360) * baseDist);
}

// ---------- traço de caneta ----------

/** Elipse na tela (px), em volta de uma estrutura. */
export interface ScreenEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * Caminho SVG de um círculo feito à mão: começa em `start` (radianos), dá `sweep` de volta
 * (um pouco mais que uma, para o traço passar do começo), com o raio tremendo devagar e
 * crescendo um tiquinho, como quem não fecha a volta certinho. Determinístico pelo `seed`.
 */
export function penLoop(
  e: ScreenEllipse,
  seed: number,
  start = -2.6,
  sweep = Math.PI * 2 * 1.12,
): string {
  let s = seed;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const a1 = rnd() * 6.28;
  const a2 = rnd() * 6.28;
  const k1 = 0.035 + rnd() * 0.03;
  const k2 = 0.025 + rnd() * 0.02;
  const n = 64;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = start + sweep * (i / n);
    const grow = 0.97 + 0.07 * (i / n);
    const wob = (1 + k1 * Math.sin(t * 2 + a1) + k2 * Math.sin(t * 3 + a2)) * grow;
    pts.push([e.cx + Math.cos(t) * e.rx * wob, e.cy + Math.sin(t) * e.ry * wob]);
  }
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
  }
  return d;
}

/** Anotação a caneta ao lado do círculo: onde começa o texto e a setinha até o traço. */
export interface NotePlacement {
  x: number;
  y: number;
  anchor: 'start' | 'end' | 'middle';
  arrow: string;
  /** Caixa ocupada pelo texto (px): serve de obstáculo para a próxima anotação. */
  box: Box;
}

/** Retângulo na tela (px). */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Caixa do miolo de uma elipse (o que o texto não deve cobrir). */
export const ellipseCore = (e: ScreenEllipse): Box => ({
  x0: e.cx - e.rx * 0.8,
  y0: e.cy - e.ry * 0.8,
  x1: e.cx + e.rx * 0.8,
  y1: e.cy + e.ry * 0.8,
});

/**
 * Põe a anotação do círculo `e` num lugar livre: à direita, à esquerda, embaixo ou em cima,
 * nessa ordem, no primeiro que cabe na tela (`w` × `h`, com `margin`) sem cobrir os
 * `obstacles` (o botão, as outras estruturas, as anotações já postas). Sem lugar livre, fica
 * no primeiro que cabe na tela. `textW` × `textH` é o tamanho do bloco de texto; `marginY`
 * guarda espaço em cima e embaixo (as faixas de cinema).
 */
export function placeNote(
  e: ScreenEllipse,
  textW: number,
  textH: number,
  w: number,
  h: number,
  obstacles: readonly Box[] = [],
  margin = 16,
  marginY = margin,
): NotePlacement {
  const gap = Math.max(18, e.rx * 0.08);
  const clampY = (y: number) => Math.min(Math.max(y, marginY), h - marginY - textH);
  const clampX = (x: number) => Math.min(Math.max(x, margin + textW / 2), w - margin - textW / 2);
  // ponto do traço na altura `y` (lado direito ou esquerdo da elipse)
  const edgeAt = (y: number, side: 1 | -1) => {
    const dy = Math.max(-0.95, Math.min(0.95, (y - e.cy) / e.ry));
    return e.cx + side * e.rx * Math.sqrt(1 - dy * dy);
  };
  const side = (dir: 1 | -1): NotePlacement => {
    const y = clampY(e.cy - e.ry * 0.75);
    const ay = y + textH * 0.55;
    const x =
      dir === 1
        ? Math.max(e.cx + e.rx + gap, edgeAt(y, 1) + gap)
        : Math.min(e.cx - e.rx - gap, edgeAt(y, -1) - gap);
    const ex = edgeAt(ay + gap, dir);
    const box =
      dir === 1
        ? { x0: x, y0: y, x1: x + textW, y1: y + textH }
        : { x0: x - textW, y0: y, x1: x, y1: y + textH };
    return {
      x,
      y,
      anchor: dir === 1 ? 'start' : 'end',
      arrow: arrowPath(x - 6 * dir, ay, ex + 4 * dir, ay + gap * 0.9),
      box,
    };
  };
  const vertical = (dir: 1 | -1): NotePlacement => {
    const x = clampX(e.cx);
    const y = dir === 1 ? e.cy + e.ry + gap * 0.6 : e.cy - e.ry - gap * 0.6 - textH;
    return {
      x,
      y,
      anchor: 'middle',
      arrow: '',
      box: { x0: x - textW / 2, y0: y, x1: x + textW / 2, y1: y + textH },
    };
  };
  const candidates = [side(1), side(-1), vertical(1), vertical(-1)];
  const inside = (b: Box) =>
    b.x0 >= margin - 0.5 &&
    b.x1 <= w - margin + 0.5 &&
    b.y0 >= marginY - 0.5 &&
    b.y1 <= h - marginY + 0.5;
  const fits = candidates.filter((c) => inside(c.box));
  return fits.find((c) => !obstacles.some((o) => overlaps(c.box, o))) ?? fits[0] ?? candidates[2];
}

function arrowPath(x0: number, y0: number, x1: number, y1: number): string {
  const f = (n: number) => n.toFixed(1);
  const mx = (x0 + x1) / 2;
  return `M${f(x0)} ${f(y0)} Q${f(mx)} ${f(y0)} ${f(x1)} ${f(y1)}`;
}
