import { describe, expect, it } from 'vitest';
import { LaneObstacle, RUNNER_RULES, RunnerEvent, RunnerRace, shownDistance, tacticalIndex } from './runner';

const R = RUNNER_RULES;
/** Obstáculo a `d` fileiras da largada (o caminho dos testes começa em 0). */
const ob = (d: number, lane: 0 | 1 | 2, move: LaneObstacle['move'], kind = 'x'): LaneObstacle => ({ at: d, lane, move, kind });

/** Roda em quadros de 1/60 s até `seconds` (ou até acabar), chamando `each` antes de cada quadro. */
function run(race: RunnerRace, seconds: number, each?: (t: number) => void): RunnerEvent[] {
  const ev: RunnerEvent[] = [];
  const dt = 1 / 60;
  for (let t = 0; t < seconds - 1e-9 && !race.over; t += dt) {
    each?.(t);
    ev.push(...race.step(dt));
  }
  return ev;
}
const types = (ev: RunnerEvent[]) => ev.map((e) => e.type);

describe('RunnerRace: distância e fim', () => {
  it('sem obstáculos os dois correm igual: a distância não muda e ele foge no fim do mapa', () => {
    const race = new RunnerRace({ obstacles: [], startAt: 0, length: 100, hexes: 3, rollEnemy: () => 20 });
    expect(race.distance()).toBe(3);
    run(race, 5);
    expect(race.distance()).toBe(3);
    run(race, 60);
    expect(race.over).toBe('fugiu');
  });

  it('a corrida (gás) aproxima e ele é agarrado', () => {
    const race = new RunnerRace({ obstacles: [], startAt: 0, length: 200, hexes: 2, rollEnemy: () => 20 });
    let ev: RunnerEvent[] = [];
    for (let i = 0; i < 600 && !race.over; i++) ev = ev.concat(race.step(1 / 60, 1.5));
    expect(race.over).toBe('agarrou');
    expect(types(ev)).toContain('agarrou');
  });

  it('o placar conta hexágonos: 2 fileiras por hexágono, menos a de encostar', () => {
    expect(shownDistance(R.catchRows)).toBe(0);
    expect(shownDistance(R.catchRows + R.rowsPerHex)).toBe(1);
    expect(shownDistance(R.catchRows + R.rowsPerHex + 0.1)).toBe(2);
  });
});

describe('RunnerRace: o agente e os obstáculos', () => {
  it('passar por carga alta na faixa dele: bate, tropeça e perde 1 hexágono', () => {
    const race = new RunnerRace({ obstacles: [ob(5, 1, 'desviar')], startAt: 0, length: 100, hexes: 3, rollEnemy: () => 20 });
    // ele desvia sozinho; o agente segue no meio
    const ev = run(race, 2.5);
    expect(types(ev)).toContain('bateu');
    expect(race.distance()).toBe(4);
  });

  it('trocar de faixa antes da carga alta: passa sem bater', () => {
    const race = new RunnerRace({ obstacles: [ob(5, 1, 'desviar')], startAt: 0, length: 100, hexes: 3, rollEnemy: () => 20 });
    race.move(1);
    const ev = run(race, 2.5);
    expect(types(ev)).not.toContain('bateu');
    expect(race.lane('agente')).toBe(2);
    expect(race.distance()).toBe(3);
  });

  it('pular na hora certa passa a tora; sem pular, bate', () => {
    const lead = 0.25; // s antes de chegar
    const make = () => new RunnerRace({ obstacles: [ob(4, 1, 'pular', 'tora')], startAt: 0, length: 100, hexes: 2, enemyLane: 0, rollEnemy: () => 20 });
    const ok = make();
    const at = 4 / R.rowsPerSecond - lead;
    const ev = run(ok, 2, (t) => t >= at && t < at + 1 / 60 && ok.jump());
    expect(ev.some((e) => e.type === 'passou' && e.who === 'agente')).toBe(true);
    const bad = make();
    expect(types(run(bad, 2))).toContain('bateu');
  });

  it('pular cedo demais não serve: o pulo acaba antes da tora', () => {
    const race = new RunnerRace({ obstacles: [ob(10, 1, 'pular')], startAt: 0, length: 100, hexes: 2, enemyLane: 0, rollEnemy: () => 20 });
    race.jump();
    expect(types(run(race, 3))).toContain('bateu');
  });

  it('deslizar passa por baixo da asa; pular não', () => {
    const at = 4 / R.rowsPerSecond - 0.3;
    const slide = new RunnerRace({ obstacles: [ob(4, 1, 'deslizar', 'aviao')], startAt: 0, length: 100, hexes: 2, enemyLane: 2, rollEnemy: () => 20 });
    const ev = run(slide, 2, (t) => t >= at && t < at + 1 / 60 && slide.slide());
    expect(types(ev)).not.toContain('bateu');
    const jump = new RunnerRace({ obstacles: [ob(4, 1, 'deslizar', 'aviao')], startAt: 0, length: 100, hexes: 2, enemyLane: 2, rollEnemy: () => 20 });
    expect(types(run(jump, 2, (t) => t >= at && t < at + 1 / 60 && jump.jump()))).toContain('bateu');
  });

  it('a faixa não passa das bordas', () => {
    const race = new RunnerRace({ obstacles: [], startAt: 0, length: 100, hexes: 2, agentLane: 0, rollEnemy: () => 20 });
    expect(race.move(-1)).toBe(false);
    expect(race.move(1)).toBe(true);
    expect(race.move(1)).toBe(true);
    expect(race.move(1)).toBe(false);
  });
});

describe('RunnerRace: o garimpeiro', () => {
  it('sai da faixa com carga alta antes de chegar e não bate', () => {
    const race = new RunnerRace({ obstacles: [ob(20, 1, 'desviar')], startAt: 0, length: 100, hexes: 2, agentLane: 0, rollEnemy: () => 20 });
    const ev = run(race, 6);
    expect(ev.some((e) => e.type === 'faixa' && e.who === 'garimpeiro')).toBe(true);
    expect(types(ev)).not.toContain('tropecou');
  });

  it('no obstáculo de pular, rola d20 + agilidade: abaixo de 8 tropeça e o agente ganha 1', () => {
    const fail = new RunnerRace({ obstacles: [ob(20, 1, 'pular')], startAt: 0, length: 100, hexes: 3, agentLane: 0, agilidade: 0, rollEnemy: () => 7 });
    const ev = run(fail, 6);
    const trip = ev.find((e) => e.type === 'tropecou');
    expect(trip).toMatchObject({ roll: 7, need: R.enemyDC });
    expect(fail.distance()).toBe(2);
    const agile = new RunnerRace({ obstacles: [ob(20, 1, 'pular')], startAt: 0, length: 100, hexes: 3, agentLane: 0, agilidade: 2, rollEnemy: () => 7 });
    expect(types(run(agile, 6))).not.toContain('tropecou');
    expect(agile.distance()).toBe(3);
  });

  it('no avião: corpo na esquerda, asa no meio, direita livre — ele vai para a direita ou desliza', () => {
    const plane = [ob(20, 0, 'desviar', 'aviao'), ob(20, 1, 'deslizar', 'aviao')];
    const race = new RunnerRace({ obstacles: plane, startAt: 0, length: 100, hexes: 3, enemyLane: 0, agentLane: 2, rollEnemy: () => 20 });
    const ev = run(race, 6);
    expect(types(ev)).not.toContain('tropecou');
    expect(race.lane('garimpeiro')).not.toBe(0);
  });
});

describe('tacticalIndex: volta ao tabuleiro', () => {
  it('da largada até ele, o caminho do agente; dali ao fim, a rota de fuga', () => {
    // 3 passos até ele, 12 ao todo; ele nasceu 7 fileiras à frente; a corrida tem 100
    expect(tacticalIndex(0, 7, 100, 3, 12)).toBe(0);
    expect(tacticalIndex(7, 7, 100, 3, 12)).toBe(3);
    expect(tacticalIndex(100, 7, 100, 3, 12)).toBe(12);
    expect(tacticalIndex(53.5, 7, 100, 3, 12)).toBe(8);
    expect(tacticalIndex(500, 7, 100, 3, 12)).toBe(12);
  });
});

describe('RunnerRace: curvas', () => {
  const turn = (at: number, side: 'esquerda' | 'direita') => ({ at, side });

  it('virar para o lado certo na janela: segue sem bater', () => {
    const race = new RunnerRace({ obstacles: [], turns: [turn(10, 'esquerda')], startAt: 0, length: 100, hexes: 2, rollEnemy: () => 20 });
    const ev = run(race, 4, (t) => {
      if (race.pose('agente').at >= 10 - R.turnWindow + 0.5 && t < 2.5) race.move(-1);
    });
    expect(types(ev)).toContain('curva-perto');
    expect(types(ev)).toContain('virou');
    expect(types(ev)).not.toContain('bateu-curva');
    // perto da esquina ← vira, não troca de faixa
    expect(race.lane('agente')).toBe(1);
  });

  it('não virar: bate na curva e perde 2 hexágonos', () => {
    const race = new RunnerRace({ obstacles: [], turns: [turn(10, 'direita')], startAt: 0, length: 100, hexes: 2, rollEnemy: () => 20 });
    const ev = run(race, 5);
    expect(ev.find((e) => e.type === 'bateu-curva')).toMatchObject({ side: 'direita', wrong: false });
    expect(race.distance()).toBe(4);
  });

  it('virar para o lado errado: bate na esquina', () => {
    const race = new RunnerRace({ obstacles: [], turns: [turn(10, 'direita')], startAt: 0, length: 100, hexes: 2, rollEnemy: () => 20 });
    const ev = run(race, 5, () => {
      if (race.pose('agente').at >= 7) race.move(-1);
    });
    expect(ev.find((e) => e.type === 'bateu-curva')).toMatchObject({ wrong: true });
    expect(types(ev)).not.toContain('virou');
  });

  it('longe da esquina, ← e → continuam trocando de faixa', () => {
    const race = new RunnerRace({ obstacles: [], turns: [turn(30, 'esquerda')], startAt: 0, length: 100, hexes: 2, rollEnemy: () => 20 });
    race.move(1);
    expect(race.lane('agente')).toBe(2);
  });

  it('a curva que ficou para trás da largada não conta', () => {
    const race = new RunnerRace({ obstacles: [], turns: [turn(5, 'esquerda')], startAt: 10, length: 100, hexes: 2, rollEnemy: () => 20 });
    expect(types(run(race, 3))).not.toContain('bateu-curva');
  });
});
