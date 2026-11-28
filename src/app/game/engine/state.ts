/**
 * Estado da partida compartilhado entre os jogadores (ver `docs/multiplayer.md`).
 *
 * Regras de ouro do motor:
 * - o estado é serializável em JSON (nada de `Map`, `Set` ou classes);
 * - toda aleatoriedade já vem resolvida dentro da ação (dados, destinos sorteados);
 * - `applyAction` é puro: mesma entrada, mesma saída, sem relógio nem animação.
 *
 * O estado cresce um sistema por vez: hoje tem o ciclo do turno (`turn.ts`), os inimigos
 * (`enemy-turn.ts`), o grupo (`group.ts`), as portas (`doors.ts`), a abordagem
 * (`approach.ts`), a investigação (`evidence.ts`) e o interrogatório (`talk.ts`). Queima e
 * perseguição ainda vivem no componente.
 */
import { AgentClass, classOf } from '../agent-class';
import { Door, isOpen } from '../door';
import { EnemyState, onBoard } from '../enemies';
import type { DialogueMemory } from '../interrogation';
import { HexArea, HexCoord, hexKey } from '../hex';
import type { HexRect } from '../maps';
import { Loadout, ZERO_STATS } from '../stats';
import type { FieldNoteData, TalkSession } from './talk';

export interface GameState {
  /** Turno global: aumenta a cada vez que um agente começa a jogar. */
  readonly turn: number;
  /** Ordem fixa da vez (ids dos agentes). */
  readonly order: readonly string[];
  /** Índice em `order` de quem está na vez. */
  readonly activeIndex: number;
  /** Onde cada agente está. */
  readonly positions: Readonly<Record<string, HexCoord>>;
  /** Dados da última rolagem de movimento (vazio antes da primeira). */
  readonly dice: readonly number[];
  /** Movimento que ainda sobra neste turno. */
  readonly movesLeft: number;
  /** Inimigos, na ordem em que agem no turno inimigo. */
  readonly enemies: readonly EnemyState[];
  /** Escalação: atributos de cada agente em campo (da ficha). */
  readonly loadouts: Readonly<Record<string, Loadout>>;
  /** O Capitão da equipe (os outros são Agentes). */
  readonly captain: string | null;
  /** Agentes agrupados (andam juntos e ganham bônus); vazio = cada um por si. */
  readonly group: readonly string[];
  /**
   * Ordem da fila do grupo, da frente para trás. Quem saiu do grupo não conta; quem falta
   * entra no fim, na ordem da equipe (ver `lineOf`).
   */
  readonly groupLine: readonly string[];
  /** Vezes que o Comando do Capitão já foi usado neste turno. */
  readonly commandsUsed: number;
  /** Portas comuns do mapa, pelo hexágono (`hexKey`). Fechadas, bloqueiam passagem e visão. */
  readonly doors: Readonly<Record<string, Door>>;
  /**
   * Arrombamento recente: a equipe ganha intimidação até o começo desta rodada. `0` = sem
   * bônus (ver `BREAK_IN_RULES`).
   */
  readonly breakInUntil: number;
  /** Móveis (e a cabine) em que a equipe já reparou: ganham o contorno e abrem o zoom. */
  readonly noticed: readonly string[];
  /** Quem já rolou percepção onde (`móvel:agente`): cada um rola uma vez por móvel. */
  readonly noticeRolled: readonly string[];
  /** O que a equipe já achou e pegou (a arma, o GPS, o rádio). */
  readonly found: readonly string[];
  /** A chave do avião está com a equipe. */
  readonly hasKey: boolean;
  /** Quem viu a chave no quadro e não pegou, na ordem em que viram. */
  readonly keySeenBy: readonly string[];
  /** O que cada suspeito já respondeu e que réplicas liberou. */
  readonly dialogues: Readonly<Record<string, DialogueMemory>>;
  /** Falas já usadas de cada sorteio (para não repetir a mesma resposta). */
  readonly linePools: Readonly<Record<string, readonly string[]>>;
  /** Pistas anotadas (liberam perguntas). */
  readonly clueLog: readonly string[];
  /** Caderneta de campo: o que cada suspeito disse. */
  readonly fieldNotes: readonly FieldNoteData[];
  /** A conversa aberta agora (ou nenhuma). */
  readonly talk: TalkSession | null;
}

export interface NewGame {
  order: readonly string[];
  positions: Readonly<Record<string, HexCoord>>;
  enemies?: readonly EnemyState[];
  loadouts?: Readonly<Record<string, Loadout>>;
  captain?: string | null;
  doors?: Readonly<Record<string, Door>>;
}

/** Começo da partida: a equipe chega junta (todos no grupo), na ordem da equipe. */
export function initialGameState(game: NewGame): GameState {
  return {
    turn: 1,
    order: [...game.order],
    activeIndex: 0,
    positions: { ...game.positions },
    dice: [],
    movesLeft: 0,
    enemies: (game.enemies ?? []).map((e) => ({ ...e })),
    loadouts: { ...game.loadouts },
    captain: game.captain ?? null,
    group: [...game.order],
    groupLine: [...game.order],
    commandsUsed: 0,
    doors: Object.fromEntries(Object.entries(game.doors ?? {}).map(([k, d]) => [k, { ...d }])),
    breakInUntil: 0,
    noticed: [],
    noticeRolled: [],
    found: [],
    hasKey: false,
    keySeenBy: [],
    dialogues: {},
    linePools: {},
    clueLog: [],
    fieldNotes: [],
    talk: null,
  };
}

/**
 * O que é fixo no mapa, como o motor precisa dele: sai do mapa e não muda na partida (no
 * servidor, é montado uma vez por sala). O que muda (as portas) está no `GameState`; junte os
 * dois com `sightBlockers` e `solidOf`.
 */
export interface World {
  readonly area: HexArea;
  /** Paredes, árvores, avião e carga alta: bloqueiam passagem e visão. */
  readonly blocked: ReadonlySet<string>;
  /** Carga baixa: bloqueia passagem; esconde quem está colado nela, do lado de lá. */
  readonly lowCover: ReadonlySet<string>;
  /** Só as paredes das estruturas (separam os cômodos; ver `roomBehind`). */
  readonly roomWalls: ReadonlySet<string>;
  /** Plantas das estruturas (casas, hangar). */
  readonly structures: readonly HexRect[];
}

/** Portas fechadas agora (pelo `hexKey`). */
export const closedDoors = (state: Pick<GameState, 'doors'>): Set<string> =>
  new Set(
    Object.entries(state.doors)
      .filter(([, d]) => !isOpen(d))
      .map(([k]) => k),
  );

/** O que bloqueia a visão: o fixo do mapa e as portas fechadas. */
export const sightBlockers = (state: Pick<GameState, 'doors'>, world: World): Set<string> =>
  new Set([...world.blocked, ...closedDoors(state)]);

/** O que ninguém atravessa: o fixo do mapa, toda a carga e as portas fechadas. */
export const solidOf = (state: Pick<GameState, 'doors'>, world: World): Set<string> =>
  new Set([...world.blocked, ...world.lowCover, ...closedDoors(state)]);

/** Rodada (o "Turno N" do bilhete): uma volta de toda a equipe. */
export const roundOf = (state: Pick<GameState, 'turn' | 'order'>): number =>
  Math.floor((state.turn - 1) / state.order.length) + 1;

export const activeAgent = (state: Pick<GameState, 'order' | 'activeIndex'>): string =>
  state.order[state.activeIndex];

export const findEnemy = (state: GameState, id: string): EnemyState | undefined =>
  state.enemies.find((e) => e.id === id);

export const positionsOf = (state: GameState): Map<string, HexCoord> =>
  new Map(Object.entries(state.positions));

/** Onde os agentes não passam: o sólido do mapa e os inimigos no tabuleiro. */
export const enemyWalls = (state: GameState, world: World): Set<string> =>
  new Set([...solidOf(state, world), ...state.enemies.filter(onBoard).map((e) => hexKey(e.hex))]);

export const loadoutOf = (state: GameState, id: string): Loadout =>
  state.loadouts[id] ?? { attributes: ZERO_STATS };

export const classOfAgent = (state: GameState, id: string): AgentClass =>
  classOf(id, state.captain);

export const inGroup = (state: Pick<GameState, 'group'>, id: string): boolean =>
  state.group.includes(id);

/** O agente (por padrão, o da vez) está no grupo. */
export const isGrouped = (
  state: Pick<GameState, 'group' | 'order' | 'activeIndex'>,
  id: string = activeAgent(state),
): boolean => inGroup(state, id);

/** O grupo tem o Capitão: quem está nele ganha a Liderança. */
export const isLed = (state: Pick<GameState, 'captain' | 'group'>): boolean =>
  !!state.captain && inGroup(state, state.captain);

/** A fila do grupo, da frente para trás (só quem está no grupo). */
export function lineOf(state: Pick<GameState, 'group' | 'groupLine' | 'order'>): string[] {
  const kept = state.groupLine.filter((id) => inGroup(state, id));
  return [...kept, ...state.order.filter((id) => inGroup(state, id) && !kept.includes(id))];
}

/** Um passo de hexágono para hexágono, com coordenadas inteiras. */
export const isHex = (h: HexCoord | undefined): h is HexCoord =>
  !!h && Number.isInteger(h.col) && Number.isInteger(h.row);

export const isCount = (n: number): boolean => Number.isInteger(n) && n >= 0;
