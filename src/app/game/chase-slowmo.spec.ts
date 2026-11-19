import { describe, expect, it } from 'vitest';
import { CHASE_SLOWMO, slowmoFov, slowmoRate } from './chase-slowmo';
import { CHASE_MUSIC } from './sound.service';

describe('CHASE_SLOWMO', () => {
  it('a fita da música usa os mesmos números da cena', () => {
    expect(CHASE_MUSIC.slowRate).toBe(CHASE_SLOWMO.rate);
    expect(CHASE_MUSIC.slowRamp).toBe(CHASE_SLOWMO.slowRamp);
    expect(CHASE_MUSIC.resumeRamp).toBe(CHASE_SLOWMO.resumeRamp);
  });
  it('a velocidade vai de 1 ao fundo do slow', () => {
    expect(slowmoRate(0)).toBe(1);
    expect(slowmoRate(1)).toBe(CHASE_SLOWMO.rate);
    expect(slowmoRate(2)).toBe(CHASE_SLOWMO.rate);
  });
  it('zoom pequeno, proporcional ao slow', () => {
    expect(slowmoFov(48, 1)).toBe(48);
    const full = slowmoFov(48, CHASE_SLOWMO.rate);
    expect(full).toBeLessThan(48);
    expect(full).toBeGreaterThan(48 * 0.85);
  });
});
