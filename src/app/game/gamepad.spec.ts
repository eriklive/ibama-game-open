import { describe, expect, it } from 'vitest';
import {
  DirectionRepeater,
  PadState,
  RawPad,
  deadzone,
  glyphFor,
  neighborToward,
  padDirection,
  padInfo,
  pressedNow,
  readPad,
} from './gamepad';
import { hexNeighbors, sameHex } from './hex';

const raw = (mapping: string, pressed: number[], axes: number[] = [0, 0, 0, 0], id = 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)'): RawPad => ({
  id,
  mapping,
  axes,
  buttons: Array.from({ length: 18 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })),
});

const idle = (): PadState => readPad(raw('standard', []));

describe('reconhecimento do controle', () => {
  it('identifica o DualShock 4 pelo id do Chrome e do Firefox', () => {
    expect(padInfo('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)')).toMatchObject({ kind: 'playstation', dualshock: true });
    expect(padInfo('054c-05c4-Sony Computer Entertainment Wireless Controller').dualshock).toBe(true);
    expect(padInfo('Xbox 360 Controller (XInput STANDARD GAMEPAD)').kind).toBe('xbox');
    expect(padInfo('USB Gamepad').kind).toBe('generic');
  });

  it('mostra os símbolos do PlayStation ou as letras do Xbox', () => {
    expect(glyphFor('playstation', 'confirm')).toBe('✕');
    expect(glyphFor('playstation', 'endTurn')).toBe('△');
    expect(glyphFor('xbox', 'confirm')).toBe('A');
  });
});

describe('leitura dos botões', () => {
  it('no mapeamento standard, 0 é ✕, 3 é △ e 12–15 são o direcional', () => {
    const s = readPad(raw('standard', [0, 3, 12, 17], [0.5, -0.2, 0.1, 0.9]));
    expect(s.buttons.cross).toBe(1);
    expect(s.buttons.triangle).toBe(1);
    expect(s.buttons.up).toBe(1);
    expect(s.buttons.touchpad).toBe(1);
    expect(s.buttons.circle).toBe(0);
    expect(s.left).toEqual({ x: 0.5, y: -0.2 });
    expect(s.right).toEqual({ x: 0.1, y: 0.9 });
  });

  it('DualShock 4 sem mapeamento standard (Firefox/Linux): △ e □ trocados e direcional nos eixos 6 e 7', () => {
    const s = readPad(raw('', [2, 3], [0, 0, -1, 0.3, 0.4, -1, 1, -1], '054c-09cc-Wireless Controller'));
    expect(s.buttons.triangle).toBe(1);
    expect(s.buttons.square).toBe(1);
    expect(s.buttons.right).toBe(1);
    expect(s.buttons.up).toBe(1);
    expect(s.right).toEqual({ x: 0.3, y: 0.4 });
  });

  it('só conta o botão no quadro em que ele desce', () => {
    const down = readPad(raw('standard', [0]));
    expect(pressedNow(idle(), down)).toEqual(['cross']);
    expect(pressedNow(down, down)).toEqual([]);
  });

  it('zona morta zera folgas pequenas e chega a 1 no fim do curso', () => {
    expect(deadzone({ x: 0.1, y: 0.1 })).toEqual({ x: 0, y: 0 });
    expect(Math.hypot(...Object.values(deadzone({ x: 1, y: 0 })))).toBeCloseTo(1);
  });
});

describe('direção e cursor', () => {
  it('o direcional manda; o analógico é quantizado em 8 direções', () => {
    expect(padDirection(readPad(raw('standard', [15])))).toEqual({ x: 1, y: 0 });
    expect(padDirection(readPad(raw('standard', [], [0.9, -0.1, 0, 0])))).toEqual({ x: 1, y: 0 });
    const diag = padDirection(readPad(raw('standard', [], [0.6, 0.6, 0, 0])))!;
    expect(diag.x).toBeCloseTo(Math.SQRT1_2);
    expect(diag.y).toBeCloseTo(Math.SQRT1_2);
    expect(padDirection(idle())).toBeNull();
  });

  it('cima e baixo andam na coluna; esquerda e direita, na mesma fileira', () => {
    const h = { col: 4, row: 4 };
    expect(neighborToward(h, { x: 0, y: -1 })).toEqual({ col: 4, row: 3 });
    expect(neighborToward(h, { x: 0, y: 1 })).toEqual({ col: 4, row: 5 });
    expect(neighborToward(h, { x: 1, y: 0 })).toEqual({ col: 5, row: 4 });
    expect(neighborToward({ col: 5, row: 4 }, { x: -1, y: 0 })).toEqual({ col: 4, row: 4 });
  });

  it('toda direção leva a um vizinho de verdade', () => {
    for (const h of [{ col: 4, row: 4 }, { col: 5, row: 4 }]) {
      for (let a = 0; a < 8; a++) {
        const dir = { x: Math.cos((a * Math.PI) / 4), y: Math.sin((a * Math.PI) / 4) };
        const n = neighborToward(h, dir);
        expect(hexNeighbors(h).some((x) => sameHex(x, n))).toBe(true);
      }
    }
  });

  it('segurar a direção repete depois de uma pausa', () => {
    const r = new DirectionRepeater(300, 100);
    const right = { x: 1, y: 0 };
    expect(r.update(right, 0)).toEqual(right);
    expect(r.update(right, 200)).toBeNull();
    expect(r.update(right, 300)).toEqual(right);
    expect(r.update(right, 350)).toBeNull();
    expect(r.update(right, 400)).toEqual(right);
    expect(r.update(null, 410)).toBeNull();
    expect(r.update(right, 420)).toEqual(right);
  });
});
