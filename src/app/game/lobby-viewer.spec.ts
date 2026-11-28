import { describe, expect, it } from 'vitest';
import { LOBBY_SPACING, slotX } from './lobby-viewer';

describe('palco do lobby', () => {
  it('a fila fica centrada, um personagem por coluna, na ordem da equipe', () => {
    expect([0, 1, 2].map((i) => slotX(i, 3))).toEqual([-LOBBY_SPACING, 0, LOBBY_SPACING]);
    expect(slotX(0, 2)).toBe(-slotX(1, 2));
  });
});
