import type { EnemyState } from './enemies';
import { HexCoord, hexDistance, hexKey, hexNeighbors } from './hex';
import type { HexRect } from './maps';

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
  /**
   * Resistência que cada chute tira da porta: o próximo arrombamento precisa de 2 a menos
   * (nunca menos que 1). Aparece como "−2" subindo da porta, igual a dano no RPG.
   */
  kickDamage: 2,
} as const;

/**
 * Arrombamento (só quando a porta cede):
 * - A equipe ganha `intimidation` de intimidação por `rounds` turnos (rodadas), contando o atual.
 * - Quem está **no cômodo** do outro lado, a até `surrenderRange` hexágonos da porta, se rende
 *   na hora — a não ser que resista, tirando no d20 pelo menos `resist[d − 1]` (d = distância da
 *   porta: colado nela é mais difícil). Quem resiste tenta correr.
 * - Quem está mais longe no cômodo tenta correr, mas só se tiver **atitude**: precisa tirar
 *   **mais que** `fleeAttitude` no d20. Sem atitude, fica parado onde está.
 */
export const BREAK_IN_RULES = {
  intimidation: 1,
  rounds: 5,
  surrenderRange: 3,
  resist: [19, 18, 17],
  fleeAttitude: 12,
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
  /** Resistência que os chutes já tiraram (desconta do arrombamento; ver `DOOR_RULES.kickDamage`). */
  damage?: number;
}

/** Dá para passar pela porta. */
export const isOpen = (d: Pick<Door, 'state' | 'broken'>): boolean =>
  d.broken || d.state === 'aberta';

/**
 * Rolagem que a ação pede: o valor a tirar no d20, `0` (sem rolagem), `Infinity` (rola e nunca
 * passa) ou `null` (não dá). `pickBonus` é a perícia de quem destranca (Gazua do Agente; ver
 * `agent-class.ts`): baixa o valor da fechadura, mas nunca abaixo de 1.
 */
export function doorNeed(action: DoorAction, door: Door, pickBonus = 0): number | null {
  const open = isOpen(door);
  switch (action) {
    case 'arrombar':
      if (door.state === 'bloqueada' && !door.broken) return Infinity;
      if (open) return 0;
      return Math.max(
        1,
        (door.state === 'encostada' ? DOOR_RULES.breakClosed : DOOR_RULES.breakLocked) - (door.damage ?? 0),
      );
    case 'pick':
      if (open) return null;
      if (door.state === 'bloqueada') return Infinity;
      return door.state === 'trancada' ? Math.max(1, door.lock - pickBonus) : 0;
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
  /** Resistência que o chute tirou da porta (0 fora do arrombamento de uma porta fechada que cede). */
  damage: number;
}

export function resolveDoor(action: DoorAction, door: Door, roll: number, pickBonus = 0): DoorOutcome {
  const need = doorNeed(action, door, pickBonus);
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
    damage: action === 'arrombar' && rolled && need !== Infinity ? DOOR_RULES.kickDamage : 0,
  };
}

/** Porta depois da ação. */
export function applyDoor(door: Door, out: DoorOutcome): Door {
  if (out.broken) return { ...door, broken: true };
  if (out.opened) return { ...door, state: 'aberta' };
  if (out.damage) return { ...door, damage: (door.damage ?? 0) + out.damage };
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

const inRect = (h: HexCoord, r: HexRect): boolean =>
  h.col >= r.cols[0] && h.col <= r.cols[1] && h.row >= r.rows[0] && h.row <= r.rows[1];

/** Hexágonos ligados a `from` dentro da planta, sem atravessar `blocked` nem `skip`. */
function flood(
  from: readonly HexCoord[],
  rect: HexRect,
  blocked: ReadonlySet<string>,
  skip: ReadonlySet<string>,
): Set<string> {
  const seen = new Set<string>();
  const open = (h: HexCoord) => inRect(h, rect) && !blocked.has(hexKey(h)) && !skip.has(hexKey(h));
  const queue = from.filter(open);
  for (const h of queue) seen.add(hexKey(h));
  while (queue.length) {
    const h = queue.shift()!;
    for (const n of hexNeighbors(h)) {
      const k = hexKey(n);
      if (seen.has(k) || !open(n)) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  return seen;
}

/**
 * O cômodo do outro lado da porta, visto de quem está em `agent` (colado nela): os hexágonos
 * da planta da estrutura ligados à porta sem passar por parede (`blocked`, que deve incluir as
 * outras portas fechadas) nem pelo lado do agente.
 */
export function roomBehind(
  door: HexCoord,
  agent: HexCoord,
  rect: HexRect,
  blocked: ReadonlySet<string>,
): Set<string> {
  const skip = new Set([hexKey(door)]);
  const mine = flood([agent], rect, blocked, skip);
  const starts = hexNeighbors(door).filter(
    (n) => !mine.has(hexKey(n)) && hexKey(n) !== hexKey(agent),
  );
  return flood(starts, rect, blocked, new Set([...skip, ...mine]));
}

/** O que acontece com cada inimigo do cômodo arrombado. */
export interface BreakInRoll {
  enemy: EnemyState;
  /** Distância até a porta. */
  distance: number;
  /** `resist`: perto, tenta resistir à rendição; `attitude`: longe, tenta tomar coragem para correr. */
  test: 'resist' | 'attitude';
  /** Texto do que precisa tirar. */
  need: number;
  roll: number;
  /** Passou no teste (resistiu ou teve atitude). */
  pass: boolean;
  /** Como fica: rendido, correndo (alerta) ou parado. */
  outcome: 'surrender' | 'flee' | 'stay';
}

/**
 * Resolve o arrombamento para os inimigos do cômodo (`room`, de `roomBehind`). `roll` sorteia
 * o d20 de cada um (na ordem da lista). Rendidos e quem já fugiu ficam de fora.
 */
export function resolveBreakIn(
  door: HexCoord,
  room: ReadonlySet<string>,
  enemies: readonly EnemyState[],
  roll: () => number,
): BreakInRoll[] {
  const out: BreakInRoll[] = [];
  for (const enemy of enemies) {
    if (enemy.status === 'surrendered' || enemy.status === 'fled' || enemy.status === 'hidden' || !room.has(hexKey(enemy.hex)))
      continue;
    const distance = Math.max(1, hexDistance(enemy.hex, door));
    const r = roll();
    if (distance <= BREAK_IN_RULES.surrenderRange) {
      const need = BREAK_IN_RULES.resist[distance - 1];
      const pass = meets(r, need);
      out.push({
        enemy,
        distance,
        test: 'resist',
        need,
        roll: r,
        pass,
        outcome: pass ? 'flee' : 'surrender',
      });
    } else {
      const pass = r > BREAK_IN_RULES.fleeAttitude;
      out.push({
        enemy,
        distance,
        test: 'attitude',
        need: BREAK_IN_RULES.fleeAttitude,
        roll: r,
        pass,
        outcome: pass ? 'flee' : 'stay',
      });
    }
  }
  return out.sort((a, b) => a.distance - b.distance);
}
