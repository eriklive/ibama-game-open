import { HexArea, HexCoord, hexDistance, hexKey, hexesInRange } from './hex';
import { beats } from './search';

/**
 * Modo diálogo com suspeito rendido (o conteúdo tem tom de interrogatório; estilo Baldur's
 * Gate 3: a rolagem é escondida).
 *
 * - Todo suspeito **rendido** ganha uma **aura** de `auraRadius` hexágonos. Com o agente da vez
 *   dentro dela, aparece **Conversar** — a qualquer momento e quantas vezes quiser. Se a classe
 *   não tem diálogo, a ação aparece bloqueada ("sem diálogo") e a aura fica apagada.
 * - Cada pergunta pode ter CD: o NPC rola 1d`die` (+ `mod` da classe) e **passa quem tira mais
 *   que a CD** (a mesma regra de `beats`, em `search.ts`). Passou = resposta evasiva; falhou =
 *   confissão ou resposta com um sinal de mentira. O jogador nunca vê o dado.
 * - A **intimidação** do agente que conversa soma à CD (+1 por ponto; ver `dcFor`): com ela, o
 *   NPC cede mais fácil.
 * - Quando o NPC **passa** numa pergunta que tem réplica, ela surge logo abaixo; passando na
 *   réplica e havendo tréplica, surge a tréplica. As CDs padrão vêm de `dc` (pergunta 8,
 *   réplica 12, tréplica 14); um nó pode trazer a sua. Cada nível tem a sua mentira (`pass`),
 *   mas a **verdade é uma só** (o `fail` da pergunta da raiz): cedendo em qualquer nível, o
 *   NPC dá essa resposta e a cadeia acaba.
 * - **Memória por NPC** (`DialogueMemory`): pergunta feita fica bloqueada para sempre (marcada
 *   como já perguntada); réplica liberada fica disponível nas próximas entradas.
 * - **Pistas da missão**: pergunta com `requires` só aparece quando a pista (ou todas, numa
 *   lista) estiver registrada; com `hiddenWhen`, some quando a pista aparece (menos para quem
 *   já a fez). Pistas vêm do que a equipe descobre (`item:<id>` ao achar algo
 *   escondido) e de respostas com `clue`.
 * - Tudo é opcional por nó: sem rolagem (`answer`, resposta fixa), sem réplica, réplica sem
 *   tréplica. Classe sem perguntas não tem diálogo.
 *
 * Os textos ficam em `npc-dialogue.ts`; aqui só a lógica pura (testada).
 */
export const INTERROGATION_RULES = {
  die: 20,
  /** CD de cada nível: pergunta, réplica e tréplica. */
  dc: [8, 12, 14],
  /** Cada ponto de intimidação do agente que conversa soma isto à CD. */
  intimidationPerPoint: 1,
  /** Raio da aura em volta do suspeito rendido (hexágonos). */
  auraRadius: 1,
  /**
   * Custo, seguindo a inspeção: a **primeira pergunta de cada entrada** gasta `moveCost` de
   * movimento (entrar e sair sem perguntar não gasta). `endsTurn` encerra a vez ao sair.
   */
  moveCost: 1,
  endsTurn: false,
} as const;

/** Nome dos níveis (o carimbo no cartão de papel). */
export const LEVEL_LABEL = ['', 'Réplica', 'Tréplica'] as const;

/** Uma fala ou várias (o jogo sorteia uma). */
export type Lines = string | readonly string[] | LinePool;

/**
 * Falas sorteadas de um **pool compartilhado na missão** (por `pool`, o id): a fala que um NPC
 * usa sai do pool para os outros (sem repetição entre eles). Esvaziou, usa `fallback`.
 */
export interface LinePool {
  pool: string;
  lines: readonly string[];
  fallback: string;
}

/** Falas já usadas de cada pool compartilhado (estado da missão, por id do pool). */
export type PoolUsage = ReadonlyMap<string, readonly string[]>;

const isPool = (l: Lines): l is LinePool => typeof l === 'object' && !Array.isArray(l);

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
  /** Pista que esta resposta registra na missão (pode liberar perguntas em outros NPCs). */
  clue?: string;
}

/** Condição de desbloqueio: uma pista da missão, ou todas as de uma lista. */
export type Requires = string | readonly string[];

/** Pistas registradas na missão (ver `item:<id>` e `Outcome.clue`). */
export type Clues = ReadonlySet<string>;

/** Pista registrada ao achar algo escondido (inspeção). */
export const itemClue = (id: string): string => `item:${id}`;

/** Pergunta sem rolagem: a resposta é sempre a mesma. */
/** Quando uma pergunta (da raiz da árvore) aparece. */
interface Visibility {
  /** Só aparece quando a pista (ou todas as da lista) estiver registrada na missão. */
  requires?: Requires;
  /**
   * Some quando a pista (ou todas as da lista) estiver registrada — menos para quem já fez a
   * pergunta, que continua vendo o cartão como "perguntado". Ex.: "De quem é essa arma?" some
   * de todos assim que alguém confirma o dono (`dono-arma`).
   */
  hiddenWhen?: Requires;
}

export interface FixedQuestion extends Visibility {
  ask: string;
  answer: Outcome;
}

/**
 * Réplica ou tréplica com rolagem: só a mentira daquele nível (`pass`). A verdade é a da raiz
 * (`fail` da pergunta de onde a cadeia saiu): cedendo em qualquer nível, o NPC diz a mesma coisa.
 */
export interface RolledFollowUp {
  ask: string;
  /** CD própria; sem ela, a do nível (`INTERROGATION_RULES.dc`). */
  dc?: number;
  /** NPC passou (tirou mais que a CD): a mentira deste nível. */
  pass: Outcome;
  /** O próximo nível (a tréplica), que surge se ele passar de novo. */
  followUp?: FollowUpQuestion;
}

/**
 * Réplica ou tréplica sem rolagem: a fala do agente que encerra a insistência e a resposta fixa
 * do NPC (sem chance de ceder; a cadeia acaba aí).
 */
export interface FixedFollowUp {
  ask: string;
  answer: Outcome;
}

export type FollowUpQuestion = RolledFollowUp | FixedFollowUp;

/**
 * Pergunta com rolagem escondida. Uma cadeia (pergunta → réplica → tréplica) tem uma mentira
 * por nível, mas uma **verdade só** (`fail`): falhando em qualquer nível, o NPC dá esta resposta
 * e a cadeia acaba — o jogador tem até 3 chances de arrancar a verdade.
 */
export interface RolledQuestion extends Visibility {
  ask: string;
  /** CD própria; sem ela, a do nível (`INTERROGATION_RULES.dc`). */
  dc?: number;
  /** NPC passou (tirou mais que a CD): evasiva (a mentira do primeiro nível). */
  pass: Outcome;
  /** NPC falhou em qualquer nível da cadeia: a verdade (confissão) ou a resposta com sinal de mentira. */
  fail: Outcome;
  /** Réplica (e, dentro dela, a tréplica): surge quando o NPC passa. */
  followUp?: FollowUpQuestion;
  /**
   * Fecho: fala conclusiva do agente, dita sozinha logo depois que o NPC resiste ao último nível
   * da cadeia que rola. Não é cartão, não rola e o NPC não responde. Não aparece se ele cedeu.
   */
  closing?: string;
}

/** Pergunta da raiz da árvore (o que vai em `NpcClass.questions`). */
export type QuestionNode = FixedQuestion | RolledQuestion;
/** Qualquer cartão: pergunta da raiz, réplica ou tréplica. */
export type AnyQuestion = QuestionNode | FollowUpQuestion;

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
  /** Fala curta de retomada, ao voltar a conversar (sem ela, repete a de entrada). */
  resume?: Lines;
  /** Perguntas; vazio = sem diálogo. */
  questions: readonly QuestionNode[];
}

export const isRolled = (q: AnyQuestion): q is RolledQuestion | RolledFollowUp => 'pass' in q;

/** A classe tem diálogo (ganha aura e pode ser interrogada). */
export const hasDialogue = (cls: NpcClass | null | undefined): cls is NpcClass =>
  !!cls && cls.questions.length > 0;

/**
 * CD de uma pergunta no nível `depth` (0 pergunta, 1 réplica, 2 tréplica), somada à intimidação
 * do agente (`intimidation` pontos × `intimidationPerPoint`); `null` sem rolagem.
 */
export function dcFor(q: AnyQuestion, depth: number, intimidation = 0): number | null {
  if (!isRolled(q)) return null;
  const dcs = INTERROGATION_RULES.dc;
  return (
    (q.dc ?? dcs[Math.min(depth, dcs.length - 1)]) +
    intimidation * INTERROGATION_RULES.intimidationPerPoint
  );
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
  const list = isPool(lines) ? lines.lines : lines;
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))] ?? '';
}

/**
 * Sorteia a fala levando em conta os pools compartilhados: de um pool, só as que ninguém usou
 * ainda (a sorteada sai do pool); vazio, a reserva. Fala comum: como `pickLine`.
 */
export function drawLine(
  lines: Lines,
  usage: PoolUsage = new Map(),
  rng: () => number = Math.random,
): { line: string; usage: PoolUsage } {
  if (!isPool(lines)) return { line: pickLine(lines, rng), usage };
  const used = usage.get(lines.pool) ?? [];
  const left = lines.lines.filter((l) => !used.includes(l));
  if (!left.length) return { line: lines.fallback, usage };
  const line = pickLine(left, rng);
  return { line, usage: new Map(usage).set(lines.pool, [...used, line]) };
}

/** A condição de desbloqueio está cumprida (sem condição, sempre). */
export function meets(requires: Requires | undefined, clues: Clues): boolean {
  if (requires === undefined) return true;
  return typeof requires === 'string' ? clues.has(requires) : requires.every((c) => clues.has(c));
}

/**
 * O que um NPC já conversou na missão: perguntas feitas (bloqueadas para sempre) e réplicas
 * liberadas (continuam disponíveis nas próximas entradas). Chaves = caminho na árvore
 * (`"1"`, `"1.r"`, `"1.r.r"`).
 */
export interface DialogueMemory {
  asked: readonly string[];
  unlocked: readonly string[];
}

export const EMPTY_MEMORY: DialogueMemory = { asked: [], unlocked: [] };

/** Já conversou com ele (ao menos uma pergunta feita). */
export const hasTalked = (m: DialogueMemory | undefined): boolean => !!m && m.asked.length > 0;

/** Uma opção (cartão de papel) da conversa. */
export interface QuestionOption {
  /** Único por NPC (o caminho na árvore: "1", "1.r", "1.r.r"). */
  key: string;
  node: AnyQuestion;
  /** 0 pergunta, 1 réplica, 2 tréplica. */
  depth: number;
  /** Já perguntada: fica marcada e bloqueada. */
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
  /** Fecho da cadeia (`RolledQuestion.closing`): o NPC resistiu ao último nível. */
  closing: string | null;
}

/** O nó da árvore na chave `key` ("2", "2.r", "2.r.r"); `null` se não existir. */
export function nodeAt(cls: NpcClass, key: string): AnyQuestion | null {
  const [base, ...rest] = key.split('.');
  let node: AnyQuestion | undefined = cls.questions[Number(base)];
  if (!node || !/^\d+$/.test(base)) return null;
  for (const step of rest) {
    if (step !== 'r' || !isRolled(node) || !node.followUp) return null;
    node = node.followUp;
  }
  return node;
}

/** A pergunta aparece com estas pistas: `requires` cumprido e `hiddenWhen` não. */
export const visibleWith = (q: QuestionNode, clues: Clues): boolean =>
  meets(q.requires, clues) && (q.hiddenWhen === undefined || !meets(q.hiddenWhen, clues));

/**
 * Cartões da conversa com o NPC: as perguntas visíveis com as pistas da missão (`requires`
 * cumprido, `hiddenWhen` não), cada uma seguida das réplicas que ele já liberou. As feitas vêm
 * marcadas (`done`) e continuam na lista (mesmo que deixem de estar visíveis), para o jogador
 * ver o histórico.
 */
export function dialogueOptions(
  cls: NpcClass,
  memory: DialogueMemory,
  clues: Clues = new Set(),
): QuestionOption[] {
  const asked = new Set(memory.asked);
  const unlocked = new Set(memory.unlocked);
  const out: QuestionOption[] = [];
  cls.questions.forEach((q, i) => {
    const key = String(i);
    // pergunta já feita fica no histórico mesmo que a condição deixe de valer
    if (!visibleWith(q, clues) && !asked.has(key)) return;
    out.push({ key, node: q, depth: 0, done: asked.has(key) });
    let node: AnyQuestion = q;
    let k = key;
    let depth = 0;
    while (isRolled(node) && node.followUp && unlocked.has(`${k}.r`)) {
      node = node.followUp;
      k = `${k}.r`;
      depth++;
      out.push({ key: k, node, depth, done: asked.has(k) });
    }
  });
  return out;
}

/**
 * Faz a pergunta `key`: rola escondido (se houver CD, mais a intimidação do agente) e sorteia
 * a fala. Passou: a mentira daquele nível e, se houver, libera a réplica (até a tréplica).
 * Falhou em qualquer nível: a verdade da cadeia (o `fail` da pergunta da raiz), e a cadeia acaba.
 * Devolve a memória nova e a resposta. Pergunta já feita, oculta ou inexistente: `null`.
 */
export function askQuestion(
  cls: NpcClass,
  memory: DialogueMemory,
  key: string,
  opts: {
    die: () => number;
    rng?: () => number;
    clues?: Clues;
    intimidation?: number;
    pools?: PoolUsage;
  },
): { memory: DialogueMemory; answer: Answer; pools: PoolUsage } | null {
  const option = dialogueOptions(cls, memory, opts.clues).find((o) => o.key === key);
  if (!option || option.done) return null;
  const node = option.node;
  const done: QuestionOption = { ...option, done: true };
  const asked = [...memory.asked, key];
  const rng = opts.rng ?? Math.random;
  const pools = opts.pools ?? new Map();
  if (!isRolled(node)) {
    const drawn = drawLine(node.answer.say, pools, rng);
    return {
      pools: drawn.usage,
      memory: { asked, unlocked: memory.unlocked },
      answer: {
        option: done,
        outcome: node.answer,
        line: drawn.line,
        roll: null,
        dc: null,
        passed: null,
        unlocked: null,
        closing: null,
      },
    };
  }
  const dc = dcFor(node, option.depth, opts.intimidation ?? 0)!;
  const { roll, pass } = hiddenRoll(dc, cls.mod, opts.die);
  // a verdade é uma só na cadeia: a da pergunta da raiz
  const root = cls.questions[Number(key.split('.')[0])] as RolledQuestion;
  const outcome = pass ? node.pass : root.fail;
  const maxDepth = INTERROGATION_RULES.dc.length - 1;
  const unlocked: QuestionOption | null =
    pass && node.followUp && option.depth < maxDepth
      ? { key: `${key}.r`, node: node.followUp, depth: option.depth + 1, done: false }
      : null;
  const drawn = drawLine(outcome.say, pools, rng);
  // resistiu ao último nível que rola: o agente fecha a insistência
  const last = !node.followUp || option.depth >= maxDepth || !isRolled(node.followUp);
  const closing = pass && last && !unlocked ? (root.closing ?? null) : null;
  return {
    pools: drawn.usage,
    memory: { asked, unlocked: unlocked ? [...memory.unlocked, unlocked.key] : memory.unlocked },
    answer: {
      option: done,
      outcome,
      line: drawn.line,
      roll,
      dc,
      passed: pass,
      unlocked,
      closing,
    },
  };
}

/** Ainda há pergunta para fazer. */
export const hasOpenQuestions = (options: readonly QuestionOption[]): boolean =>
  options.some((o) => !o.done);

/** Fala ao abrir a conversa: a de retomada se já conversaram (ou a de entrada). */
export function openingLine(cls: NpcClass, memory: DialogueMemory | undefined): Lines | null {
  if (hasTalked(memory) && cls.resume) return cls.resume;
  return cls.intro?.say ?? null;
}

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

/** Movimento gasto pela pergunta: só a primeira de cada entrada (`askedThisEntry` = já feitas nela). */
export const questionCost = (
  askedThisEntry: number,
  rules: { moveCost: number } = INTERROGATION_RULES,
): number => (askedThisEntry === 0 ? rules.moveCost : 0);

/** Rendido ao lado do agente e se dá para conversar (`silent`: sem diálogo, ação bloqueada). */
export interface TalkTarget<E> {
  enemy: E;
  silent: boolean;
}

/**
 * O rendido em cuja aura o agente está: todo rendido conta (com ou sem diálogo), quantas vezes
 * for. Quem não se rendeu (em patrulha, em alerta, fugido, escondido) não conversa.
 */
export function talkTarget<E extends { hex: HexCoord; status: string; npc?: string }>(
  agent: HexCoord,
  enemies: readonly E[],
  classOf: (id: string | undefined) => NpcClass | undefined,
): TalkTarget<E> | null {
  const enemy = enemies.find((e) => e.status === 'surrendered' && inAura(agent, e.hex));
  return enemy ? { enemy, silent: !hasDialogue(classOf(enemy.npc)) } : null;
}

/** Tipo da anotação na caderneta (o carimbo ao lado). */
export type NoteKind = 'declarou' | 'sinal' | 'confessou';

export const noteKind = (o: Outcome): NoteKind =>
  o.confess ? 'confessou' : o.tell ? 'sinal' : 'declarou';
