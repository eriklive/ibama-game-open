import { describe, expect, it } from 'vitest';
import { CHASE_SLOWMO, pulseRate, pulseRestart, pulseTotalMs, slowmoFov, slowmoRate } from './chase-slowmo';
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

describe('SLOWMO_PULSE', () => {
  it('desce em 300 ms, fica parado 1 s e volta em 300 ms (1,6 s)', () => {
    expect(pulseTotalMs()).toBe(1600);
    expect(pulseRate(0)).toBe(1);
    expect(pulseRate(150)).toBeCloseTo(0.5);
    expect(pulseRate(300)).toBe(0);
    expect(pulseRate(1299)).toBe(0);
    expect(pulseRate(1450)).toBeCloseTo(0.5);
    expect(pulseRate(1600)).toBe(1);
  });
  it('emenda um pulso novo na velocidade de agora', () => {
    expect(pulseRate(pulseRestart(1))).toBe(1);
    expect(pulseRate(pulseRestart(0.5))).toBeCloseTo(0.5);
    expect(pulseRate(pulseRestart(0))).toBe(0);
  });
});
