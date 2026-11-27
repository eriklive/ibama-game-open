/**
 * Estado da partida compartilhado entre os jogadores (ver `docs/multiplayer.md`).
 *
 * Regras de ouro do motor:
 * - o estado é serializável em JSON (nada de `Map`, `Set` ou classes);
 * - toda aleatoriedade já vem resolvida dentro da ação (dados, destinos sorteados);
 * - `applyAction` é puro: mesma entrada, mesma saída, sem relógio nem animação.
 *
 * O estado cresce um sistema por vez: hoje tem o ciclo do turno (`turn.ts`), os inimigos
 * (`enemy-turn.ts`) e o grupo (`group.ts`). Portas, abordagem e o resto ainda vivem no
 * componente.
 */
import { AgentClass, classOf } from '../agent-class';
import { EnemyState, onBoard } from '../enemies';
import { HexArea, HexCoord, hexKey } from '../hex';
import { Loadout, ZERO_STATS } from '../stats';

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
}

export interface NewGame {
  order: readonly string[];
  positions: Readonly<Record<string, HexCoord>>;
  enemies?: readonly EnemyState[];
  loadouts?: Readonly<Record<string, Loadout>>;
  captain?: string | null;
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
  };
}

/**
 * O mapa como o motor precisa dele. Por enquanto quem monta é o componente (as portas ainda
 * não estão no estado); no servidor, sai do mapa e do estado da sala.
 */
export interface World {
  readonly area: HexArea;
  /** O que bloqueia a visão (paredes, carga alta, portas fechadas). */
  readonly walls: ReadonlySet<string>;
  /** Carga baixa: esconde quem está colado nela, do lado de lá. */
  readonly lowCover: ReadonlySet<string>;
  /** O que ninguém atravessa (paredes, toda a carga, portas fechadas). */
  readonly solid: ReadonlySet<string>;
}

export const activeAgent = (state: Pick<GameState, 'order' | 'activeIndex'>): string =>
  state.order[state.activeIndex];

export const findEnemy = (state: GameState, id: string): EnemyState | undefined =>
  state.enemies.find((e) => e.id === id);

export const positionsOf = (state: GameState): Map<string, HexCoord> =>
  new Map(Object.entries(state.positions));

/** Onde os agentes não passam: o sólido do mapa e os inimigos no tabuleiro. */
export const enemyWalls = (state: GameState, world: World): Set<string> =>
  new Set([...world.solid, ...state.enemies.filter(onBoard).map((e) => hexKey(e.hex))]);

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
