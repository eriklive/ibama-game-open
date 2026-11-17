import { describe, expect, it } from 'vitest';
import { spawnEnemy } from './enemies';
import { hexKey, hexNeighbors, rectArea } from './hex';
import {
  DialogueMemory,
  EMPTY_MEMORY,
  INTERROGATION_RULES,
  NpcClass,
  QuestionOption,
  RolledQuestion,
  askQuestion,
  auraHexes,
  dcFor,
  dialogueOptions,
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
  openingLine,
  pickLine,
  questionCost,
  talkTarget,
} from './interrogation';
import { MAPS } from './maps';
import { MORE_PEOPLE, NPC_CLASSES, isMorePeople, npcClass } from './npc-dialogue';

/** Dado viciado: devolve as faces na ordem (e repete a última). */
const dice = (...faces: number[]) => {
  let i = 0;
  return () => faces[Math.min(i++, faces.length - 1)];
};

const piloto = NPC_CLASSES.piloto;
const garimpeiro = NPC_CLASSES.garimpeiro;
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
  it('abre com as perguntas sem condição, sempre com "Tem mais gente com vocês?"', () => {
    for (const cls of Object.values(NPC_CLASSES).filter(hasDialogue)) {
      const asks = dialogueOptions(cls, EMPTY_MEMORY).map((o) => o.node.ask);
      expect(asks.length, cls.id).toBe(3);
      expect(asks, cls.id).toContain(MORE_PEOPLE);
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
    // tréplica (CD 14): tira 14 (não é mais que 14) → confessa e registra a pista
    r = ask(piloto, r.memory, TREPLICA, 14);
    expect(r.answer.dc).toBe(14);
    expect(r.answer.passed).toBe(false);
    expect(r.answer.outcome.confess).toBe(true);
    expect(r.answer.outcome.clue).toBe('contrabando-combustivel');
    expect(r.answer.unlocked).toBeNull();
    expect(noteKind(r.answer.outcome)).toBe('confessou');
    opts = dialogueOptions(piloto, r.memory);
    expect(opts.filter((o) => o.depth > 0).map((o) => o.done)).toEqual([true, true]);
  });

  it('falhou na pergunta: confessa e não surge réplica', () => {
    const r = ask(piloto, EMPTY_MEMORY, CARGA, 3);
    expect(r.answer.passed).toBe(false);
    expect(r.answer.line).toBe('Combustível… pro garimpo.');
    expect(r.answer.unlocked).toBeNull();
    expect(r.memory.unlocked).toEqual([]);
  });

  it('pergunta sem réplica: passar não libera nada', () => {
    const r = ask(piloto, EMPTY_MEMORY, 'Pra onde ia esse voo?', 20);
    expect(r.answer.passed).toBe(true);
    expect(r.answer.unlocked).toBeNull();
  });

  it('réplica sem tréplica: passar na réplica não libera nada', () => {
    let r = ask(garimpeiro, EMPTY_MEMORY, 'Essa carga tem nota?', 20);
    r = ask(garimpeiro, r.memory, 'Então pega pra mim.', 20);
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

  it('"Tem mais gente?" falhou: entrega alguém (revela a unidade)', () => {
    expect(ask(piloto, EMPTY_MEMORY, MORE_PEOPLE, 2).answer.outcome.reveal).toBe(true);
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
    expect(questionCost(0)).toBe(1);
    expect(questionCost(0, { moveCost: 2 })).toBe(2);
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

describe('perguntas que surgem com pistas da missão', () => {
  const ARMA = 'E aquela arma escondida na prateleira da casa?';
  const DIESEL = 'O piloto contou do diesel pras balsas. Quem recebe?';

  it('condição: uma pista ou todas de uma lista', () => {
    const clues = new Set(['a', 'b']);
    expect(meets(undefined, clues)).toBe(true);
    expect(meets('a', clues)).toBe(true);
    expect(meets('c', clues)).toBe(false);
    expect(meets(['a', 'b'], clues)).toBe(true);
    expect(meets(['a', 'c'], clues)).toBe(false);
  });

  it('a inspeção acha a arma: o garimpeiro ganha uma pergunta nova', () => {
    const asks = (clues: Set<string>) =>
      dialogueOptions(garimpeiro, EMPTY_MEMORY, clues).map((o) => o.node.ask);
    expect(asks(new Set())).not.toContain(ARMA);
    // pergunta oculta não pode ser feita
    expect(askQuestion(garimpeiro, EMPTY_MEMORY, '3', { die: dice(1) })).toBeNull();
    const clues = new Set([itemClue('arma')]);
    expect(asks(clues)).toContain(ARMA);
    const r = ask(garimpeiro, EMPTY_MEMORY, ARMA, 1, { clues });
    expect(r.answer.outcome.confess).toBe(true);
  });

  it('o piloto confessa o contrabando: o garimpeiro ganha a pergunta do diesel', () => {
    const confession = ask(piloto, EMPTY_MEMORY, CARGA, 1).answer.outcome;
    const clues = new Set([confession.clue!]);
    expect(dialogueOptions(garimpeiro, EMPTY_MEMORY).map((o) => o.node.ask)).not.toContain(DIESEL);
    expect(dialogueOptions(garimpeiro, EMPTY_MEMORY, clues).map((o) => o.node.ask)).toContain(
      DIESEL,
    );
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

  it('toda classe com diálogo tem fala de entrada, "Tem mais gente?" e mod 0', () => {
    expect(withDialogue.map((c) => c.id).sort()).toEqual([
      'cacador',
      'garimpeiro',
      'pescador',
      'piloto',
    ]);
    for (const c of withDialogue) {
      expect(c.intro?.say, c.id).toBeTruthy();
      expect(c.questions.some(isMorePeople), c.id).toBe(true);
      expect(c.mod, c.id).toBe(0);
    }
  });

  it('árvores com no máximo pergunta → réplica → tréplica', () => {
    const depth = (q: RolledQuestion): number => (q.followUp ? 1 + depth(q.followUp) : 0);
    for (const c of withDialogue)
      for (const q of c.questions) if (isRolled(q)) expect(depth(q)).toBeLessThanOrEqual(2);
  });

  it('os suspeitos dos mapas usam classes que existem; quem entrega alguém aponta para um escondido', () => {
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
    const pilot = aeroporto.enemies.find((e) => e.id === 'piloto')!;
    expect(pilot.npc).toBe('piloto');
    expect(spawnEnemy(aeroporto.enemies.find((e) => e.id === pilot.reveals)!).status).toBe(
      'hidden',
    );
  });
});
