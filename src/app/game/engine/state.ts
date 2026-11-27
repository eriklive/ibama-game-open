/**
 * Estado da partida compartilhado entre os jogadores (ver `docs/multiplayer.md`).
 *
 * Regras de ouro do motor:
 * - o estado é serializável em JSON (nada de `Map`, `Set` ou classes);
 * - toda aleatoriedade já vem resolvida dentro da ação (dados, destinos sorteados);
 * - `applyAction` é puro: mesma entrada, mesma saída, sem relógio nem animação.
 *
 * O estado cresce um sistema por vez: hoje tem o ciclo do turno (`turn.ts`) e os inimigos
 * (`enemy-turn.ts`). Grupo, portas, abordagem e o resto ainda vivem no componente.
 */
import type { EnemyState } from '../enemies';
import type { HexCoord } from '../hex';

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
}

export function initialGameState(
  order: readonly string[],
  positions: Readonly<Record<string, HexCoord>>,
  enemies: readonly EnemyState[] = [],
): GameState {
  return {
    turn: 1,
    order: [...order],
    activeIndex: 0,
    positions: { ...positions },
    dice: [],
    movesLeft: 0,
    enemies: enemies.map((e) => ({ ...e })),
  };
}

export const activeAgent = (state: GameState): string => state.order[state.activeIndex];

export const findEnemy = (state: GameState, id: string): EnemyState | undefined =>
  state.enemies.find((e) => e.id === id);

/** Um passo de hexágono para hexágono, com coordenadas inteiras. */
export const isHex = (h: HexCoord | undefined): h is HexCoord =>
  !!h && Number.isInteger(h.col) && Number.isInteger(h.row);

export const isCount = (n: number): boolean => Number.isInteger(n) && n >= 0;
