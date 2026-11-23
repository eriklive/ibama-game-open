import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Pt, Rect, TabletMarkIn, layoutTablet, ringPath } from './tablet-layout';

/** O que o tablet mostra: quem abordou, onde (px da tela) e cada suspeito com o resultado. */
export interface TabletReport {
  agent: string;
  round: number;
  op: string;
  /** Hexágono de quem abordou (a "coordenada" do aparelho). */
  hex: { col: number; row: number };
  radius: number;
  agentAt: Pt | null;
  /** Alcance da voz de prisão no chão, projetado na tela. */
  ring: readonly Pt[];
  marks: readonly TabletMarkIn[];
}

/** Quanto dura o desligar (tela apaga e o tablet desce) antes de a vez passar (ms). */
export const TABLET_CLOSE_MS = 900;

const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Retângulo do elemento sem as transformações (o tablet ainda sobe quando é medido). */
function layoutRect(el: HTMLElement): Rect {
  let x = 0;
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft + (n === el ? 0 : n.clientLeft);
    y += n.offsetTop + (n === el ? 0 : n.clientTop);
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/**
 * Auto de abordagem no tablet de campo: o aparelho sobe da base da tela e a tela dele é uma lente
 * verde sobre o próprio tabuleiro (`backdrop-filter`), com grade tática, retículas e os rabiscos
 * da caneta. Um controle só: a tecla física Confirmar, que desliga a tela, guarda o tablet e só
 * então avisa (`confirmed`) para a vez passar.
 */
@Component({
  selector: 'app-approach-tablet',
  templateUrl: './approach-tablet.html',
  styleUrl: './approach-tablet.css',
})
export class ApproachTablet {
  readonly report = input.required<TabletReport>();
  /** Controle conectado: mostra o botão do controle na tecla. */
  readonly pad = input(false);
  readonly padGlyph = input('');
  readonly confirmed = output<void>();

  private readonly screen = viewChild.required<ElementRef<HTMLElement>>('screen');
  private readonly key = viewChild.required<ElementRef<HTMLButtonElement>>('key');
  private readonly rect = signal<Rect | null>(null);
  protected readonly closing = signal(false);
  protected readonly pressed = signal(false);
  /** Hora do aparelho (fica parada enquanto o auto está aberto). */
  protected readonly clock = new Date().toTimeString().slice(0, 5);

  protected readonly view = computed(() => {
    const r = this.rect();
    const rep = this.report();
    if (!r) return null;
    const small = r.h < 300;
    const marks = layoutTablet(
      rep.marks,
      rep.agentAt,
      r,
      small ? { top: 26, bottom: 24 } : { top: 40, bottom: 30 },
    );
    const ringLabel = rep.ring.length ? rep.ring.reduce((a, b) => (b.x > a.x ? b : a)) : null;
    return {
      viewBox: `${r.x} ${r.y} ${r.w} ${r.h}`,
      ring: ringPath(rep.ring),
      ringLabel,
      agent: rep.agentAt,
      marks,
    };
  });

  protected readonly tally = computed(() => {
    const ms = this.report().marks;
    const s = ms.filter((m) => m.result === 'surrender').length;
    const f = ms.length - s;
    return [
      s && `${s} ${s === 1 ? 'rendido' : 'rendidos'}`,
      f && `${f} ${f === 1 ? 'alertado' : 'alertados'}`,
    ]
      .filter(Boolean)
      .join(' · ');
  });

  /** Quando a tecla acende (os rabiscos acabaram), em s desde que o tablet começou a subir. */
  protected readonly readyAt = computed(
    () => 1.55 + this.stagger(this.report().marks.length) + 0.6,
  );

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.screen().nativeElement;
      const measure = () => this.rect.set(layoutRect(el));
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      addEventListener('resize', measure);
      destroy.onDestroy(() => {
        ro.disconnect();
        removeEventListener('resize', measure);
      });
      this.key().nativeElement.focus({ preventScroll: true });
    });
  }

  /** Atraso do i-ésimo suspeito (s): um depois do outro, mais rápido quando são muitos. */
  protected stagger(i: number): number {
    return i * Math.max(0.14, 0.32 - Math.max(0, i - 3) * 0.03);
  }

  /** Aperta a tecla Confirmar (toque, teclado ou ✕ do controle). */
  press(): void {
    if (this.closing()) return;
    this.pressed.set(true);
    this.closing.set(true);
    setTimeout(() => this.pressed.set(false), 140);
    setTimeout(() => this.confirmed.emit(), reducedMotion() ? 0 : TABLET_CLOSE_MS);
  }
}
