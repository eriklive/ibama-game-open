import { describe, expect, it } from 'vitest';
import {
  TurnAction,
  TurnState,
  activeAgent,
  applyAction,
  initialTurnState,
  validateAction,
} from './engine';

const start = (): TurnState =>
  initialTurnState(['ana', 'bruno', 'clara'], {
    ana: { col: 2, row: 2 },
    bruno: { col: 4, row: 2 },
    clara: { col: 6, row: 2 },
  });

const run = (state: TurnState, ...actions: TurnAction[]): TurnState =>
  actions.reduce((s, a) => {
    expect(validateAction(s, a)).toBeNull();
    return applyAction(s, a);
  }, state);

describe('engine (ciclo do turno)', () => {
  it('começa no turno 1, com o primeiro da ordem na vez e sem movimento', () => {
    const s = start();
    expect(s.turn).toBe(1);
    expect(activeAgent(s)).toBe('ana');
    expect(s.movesLeft).toBe(0);
    expect(s.dice).toEqual([]);
  });

  it('a rolagem guarda os dados e o movimento que eles deram', () => {
    const s = run(start(), { type: 'roll', dice: [3, 1], movement: 5 });
    expect(s.dice).toEqual([3, 1]);
    expect(s.movesLeft).toBe(5);
  });

  it('andar leva o agente ao fim do caminho e gasta o custo', () => {
    const s = run(
      start(),
      { type: 'roll', dice: [2, 2], movement: 4 },
      {
        type: 'move',
        paths: {
          ana: [
            { col: 2, row: 3 },
            { col: 2, row: 4 },
          ],
        },
        cost: 2,
      },
    );
    expect(s.positions['ana']).toEqual({ col: 2, row: 4 });
    expect(s.positions['bruno']).toEqual({ col: 4, row: 2 });
    expect(s.movesLeft).toBe(2);
  });

  it('caminho vazio não move ninguém (companheiro que fica parado)', () => {
    const s = run(start(), {
      type: 'move',
      paths: { ana: [{ col: 2, row: 3 }], bruno: [] },
      cost: 0,
    });
    expect(s.positions['bruno']).toEqual({ col: 4, row: 2 });
  });

  it('recusa caminho que pula hexágonos ou agente que não existe', () => {
    expect(
      validateAction(start(), { type: 'move', paths: { ana: [{ col: 2, row: 5 }] }, cost: 1 }),
    ).toMatch(/passo a passo/);
    expect(validateAction(start(), { type: 'move', paths: { zé: [] }, cost: 0 })).toMatch(
      /desconhecido/,
    );
    expect(validateAction(start(), { type: 'move', paths: {}, cost: -1 })).toMatch(/custo/);
  });

  it('recusa rolagem sem dados ou com valores impossíveis', () => {
    expect(validateAction(start(), { type: 'roll', dice: [], movement: 2 })).not.toBeNull();
    expect(validateAction(start(), { type: 'roll', dice: [0, 2], movement: 2 })).not.toBeNull();
    expect(validateAction(start(), { type: 'roll', dice: [1, 2], movement: 1.5 })).not.toBeNull();
  });

  it('gastar movimento nunca deixa negativo', () => {
    const s = run(start(), { type: 'roll', dice: [1, 1], movement: 2 }, { type: 'spend', cost: 5 });
    expect(s.movesLeft).toBe(0);
  });

  it('a vez passa em roda e o turno global sobe', () => {
    const s = run(start(), { type: 'nextAgent' }, { type: 'nextAgent' });
    expect(activeAgent(s)).toBe('clara');
    expect(s.turn).toBe(3);
    const back = run(s, { type: 'nextAgent' });
    expect(activeAgent(back)).toBe('ana');
    expect(back.turn).toBe(4);
  });

  it('a vez pode ir direto para um agente sem mexer no turno', () => {
    const s = run(start(), { type: 'setActive', agent: 'clara' });
    expect(activeAgent(s)).toBe('clara');
    expect(s.turn).toBe(1);
    expect(validateAction(s, { type: 'setActive', agent: 'zé' })).not.toBeNull();
  });

  it('pôr agentes direto troca só quem foi citado', () => {
    const s = run(start(), { type: 'place', positions: { bruno: { col: 9, row: 9 } } });
    expect(s.positions['bruno']).toEqual({ col: 9, row: 9 });
    expect(s.positions['ana']).toEqual({ col: 2, row: 2 });
  });

  it('não muda o estado de entrada e sobrevive a JSON (vai viajar pela rede)', () => {
    const s0 = start();
    const frozen = JSON.stringify(s0);
    const s1 = run(
      s0,
      { type: 'roll', dice: [4, 4], movement: 8 },
      { type: 'move', paths: { ana: [{ col: 3, row: 2 }] }, cost: 1 },
    );
    expect(JSON.stringify(s0)).toBe(frozen);
    expect(JSON.parse(JSON.stringify(s1))).toEqual(s1);
  });
});
