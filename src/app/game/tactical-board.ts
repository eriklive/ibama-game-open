import {
  APPROACH_RULES,
  ApproachZones,
  BASE_APPROACH,
  escapeChance,
  escapeModifier,
} from './enemies';
import { INTERROGATION_RULES } from './interrogation';

/**
 * Lousa tática (tutorial, passo 2): uma lousa de giz que cobre quase a tela inteira e explica uma
 * regra com o mapa visto de cima, desenhado a giz, e "fotos" coladas com fita. Abre sozinha na
 * primeira vez que a situação aparece na partida e fica no menu para rever.
 *
 * - **Abordagem**: abre quando o primeiro garimpeiro entra na tela. Mostra as faixas do grito
 *   (rende, rola, foge), o que acontece em cada uma e que quem foge vira perseguição.
 * - **Interrogatório**: abre quando o primeiro suspeito se rende. Mostra o raio de conversa em
 *   volta do rendido e o toque nele: um toque marca o caminho até o raio, o segundo anda até lá e
 *   abre a conversa (já dentro do raio, um toque basta).
 *
 * As lições ficam no submenu **Tutoriais** do menu do jogo, para rever.
 *
 * Aqui ficam as regras puras (quando abrir, o que foi visto, a geometria do giz); a lousa em si
 * está em `ui/tactical-board`.
 */
export type LessonId = 'abordagem' | 'interrogatorio';

export const LESSONS: readonly { id: LessonId; label: string }[] = [
  { id: 'abordagem', label: 'Abordagem' },
  { id: 'interrogatorio', label: 'Interrogatório' },
];

/** Chave no `localStorage` com as lições já vistas (uma lista separada por vírgula). */
export const LESSONS_KEY = 'ibama.lousa';

/** Margem (fração da tela) que a peça precisa estar para dentro da borda para "aparecer na tela". */
export const ON_SCREEN_MARGIN = 0.06;

export function readSeen(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Set<LessonId> {
  try {
    const raw = storage?.getItem(LESSONS_KEY) ?? '';
    return new Set(raw.split(',').filter((s): s is LessonId => LESSONS.some((l) => l.id === s)));
  } catch {
    return new Set();
  }
}

export function markSeen(
  id: LessonId,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage(),
): void {
  try {
    const seen = readSeen(storage);
    seen.add(id);
    storage?.setItem(LESSONS_KEY, [...seen].join(','));
  } catch {
    // navegação privada ou armazenamento bloqueado: a lição só volta a aparecer na próxima partida
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** O ponto (px do canvas) está dentro da tela, com folga de `margin` (fração) nas bordas. */
export function insideScreen(
  p: { x: number; y: number } | null,
  w: number,
  h: number,
  margin: number = ON_SCREEN_MARGIN,
): boolean {
  if (!p || w <= 0 || h <= 0) return false;
  const mx = w * margin;
  const my = h * margin;
  return p.x >= mx && p.x <= w - mx && p.y >= my && p.y <= h - my;
}

/** Situação da partida que a lousa olha para decidir se abre (ver `lessonDue`). */
export interface LessonCheck {
  seen: ReadonlySet<LessonId>;
  /** Algum garimpeiro (vigiando ou em fuga) está dentro da tela. */
  suspectOnScreen: boolean;
  /** Algum suspeito está rendido. */
  anySurrendered: boolean;
}

/** Qual lição abrir agora (a abordagem primeiro: um rendido só existe depois de uma abordagem). */
export function lessonDue(c: LessonCheck): LessonId | null {
  if (c.suspectOnScreen && !c.seen.has('abordagem')) return 'abordagem';
  if (c.anySurrendered && !c.seen.has('interrogatorio')) return 'interrogatorio';
  return null;
}

// ---------- o que a lousa escreve ----------

/** Uma faixa da abordagem, como a lousa escreve: distâncias e o que acontece. */
export interface ApproachBand {
  key: 'surrender' | 'roll' | 'flee';
  /** "1–3", "4–6", "7". */
  range: string;
  title: string;
  /** O que acontece com quem está nela. */
  outcome: string;
}

const span = (a: number, b: number) => (a >= b ? `${b}` : `${a}–${b}`);

/** As três faixas a partir das zonas do agente (que crescem com intimidação e grupo). */
export function approachBands(
  zones: ApproachZones = BASE_APPROACH,
  rules: Pick<typeof APPROACH_RULES, 'escapeDC' | 'escapeDie' | 'rollMods'> = APPROACH_RULES,
): ApproachBand[] {
  // chance média de escapar na faixa amarela (os modificadores vão de -1 a +1)
  const mods = rules.rollMods.map((_, i) =>
    escapeModifier(zones.surrenderRange + 1 + i, zones, rules.rollMods),
  );
  const avg =
    mods.reduce((s, m) => s + escapeChance(m, rules.escapeDC, rules.escapeDie), 0) /
    Math.max(1, mods.length);
  return [
    {
      key: 'surrender',
      range: span(1, zones.surrenderRange),
      title: 'Se rende',
      outcome: 'Larga tudo e levanta as mãos. Fica rendido no lugar.',
    },
    {
      key: 'roll',
      range: span(zones.surrenderRange + 1, zones.rollRange),
      title: `Rola d${rules.escapeDie}`,
      outcome: `Tira ${rules.escapeDC} ou mais (~${Math.round(avg * 100)}%): escapa e corre. Senão, se rende.`,
    },
    {
      key: 'flee',
      range: span(zones.rollRange + 1, zones.radius),
      title: 'Foge',
      outcome: 'Ouve o grito de longe e corre, sem rolar nada.',
    },
  ];
}

/** Raio de conversa e custo, para a lição de interrogatório. */
export const TALK = {
  radius: INTERROGATION_RULES.auraRadius,
  moveCost: INTERROGATION_RULES.moveCost,
} as const;

// ---------- giz: hexágonos vistos de cima ----------

/** Hexágono do desenho, em coordenadas axiais (q, r), com a distância até o centro. */
export interface ChalkHex {
  q: number;
  r: number;
  d: number;
}

/** Todos os hexágonos até `radius` do centro (o centro incluso), do centro para fora. */
export function chalkHexes(radius: number): ChalkHex[] {
  const out: ChalkHex[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      out.push({ q, r, d: Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) });
    }
  }
  return out.sort((a, b) => a.d - b.d);
}

/** Centro (px) do hexágono axial `q, r` de lado `size` (topo plano, como o tabuleiro). */
export function chalkCenter(q: number, r: number, size: number): { x: number; y: number } {
  return { x: size * 1.5 * q, y: size * Math.sqrt(3) * (r + q / 2) };
}

/** Pontos do polígono (atributo `points` do SVG) de um hexágono de topo plano. */
export function hexPolygon(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${round(cx + size * Math.cos(a))},${round(cy + size * Math.sin(a))}`);
  }
  return pts.join(' ');
}

/**
 * Contorno de uma região de hexágonos (os lados que dão para fora dela), como um caminho SVG.
 * Serve para riscar a giz só a borda de cada faixa.
 */
export function regionOutline(hexes: readonly { q: number; r: number }[], size: number): string {
  const inside = new Set(hexes.map((h) => `${h.q},${h.r}`));
  // vizinho de cada lado, na ordem dos vértices (lado i liga o vértice i ao i+1)
  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  let d = '';
  for (const h of hexes) {
    const c = chalkCenter(h.q, h.r, size);
    dirs.forEach(([dq, dr], i) => {
      if (inside.has(`${h.q + dq},${h.r + dr}`)) return;
      const a0 = (Math.PI / 3) * i;
      const a1 = (Math.PI / 3) * (i + 1);
      d += `M${round(c.x + size * Math.cos(a0))} ${round(c.y + size * Math.sin(a0))}L${round(c.x + size * Math.cos(a1))} ${round(c.y + size * Math.sin(a1))}`;
    });
  }
  return d;
}

const round = (n: number) => Math.round(n * 10) / 10;
