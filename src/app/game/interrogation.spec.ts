import { describe, expect, it } from 'vitest';
import { spawnEnemy } from './enemies';
import { hexKey, hexNeighbors, rectArea } from './hex';
import {
  DialogueMemory,
  PoolUsage,
  FollowUpQuestion,
  EMPTY_MEMORY,
  INTERROGATION_RULES,
  NpcClass,
  QuestionOption,
  RolledQuestion,
  askQuestion,
  auraHexes,
  dcFor,
  dialogueOptions,
  drawLine,
  hasDialogue,
  hasOpenQuestions,
  hasTalked,
  hiddenRoll,
  inAura,
  isRolled,
  itemClue,
  meets,
  nodeAt,
  noteKind,
  noticedAfter,
  Outcome,
  openingLine,
  pickLine,
  questionCost,
  talkTarget,
} from './interrogation';
import { MAPS } from './maps';
import { objectiveState } from './mission';
import { needsNoticeRoll } from './search';
import { KEY_PANEL_ID, KEY_TAKEN, PLANE_LOCKED } from './plane';
import { GUN_OWNER, MORE_PEOPLE, NPC_CLASSES, isMorePeople, npcClass } from './npc-dialogue';

/** Dado viciado: devolve as faces na ordem (e repete a última). */
const dice = (...faces: number[]) => {
  let i = 0;
  return () => faces[Math.min(i++, faces.length - 1)];
};

const piloto = NPC_CLASSES.piloto;
const garimpeiro = NPC_CLASSES.garimpeiro;
const caseiro = NPC_CLASSES.caseiro;
const CONFESSION = 'Tá bom… é combustível pro garimpo. Contrabando. Vai pras balsas lá dentro.';
const keyOf = (options: readonly QuestionOption[], ask: string) =>
  options.find((o) => o.node.ask === ask)!.key;
const CARGA = 'O que você carregava no avião?';
const REPLICA = 'Não sabe? Tava pilotando vendado?';
const TREPLICA = 'É melhor você não mentir pra gente. Você não vai ser preso agora.';

/** Faz a pergunta `ask` (pelo texto) com o dado dado. */
function ask(
  cls: NpcClass,
  memory: DialogueMemory,
  text: string,
  face: number,
  extra: { clues?: Set<string>; intimidation?: number } = {},
) {
  const key = keyOf(dialogueOptions(cls, memory, extra.clues), text);
  return askQuestion(cls, memory, key, { die: dice(face), rng: () => 0, ...extra })!;
}

describe('rolagem escondida do NPC', () => {
  it('passa só quem tira mais que a CD (como beats)', () => {
    expect(hiddenRoll(8, 0, () => 9).pass).toBe(true);
    expect(hiddenRoll(8, 0, () => 8).pass).toBe(false);
    expect(hiddenRoll(12, 0, () => 12).pass).toBe(false);
    expect(hiddenRoll(14, 0, () => 15).pass).toBe(true);
  });

  it('o modificador da classe entra na conta', () => {
    expect(hiddenRoll(8, 1, () => 8).pass).toBe(true);
    expect(hiddenRoll(8, -1, () => 9).pass).toBe(false);
  });

  it('CD padrão por nível: pergunta 8, réplica 12, tréplica 14 (ou a do nó)', () => {
    const q: RolledQuestion = {
      ask: 'x',
      pass: { say: 'a', note: 'a' },
      fail: { say: 'b', note: 'b' },
    };
    expect(INTERROGATION_RULES.dc).toEqual([8, 12, 14]);
    expect([0, 1, 2].map((d) => dcFor(q, d))).toEqual([8, 12, 14]);
    expect(dcFor({ ...q, dc: 11 }, 0)).toBe(11);
    expect(dcFor({ ask: 'y', answer: { say: 'c', note: 'c' } }, 0)).toBeNull();
  });

  it('a intimidação do agente soma +1 à CD por ponto', () => {
    const q: RolledQuestion = {
      ask: 'x',
      pass: { say: 'a', note: 'a' },
      fail: { say: 'b', note: 'b' },
    };
    expect(dcFor(q, 0, 2)).toBe(10);
    expect(dcFor(q, 2, 1)).toBe(15);
    expect(dcFor(q, 0, -1)).toBe(7);
  });

  it('com intimidação, o mesmo dado que passaria vira falha (o NPC cede)', () => {
    // 10 é mais que 8: sem intimidação, passa (evasiva)
    const calm = ask(piloto, EMPTY_MEMORY, CARGA, 10);
    expect(calm.answer.passed).toBe(true);
    expect(calm.answer.dc).toBe(8);
    // com intimidação 2 a CD vira 10 e 10 não é mais que 10: confessa
    const tough = ask(piloto, EMPTY_MEMORY, CARGA, 10, { intimidation: 2 });
    expect(tough.answer.dc).toBe(10);
    expect(tough.answer.passed).toBe(false);
    expect(tough.answer.outcome.confess).toBe(true);
  });

  it('sorteia uma das falas', () => {
    expect(pickLine('só uma')).toBe('só uma');
    expect(pickLine(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pickLine(['a', 'b', 'c'], () => 0.99)).toBe('c');
  });
});

describe('perguntas, réplica e tréplica', () => {
  it('abre com as perguntas sem condição, sempre com uma de "tem mais gente?"', () => {
    for (const cls of Object.values(NPC_CLASSES).filter(hasDialogue)) {
      const opts = dialogueOptions(cls, EMPTY_MEMORY);
      expect(opts.length, cls.id).toBeGreaterThanOrEqual(2);
      expect(
        opts.some((o) => isMorePeople(o.node as never)),
        cls.id,
      ).toBe(true);
    }
  });

  it('missão do aeroporto: o piloto passa, surge a RÉPLICA e depois a TRÉPLICA', () => {
    let r = ask(piloto, EMPTY_MEMORY, CARGA, 14);
    expect(r.answer.passed).toBe(true);
    expect(r.answer.dc).toBe(8);
    expect(r.answer.line).toBe('Não sei, doutor.');
    expect(r.answer.unlocked?.node.ask).toBe(REPLICA);
    expect(r.answer.unlocked?.depth).toBe(1);
    let opts = dialogueOptions(piloto, r.memory);
    const i = opts.findIndex((o) => o.node.ask === CARGA);
    expect(opts[i].done).toBe(true);
    expect(opts[i + 1].node.ask).toBe(REPLICA);
    // réplica (CD 12): tira 13, passa → tréplica
    r = ask(piloto, r.memory, REPLICA, 13);
    expect(r.answer.dc).toBe(12);
    expect(r.answer.passed).toBe(true);
    expect(r.answer.unlocked?.node.ask).toBe(TREPLICA);
    expect(r.answer.unlocked?.depth).toBe(2);
    // tréplica (CD 14): tira 14 (não é mais que 14) → confessa
    r = ask(piloto, r.memory, TREPLICA, 14);
    expect(r.answer.dc).toBe(14);
    expect(r.answer.passed).toBe(false);
    expect(r.answer.outcome.confess).toBe(true);
    expect(r.answer.unlocked).toBeNull();
    expect(noteKind(r.answer.outcome)).toBe('confessou');
    opts = dialogueOptions(piloto, r.memory);
    expect(opts.filter((o) => o.depth > 0).map((o) => o.done)).toEqual([true, true]);
  });

  it('falhou na pergunta: confessa e não surge réplica', () => {
    const r = ask(piloto, EMPTY_MEMORY, CARGA, 3);
    expect(r.answer.passed).toBe(false);
    expect(r.answer.line).toBe(
      'Tá bom… é combustível pro garimpo. Contrabando. Vai pras balsas lá dentro.',
    );
    expect(r.answer.unlocked).toBeNull();
    expect(r.memory.unlocked).toEqual([]);
  });

  it('pergunta sem réplica: passar não libera nada', () => {
    const r = ask(piloto, EMPTY_MEMORY, 'Pra onde ia esse voo?', 20);
    expect(r.answer.passed).toBe(true);
    expect(r.answer.unlocked).toBeNull();
  });

  it('falhou com sinal de mentira: a anotação vira "sinal"', () => {
    const r = ask(piloto, EMPTY_MEMORY, 'Pra onde ia esse voo?', 1);
    expect(r.answer.outcome.tell).toBe('olha de relance pro GPS no painel');
    expect(noteKind(r.answer.outcome)).toBe('sinal');
  });

  it('pergunta sem CD: resposta fixa, sem rolar o dado', () => {
    let rolled = false;
    const key = keyOf(dialogueOptions(garimpeiro, EMPTY_MEMORY), 'Estão armados?');
    const r = askQuestion(garimpeiro, EMPTY_MEMORY, key, { die: () => ((rolled = true), 1) })!;
    expect(rolled).toBe(false);
    expect(r.answer.passed).toBeNull();
    expect(r.answer.roll).toBeNull();
    expect(r.answer.line).toBe('Só o facão. Já tá aí com o senhor.');
    expect(noteKind(r.answer.outcome)).toBe('declarou');
  });

  it('"Tem mais gente?" no aeroporto: só anotação, ninguém é entregue', () => {
    for (const cls of [piloto, garimpeiro, caseiro]) {
      const q = cls.questions.find(isMorePeople)!;
      expect(q.ask, cls.id).toBeTruthy();
      for (const face of [1, 20]) {
        const r = ask(cls, EMPTY_MEMORY, q.ask, face);
        expect(r.answer.outcome.reveal, cls.id).toBeFalsy();
        expect(r.answer.unlocked, cls.id).toBeNull();
      }
    }
    expect(caseiro.questions.find(isMorePeople)!.ask).toBe('Tem mais alguém por aqui?');
  });

  it('acabam as perguntas', () => {
    let m = EMPTY_MEMORY;
    for (const o of dialogueOptions(NPC_CLASSES.pescador, m))
      m = askQuestion(NPC_CLASSES.pescador, m, o.key, { die: dice(1) })!.memory;
    expect(hasOpenQuestions(dialogueOptions(NPC_CLASSES.pescador, m))).toBe(false);
  });

  it('acha o nó pela chave da árvore', () => {
    expect(nodeAt(piloto, '1')?.ask).toBe(CARGA);
    expect(nodeAt(piloto, '1.r')?.ask).toBe(REPLICA);
    expect(nodeAt(piloto, '1.r.r')?.ask).toBe(TREPLICA);
    expect(nodeAt(piloto, '1.r.r.r')).toBeNull();
    expect(nodeAt(piloto, '9')).toBeNull();
  });
});

describe('cadeia: três mentiras, uma verdade', () => {
  const chain = (cls: NpcClass, asks: string[], faces: number[]) => {
    let m = EMPTY_MEMORY;
    const out = [];
    for (let i = 0; i < faces.length; i++) {
      const r = ask(cls, m, asks[i], faces[i]);
      out.push(r);
      m = r.memory;
    }
    return { out, memory: m };
  };

  it('piloto: três mentiras distintas, uma por nível', () => {
    const { out } = chain(piloto, [CARGA, REPLICA, TREPLICA], [20, 20, 20]);
    expect(out[0].answer.line).toBe('Não sei, doutor.');
    expect(out[1].answer.line).toBe('A gente não olha o conteúdo não. É o ajudante que carrega.');
    expect(['…', 'Tô falando pro senhor que não sei de nada.']).toContain(out[2].answer.line);
    expect(new Set(out.map((r) => r.answer.outcome.note)).size).toBe(3);
  });

  it('piloto: cedendo em qualquer nível, a mesma confissão e a cadeia acaba', () => {
    const asks = [CARGA, REPLICA, TREPLICA];
    for (let level = 0; level < 3; level++) {
      const faces = [...Array(level).fill(20), 1];
      const { out, memory } = chain(piloto, asks, faces);
      const last = out.at(-1)!.answer;
      expect(last.passed, `nível ${level}`).toBe(false);
      expect(last.line).toBe(CONFESSION);
      expect(last.outcome).toBe(
        piloto.questions[1] && (piloto.questions[1] as RolledQuestion).fail,
      );
      expect(last.unlocked).toBeNull();
      // nada novo da cadeia para perguntar depois
      expect(
        dialogueOptions(piloto, memory).filter((o) => o.key.startsWith('1') && !o.done),
      ).toEqual([]);
    }
    expect(CONFESSION).not.toContain('diesel');
  });

  it('caseiro: "Tem arma na casa?" com três mentiras e uma verdade', () => {
    const asks = [
      'Tem arma na casa?',
      'Não tem? Casa no meio do garimpo e nenhuma arma?',
      'Olha, é melhor falar agora. Se a gente achar, complica pra você.',
    ];
    const lies = chain(caseiro, asks, [20, 20, 20]).out.map((r) => r.answer.line);
    expect(lies[0]).toBe('Arma? Aqui não tem nada disso, doutor.');
    expect(lies[1]).toBe('Aqui é só panela e rede, pode olhar.');
    expect(['…', 'Já disse que não tem, doutor.']).toContain(lies[2]);
    for (let level = 0; level < 3; level++) {
      const last = chain(caseiro, asks, [...Array(level).fill(20), 1]).out.at(-1)!.answer;
      expect(last.line, `nível ${level}`).toBe('Tem sim, tá no quartinho de trás.');
      expect(last.outcome.confess).toBe(true);
      expect(last.unlocked).toBeNull();
    }
  });
});

describe('confissão que entrega o esconderijo', () => {
  const ARMA_CASA = [
    'Tem arma na casa?',
    'Não tem? Casa no meio do garimpo e nenhuma arma?',
    'Olha, é melhor falar agora. Se a gente achar, complica pra você.',
  ];
  const aeroporto = MAPS.find((m) => m.id === 'aeroporto')!;
  const arma = aeroporto.hidden!.find((h) => h.id === 'arma')!;
  // entrando no quarto de trás (o cômodo do armário)
  const path = [
    { col: 35, row: 29 },
    { col: 36, row: 29 },
  ];
  const investigar = aeroporto.objectives!.find((o) => o.id === 'investigar-casa')!;
  const progress = (noticed: ReadonlySet<string>) => ({
    enemies: [],
    noticed,
    found: new Set<string>(),
    burned: new Set<string>(),
  });

  it('o caseiro confessa (em qualquer nível): o armário conta como percebido e pula a percepção', () => {
    for (let level = 0; level < 3; level++) {
      let m = EMPTY_MEMORY;
      let last;
      for (let i = 0; i <= level; i++) {
        last = ask(caseiro, m, ARMA_CASA[i], i === level ? 1 : 20);
        m = last.memory;
      }
      const out = last!.answer.outcome;
      expect(out.notices, `nível ${level}`).toBe('arma');
      const noticed = noticedAfter(new Set(), out);
      expect(noticed.has('arma')).toBe(true);
      expect(needsNoticeRoll(arma, 'ana', path, noticed, new Set())).toBe(false);
      expect(objectiveState(investigar, progress(noticed))).toBe('done');
    }
  });

  it('sem confissão, tudo como antes: rola percepção ao entrar e o objetivo segue aberto', () => {
    const lies = ARMA_CASA.reduce(
      (acc, q) => {
        const r = ask(caseiro, acc.m, q, 20);
        return { m: r.memory, outs: [...acc.outs, r.answer.outcome] };
      },
      { m: EMPTY_MEMORY, outs: [] as Outcome[] },
    ).outs;
    let noticed: ReadonlySet<string> = new Set();
    for (const o of lies) {
      expect(o.notices).toBeUndefined();
      noticed = noticedAfter(noticed, o);
    }
    expect(noticed.size).toBe(0);
    expect(needsNoticeRoll(arma, 'ana', path, noticed, new Set())).toBe(true);
    // quem já rolou ali não rola de novo; fora do cômodo, não rola
    expect(needsNoticeRoll(arma, 'ana', path, noticed, new Set(['arma:ana']))).toBe(false);
    expect(needsNoticeRoll(arma, 'ana', [{ col: 33, row: 29 }], noticed, new Set())).toBe(false);
    expect(objectiveState(investigar, progress(noticed))).toBe('open');
  });
});

describe('memória por NPC (modo diálogo)', () => {
  it('pergunta feita fica bloqueada para sempre, seja qual for a resposta', () => {
    for (const face of [1, 20]) {
      const r = ask(piloto, EMPTY_MEMORY, MORE_PEOPLE, face);
      const key = keyOf(dialogueOptions(piloto, r.memory), MORE_PEOPLE);
      // continua na lista (histórico), marcada como feita
      expect(dialogueOptions(piloto, r.memory).find((o) => o.key === key)?.done).toBe(true);
      expect(askQuestion(piloto, r.memory, key, { die: dice(5) })).toBeNull();
    }
    // a de resposta fixa também
    const fixed = ask(garimpeiro, EMPTY_MEMORY, 'Estão armados?', 1);
    const key = keyOf(dialogueOptions(garimpeiro, fixed.memory), 'Estão armados?');
    expect(askQuestion(garimpeiro, fixed.memory, key, { die: dice(1) })).toBeNull();
  });

  it('as que faltam continuam disponíveis numa próxima entrada', () => {
    const r = ask(piloto, EMPTY_MEMORY, MORE_PEOPLE, 20);
    // "sai" e "volta": a memória é a mesma, então as outras seguem abertas
    const later = dialogueOptions(piloto, r.memory);
    expect(later.filter((o) => !o.done).map((o) => o.node.ask)).toEqual([
      CARGA,
      'Pra onde ia esse voo?',
    ]);
    expect(hasTalked(r.memory)).toBe(true);
    expect(hasTalked(EMPTY_MEMORY)).toBe(false);
  });

  it('réplica liberada e não feita continua lá na próxima entrada', () => {
    const r = ask(piloto, EMPTY_MEMORY, CARGA, 20);
    expect(r.memory.unlocked).toEqual([r.answer.unlocked!.key]);
    const reopened = dialogueOptions(piloto, r.memory);
    const replica = reopened.find((o) => o.node.ask === REPLICA)!;
    expect(replica.done).toBe(false);
    expect(replica.depth).toBe(1);
    // e dá para fazê-la depois
    expect(ask(piloto, r.memory, REPLICA, 1).answer.passed).toBe(false);
  });

  it('cada NPC tem a sua memória', () => {
    const jo = ask(garimpeiro, EMPTY_MEMORY, MORE_PEOPLE, 20).memory;
    const other: DialogueMemory = EMPTY_MEMORY;
    expect(dialogueOptions(garimpeiro, jo).some((o) => o.done)).toBe(true);
    expect(dialogueOptions(garimpeiro, other).some((o) => o.done)).toBe(false);
  });

  it('ao voltar, abre com a fala de retomada (ou a de entrada, sem ela)', () => {
    expect(openingLine(piloto, EMPTY_MEMORY)).toBe(piloto.intro!.say);
    const talked = ask(piloto, EMPTY_MEMORY, MORE_PEOPLE, 20).memory;
    expect(openingLine(piloto, talked)).toBe(piloto.resume);
    expect(openingLine({ ...piloto, resume: undefined }, talked)).toBe(piloto.intro!.say);
  });
});

describe('custo e ação de conversa', () => {
  it('só a primeira pergunta de cada entrada gasta movimento', () => {
    expect(questionCost(0)).toBe(INTERROGATION_RULES.moveCost);
    expect(questionCost(1)).toBe(0);
    expect(questionCost(3)).toBe(0);
    // nova entrada, conta de novo
    expect(questionCost(0, { moveCost: 1 })).toBe(1);
    expect(questionCost(0, { moveCost: 2 })).toBe(2);
  });

  it('conversar não gasta movimento: o alcance para no hexágono colado no rendido', () => {
    expect(INTERROGATION_RULES.moveCost).toBe(0);
    expect(questionCost(0)).toBe(0);
  });

  it('todo rendido ao lado mostra a ação; sem diálogo, bloqueada', () => {
    const agent = { col: 5, row: 5 };
    const near = hexNeighbors(agent)[0];
    const at = (npc: string | undefined, status: string, hex = near) => [
      { id: 'x', hex, status, npc },
    ];
    expect(talkTarget(agent, at('piloto', 'surrendered'), npcClass)).toMatchObject({
      silent: false,
    });
    expect(talkTarget(agent, at('seguranca', 'surrendered'), npcClass)).toMatchObject({
      silent: true,
    });
    expect(talkTarget(agent, at(undefined, 'surrendered'), npcClass)).toMatchObject({
      silent: true,
    });
    // só rendidos: quem não foi abordado não conversa
    expect(talkTarget(agent, at('piloto', 'patrol'), npcClass)).toBeNull();
    expect(talkTarget(agent, at('piloto', 'alert'), npcClass)).toBeNull();
    // longe da aura, nada
    expect(talkTarget(agent, at('piloto', 'surrendered', { col: 8, row: 5 }), npcClass)).toBeNull();
  });
});

describe('perguntas que surgem (e somem) com pistas da missão', () => {
  const WHOSE = 'De quem é essa arma?';
  const ARMA = new Set([itemClue('arma')]);
  const asks = (cls: NpcClass, memory: DialogueMemory, clues: Set<string>) =>
    dialogueOptions(cls, memory, clues).map((o) => o.node.ask);

  it('condição: uma pista ou todas de uma lista', () => {
    const clues = new Set(['a', 'b']);
    expect(meets(undefined, clues)).toBe(true);
    expect(meets('a', clues)).toBe(true);
    expect(meets('c', clues)).toBe(false);
    expect(meets(['a', 'b'], clues)).toBe(true);
    expect(meets(['a', 'c'], clues)).toBe(false);
  });

  it('achar a arma libera "De quem é essa arma?" para todos os NPCs com diálogo da missão', () => {
    for (const cls of [piloto, garimpeiro, caseiro]) {
      expect(asks(cls, EMPTY_MEMORY, new Set()), cls.id).not.toContain(WHOSE);
      expect(asks(cls, EMPTY_MEMORY, ARMA), cls.id).toContain(WHOSE);
    }
    // oculta, não pode ser feita
    const key = String(garimpeiro.questions.findIndex((q) => q.ask === WHOSE));
    expect(askQuestion(garimpeiro, EMPTY_MEMORY, key, { die: dice(1) })).toBeNull();
  });

  it('os outros não sabem; o caseiro passa e diz que não sabe, falha e confessa', () => {
    expect(
      ask(piloto, EMPTY_MEMORY, WHOSE, 1, { clues: ARMA }).answer.outcome.clue,
    ).toBeUndefined();
    expect(ask(garimpeiro, EMPTY_MEMORY, WHOSE, 1, { clues: ARMA }).answer.passed).toBeNull();
    const dodge = ask(caseiro, EMPTY_MEMORY, WHOSE, 20, { clues: ARMA }).answer;
    expect(dodge.line).toBe('Sei não, senhor.');
    expect(dodge.outcome.clue).toBeUndefined();
    const owns = ask(caseiro, EMPTY_MEMORY, WHOSE, 1, { clues: ARMA }).answer;
    expect(owns.outcome.confess).toBe(true);
    expect(owns.outcome.clue).toBe(GUN_OWNER);
  });

  it('caseiro: "De quem é essa arma?" com três rolagens, três evasivas e uma verdade', () => {
    const asks3 = [
      WHOSE,
      'Não sabe de quem é a arma que tá dentro da sua casa?',
      'Pensa bem antes de responder. Essa arma é de quem?',
    ];
    let m = EMPTY_MEMORY;
    const res = [];
    for (const q of asks3) {
      const r = ask(caseiro, m, q, 20, { clues: ARMA });
      res.push(r.answer);
      m = r.memory;
    }
    expect(res.map((a) => a.dc)).toEqual([8, 12, 14]);
    expect(res.map((a) => a.line)).toEqual([
      'Sei não, senhor.',
      'Pode ser de um dos meninos… eles vivem entrando aqui.',
      'Sei lá, doutor. Minha é que não é.',
    ]);
    // o fecho só vem depois de resistir à última rolagem
    expect(res.map((a) => a.closing)).toEqual([
      null,
      null,
      'Claro. A arma entrou sozinha e foi se esconder no armário.',
    ]);
    expect(res[2].unlocked).toBeNull();
    expect(res[2].outcome.clue).toBeUndefined();
    // nenhum cartão sobra na cadeia, e a pergunta segue aberta para os outros
    expect(
      dialogueOptions(caseiro, m, ARMA).filter((o) => o.key.startsWith('2') && !o.done),
    ).toEqual([]);
    expect(asks(piloto, EMPTY_MEMORY, ARMA)).toContain(WHOSE);
    for (let level = 0; level < 3; level++) {
      let mem = EMPTY_MEMORY;
      let last;
      for (let i = 0; i <= level; i++) {
        last = ask(caseiro, mem, asks3[i], i === level ? 1 : 20, { clues: ARMA });
        mem = last.memory;
      }
      const a = last!.answer;
      expect(a.line, `nível ${level}`).toBe('…É minha, doutor. É pra onça, juro.');
      expect(a.outcome.clue).toBe(GUN_OWNER);
      expect(a.unlocked).toBeNull();
      // cedeu: sem fecho
      expect(a.closing, `nível ${level}`).toBeNull();
      // e fecha a pergunta para quem ainda não perguntou
      const after = new Set([...ARMA, GUN_OWNER]);
      expect(asks(piloto, EMPTY_MEMORY, after)).not.toContain(WHOSE);
      expect(asks(garimpeiro, EMPTY_MEMORY, after)).not.toContain(WHOSE);
    }
  });

  it('cadeias sem fecho não trazem fala conclusiva', () => {
    let m = EMPTY_MEMORY;
    let last;
    for (const q of [CARGA, REPLICA, TREPLICA]) {
      last = ask(piloto, m, q, 20);
      m = last.memory;
    }
    expect(last!.answer.closing).toBeNull();
  });

  it('garimpeiros: falas de um pool compartilhado, sem repetição, e "Não sei." quando acaba', () => {
    let pools: PoolUsage = new Map();
    const lines: string[] = [];
    // sete garimpeiros diferentes (cada um com a sua memória) perguntam
    for (let i = 0; i < 7; i++) {
      const key = keyOf(dialogueOptions(garimpeiro, EMPTY_MEMORY, ARMA), WHOSE);
      const r = askQuestion(garimpeiro, EMPTY_MEMORY, key, {
        die: dice(1),
        clues: ARMA,
        pools,
        rng: () => 0.5,
      })!;
      expect(r.answer.passed).toBeNull();
      lines.push(r.answer.line);
      pools = r.pools;
    }
    const pool = [
      'Não sei.',
      'Já perguntou pro caseiro?',
      'Como eu vou saber?',
      'Eu só trabalho aqui, cara, sei de arma não.',
      'Eu não moro com o caseiro pra saber.',
    ];
    expect([...lines.slice(0, 5)].sort()).toEqual([...pool].sort());
    expect(lines.slice(5)).toEqual(['Não sei.', 'Não sei.']);
    // o piloto não usa o pool
    const p = ask(piloto, EMPTY_MEMORY, WHOSE, 1, { clues: ARMA, pools } as never);
    expect(p.answer.line).toBe('Arma? Eu só piloto, doutor. Não sei de quem é.');
  });

  it('pool: drawLine tira a fala sorteada para os próximos', () => {
    const pool = { pool: 'p', lines: ['a', 'b'], fallback: 'z' };
    const one = drawLine(pool, new Map(), () => 0);
    expect(one.line).toBe('a');
    const two = drawLine(pool, one.usage, () => 0);
    expect(two.line).toBe('b');
    expect(drawLine(pool, two.usage).line).toBe('z');
    // fala comum não mexe no estado
    const plain = drawLine('oi', two.usage);
    expect([plain.line, plain.usage]).toEqual(['oi', two.usage]);
  });

  it('confirmado o dono, a pergunta some de quem não perguntou e fica para quem perguntou', () => {
    // o garimpeiro perguntou antes ("não sei"); o caseiro confessa; o piloto ainda não perguntou
    const garimpeiroMem = ask(garimpeiro, EMPTY_MEMORY, WHOSE, 1, { clues: ARMA }).memory;
    const caseiroRes = ask(caseiro, EMPTY_MEMORY, WHOSE, 1, { clues: ARMA });
    const after = new Set([...ARMA, caseiroRes.answer.outcome.clue!]);
    expect(asks(piloto, EMPTY_MEMORY, after)).not.toContain(WHOSE);
    const kept = dialogueOptions(garimpeiro, garimpeiroMem, after).find(
      (o) => o.node.ask === WHOSE,
    );
    expect(kept?.done).toBe(true);
    const own = dialogueOptions(caseiro, caseiroRes.memory, after).find(
      (o) => o.node.ask === WHOSE,
    );
    expect(own?.done).toBe(true);
  });

  it('"não sei" não fecha a pergunta para os outros', () => {
    const r = ask(caseiro, EMPTY_MEMORY, WHOSE, 20, { clues: ARMA });
    const clues = new Set([...ARMA, ...(r.answer.outcome.clue ? [r.answer.outcome.clue] : [])]);
    expect(asks(piloto, EMPTY_MEMORY, clues)).toContain(WHOSE);
    expect(asks(garimpeiro, EMPTY_MEMORY, clues)).toContain(WHOSE);
  });

  it('a pista "item:<id>" bate com o esconderijo do mapa', () => {
    const aeroporto = MAPS.find((m) => m.id === 'aeroporto')!;
    expect(aeroporto.hidden?.map((h) => itemClue(h.id))).toContain('item:arma');
  });
});

describe('aura de diálogo', () => {
  it('raio de 1 hexágono: só colado no suspeito', () => {
    const s = { col: 5, row: 5 };
    for (const n of hexNeighbors(s)) expect(inAura(n, s)).toBe(true);
    expect(inAura(s, s)).toBe(false);
    expect(inAura({ col: 7, row: 5 }, s)).toBe(false);
  });

  it('a aura são os vizinhos livres dentro da área', () => {
    const area = rectArea(10, 10);
    const s = { col: 5, row: 5 };
    expect(auraHexes(s, area).length).toBe(6);
    const wall = hexKey(hexNeighbors(s)[0]);
    expect(auraHexes(s, area, new Set([wall])).map(hexKey)).not.toContain(wall);
    // no canto, só o que está dentro do mapa
    expect(auraHexes({ col: 0, row: 0 }, area).length).toBeLessThan(6);
  });

  it('NPC sem diálogo (segurança): a ação aparece bloqueada (hasDialogue falso)', () => {
    expect(hasDialogue(NPC_CLASSES.seguranca)).toBe(false);
    expect(hasDialogue(npcClass(undefined))).toBe(false);
    expect(hasDialogue(npcClass('desconhecido'))).toBe(false);
    expect(hasDialogue(NPC_CLASSES.piloto)).toBe(true);
  });
});

describe('dados de diálogo', () => {
  const withDialogue = Object.values(NPC_CLASSES).filter(hasDialogue);

  it('toda classe com diálogo tem fala de entrada, "tem mais gente?" (sem condição) e mod 0', () => {
    expect(withDialogue.map((c) => c.id).sort()).toEqual([
      'cacador',
      'caseiro',
      'garimpeiro',
      'pescador',
      'piloto',
    ]);
    for (const c of withDialogue) {
      expect(c.intro?.say, c.id).toBeTruthy();
      expect(
        c.questions.some((q) => isMorePeople(q) && !q.requires),
        c.id,
      ).toBe(true);
      expect(c.mod, c.id).toBe(0);
    }
  });

  it('nos mapas, só o piloto (1) e o caseiro (2) têm cadeia de réplica', () => {
    const chains = (c: NpcClass) => c.questions.filter((q) => isRolled(q) && q.followUp).length;
    // piloto: "o que carregava" e "onde está a chave"; caseiro: a arma e "tem arma na casa"
    expect([piloto, caseiro].map(chains)).toEqual([2, 2]);
    expect(chains(garimpeiro)).toBe(0);
  });

  it('árvores com no máximo pergunta → réplica → tréplica', () => {
    const depth = (q: FollowUpQuestion | RolledQuestion): number =>
      'followUp' in q && q.followUp ? 1 + depth(q.followUp) : 0;
    for (const c of withDialogue)
      for (const q of c.questions) if (isRolled(q)) expect(depth(q)).toBeLessThanOrEqual(2);
  });

  it('os suspeitos dos mapas usam classes que existem; o Jô é o caseiro; ninguém escondido no aeroporto', () => {
    for (const map of MAPS.filter((m) => m.available)) {
      for (const e of map.enemies) {
        if (e.npc) expect(npcClass(e.npc), `${map.id}/${e.id}`).toBeDefined();
        if (e.reveals)
          expect(map.enemies.find((o) => o.id === e.reveals)?.hidden, `${map.id}/${e.id}`).toBe(
            true,
          );
      }
    }
    const aeroporto = MAPS.find((m) => m.id === 'aeroporto')!;
    expect(aeroporto.enemies.find((e) => e.id === 'piloto')?.npc).toBe('piloto');
    expect(aeroporto.enemies.find((e) => e.id === 'piloto')?.reveals).toBeUndefined();
    const jo = aeroporto.enemies.find((e) => e.id === 'jo')!;
    expect([jo.name, jo.npc]).toEqual(['Caseiro Jô', 'caseiro']);
    expect(aeroporto.enemies.some((e) => e.hidden)).toBe(false);
    expect(spawnEnemy(jo).status).toBe('patrol');
  });
});

describe('a chave do avião trancado', () => {
  const asks = (cls: NpcClass, clues: string[]) =>
    dialogueOptions(cls, EMPTY_MEMORY, new Set(clues)).map((o) => o.node.ask);
  const piloto = NPC_CLASSES.piloto;
  const garimpeiro = NPC_CLASSES.garimpeiro;

  it('as perguntas só aparecem depois de achar o avião trancado e somem com a chave', () => {
    for (const cls of [piloto, garimpeiro]) {
      expect(asks(cls, [])).not.toContain('Onde está a chave?');
      expect(asks(cls, [PLANE_LOCKED])).toContain('Onde está a chave?');
      expect(asks(cls, [PLANE_LOCKED, KEY_TAKEN])).not.toContain('Onde está a chave?');
    }
  });

  it('os ajudantes não sabem da chave, mas mandam olhar no quadro do fundo do hangar (resposta fixa)', () => {
    const q = garimpeiro.questions.find((x) => x.ask === 'Onde está a chave?')!;
    expect('answer' in q && q.answer.say).toBe('Sei não. Mas olha no quadro lá no fundo do hangar.');
    // a dica destaca o quadro, como o piloto cedendo
    expect('answer' in q && q.answer.notices).toBe(KEY_PANEL_ID);
    expect('answer' in q && noticedAfter(new Set(), q.answer).has(KEY_PANEL_ID)).toBe(true);
  });

  it('o piloto mente ("Não sei não.") e, cedendo, entrega o painel e o quadro de chaves', () => {
    const q = piloto.questions.find((x) => x.ask === 'Onde está a chave?')!;
    expect(isRolled(q)).toBe(true);
    if (!isRolled(q) || !('fail' in q)) return;
    expect(q.pass.say).toBe('Não sei não.');
    expect(q.fail.say).toBe('No painel ali atrás.');
    expect(q.fail.notices).toBe(KEY_PANEL_ID);
    expect(q.followUp?.ask).toBe('O avião abre por digital? Cadê a chave?');
  });
});
