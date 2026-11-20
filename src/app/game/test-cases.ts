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

/**
 * O piloto vagueia pelo hangar e começa parado logo atrás do caixote de meia altura da porta dos
 * fundos do oeste (14,6): ali ele fecha o atalho por cima do caixote. Nos casos do aeroporto ele
 * fica longe, num canto do hangar.
 */
const PILOTO_LONGE = { piloto: { hex: { col: 20, row: 6 } } } as const;

export const TEST_CASES: readonly TestCase[] = [
  {
    id: 'fuga-aeroporto',
    name: 'Fuga pelo aeroporto',
    hint: 'Clara aborda o vigia na pista, que corre até o hangar, cruza por dentro e sai pelos fundos, pela esquerda, contornando o caixote de meia altura (escolha: pular ou dar a volta). Começa na perseguição.',
    mapId: 'aeroporto',
    active: 'clara',
    // no meio do caminho entre a clareira da equipe e o portão do hangar, 4 hexágonos abaixo
    // da frente do portão (1 coluna à direita: bem embaixo, ele fugiria para o sul): ele sobe a
    // pista, entra pela ponta esquerda do portão, cruza o hangar por dentro, sai pela porta dos
    // fundos do oeste (trancada) e some pela trilha da esquerda
    agents: { clara: { col: 17, row: 25 } },
    enemies: { 'vigia-pista': { hex: { col: 17, row: 23 }, status: 'alert' }, ...PILOTO_LONGE },
    start: { kind: 'chase', agent: 'clara', enemy: 'vigia-pista' },
  },
  {
    id: 'fuga-aeroporto-direita',
    name: 'Fuga pela direita',
    hint: 'Clara aborda o vigia à esquerda da pista; ele cruza a pista correndo para a direita, passa pelo lado do hangar e some na mata do leste, sem portas no caminho. Começa na perseguição.',
    mapId: 'aeroporto',
    active: 'clara',
    // Clara chega por baixo e pela esquerda: ele foge para o outro lado
    agents: { clara: { col: 15, row: 23 } },
    enemies: { 'vigia-pista': { hex: { col: 16, row: 21 }, status: 'alert' }, ...PILOTO_LONGE },
    start: { kind: 'chase', agent: 'clara', enemy: 'vigia-pista' },
  },
  {
    id: 'fuga-aeroporto-fundos',
    name: 'Fuga pelos fundos do hangar',
    hint: 'Clara aborda o garimpeiro no posto dele, à direita do portão; ele entra no hangar, corre pelo fundo, de leste a oeste, e sai pela porta dos fundos do oeste. Começa na perseguição.',
    mapId: 'aeroporto',
    active: 'clara',
    // ele fica no posto de sempre (27,19); Clara chega pela direita e por baixo, então ele foge
    // para dentro do hangar
    agents: { clara: { col: 28, row: 21 } },
    enemies: { garimpeiro: { hex: { col: 27, row: 19 }, status: 'alert' }, ...PILOTO_LONGE },
    start: { kind: 'chase', agent: 'clara', enemy: 'garimpeiro' },
  },
];

export const findTestCase = (id: string | null | undefined): TestCase | undefined =>
  TEST_CASES.find((c) => c.id === id);
