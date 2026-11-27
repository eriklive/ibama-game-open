import { describe, expect, it } from 'vitest';
import { toBack, toFront } from '../group';
import { HexCoord, hexDistance, hexKey, rectArea } from '../hex';
import {
  GameAction,
  GameState,
  World,
  activeAgent,
  applyAction,
  initialGameState,
  lineOf,
  planMove,
  planRally,
  planReline,
  rallyFree,
  rallyOptions,
  validateAction,
} from '.';

const AREA = rectArea(14, 14);
const world = (solid: string[] = []): World => ({
  area: AREA,
  walls: new Set(solid),
  lowCover: new Set(),
  solid: new Set(solid),
});

const team = (positions: Record<string, HexCoord>, captain: string | null = 'ana'): GameState =>
  initialGameState({ order: Object.keys(positions), positions, captain });

const run = (state: GameState, ...actions: GameAction[]): GameState =>
  actions.reduce((s, a) => {
    expect(validateAction(s, a)).toBeNull();
    return applyAction(s, a);
  }, state);

const apart = { ana: { col: 2, row: 2 }, bruno: { col: 7, row: 2 }, clara: { col: 4, row: 6 } };
const together = { ana: { col: 5, row: 5 }, bruno: { col: 5, row: 6 }, clara: { col: 5, row: 7 } };

describe('motor: agrupar', () => {
  const separated = (captain: string | null = 'ana') => ({
    ...run(team(apart, captain), { type: 'ungroup' }),
    movesLeft: 6,
  });

  it('começa com a equipe inteira no grupo, na ordem da equipe', () => {
    const s = team(apart);
    expect(s.group).toEqual(['ana', 'bruno', 'clara']);
    expect(lineOf(s)).toEqual(['ana', 'bruno', 'clara']);
  });

  it('agrupada, não há ponto de encontro a escolher', () => {
    expect(rallyOptions({ ...team(apart), movesLeft: 6 }, world()).size).toBe(0);
  });

  it('agrupar leva todos ao ponto, junta a equipe e põe quem chamou na frente da fila', () => {
    const s0 = { ...separated(null), activeIndex: 1 };
    const [plan] = rallyOptions(s0, world()).values();
    const act = planRally(s0, plan.point, world())!;
    const s1 = run(s0, act);
    expect(s1.group).toEqual(['ana', 'bruno', 'clara']);
    expect(lineOf(s1)[0]).toBe('bruno');
    expect(s1.positions['bruno']).toEqual(plan.point);
    for (const id of ['ana', 'clara']) expect(hexDistance(s1.positions[id], plan.point)).toBe(1);
    // sem Capitão, gasta o plano inteiro
    expect(s1.movesLeft).toBe(6 - plan.cost);
    expect(s1.commandsUsed).toBe(0);
  });

  it('Comando: o Capitão agrupa de graça uma vez por turno', () => {
    const s0 = separated('ana');
    expect(rallyFree(s0)).toBe(true);
    const [plan] = rallyOptions(s0, world()).values();
    const s1 = run(s0, planRally(s0, plan.point, world())!);
    expect(s1.movesLeft).toBe(6);
    expect(s1.commandsUsed).toBe(1);
    expect(rallyFree(s1)).toBe(false);
    // a vez seguinte zera o Comando
    expect(run(s1, { type: 'nextAgent' }, { type: 'setActive', agent: 'ana' }).commandsUsed).toBe(
      0,
    );
  });

  it('Agente (não Capitão) paga o encontro', () => {
    const s0 = { ...separated('ana'), activeIndex: 2 };
    expect(rallyFree(s0)).toBe(false);
    const [plan] = rallyOptions(s0, world()).values();
    expect(run(s0, planRally(s0, plan.point, world())!).movesLeft).toBe(6 - plan.cost);
  });

  it('recusa ponto que não é de encontro, quem não está na vez e encontro sem movimento', () => {
    const s0 = separated();
    expect(planRally(s0, { col: 13, row: 13 }, world())).toBeNull();
    const [plan] = rallyOptions(s0, world()).values();
    const act = planRally(s0, plan.point, world())!;
    expect(validateAction({ ...s0, activeIndex: 1 }, act)).toMatch(/vez/);
    expect(validateAction({ ...s0, movesLeft: 0 }, act)).toMatch(/movimento/);
    expect(validateAction(team(apart), act)).toMatch(/agrupada/);
  });

  it('desagrupar: cada um por si (e não dá para desagrupar duas vezes)', () => {
    const s1 = run(team(apart), { type: 'ungroup' });
    expect(s1.group).toEqual([]);
    expect(validateAction(s1, { type: 'ungroup' })).not.toBeNull();
  });
});

describe('motor: andar em grupo', () => {
  const ready = (): GameState => ({ ...team(together), movesLeft: 6 });

  it('separado: só o agente da vez anda', () => {
    const s0 = { ...run(ready(), { type: 'ungroup' }) };
    const act = planMove(s0, [{ col: 5, row: 4 }], world());
    expect(Object.keys(act.paths)).toEqual(['ana']);
    expect(act.line).toBeUndefined();
    expect(run(s0, act).positions['ana']).toEqual({ col: 5, row: 4 });
  });

  it('agrupado: os companheiros seguem o rastro e a fila fica na ordem em que andaram', () => {
    const s0 = ready();
    const path = [
      { col: 5, row: 4 },
      { col: 5, row: 3 },
    ];
    const act = planMove(s0, path, world());
    expect(act.line?.[0]).toBe('ana');
    expect(Object.keys(act.paths).sort()).toEqual(['ana', 'bruno', 'clara']);
    const s1 = run(s0, act);
    expect(s1.positions['ana']).toEqual({ col: 5, row: 3 });
    expect(s1.movesLeft).toBe(4);
    expect(s1.group).toHaveLength(3);
    // os três continuam colados, cada um no seu hexágono
    const ends = Object.values(s1.positions).map(hexKey);
    expect(new Set(ends).size).toBe(3);
  });

  it('quem não consegue seguir sai do grupo (com menos de dois, o grupo acaba)', () => {
    const s0 = ready();
    const act: GameAction = {
      type: 'move',
      paths: { ana: [{ col: 5, row: 4 }] },
      cost: 1,
      line: ['ana', 'bruno'],
      left: ['clara'],
    };
    const s1 = run(s0, act);
    expect(s1.group).toEqual(['ana', 'bruno']);
    const s2 = run(s1, {
      type: 'move',
      paths: { ana: [{ col: 5, row: 3 }] },
      cost: 1,
      left: ['bruno'],
    });
    expect(s2.group).toEqual([]);
  });

  it('não anda mais do que o movimento que sobra, nem com quem não está na vez', () => {
    const s0 = { ...ready(), movesLeft: 1 };
    expect(
      validateAction(
        s0,
        planMove(
          s0,
          [
            { col: 5, row: 4 },
            { col: 5, row: 3 },
          ],
          world(),
        ),
      ),
    ).toMatch(/insuficiente/);
    const alone = { ...run(ready(), { type: 'ungroup' }) };
    expect(
      validateAction(alone, { type: 'move', paths: { bruno: [{ col: 6, row: 6 }] }, cost: 1 }),
    ).toMatch(/não anda na vez/);
  });
});

describe('motor: fila do grupo', () => {
  it('na vez de alguém, ele vai para a frente da fila trocando de vaga com o primeiro', () => {
    const s0 = { ...team(together), activeIndex: 2 };
    const next = toFront(lineOf(s0), activeAgent(s0));
    const act = planReline(s0, next, world())!;
    const s1 = run(s0, act);
    expect(lineOf(s1)).toEqual(['clara', 'bruno', 'ana']);
    expect(s1.positions['clara']).toEqual(together.ana);
    expect(s1.positions['ana']).toEqual(together.clara);
  });

  it('ao passar a vez, quem jogou vai para o fim', () => {
    const s0 = team(together);
    const s1 = run(s0, planReline(s0, toBack(lineOf(s0), 'ana'), world())!);
    expect(lineOf(s1)).toEqual(['bruno', 'clara', 'ana']);
  });

  it('nada a trocar: sem ação', () => {
    const s0 = team(together);
    expect(planReline(s0, lineOf(s0), world())).toBeNull();
  });

  it('recusa fila nova com outras pessoas', () => {
    const s0 = team(together);
    const act = planReline(s0, toBack(lineOf(s0), 'ana'), world())!;
    expect(validateAction({ ...s0, group: ['ana', 'bruno'] }, act)).toMatch(/mesmas pessoas/);
  });

  it('o estado com grupo sobrevive a JSON', () => {
    const s0 = team(together);
    const s1 = run(s0, planReline(s0, toBack(lineOf(s0), 'ana'), world())!);
    expect(JSON.parse(JSON.stringify(s1))).toEqual(s1);
  });
});
