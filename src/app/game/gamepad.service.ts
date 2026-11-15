import { Injectable, OnDestroy, signal } from '@angular/core';
import {
  DirectionRepeater,
  PadButton,
  PadInfo,
  PadState,
  RawPad,
  Stick,
  padDirection,
  padInfo,
  pressedNow,
  readPad,
} from './gamepad';

/** O que uma tela quer ouvir do controle. Só a tela mais recente (topo da pilha) recebe. */
export interface PadHandlers {
  /** Botão acabou de ser apertado. */
  button?(b: PadButton): void;
  /** Direcional / analógico esquerdo, com repetição ao segurar (x direita, y baixo). */
  move?(dir: Stick): void;
  /** Todo quadro, para o que é contínuo (câmera no analógico direito, zoom nos gatilhos). */
  frame?(dt: number, state: PadState): void;
}

interface VibratingPad {
  vibrationActuator?: {
    playEffect?(type: string, params: Record<string, number>): Promise<unknown>;
  } | null;
}

/**
 * Lê o controle a cada quadro (a Gamepad API não tem eventos de botão).
 * O navegador só mostra o controle depois do primeiro botão apertado com a página aberta.
 */
@Injectable({ providedIn: 'root' })
export class GamepadService implements OnDestroy {
  /** Controle conectado (ou `null`): a interface troca os textos de toque pelos botões. */
  readonly pad = signal<PadInfo | null>(null);

  private readonly listeners: PadHandlers[] = [];
  private readonly repeater = new DirectionRepeater();
  private prev: PadState | null = null;
  private index: number | null = null;
  private frameId = 0;
  private last = 0;
  private readonly supported = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';

  constructor() {
    if (!this.supported) return;
    window.addEventListener('gamepadconnected', this.onConnect);
    window.addEventListener('gamepaddisconnected', this.onDisconnect);
    this.onConnect();
  }

  /** Registra uma tela; devolve a função que a remove. */
  listen(handlers: PadHandlers): () => void {
    this.listeners.push(handlers);
    // a tela nova não herda um botão que ainda está apertado
    this.prev = this.read();
    this.repeater.reset();
    this.ensureLoop();
    return () => {
      const i = this.listeners.indexOf(handlers);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  /** Vibração curta (DualShock 4 no Chrome/Edge). Ignorada onde não há suporte. */
  rumble(strong: number, weak: number, ms: number): void {
    const gp = this.raw() as (Gamepad & VibratingPad) | null;
    gp?.vibrationActuator?.playEffect?.('dual-rumble', {
      duration: ms,
      strongMagnitude: strong,
      weakMagnitude: weak,
    })?.catch(() => undefined);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    if (!this.supported) return;
    window.removeEventListener('gamepadconnected', this.onConnect);
    window.removeEventListener('gamepaddisconnected', this.onDisconnect);
  }

  private raw(): Gamepad | null {
    if (!this.supported) return null;
    const pads = navigator.getGamepads();
    if (this.index !== null && pads[this.index]?.connected) return pads[this.index];
    return null;
  }

  private read(): PadState | null {
    const gp = this.raw();
    return gp ? readPad(gp as unknown as RawPad) : null;
  }

  /** Escolhe o controle: o primeiro conectado, preferindo um DualShock. */
  private pick(): void {
    const pads = [...navigator.getGamepads()].filter((p): p is Gamepad => !!p?.connected);
    const chosen = pads.find((p) => padInfo(p.id).dualshock) ?? pads[0];
    this.index = chosen ? chosen.index : null;
    const info = chosen ? padInfo(chosen.id) : null;
    if (info?.id !== this.pad()?.id) this.pad.set(info);
    this.prev = this.read();
    this.repeater.reset();
  }

  private onConnect = (): void => {
    this.pick();
    this.ensureLoop();
  };

  private onDisconnect = (): void => this.pick();

  private ensureLoop(): void {
    if (this.frameId || !this.supported) return;
    this.last = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  private tick = (now: number): void => {
    this.frameId = 0;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    // alguns navegadores não disparam "gamepadconnected" se o controle já estava ligado
    if (this.index === null || !this.raw()) this.pick();
    const state = this.read();
    const top = this.listeners.at(-1);
    if (state && top && document.visibilityState === 'visible') {
      for (const b of pressedNow(this.prev, state)) top.button?.(b);
      const dir = this.repeater.update(padDirection(state), now);
      if (dir) top.move?.(dir);
      top.frame?.(dt, state);
    }
    this.prev = state;
    // continua lendo enquanto alguém escuta ou há controle a acompanhar
    if (this.listeners.length || this.index !== null) this.frameId = requestAnimationFrame(this.tick);
  };
}
