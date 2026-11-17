import { HexCoord, hexDistance, hexKey, hexNeighbors } from './hex';

/**
 * Estado de uma porta comum:
 * - `aberta`: passa direto.
 * - `encostada`: fechada, sem tranca. Abre empurrando.
 * - `trancada`: só passa com pick lock ou arrombando.
 * - `bloqueada`: não abre nunca (até ser desbloqueada).
 */
export type DoorState = 'aberta' | 'encostada' | 'trancada' | 'bloqueada';

/** Ações no menu da porta, na ordem em que aparecem. */
export type DoorAction = 'arrombar' | 'pick' | 'abrir';

/**
 * Regras das portas. Os testes são de 1d20 e passa quem tira **pelo menos** o número
 * (`precisa de 12` = 12 ou mais).
 */
export const DOOR_RULES = {
  die: 20,
  /** Arrombar uma porta só encostada. */
  breakClosed: 3,
  /** Arrombar uma porta trancada. */
  breakLocked: 12,
  /** Fechadura padrão (pick lock numa porta trancada); cada porta pode ter a sua. */
  lock: 12,
  /** Movimento gasto pelo pick lock. */
  pickCost: 1,
  /** Até quantos hexágonos da porta um inimigo vê o arrombamento à toa e comenta. */
  witnessRange: 4,
} as const;

/** Falas de quem vê alguém arrombar uma porta que nem estava trancada. */
export const DOOR_REACTIONS = ['Precisava disso não, senhor.', 'Pô, a porta tava aberta!'] as const;

/** Como a porta começa num mapa (`lock` só vale para a trancada). */
export interface DoorSpec {
  state: DoorState;
  lock?: number;
}

/** Porta durante a partida. */
export interface Door {
  hex: HexCoord;
  state: DoorState;
  /** Valor da fechadura (pick lock na trancada). */
  lock: number;
  /** Arrombada: fica aberta (e torta) para sempre. */
  broken: boolean;
}

/** Dá para passar pela porta. */
export const isOpen = (d: Pick<Door, 'state' | 'broken'>): boolean =>
  d.broken || d.state === 'aberta';

/** Rolagem que a ação pede: o valor a tirar no d20, `0` (sem rolagem), `Infinity` (rola e nunca passa) ou `null` (não dá). */
export function doorNeed(action: DoorAction, door: Door): number | null {
  const open = isOpen(door);
  switch (action) {
    case 'arrombar':
      if (door.state === 'bloqueada' && !door.broken) return Infinity;
      if (open) return 0;
      return door.state === 'encostada' ? DOOR_RULES.breakClosed : DOOR_RULES.breakLocked;
    case 'pick':
      if (open) return null;
      if (door.state === 'bloqueada') return Infinity;
      return door.state === 'trancada' ? door.lock : 0;
    case 'abrir':
      if (open || door.state === 'encostada') return 0;
      return null;
  }
}

/** A ação rola o d20. */
export const rollsDie = (need: number | null): boolean => need !== null && need > 0;

/** Passa no teste da porta: tirou pelo menos o que precisava. */
export const meets = (roll: number, need: number): boolean => roll >= need;

/** Chance (0..1) de tirar pelo menos `need` num d20. */
export const doorChance = (need: number | null): number => {
  if (need === null || need === Infinity) return 0;
  if (need <= 1) return 1;
  return Math.max(0, (DOOR_RULES.die - need + 1) / DOOR_RULES.die);
};

/**
 * Resultado de uma ação. `roll` é o d20 (ignorado quando a ação não rola).
 * - `opened`: a porta abriu (normal ou arrombada).
 * - `reaction`: arrombou uma porta sem tranca: quem vê comenta.
 */
export interface DoorOutcome {
  opened: boolean;
  broken: boolean;
  /** Rolou o d20 nesta ação. */
  rolled: boolean;
  pass: boolean;
  reaction: boolean;
  /** Movimento gasto. */
  cost: number;
}

export function resolveDoor(action: DoorAction, door: Door, roll: number): DoorOutcome {
  const need = doorNeed(action, door);
  const rolled = rollsDie(need);
  const pass = need !== null && (need === 0 || (need !== Infinity && meets(roll, need)));
  const cost = action === 'pick' && need !== null ? DOOR_RULES.pickCost : 0;
  const unlocked = door.state === 'aberta' || door.state === 'encostada';
  const breaking = action === 'arrombar' && pass;
  return {
    opened: pass && !isOpen(door),
    broken: breaking,
    rolled,
    pass,
    reaction: breaking && unlocked && !door.broken,
    cost,
  };
}

/** Porta depois da ação. */
export function applyDoor(door: Door, out: DoorOutcome): Door {
  if (out.broken) return { ...door, broken: true };
  if (out.opened) return { ...door, state: 'aberta' };
  return door;
}

/**
 * Portas comuns do mapa: hexágonos `D` sem outro `D` ao lado. Uma fileira de `D` é um
 * portão (o do hangar), que fica sempre aberto e não entra nesta mecânica.
 */
export function commonDoors(doors: readonly HexCoord[]): HexCoord[] {
  const keys = new Set(doors.map(hexKey));
  return doors.filter((d) => !hexNeighbors(d).some((n) => keys.has(hexKey(n))));
}

/** Monta as portas da partida (sem especificação, a porta começa encostada). */
export function spawnDoors(
  doors: readonly HexCoord[],
  specs: Readonly<Record<string, DoorSpec>> = {},
): Map<string, Door> {
  return new Map(
    commonDoors(doors).map((hex) => {
      const spec = specs[hexKey(hex)];
      return [
        hexKey(hex),
        {
          hex: { ...hex },
          state: spec?.state ?? 'encostada',
          lock: spec?.lock ?? DOOR_RULES.lock,
          broken: false,
        },
      ];
    }),
  );
}

/**
 * Passagens de uma estrutura por onde dá para enxergar o interior: os portões e as portas
 * abertas (ou arrombadas). Porta fechada mantém o telhado no lugar e o interior escondido.
 */
export const seeThroughDoors = (
  doors: readonly HexCoord[],
  state: ReadonlyMap<string, Door>,
): HexCoord[] =>
  doors.filter((d) => {
    const door = state.get(hexKey(d));
    return !door || isOpen(door);
  });

/** Colado na porta: dá para interagir. */
export const nextToDoor = (agent: HexCoord, door: HexCoord): boolean =>
  hexDistance(agent, door) === 1;
