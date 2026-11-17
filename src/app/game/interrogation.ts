import { HexArea, HexCoord, hexDistance, hexKey, hexesInRange } from './hex';
import { beats } from './search';

/**
 * Interrogatório de suspeito rendido (estilo Baldur's Gate 3: a rolagem é escondida).
 *
 * - Todo suspeito **rendido** cuja classe tem diálogo ganha uma **aura** de `auraRadius`
 *   hexágonos. Com o agente da vez dentro dela, aparece **Interrogar**.
 * - Cada pergunta pode ter CD: o NPC rola 1d`die` (+ `mod` da classe) e **passa quem tira
 *   mais que a CD** (a mesma regra de `beats`, em `search.ts`). Passou = resposta evasiva;
 *   falhou = confissão ou resposta com um sinal de mentira. O jogador nunca vê o dado.
 * - Quando o NPC **passa** numa pergunta que tem réplica, ela surge logo abaixo; passando na
 *   réplica e havendo tréplica, surge a tréplica. As CDs padrão vêm de `dc` (pergunta,
 *   réplica, tréplica); um nó pode trazer a sua.
 * - Tudo é opcional por nó: sem rolagem (`answer`, resposta fixa), sem réplica, réplica sem
 *   tréplica. Classe sem perguntas não tem diálogo (sem aura, sem ação).
 *
 * Os textos ficam em `npc-dialogue.ts`; aqui só a lógica pura (testada).
 */
export const INTERROGATION_RULES = {
  die: 20,
  /** CD de cada nível: pergunta, réplica e tréplica. */
  dc: [10, 15, 18],
  /** Raio da aura em volta do suspeito rendido (hexágonos). */
  auraRadius: 1,
  /** Quantas perguntas abrem o interrogatório ("Tem mais gente com vocês?" sempre entre elas). */
  openingQuestions: 3,
  /**
   * Custo, seguindo a inspeção: gasta `moveCost` de movimento ao fazer a **primeira** pergunta
   * (encerrar sem perguntar nada não gasta). `endsTurn` encerra a vez ao sair do close-up.
   */
  moveCost: 1,
  endsTurn: false,
} as const;

/** Nome dos níveis (o carimbo no cartão de papel). */
export const LEVEL_LABEL = ['', 'Réplica', 'Tréplica'] as const;

/** Uma fala ou várias (o jogo sorteia uma). */
export type Lines = string | readonly string[];

/** Desfecho de uma pergunta: o que o suspeito diz e o que vai para a caderneta. */
export interface Outcome {
  say: Lines;
  /** Sinal de mentira: aparece entre parênteses, em itálico, e o suspeito se mexe. */
  tell?: string;
  /** Anotação na caderneta de campo. */
  note: string;
  /** Confissão (a anotação ganha o carimbo "confessou"). */
  confess?: boolean;
  /** Entrega alguém escondido: revela no mapa a unidade ligada ao suspeito (se houver). */
  reveal?: boolean;
}

/** Pergunta sem rolagem: a resposta é sempre a mesma. */
export interface FixedQuestion {
  ask: string;
  answer: Outcome;
}

/** Pergunta com rolagem escondida (e, opcionalmente, a réplica que surge se ele passar). */
export interface RolledQuestion {
  ask: string;
  /** CD própria; sem ela, a do nível (`INTERROGATION_RULES.dc`). */
  dc?: number;
  /** NPC passou (tirou mais que a CD): evasiva. */
  pass: Outcome;
  /** NPC falhou: confissão ou resposta com sinal de mentira. */
  fail: Outcome;
  /** Réplica (e, dentro dela, a tréplica): surge quando o NPC passa. */
  followUp?: RolledQuestion;
}

export type QuestionNode = FixedQuestion | RolledQuestion;

/** Classe de NPC: personalidade, fala de entrada e a árvore de perguntas. */
export interface NpcClass {
  id: string;
  name: string;
  /** Traço de personalidade ("nervoso · se faz de desentendido"). */
  trait: string;
  /** Modificador da rolagem do NPC (padrão 0; reservado para o futuro). */
  mod: number;
  /** Entrada: postura (rubrica) e fala, sem cumprimento. */
  intro?: { posture: string; say: Lines };
  /** Perguntas; vazio = sem diálogo. */
  questions: readonly QuestionNode[];
}

export const isRolled = (q: QuestionNode): q is RolledQuestion => 'pass' in q;

/** A classe tem diálogo (ganha aura e pode ser interrogada). */
export const hasDialogue = (cls: NpcClass | null | undefined): cls is NpcClass =>
  !!cls && cls.questions.length > 0;

/** CD de uma pergunta no nível `depth` (0 pergunta, 1 réplica, 2 tréplica); `null` sem rolagem. */
export function dcFor(q: QuestionNode, depth: number): number | null {
  if (!isRolled(q)) return null;
  const dcs = INTERROGATION_RULES.dc;
  return q.dc ?? dcs[Math.min(depth, dcs.length - 1)];
}

/** Rolagem escondida do NPC: passa tirando **mais que** a CD (com o modificador da classe). */
export function hiddenRoll(
  dc: number,
  mod: number,
  die: () => number,
): { roll: number; pass: boolean } {
  const roll = die();
  return { roll, pass: beats(roll + mod, dc) };
}

/** Sorteia uma das falas (`rng` em [0, 1), como `Math.random`). */
export function pickLine(lines: Lines, rng: () => number = Math.random): string {
  if (typeof lines === 'string') return lines;
  return lines[Math.min(lines.length - 1, Math.floor(rng() * lines.length))] ?? '';
}

/** Uma opção (cartão de papel) do interrogatório. */
export interface QuestionOption {
  /** Único no interrogatório (o caminho na árvore: "1", "1.r", "1.r.r"). */
  key: string;
  node: QuestionNode;
  /** 0 pergunta, 1 réplica, 2 tréplica. */
  depth: number;
  done: boolean;
}

/** Resultado de uma pergunta feita. */
export interface Answer {
  option: QuestionOption;
  outcome: Outcome;
  /** A fala sorteada. */
  line: string;
  /** Rolagem escondida (só para depuração e testes; nunca vai para a tela). */
  roll: number | null;
  dc: number | null;
  /** `true` NPC passou (evasiva), `false` falhou, `null` sem rolagem. */
  passed: boolean | null;
  /** Réplica/tréplica liberada, se houver. */
  unlocked: QuestionOption | null;
}

/**
 * Perguntas que abrem o interrogatório: até `max`, sempre com a de "mais gente" (`mustAsk`)
 * entre elas, na ordem da classe.
 */
export function openingOptions(
  cls: NpcClass,
  mustAsk: (q: QuestionNode) => boolean = () => false,
  max: number = INTERROGATION_RULES.openingQuestions,
): QuestionOption[] {
  const all = cls.questions.map((node, i) => ({ node, i }));
  const required = all.filter(({ node }) => mustAsk(node));
  const rest = all.filter(({ node }) => !mustAsk(node));
  const chosen = [...required, ...rest.slice(0, Math.max(0, max - required.length))].sort(
    (a, b) => a.i - b.i,
  );
  return chosen.map(({ node, i }) => ({ key: String(i), node, depth: 0, done: false }));
}

/**
 * Faz a pergunta `key`: rola escondido (se houver CD), sorteia a fala e, se o NPC passou e o
 * nó tem réplica (até a tréplica), põe a nova opção logo abaixo. Devolve as opções novas
 * (a feita marcada como `done`) e a resposta. Pergunta já feita ou inexistente: `null`.
 */
export function askQuestion(
  options: readonly QuestionOption[],
  key: string,
  mod: number,
  die: () => number,
  rng: () => number = Math.random,
): { options: QuestionOption[]; answer: Answer } | null {
  const index = options.findIndex((o) => o.key === key);
  const option = options[index];
  if (!option || option.done) return null;
  const node = option.node;
  const done: QuestionOption = { ...option, done: true };
  const next = [...options];
  next[index] = done;
  if (!isRolled(node)) {
    const answer: Answer = {
      option: done,
      outcome: node.answer,
      line: pickLine(node.answer.say, rng),
      roll: null,
      dc: null,
      passed: null,
      unlocked: null,
    };
    return { options: next, answer };
  }
  const dc = dcFor(node, option.depth)!;
  const { roll, pass } = hiddenRoll(dc, mod, die);
  const outcome = pass ? node.pass : node.fail;
  const maxDepth = INTERROGATION_RULES.dc.length - 1;
  const unlocked: QuestionOption | null =
    pass && node.followUp && option.depth < maxDepth
      ? { key: `${option.key}.r`, node: node.followUp, depth: option.depth + 1, done: false }
      : null;
  if (unlocked) next.splice(index + 1, 0, unlocked);
  return {
    options: next,
    answer: {
      option: done,
      outcome,
      line: pickLine(outcome.say, rng),
      roll,
      dc,
      passed: pass,
      unlocked,
    },
  };
}

/** Ainda há pergunta para fazer. */
export const hasOpenQuestions = (options: readonly QuestionOption[]): boolean =>
  options.some((o) => !o.done);

/** Agente dentro da aura do suspeito (colado nele, com o raio padrão de 1). */
export const inAura = (
  agent: HexCoord,
  suspect: HexCoord,
  radius: number = INTERROGATION_RULES.auraRadius,
): boolean => {
  const d = hexDistance(agent, suspect);
  return d >= 1 && d <= radius;
};

/** Hexágonos da aura (em volta do suspeito, dentro da área e fora do que é sólido). */
export function auraHexes(
  suspect: HexCoord,
  area: HexArea,
  solid: ReadonlySet<string> = new Set(),
  radius: number = INTERROGATION_RULES.auraRadius,
): HexCoord[] {
  return hexesInRange(suspect, radius, area).filter(
    (h) => inAura(h, suspect, radius) && !solid.has(hexKey(h)),
  );
}

/** Tipo da anotação na caderneta (o carimbo ao lado). */
export type NoteKind = 'declarou' | 'sinal' | 'confessou';

export const noteKind = (o: Outcome): NoteKind =>
  o.confess ? 'confessou' : o.tell ? 'sinal' : 'declarou';
