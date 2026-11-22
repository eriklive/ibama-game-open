/**
 * Casos de teste: situações prontas para testar uma parte do jogo sem jogar até ela. Ficam no
 * menu da partida ("Casos de teste"). Cada caso diz o mapa, onde cada um está e o que começa
 * na hora: uma perseguição já em curso, ou o turno inimigo com dois fugindo (a escolha de alvo).
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
  /**
   * O que começa ao carregar: `chase` é a perseguição já com o agente correndo atrás dele;
   * `targets` abre o turno inimigo com o agente no raio de perseguição de `enemies` (em alerta),
   * que vão correr: ele escolhe qual perseguir ou deixa os dois (`decisao:alvo`).
   */
  start:
    | { kind: 'chase'; agent: string; enemy: string }
    | { kind: 'targets'; agent: string; enemies: readonly string[] };
}

/**
 * O piloto vagueia pelo hangar e começa perto da porta dos fundos do oeste, onde pode fechar os
 * atalhos por cima da carga baixa. Nos casos do aeroporto ele fica longe, num canto do hangar.
 */
const PILOTO_LONGE = { piloto: { hex: { col: 20, row: 6 } } } as const;

export const TEST_CASES: readonly TestCase[] = [
  {
    id: 'fuga-aeroporto',
    name: 'Fuga pelo aeroporto',
    hint: 'Clara aborda o vigia na pista, que corre até o hangar, cruza por dentro e sai pelos fundos, pela esquerda, contornando os sacos (escolha: pular ou dar a volta). Começa na perseguição.',
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
    // para dentro do hangar (mais perto, ele pularia para a mata do leste: as gaiolas do fundo
    // deixam a volta por dentro 2 passos mais longa)
    agents: { clara: { col: 30, row: 21 } },
    enemies: { garimpeiro: { hex: { col: 27, row: 19 }, status: 'alert' }, ...PILOTO_LONGE },
    start: { kind: 'chase', agent: 'clara', enemy: 'garimpeiro' },
  },
  {
    id: 'dois-fugindo-aeroporto',
    name: 'Dois fugindo',
    hint: 'Os dois garimpeiros, em alerta, vão correr no turno inimigo, e Clara, no meio da pista, está no raio dos dois: escolha qual perseguir (o do portão foge para o leste, o da pá entra no hangar e sai pelos fundos) ou deixe os dois.',
    mapId: 'aeroporto',
    active: 'clara',
    // Clara na pista, de frente para o portão; os dois a 4 hexágonos dela, à frente e pouco
    // abertos (os dois cabem na câmera da escolha). Só ela alcança os dois (Ana e Bruno ficam na
    // clareira). O da pá fica na ponta do portão, já de cara para o hangar. O vigia, que patrulha
    // a pista, fica mais abaixo para não ficar entre eles
    agents: { clara: { col: 20, row: 22 } },
    enemies: {
      garimpeiro: { hex: { col: 24, row: 20 }, status: 'alert' },
      'garimpeiro-pa': { hex: { col: 21, row: 18 }, status: 'alert' },
      'vigia-pista': { hex: { col: 21, row: 30 } },
      ...PILOTO_LONGE,
    },
    start: { kind: 'targets', agent: 'clara', enemies: ['garimpeiro', 'garimpeiro-pa'] },
  },
];

export const findTestCase = (id: string | null | undefined): TestCase | undefined =>
  TEST_CASES.find((c) => c.id === id);
