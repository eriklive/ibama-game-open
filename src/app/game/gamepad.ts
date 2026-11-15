/**
 * Leitura de controles pela Gamepad API, pensada para o DualShock 4 (PS4).
 * Aqui ficam só funções puras (testadas); o laço de leitura está em `gamepad.service.ts`.
 */
import { HexCoord, hexNeighbors, hexToWorld } from './hex';

export type PadButton =
  | 'cross'
  | 'circle'
  | 'square'
  | 'triangle'
  | 'l1'
  | 'r1'
  | 'l2'
  | 'r2'
  | 'share'
  | 'options'
  | 'l3'
  | 'r3'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'ps'
  | 'touchpad';

export const PAD_BUTTONS: readonly PadButton[] = [
  'cross', 'circle', 'square', 'triangle', 'l1', 'r1', 'l2', 'r2', 'share', 'options',
  'l3', 'r3', 'up', 'down', 'left', 'right', 'ps', 'touchpad',
];

/** Família do controle: decide os símbolos mostrados na tela (✕ ○ □ △ ou A B X Y). */
export type PadKind = 'playstation' | 'xbox' | 'generic';

export interface PadInfo {
  id: string;
  kind: PadKind;
  /** É um DualShock 4 (ou outro controle da Sony) reconhecido pelo id. */
  dualshock: boolean;
}

export interface Stick {
  x: number;
  y: number;
}

/** Estado de um quadro: valor de cada botão (0–1) e os dois analógicos (y positivo = para baixo). */
export interface PadState {
  buttons: Record<PadButton, number>;
  left: Stick;
  right: Stick;
}

/** Formas mínimas da Gamepad API (facilita os testes sem navegador). */
export interface RawButton {
  pressed: boolean;
  value: number;
}
export interface RawPad {
  id: string;
  mapping: string;
  buttons: readonly RawButton[];
  axes: readonly number[];
}

/** Layout "standard" do W3C: é o que o Chrome/Edge (e o Safari) entregam para o DualShock 4. */
const STANDARD: Record<PadButton, number> = {
  cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, share: 8, options: 9,
  l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15, ps: 16, touchpad: 17,
};

/**
 * DualShock 4 sem mapeamento "standard" (Firefox no Linux, driver hid-sony/hid-playstation):
 * os botões seguem a ordem do evdev e o direcional vira os eixos 6 e 7.
 */
const DS4_LINUX: Record<Exclude<PadButton, 'up' | 'down' | 'left' | 'right' | 'touchpad'>, number> = {
  cross: 0, circle: 1, triangle: 2, square: 3, l1: 4, r1: 5, l2: 6, r2: 7, share: 8, options: 9,
  ps: 10, l3: 11, r3: 12,
};

const SONY = /054c|dualshock|dualsense|wireless controller|playstation|ps4|ps5/i;
const XBOX = /045e|xbox|xinput/i;

export function padInfo(id: string): PadInfo {
  const dualshock = SONY.test(id);
  return { id, dualshock, kind: dualshock ? 'playstation' : XBOX.test(id) ? 'xbox' : 'generic' };
}

const btn = (pad: RawPad, i: number): number => {
  const b = pad.buttons[i];
  return b ? Math.max(b.value, b.pressed ? 1 : 0) : 0;
};

/** Traduz o controle bruto para nomes de botões do DualShock 4. */
export function readPad(pad: RawPad): PadState {
  const buttons = {} as Record<PadButton, number>;
  const axis = (i: number) => pad.axes[i] ?? 0;
  if (pad.mapping !== 'standard' && padInfo(pad.id).dualshock && pad.axes.length >= 8) {
    for (const b of PAD_BUTTONS) buttons[b] = 0;
    for (const [name, i] of Object.entries(DS4_LINUX)) buttons[name as PadButton] = btn(pad, i);
    const dx = axis(6);
    const dy = axis(7);
    buttons.left = dx < -0.5 ? 1 : 0;
    buttons.right = dx > 0.5 ? 1 : 0;
    buttons.up = dy < -0.5 ? 1 : 0;
    buttons.down = dy > 0.5 ? 1 : 0;
    return { buttons, left: { x: axis(0), y: axis(1) }, right: { x: axis(3), y: axis(4) } };
  }
  for (const b of PAD_BUTTONS) buttons[b] = btn(pad, STANDARD[b]);
  return { buttons, left: { x: axis(0), y: axis(1) }, right: { x: axis(2), y: axis(3) } };
}

/** Zona morta radial, reescalando o resto para 0–1 (o analógico do DS4 "folga" uns 10%). */
export function deadzone(s: Stick, dead = 0.25): Stick {
  const m = Math.hypot(s.x, s.y);
  if (m < dead) return { x: 0, y: 0 };
  const k = Math.min(1, (m - dead) / (1 - dead)) / m;
  return { x: s.x * k, y: s.y * k };
}

/**
 * Direção pedida no quadro: o direcional tem prioridade; senão, o analógico esquerdo
 * quantizado em 8 setores (para o cursor não "tremer" entre dois vizinhos).
 */
export function padDirection(s: PadState, dead = 0.5): Stick | null {
  const b = s.buttons;
  const dx = (b.right > 0.5 ? 1 : 0) - (b.left > 0.5 ? 1 : 0);
  const dy = (b.down > 0.5 ? 1 : 0) - (b.up > 0.5 ? 1 : 0);
  if (dx || dy) return { x: dx, y: dy };
  if (Math.hypot(s.left.x, s.left.y) < dead) return null;
  const sector = Math.round(Math.atan2(s.left.y, s.left.x) / (Math.PI / 4));
  const a = sector * (Math.PI / 4);
  const r = (v: number) => Math.round(v * 1e6) / 1e6 + 0;
  return { x: r(Math.cos(a)), y: r(Math.sin(a)) };
}

/**
 * Vizinho de `from` na direção de tela pedida (x para a direita, y para baixo).
 * A câmera olha o tabuleiro de frente: direita = +X e baixo = +Z no mundo.
 * Direções quase horizontais andam pela mesma fileira (no odd-q, `col ± 1` na mesma
 * `row` é sempre vizinho), para o cursor não subir/descer sozinho.
 */
export function neighborToward(from: HexCoord, dir: Stick): HexCoord {
  if (Math.abs(dir.y) < Math.abs(dir.x) * 0.4) {
    return { col: from.col + Math.sign(dir.x), row: from.row };
  }
  const o = hexToWorld(from, 1);
  const len = Math.hypot(dir.x, dir.y) || 1;
  let best = from;
  let bestDot = -Infinity;
  for (const n of hexNeighbors(from)) {
    const p = hexToWorld(n, 1);
    const vx = p.x - o.x;
    const vz = p.z - o.z;
    const dot = (vx * dir.x + vz * dir.y) / (Math.hypot(vx, vz) * len);
    if (dot > bestDot) {
      bestDot = dot;
      best = n;
    }
  }
  return best;
}

/**
 * Repetição de direção segurada, como num teclado: dispara na hora, espera `delay` ms
 * e depois repete a cada `interval` ms. Mudar de direção dispara de novo na hora.
 */
export class DirectionRepeater {
  private current: string | null = null;
  private next = 0;

  constructor(
    private readonly delay = 300,
    private readonly interval = 130,
  ) {}

  update(dir: Stick | null, now: number): Stick | null {
    const key = dir ? `${dir.x},${dir.y}` : null;
    if (key !== this.current) {
      this.current = key;
      this.next = now + this.delay;
      return dir;
    }
    if (dir && now >= this.next) {
      this.next = now + this.interval;
      return dir;
    }
    return null;
  }

  reset(): void {
    this.current = null;
  }
}

/** Botões que acabaram de ser apertados neste quadro. */
export function pressedNow(prev: PadState | null, cur: PadState, threshold = 0.5): PadButton[] {
  return PAD_BUTTONS.filter((b) => cur.buttons[b] >= threshold && (prev?.buttons[b] ?? 0) < threshold);
}

/** Ações da interface e o botão de cada família de controle. */
export type PadAction = 'confirm' | 'cancel' | 'approach' | 'endTurn' | 'group' | 'prev' | 'next' | 'help';

const GLYPHS: Record<PadKind, Record<PadAction, string>> = {
  playstation: { confirm: '✕', cancel: '○', approach: '□', endTurn: '△', group: 'Share', prev: 'L1', next: 'R1', help: 'Options' },
  xbox: { confirm: 'A', cancel: 'B', approach: 'X', endTurn: 'Y', group: 'View', prev: 'LB', next: 'RB', help: 'Menu' },
  generic: { confirm: 'A', cancel: 'B', approach: 'X', endTurn: 'Y', group: 'Select', prev: 'LB', next: 'RB', help: 'Start' },
};

export const glyphFor = (kind: PadKind, action: PadAction): string => GLYPHS[kind][action];
