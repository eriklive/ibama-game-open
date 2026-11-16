import { describe, expect, it } from 'vitest';
import {
  APPROACH_FX,
  holdProgress,
  holdRing,
  waveArrival,
  waveBump,
  waveDuration,
} from './approach-fx';
import { APPROACH_RULES } from './enemies';

describe('segurar para abordar', () => {
  it('não conta o toque rápido e fecha depois do tempo de segurar', () => {
    expect(holdProgress(0)).toBe(0);
    expect(holdProgress(APPROACH_FX.tapMs)).toBe(0);
    expect(holdProgress(APPROACH_FX.tapMs + APPROACH_FX.holdMs / 2)).toBeCloseTo(0.5);
    expect(holdProgress(APPROACH_FX.tapMs + APPROACH_FX.holdMs)).toBe(1);
    expect(holdProgress(99999)).toBe(1);
  });

  it('o raio cresce anel por anel até o raio da abordagem', () => {
    expect(holdRing(0)).toBe(0);
    expect(holdRing(0.01)).toBe(1);
    expect(holdRing(0.5)).toBe(2);
    expect(holdRing(1)).toBe(APPROACH_RULES.radius);
  });
});

describe('onda de voz', () => {
  it('chega primeiro em quem está perto', () => {
    expect(waveArrival(1)).toBeLessThan(waveArrival(2));
    expect(waveArrival(0)).toBe(APPROACH_FX.waveDelay);
  });

  it('termina depois de chegar no último anel', () => {
    expect(waveDuration()).toBeGreaterThan(waveArrival(APPROACH_RULES.radius));
    // cabe no orçamento de ~2 s por abordagem (antes do auto)
    expect(waveDuration()).toBeLessThan(2);
  });

  it('o hexágono pula só enquanto a onda passa', () => {
    expect(waveBump(-0.1)).toBe(0);
    expect(waveBump(APPROACH_FX.bumpTime / 2)).toBeCloseTo(1);
    expect(waveBump(APPROACH_FX.bumpTime)).toBe(0);
  });
});
