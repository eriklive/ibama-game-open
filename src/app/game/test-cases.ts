/**
 * Casos de teste: situações prontas para testar uma parte do jogo sem jogar até ela. Ficam no
 * menu da partida ("Casos de teste"). Cada caso diz o mapa, onde cada um está e o que começa
 * na hora (por enquanto, uma perseguição já em curso).
 */
import type { EnemyStatus } from './enemies';
import type { HexCoord } from './hex';

export interface TestCase {
  id: string;
  /** Nome no menu. */
  name: string;
  /** Uma linha explicando a situação. */
  hint: string;
  /** Mapa onde o caso roda (`GameMap.id`). */
  mapId: string;
  /** Agente da vez (`Character.id`). */
  active: string;
  /** Onde ficam os agentes; quem não aparece fica na largada do mapa. */
  agents?: Readonly<Record<string, HexCoord>>;
  /** Inimigos mexidos: posição e situação. Quem não aparece começa como no mapa. */
  enemies?: Readonly<Record<string, { hex: HexCoord; status?: EnemyStatus }>>;
  /** O que começa ao carregar: `chase` é a perseguição já com o agente correndo atrás dele. */
  start: { kind: 'chase'; agent: string; enemy: string };
}

export const TEST_CASES: readonly TestCase[] = [
  {
    id: 'fuga-aeroporto',
    name: 'Fuga pelo aeroporto',
    hint: 'Clara aborda o vigia, que foge por dentro do hangar e sai pelos fundos, pela esquerda. Começa na perseguição.',
    mapId: 'aeroporto',
    active: 'clara',
    // na frente do portão do hangar, na ponta da esquerda: ele entra correndo, cruza o hangar
    // por dentro, sai pela porta dos fundos do oeste (trancada) e some pela trilha da esquerda
    agents: { clara: { col: 15, row: 21 } },
    enemies: { 'vigia-pista': { hex: { col: 16, row: 19 }, status: 'alert' } },
    start: { kind: 'chase', agent: 'clara', enemy: 'vigia-pista' },
  },
];

export const findTestCase = (id: string | null | undefined): TestCase | undefined =>
  TEST_CASES.find((c) => c.id === id);
