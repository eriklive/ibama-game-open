import { Component, computed, effect, input, output, signal } from '@angular/core';
import { MainButton } from '../main-button';
import { ApproachZones, BASE_APPROACH } from '../../game/enemies';
import {
  ApproachBand,
  ChalkHex,
  LessonId,
  TALK,
  approachBands,
  chalkCenter,
  chalkHexes,
  hexPolygon,
  regionOutline,
} from '../../game/tactical-board';

/** Lado (unidades do desenho) de cada hexágono desenhado a giz. */
const HEX = 10;
/**
 * O desenho é ampliado este tanto dentro do SVG: o filtro de giz trabalha nas unidades de fora,
 * então o grão e o tremido ficam finos como risco de giz, e não borrões do tamanho de um hexágono.
 */
export const CHALK_SCALE = 4;

/** Peça desenhada no mapa a giz: agente ou garimpeiro, com uma anotação opcional. */
interface Piece {
  kind: 'agent' | 'suspect' | 'surrendered' | 'runner' | 'roller';
  x: number;
  y: number;
  note?: string;
  /** Lado da anotação. */
  side?: 'left' | 'right' | 'above' | 'below';
}

/** Um mapa visto de cima, já em coordenadas do SVG. */
interface ChalkMap {
  viewBox: string;
  /** Hexágonos (polígono) com a classe da faixa e a distância (atraso do giz). */
  hexes: { points: string; cls: string; d: number }[];
  /** Contornos riscados (cada faixa, a aura), com a classe da cor. */
  outlines: { d: string; cls: string }[];
  /** Traços soltos: setas, caminho do agente, parede, rota de fuga. */
  strokes: { d: string; cls: string; arrow?: boolean }[];
  /** Textos escritos a giz no próprio mapa. */
  labels: {
    x: number;
    y: number;
    text: string;
    cls: string;
    anchor?: 'start' | 'middle' | 'end';
  }[];
  pieces: Piece[];
}

interface Page {
  kicker: string;
  title: string;
  map: ChalkMap;
  /** Frases curtas ao lado do mapa (a primeira palavra em destaque vai entre `*`). */
  notes: { text: string; tone?: 'surrender' | 'roll' | 'flee' | 'talk' }[];
  photo?: { src: string; caption: string };
}

const at = (q: number, r: number) => chalkCenter(q, r, HEX);

/** Caixa (viewBox) em volta de `radius` anéis de hexágonos, com folga para as anotações. */
function box(radius: number, padX = 26, padY = 14): string {
  const w = HEX * (1.5 * radius + 1) + padX;
  const h = HEX * Math.sqrt(3) * (radius + 0.5) + padY;
  const k = CHALK_SCALE;
  return `${-w * k} ${-h * k} ${2 * w * k} ${2 * h * k}`;
}

/** Caminho de giz passando pelos centros dos hexágonos `pts`. */
const path = (pts: { q: number; r: number }[]) =>
  pts
    .map((p, i) => {
      const c = at(p.q, p.r);
      return `${i ? 'L' : 'M'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
    })
    .join('');

const BAND_CLS: Record<ApproachBand['key'], string> = {
  surrender: 'surrender',
  roll: 'roll',
  flee: 'flee',
};

/** Lição de abordagem, página 1: as três faixas em volta do agente. */
function ringsMap(z: ApproachZones): ChalkMap {
  const R = z.radius;
  const all = chalkHexes(R + 1);
  const band = (d: number) =>
    d === 0
      ? 'center'
      : d <= z.surrenderRange
        ? 'surrender'
        : d <= z.rollRange
          ? 'roll'
          : d <= R
            ? 'flee'
            : 'out';
  const inBand = (k: string) => all.filter((h) => band(h.d) === k);
  // garimpeiros: um em cada faixa (nos anéis do meio de cada uma)
  const sAt = { q: 1, r: -Math.max(1, z.surrenderRange - 1) };
  const rollD = Math.ceil((z.surrenderRange + 1 + z.rollRange) / 2);
  const rAt = { q: -rollD, r: Math.ceil(rollD / 2) };
  const fAt = { q: Math.ceil(R / 2), r: R - Math.ceil(R / 2) };
  const s = at(sAt.q, sAt.r);
  const r = at(rAt.q, rAt.r);
  const f = at(fAt.q, fAt.r);
  const out = at(fAt.q + 1, fAt.r + 1);
  return {
    viewBox: box(R + 1, 8, 8),
    hexes: all.map((h) => ({ ...poly(h), cls: band(h.d), d: h.d })),
    outlines: (['surrender', 'roll', 'flee'] as const).map((k) => ({
      d: regionOutline(inBand(k), HEX),
      cls: BAND_CLS[k],
    })),
    strokes: [
      // fuga: a seta sai da faixa vermelha para fora
      {
        d: `M${f.x + 4} ${f.y + 3}Q${(f.x + out.x) / 2 + 6} ${(f.y + out.y) / 2} ${out.x + 6} ${out.y + 4}`,
        cls: 'flee',
        arrow: true,
      },
    ],
    labels: [
      ...[
        { d: z.surrenderRange, k: 'surrender' },
        { d: z.rollRange, k: 'roll' },
        { d: R, k: 'flee' },
      ].map(({ d, k }) => {
        const c = at(0, -d);
        return { x: c.x, y: c.y + 4.5, text: `${d}`, cls: `num ${k}`, anchor: 'middle' as const };
      }),
    ],
    pieces: [
      { kind: 'agent', x: 0, y: 0 },
      { kind: 'surrendered', ...s },
      { kind: 'roller', ...r },
      { kind: 'runner', ...f },
    ],
  };
}

/** Página 2: a voz não atravessa parede. */
function wallMap(z: ApproachZones): ChalkMap {
  const R = Math.min(4, z.surrenderRange + 1);
  const all = chalkHexes(R);
  // parede vertical à direita do agente, entre q = 1 e q = 2
  const wallQ = 2;
  const behind = (h: ChalkHex) => h.q >= wallQ && h.r <= 0 && h.r >= -3;
  const wallTop = at(wallQ, -3.4);
  const wallBot = at(wallQ, 0.4);
  const hidden = at(3, -2);
  const seen = at(-2, 0);
  return {
    viewBox: box(R, 10, 8),
    hexes: all.map((h) => ({
      ...poly(h),
      cls:
        h.d === 0 ? 'center' : behind(h) ? 'shadow' : h.d <= z.surrenderRange ? 'surrender' : 'out',
      d: h.d,
    })),
    outlines: [
      {
        d: regionOutline(
          all.filter((h) => h.d > 0 && h.d <= z.surrenderRange && !behind(h)),
          HEX,
        ),
        cls: 'surrender',
      },
    ],
    strokes: [
      { d: `M${wallTop.x - 7.5} ${wallTop.y}L${wallBot.x - 7.5} ${wallBot.y}`, cls: 'wall' },
      // o grito bate na parede
      {
        d: `M5 -4L${wallTop.x - 12} ${(wallTop.y + wallBot.y) / 2 + 4}`,
        cls: 'voice',
        arrow: true,
      },
    ],
    labels: [
      { x: wallTop.x - 7.5, y: wallTop.y - 5, text: 'parede', cls: 'small', anchor: 'middle' },
      { x: hidden.x, y: hidden.y + 15, text: 'não ouve', cls: 'small flee', anchor: 'middle' },
    ],
    pieces: [
      { kind: 'agent', x: 0, y: 0 },
      { kind: 'suspect', ...hidden },
      { kind: 'surrendered', ...seen },
    ],
  };
}

/** Página 3: quem escapa corre até a borda do mapa (e o agente vai atrás). */
function chaseMap(): ChalkMap {
  const R = 4;
  const all = chalkHexes(R);
  const route = [
    { q: -1, r: 1 },
    { q: 0, r: 0 },
    { q: 1, r: -1 },
    { q: 2, r: -2 },
    { q: 3, r: -3 },
    { q: 4, r: -4 },
  ];
  const chase = [
    { q: -3, r: 2 },
    { q: -2, r: 2 },
    { q: -1, r: 1 },
  ];
  const runner = at(0, 0);
  const agent = at(-3, 2);
  const edge = at(4, -4);
  return {
    viewBox: box(R, 12, 8),
    hexes: all.map((h) => ({ ...poly(h), cls: h.d === R ? 'edge' : 'out', d: h.d })),
    outlines: [{ d: regionOutline(all, HEX), cls: 'edge-line' }],
    strokes: [
      { d: path(route), cls: 'flee dashed', arrow: true },
      { d: path(chase), cls: 'agent-path', arrow: true },
    ],
    labels: [{ x: edge.x - 2, y: edge.y - 13, text: 'saída', cls: 'small flee', anchor: 'middle' }],
    pieces: [
      { kind: 'runner', ...runner },
      { kind: 'agent', ...agent },
    ],
  };
}

/** Interrogatório, página 1: o raio de conversa em volta do rendido. */
function talkMap(): ChalkMap {
  const R = 4;
  const all = chalkHexes(R);
  const walk = [
    { q: -3, r: 3 },
    { q: -2, r: 2 },
    { q: -1, r: 1 },
  ];
  const agent = at(-3, 3);
  const stop = at(-1, 1);
  return {
    viewBox: box(R, 12, 8),
    hexes: all.map((h) => ({
      ...poly(h),
      cls: h.d === 0 ? 'talk-center' : h.d <= TALK.radius ? 'talk' : 'out',
      d: h.d,
    })),
    outlines: [
      {
        d: regionOutline(
          all.filter((h) => h.d <= TALK.radius),
          HEX,
        ),
        cls: 'talk',
      },
    ],
    strokes: [{ d: path(walk), cls: 'agent-path', arrow: true }],
    labels: [
      { x: stop.x + 16, y: stop.y + 16, text: 'pare aqui', cls: 'small talk', anchor: 'middle' },
      { x: agent.x, y: agent.y + 15, text: 'agente', cls: 'small', anchor: 'middle' },
    ],
    pieces: [{ kind: 'surrendered', x: 0, y: 0 }],
  };
}

/** Interrogatório, página 2: dentro do raio, conversa; fora, não. */
function talkInsideMap(): ChalkMap {
  const R = 3;
  const all = chalkHexes(R);
  const inside = at(1, 0);
  const outside = at(-3, 1);
  return {
    viewBox: box(R, 12, 8),
    hexes: all.map((h) => ({
      ...poly(h),
      cls: h.d === 0 ? 'talk-center' : h.d <= TALK.radius ? 'talk' : 'out',
      d: h.d,
    })),
    outlines: [
      {
        d: regionOutline(
          all.filter((h) => h.d <= TALK.radius),
          HEX,
        ),
        cls: 'talk',
      },
    ],
    strokes: [],
    labels: [
      { x: inside.x + 9, y: inside.y - 12, text: '?', cls: 'big talk', anchor: 'middle' },
      { x: outside.x, y: outside.y + 15, text: 'longe', cls: 'small flee', anchor: 'middle' },
    ],
    pieces: [
      { kind: 'surrendered', x: 0, y: 0 },
      { kind: 'agent', ...inside },
      { kind: 'agent', ...outside },
    ],
  };
}

const poly = (h: { q: number; r: number }) => {
  const c = at(h.q, h.r);
  return { points: hexPolygon(c.x, c.y, HEX * 0.94) };
};

/**
 * Lousa tática (ver `game/tactical-board.ts`): uma lousa de giz em moldura de madeira que cobre
 * quase a tela toda, de pé ou deitada conforme a tela. Cada página tem o mapa visto de cima,
 * riscado a giz, e frases curtas; algumas têm uma foto colada com fita. Botões: voltar,
 * próximo e, na última página, **Entendi**. Nada chega ao tabuleiro enquanto ela está aberta.
 */
@Component({
  selector: 'app-tactical-board',
  imports: [MainButton],
  host: {
    class: 'tactical-board',
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-label]': '"Lousa tática: " + heading()',
    '[class.closing]': 'closing()',
  },
  templateUrl: './tactical-board.html',
  styleUrl: './tactical-board.css',
})
export class TacticalBoard {
  readonly lesson = input.required<LessonId>();
  /** Faixas da abordagem do agente da vez (intimidação e grupo aumentam). */
  readonly zones = input<ApproachZones>(BASE_APPROACH);
  /** O mapa tem Modo Corrida: quem foge vira perseguição. Sem ele, quem corre só foge. */
  readonly hasChase = input(true);
  /** Fechou (Entendi ou ×), depois da animação de saída. */
  readonly closed = output<void>();

  protected readonly scale = `scale(${CHALK_SCALE})`;
  protected readonly page = signal(0);
  protected readonly closing = signal(false);

  protected readonly heading = computed(() =>
    this.lesson() === 'abordagem' ? 'Abordagem' : 'Interrogatório',
  );

  protected readonly pages = computed<Page[]>(() => {
    if (this.lesson() === 'interrogatorio') {
      return [
        {
          kicker: 'Suspeito rendido',
          title: 'Raio de conversa',
          map: talkMap(),
          notes: [
            {
              text: `Todo suspeito *rendido* tem um raio de ${TALK.radius} hexágono em volta dele.`,
              tone: 'talk',
            },
            { text: 'Pare o agente da vez *dentro do raio*: aparece o botão Conversar.' },
            { text: 'Pode entrar e sair quantas vezes quiser, a qualquer momento da vez.' },
          ],
        },
        {
          kicker: 'Na conversa',
          title: 'Pergunte de perto',
          map: talkInsideMap(),
          notes: [
            {
              text: `A *1ª pergunta* de cada conversa gasta ${TALK.moveCost} de movimento.`,
              tone: 'talk',
            },
            { text: 'Ele pode mentir. *Intimidação* ajuda a arrancar a verdade.' },
            { text: 'Agarrado numa perseguição, chega *abalado*: cede mais fácil.' },
          ],
        },
      ];
    }
    const z = this.zones();
    const [s, r, f] = approachBands(z);
    const chase = this.hasChase();
    return [
      {
        kicker: 'Garimpeiro à vista',
        title: 'Raio de ação',
        map: ringsMap(z),
        notes: [
          { text: `*${s.range} hex · ${s.title}.* ${s.outcome}`, tone: 'surrender' },
          { text: `*${r.range} hex · ${r.title}.* ${r.outcome}`, tone: 'roll' },
          { text: `*${f.range} hex · ${f.title}.* ${f.outcome}`, tone: 'flee' },
        ],
      },
      {
        kicker: 'Antes de gritar',
        title: 'Consequências',
        map: wallMap(z),
        notes: [
          { text: '*Parede*, porta fechada ou carga alta no meio: ele não ouve.' },
          { text: '*Abordar encerra a vez* do agente. Chegue perto antes.' },
          { text: '*Intimidação* e o grupo junto aumentam o raio.', tone: 'surrender' },
        ],
      },
      {
        kicker: 'Se ele fugir',
        title: chase ? 'Perseguição!' : 'Fuga',
        map: chaseMap(),
        notes: chase
          ? [
              { text: 'Quem foge corre para a *saída do mapa* mais perto.', tone: 'flee' },
              { text: 'Um agente perto pode *ir atrás*: vira uma corrida.' },
              {
                text: '*Alcançou:* rendido na hora. Ele chegou na saída: fugiu.',
                tone: 'surrender',
              },
            ]
          : [
              { text: 'Quem foge corre para a *saída do mapa* mais perto.', tone: 'flee' },
              { text: 'Feche o caminho: agentes e paredes *bloqueiam* a fuga.' },
              { text: 'Saiu do mapa: *fugiu*. Aborde de novo antes disso.', tone: 'surrender' },
            ],
        photo: chase ? { src: 'tutorial/perseguicao.jpg', caption: 'Modo perseguição' } : undefined,
      },
    ];
  });

  protected readonly current = computed(
    () => this.pages()[Math.min(this.page(), this.pages().length - 1)],
  );
  protected readonly last = computed(() => this.page() >= this.pages().length - 1);

  constructor() {
    // trocou de lição (rever pelo menu): volta para a primeira página
    effect(() => {
      this.lesson();
      this.page.set(0);
      this.closing.set(false);
    });
  }

  /** Avança (ou fecha, na última página). Também é o ✕ do controle. */
  next(): void {
    if (this.closing()) return;
    if (this.last()) this.close();
    else this.page.update((p) => p + 1);
  }

  prev(): void {
    if (this.page() > 0 && !this.closing()) this.page.update((p) => p - 1);
  }

  go(i: number): void {
    if (!this.closing()) this.page.set(i);
  }

  close(): void {
    if (this.closing()) return;
    this.closing.set(true);
    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => this.closed.emit(), reduced ? 0 : 320);
  }

  /** Separa o destaque (`*assim*`) do resto da frase. */
  protected parts(text: string): { t: string; em: boolean }[] {
    return text
      .split('*')
      .map((t, i) => ({ t, em: i % 2 === 1 }))
      .filter((p) => p.t);
  }
}
