import { describe, expect, it } from 'vitest';
import {
  APPROACH_FX,
  waveArrival,
  waveBump,
  waveDuration,
} from './approach-fx';
import { BASE_APPROACH } from './enemies';

describe('onda de voz', () => {
  it('chega primeiro em quem está perto', () => {
    expect(waveArrival(1)).toBeLessThan(waveArrival(2));
    expect(waveArrival(0)).toBe(APPROACH_FX.waveDelay);
  });

  it('termina depois de chegar no último anel', () => {
    expect(waveDuration()).toBeGreaterThan(waveArrival(BASE_APPROACH.radius));
    // cabe no orçamento de ~2 s por abordagem (antes do auto)
    expect(waveDuration()).toBeLessThan(2);
  });

  it('o hexágono pula só enquanto a onda passa', () => {
    expect(waveBump(-0.1)).toBe(0);
    expect(waveBump(APPROACH_FX.bumpTime / 2)).toBeCloseTo(1);
    expect(waveBump(APPROACH_FX.bumpTime)).toBe(0);
  });
});
