import {
  Directive,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { rollDie } from '../../game/dice';
import { DieModel, DieScene, DieTone } from './die-scene';

const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Base dos componentes de dado (`app-d4`, `app-d20`…). Cada instância é **um** dado 3D num
 * canvas próprio, de fundo transparente, que ocupa o tamanho do elemento (quem usa define
 * largura e altura no CSS).
 *
 * Assim que aparece na tela o dado é lançado: sorteia o resultado (ou usa `value`, se vier),
 * roda a animação e, quando para, emite `rolled` com o valor que ficou para cima. Para
 * jogar de novo, chame `roll()` ou recrie o componente. Sem WebGL, cai num desenho 2D que
 * gira e para no mesmo resultado.
 */
@Directive({
  host: {
    role: 'img',
    '[attr.aria-label]': 'label()',
    '[class.die-rolling]': 'result() === null',
    '[class.die-flat]': 'flat()',
  },
})
export abstract class DieComponent implements OnDestroy {
  /** Número de faces (4, 20…). */
  abstract readonly sides: number;
  protected abstract createModel(): DieModel;

  /** Resultado imposto; sem ele, o próprio dado sorteia. */
  readonly value = input<number | undefined>(undefined);
  /** Duração do lance em ms (com animação reduzida, o dado aparece já parado). */
  readonly duration = input(1500);
  /** Espera antes de cair, em ms (para dados lançados juntos não caírem em uníssono). */
  readonly delay = input(0);
  /** Lança sem animação. Padrão: segue a preferência de animação reduzida do sistema. */
  readonly instant = input(reducedMotion());
  /** Cor do brilho quando para (`pass`/`fail` para testes que passam ou falham). */
  readonly tone = input<DieTone>('gold');

  /** Emite o resultado quando o dado para. */
  readonly rolled = output<number>();

  /** Resultado da última rolagem; `null` enquanto o dado ainda está rolando. */
  readonly result = signal<number | null>(null);
  /** Face à mostra no desenho 2D (gira enquanto rola). */
  protected readonly face = signal(1);
  /** Sem WebGL: desenho 2D. */
  protected readonly flat = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private scene?: DieScene;
  private spin?: ReturnType<typeof setInterval>;
  private flatTimer?: ReturnType<typeof setTimeout>;
  private destroyed = false;
  /** Muda a cada `roll()`: lances antigos não emitem resultado. */
  private throwId = 0;

  constructor() {
    afterNextRender(() => {
      try {
        this.scene = new DieScene(this.host, this.createModel());
        // a fonte do jogo pode chegar depois: redesenha as faces quando estiver pronta
        document.fonts?.ready.then(() => this.scene?.redraw()).catch(() => undefined);
      } catch {
        this.flat.set(true);
      }
      void this.roll(this.value());
    });
    effect(() => this.scene?.setTone(this.tone()));
  }

  protected label(): string {
    const r = this.result();
    return r === null ? `Rolando o d${this.sides}…` : `d${this.sides}: ${r}`;
  }

  /** Lança o dado (de novo); resolve com o resultado quando ele para. */
  roll(value?: number): Promise<number> {
    const final = value ?? rollDie(this.sides);
    const id = ++this.throwId;
    this.result.set(null);
    clearInterval(this.spin);
    clearTimeout(this.flatTimer);
    const instant = this.instant();
    const settle = (): number => {
      if (this.destroyed || id !== this.throwId) return final;
      clearInterval(this.spin);
      this.face.set(final);
      this.result.set(final);
      this.rolled.emit(final);
      return final;
    };
    if (this.scene) {
      this.scene.setTone(this.tone());
      return this.scene
        .throw(final, { duration: instant ? 0 : this.duration(), delay: this.delay() })
        .then(settle);
    }
    // desenho 2D: a face troca de número enquanto gira
    if (!instant) this.spin = setInterval(() => this.face.set(rollDie(this.sides)), 70);
    return new Promise((resolve) => {
      this.flatTimer = setTimeout(
        () => resolve(settle()),
        instant ? 0 : this.delay() + this.duration() * 0.6,
      );
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearInterval(this.spin);
    clearTimeout(this.flatTimer);
    this.scene?.dispose();
    this.scene = undefined;
  }
}
