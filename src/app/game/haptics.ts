import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ibama.vibration';

/** Padrão da rolagem: pancadinhas que vão perdendo força, como os dados quicando (~1,5 s). */
export const ROLL_PATTERN: readonly number[] = [35, 110, 28, 170, 22, 240, 16, 320, 10];
/** Toque curto quando os dados param e o resultado aparece. */
export const SETTLE_PATTERN: readonly number[] = [45];

/** Vibração do celular (Vibration API); pode ser desligada no menu e fica guardada no navegador. */
@Injectable({ providedIn: 'root' })
export class Haptics {
  /** O aparelho/navegador vibra? (iPhone/Safari e computadores, em geral, não.) */
  readonly supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  readonly enabled = signal<boolean>(this.load());

  setEnabled(on: boolean): void {
    this.enabled.set(on);
    if (!on) this.stop();
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    } catch {
      // sem armazenamento (aba anônima, por exemplo): vale só nesta sessão
    }
  }

  vibrate(pattern: number | readonly number[]): void {
    if (!this.supported || !this.enabled()) return;
    try {
      navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
    } catch {
      // alguns navegadores recusam vibrar sem um toque recente na página
    }
  }

  stop(): void {
    if (!this.supported) return;
    try {
      navigator.vibrate(0);
    } catch {
      // idem
    }
  }

  private load(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  }
}
