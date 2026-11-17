/**
 * Camada "RPG": atributos de cada agente, escolhidos na ficha antes da missão.
 *
 * - **Velocidade:** cada ponto vale +1 de movimento no turno (somado aos 2d4).
 * - **Intimidação:** cada ponto vale +1 no raio de abordagem; a zona de rolagem e a de fuga
 *   se afastam junto (ver `approachRulesFor`).
 *
 * Cada atributo vai de −5 a +5 e todo agente começa com 0. O jogador tem `points` (1) para pôr
 * em um dos dois; o lado negativo fica para penalidades de outras fontes (peso, equipamento).
 * O valor em campo soma três fontes: o **atributo** (ficha), o **equipamento** (vazio por ora)
 * e o **grupo** (só enquanto os agentes estão agrupados; ver `GROUP_RULES`).
 *
 * Só funções puras (testadas em `stats.spec.ts`); as telas decidem quando usá-las.
 */
import { APPROACH_RULES, ApproachZones, approachZones } from './enemies';
import { GROUP_RULES } from './group';

export type StatKey = 'velocidade' | 'intimidacao';
export const STAT_KEYS: readonly StatKey[] = ['velocidade', 'intimidacao'];

/** Valor de cada atributo. */
export type Stats = Readonly<Record<StatKey, number>>;

export const STAT_RULES = {
  /** Escala de cada atributo (atributo + equipamento ficam sempre dentro dela). */
  min: -5,
  max: 5,
  /** Pontos que o jogador distribui na ficha de cada agente. */
  points: 1,
} as const;

export const ZERO_STATS: Stats = { velocidade: 0, intimidacao: 0 };

const clampStat = (v: number): number => Math.min(STAT_RULES.max, Math.max(STAT_RULES.min, v));

// ---------- distribuição de pontos (ficha) ----------

/** Pontos que o jogador ainda pode distribuir (`spent` = o que ele já pôs em cada atributo). */
export function freePoints(spent: Stats): number {
  return STAT_RULES.points - STAT_KEYS.reduce((a, k) => a + spent[k], 0);
}

/** Dá para pôr um ponto em `key`: sobra ponto livre e o atributo não passa do máximo. */
export function canAddPoint(spent: Stats, key: StatKey, base: Stats = ZERO_STATS): boolean {
  return freePoints(spent) > 0 && base[key] + spent[key] < STAT_RULES.max;
}

/** Dá para tirar um ponto de `key`: só o que o próprio jogador colocou (não desce de 0 por aqui). */
export function canRemovePoint(spent: Stats, key: StatKey): boolean {
  return spent[key] > 0;
}

export function addPoint(spent: Stats, key: StatKey, base: Stats = ZERO_STATS): Stats {
  return canAddPoint(spent, key, base) ? { ...spent, [key]: spent[key] + 1 } : spent;
}

export function removePoint(spent: Stats, key: StatKey): Stats {
  return canRemovePoint(spent, key) ? { ...spent, [key]: spent[key] - 1 } : spent;
}

// ---------- valores em campo ----------

/** De onde vem cada parte de um atributo em campo. */
export interface StatBreakdown {
  /** Ficha: base do agente + pontos distribuídos. */
  attribute: number;
  /** Equipamento (ainda não há: sempre 0). */
  equipment: number;
  /** Bônus do grupo (só agrupado). */
  group: number;
  /** Atributo + equipamento, presos à escala de −5 a +5, mais o grupo. */
  total: number;
}

export interface Loadout {
  /** Atributos da ficha (base + pontos distribuídos). */
  attributes: Stats;
  /** Modificadores do equipamento (por ora, nenhum). */
  equipment?: Stats;
}

/** Bônus do grupo em cada atributo (velocidade = movimento, intimidação = alcance). */
export const GROUP_STAT_BONUS: Stats = {
  velocidade: GROUP_RULES.moveBonus,
  intimidacao: GROUP_RULES.approachBonus,
};

/** Um atributo em campo, separado por fonte. */
export function statBreakdown(loadout: Loadout, key: StatKey, grouped: boolean): StatBreakdown {
  const attribute = loadout.attributes[key];
  const equipment = loadout.equipment?.[key] ?? 0;
  const group = grouped ? GROUP_STAT_BONUS[key] : 0;
  return { attribute, equipment, group, total: clampStat(attribute + equipment) + group };
}

/** Atributos da ficha a partir da base do agente e dos pontos distribuídos. */
export function sheetStats(spent: Stats, base: Stats = ZERO_STATS): Stats {
  return {
    velocidade: clampStat(base.velocidade + spent.velocidade),
    intimidacao: clampStat(base.intimidacao + spent.intimidacao),
  };
}

/** Movimento do turno: soma dos dados + velocidade (+ grupo). Nunca fica negativo. */
export function turnMovement(diceTotal: number, loadout: Loadout, grouped: boolean): number {
  return Math.max(0, diceTotal + statBreakdown(loadout, 'velocidade', grouped).total);
}

/**
 * Faixas da abordagem de um agente: o raio de abordagem base cresce com a intimidação (e com
 * o grupo), nunca fica menor que 1, e a zona de rolagem e a de fuga vêm logo depois dele.
 */
export function approachRulesFor(
  loadout: Loadout,
  grouped: boolean,
  rules: Pick<typeof APPROACH_RULES, 'surrenderRange' | 'rollBand' | 'fleeBand'> = APPROACH_RULES,
): ApproachZones {
  const bonus = statBreakdown(loadout, 'intimidacao', grouped).total;
  return approachZones(rules.surrenderRange + bonus, rules);
}

/**
 * Estado de cada casa da régua (−5 … −1, +1 … +5; o 0 é o traço do meio):
 * `pos` cheia em verde, `neg` cheia em vermelho, `slot` tracejada (onde o ponto livre pode
 * entrar), `neg-empty` lado negativo vazio, `empty` lado positivo vazio.
 */
export type RulerCell = 'pos' | 'neg' | 'slot' | 'neg-empty' | 'empty';

export function rulerCells(value: number, free: number): { unit: number; state: RulerCell }[] {
  const units = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5].filter(
    (u) => u >= STAT_RULES.min && u <= STAT_RULES.max,
  );
  return units.map((unit) => {
    let state: RulerCell;
    if (unit > 0 && unit <= value) state = 'pos';
    else if (unit < 0 && unit >= value) state = 'neg';
    else if (unit > 0 && unit <= Math.max(value, 0) + Math.max(0, free)) state = 'slot';
    else state = unit < 0 ? 'neg-empty' : 'empty';
    return { unit, state };
  });
}

/** "+1", "−2" ou "0" (com o sinal de menos tipográfico). */
export function signed(v: number): string {
  return v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0';
}
