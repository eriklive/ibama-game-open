import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MainButton } from '../main-button';
import { Box, ScreenEllipse, ellipseCore, penLoop, placeNote } from '../../game/mission-intro';

/** Uma estrutura circulada: a elipse na tela (px) e o que escrever do lado. */
export interface IntroMark extends ScreenEllipse {
  label: string;
  notes: string[];
}

/** Segundos entre um círculo e o próximo, e quanto dura cada traço. */
const LOOP_GAP = 1.1;
const LOOP_DRAW = 0.9;

/**
 * Camada da abertura da missão (ver `game/mission-intro.ts`): faixas de cinema, o mapa
 * escurecido com as estruturas em destaque, os círculos a caneta vermelha com a anotação
 * do que fazer em cada uma, o botão grande **Iniciar missão** e o **Pular**. Cobre o
 * tabuleiro inteiro, então nenhum toque chega nele enquanto ela estiver na tela.
 */
@Component({
  selector: 'app-mission-intro',
  imports: [MainButton],
  host: {
    class: 'mission-intro',
    '[class.leaving]': 'leaving()',
    '[class.ready]': 'marks().length > 0',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Objetivos da missão',
  },
  template: `
    <div class="bar top"></div>
    <div class="bar bottom"></div>
    @if (marks().length) {
      <svg class="ink" [attr.viewBox]="'0 0 ' + width() + ' ' + height()" aria-hidden="true">
        <defs>
          <filter id="intro-feather" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur [attr.stdDeviation]="feather()" />
          </filter>
          <mask
            id="intro-holes"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            [attr.width]="width()"
            [attr.height]="height()"
          >
            <rect [attr.width]="width()" [attr.height]="height()" fill="#fff" />
            <g filter="url(#intro-feather)">
              @for (m of marks(); track $index) {
                <ellipse
                  [attr.cx]="m.cx"
                  [attr.cy]="m.cy"
                  [attr.rx]="m.rx * 0.92"
                  [attr.ry]="m.ry * 0.9"
                  fill="#000"
                />
              }
            </g>
          </mask>
          <filter id="intro-marker" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="4" />
          </filter>
          <marker
            id="intro-head"
            viewBox="0 0 20 20"
            refX="10"
            refY="10"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M2 3 L12 10 L2 17" class="head" />
          </marker>
        </defs>
        <rect
          class="dim"
          [attr.width]="width()"
          [attr.height]="height()"
          mask="url(#intro-holes)"
        />
        <g filter="url(#intro-marker)">
          @for (l of loops(); track $index) {
            <path
              class="pen"
              [class.ghost]="l.ghost"
              [attr.d]="l.d"
              pathLength="1"
              [style.animation-delay.s]="l.delay"
              [style.animation-duration.s]="l.dur"
            />
          }
          @for (n of notes(); track $index) {
            @if (n.place.arrow) {
              <path
                class="pen arrow"
                [attr.d]="n.place.arrow"
                pathLength="1"
                marker-end="url(#intro-head)"
                [style.animation-delay.s]="n.delay + 0.25"
              />
            }
          }
        </g>
        @for (n of notes(); track $index) {
          <text
            class="note"
            [attr.text-anchor]="n.place.anchor"
            [style.animation-delay.s]="n.delay"
            [attr.transform]="'rotate(' + n.tilt + ' ' + n.place.x + ' ' + n.place.y + ')'"
          >
            <tspan
              class="label"
              [attr.x]="n.place.x"
              [attr.y]="n.place.y + labelSize()"
              [style.font-size.px]="labelSize()"
            >
              {{ n.label }}
            </tspan>
            @for (line of n.notes; track $index) {
              <tspan
                [attr.x]="n.place.x"
                [attr.dy]="noteSize() * 1.3"
                [style.font-size.px]="noteSize()"
              >
                {{ line }}
              </tspan>
            }
          </text>
        }
      </svg>
      <div #go class="go" [style.animation-delay.s]="buttonDelay()">
        <button
          type="button"
          appMainButton
          class="start"
          (click)="begin.emit()"
          data-testid="intro-start"
        >
          Iniciar missão
        </button>
      </div>
    }
    <button type="button" class="skip" (click)="skip.emit()" data-testid="intro-skip">
      Pular ›
    </button>
  `,
  styleUrl: './mission-intro.css',
})
export class MissionIntro {
  readonly marks = input.required<readonly IntroMark[]>();
  readonly width = input.required<number>();
  readonly height = input.required<number>();
  readonly leaving = input(false);
  readonly begin = output<void>();
  readonly skip = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly goRef = viewChild<ElementRef<HTMLElement>>('go');
  /** Onde está o botão (px, relativo à camada): as anotações desviam dele. */
  private readonly buttonBox = signal<Box | null>(null);

  protected readonly labelSize = computed(() => clamp(this.width() * 0.026, 22, 42));
  protected readonly noteSize = computed(() => clamp(this.width() * 0.0145, 14, 24));
  protected readonly feather = computed(() => Math.min(this.width(), this.height()) * 0.035);

  protected readonly loops = computed(() =>
    this.marks().flatMap((m, i) => {
      const t = 0.3 + i * LOOP_GAP;
      return [
        { d: penLoop(m, 11 + i * 17), ghost: false, delay: t, dur: LOOP_DRAW },
        {
          d: penLoop(
            { ...m, rx: m.rx * 1.03, ry: m.ry * 1.04 },
            29 + i * 13,
            -2.4,
            Math.PI * 2 * 0.55,
          ),
          ghost: true,
          delay: t + 0.7,
          dur: 0.45,
        },
      ];
    }),
  );

  protected readonly notes = computed(() => {
    const w = this.width();
    const h = this.height();
    const label = this.labelSize();
    const note = this.noteSize();
    const marks = this.marks();
    // fora as faixas de cinema; desvia do botão, das outras estruturas e das anotações já postas
    const marginY = Math.max(16, h * 0.06 + 10);
    const button = this.buttonBox();
    const taken: Box[] = button ? [button] : [];
    return marks.map((m, i) => {
      // tamanho do bloco de texto pela fonte de caneta (larga): ~0,62 da altura por letra
      const textW = Math.max(
        m.label.length * label * 0.62,
        ...m.notes.map((n) => n.length * note * 0.6),
      );
      const textH = label * 1.15 + m.notes.length * note * 1.3;
      const others = marks.filter((_, j) => j !== i).map(ellipseCore);
      const place = placeNote(m, textW, textH, w, h, [...taken, ...others], 16, marginY);
      taken.push(place.box);
      return {
        label: m.label,
        notes: m.notes,
        place,
        tilt: i % 2 ? 3 : -4,
        delay: 0.3 + i * LOOP_GAP + 0.55,
      };
    });
  });

  protected readonly buttonDelay = computed(() => 0.3 + this.marks().length * LOOP_GAP + 0.4);

  constructor() {
    const measure = () => {
      const go = this.goRef()?.nativeElement;
      if (!go) return this.buttonBox.set(null);
      // pelo tamanho de layout (o "pop" de entrada escala o botão), centrado na camada
      const host = this.host.nativeElement;
      const hw = go.offsetWidth / 2 + 10;
      const hh = go.offsetHeight / 2 + 10;
      const cx = host.clientWidth / 2;
      const cy = host.clientHeight / 2;
      this.buttonBox.set({ x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh });
    };
    const observer = new ResizeObserver(measure);
    effect(() => {
      const go = this.goRef()?.nativeElement;
      observer.disconnect();
      if (go) observer.observe(go);
      this.width();
      this.height();
      measure();
    });
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
