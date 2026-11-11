/** Rolagem de dados. `rng` deve devolver um número em [0, 1), como Math.random. */
export type Rng = () => number;

export const rollDie = (sides: number, rng: Rng = Math.random): number =>
  1 + Math.min(sides - 1, Math.floor(rng() * sides));

export const rollDice = (count: number, sides: number, rng: Rng = Math.random): number[] =>
  Array.from({ length: count }, () => rollDie(sides, rng));

export const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);
