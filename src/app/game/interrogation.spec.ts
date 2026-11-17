import { describe, expect, it } from 'vitest';
import { spawnEnemy } from './enemies';
import { hexKey, hexNeighbors, rectArea } from './hex';
import {
  INTERROGATION_RULES,
  NpcClass,
  QuestionOption,
  RolledQuestion,
  askQuestion,
  auraHexes,
  dcFor,
  hasDialogue,
  hasOpenQuestions,
  hiddenRoll,
  inAura,
  isRolled,
  noteKind,
  openingOptions,
  pickLine,
} from './interrogation';
import { MAPS } from './maps';
import { MORE_PEOPLE, NPC_CLASSES, isMorePeople, npcClass } from './npc-dialogue';

/** Dado viciado: devolve as faces na ordem (e repete a última). */
const dice = (...faces: number[]) => {
  let i = 0;
  return () => faces[Math.min(i++, faces.length - 1)];
};

const piloto = NPC_CLASSES.piloto;
const open = (cls: NpcClass) => openingOptions(cls, isMorePeople);
const keyOf = (options: readonly QuestionOption[], ask: string) =>
  options.find((o) => o.node.ask === ask)!.key;

describe('rolagem escondida do NPC', () => {
  it('passa só quem tira mais que a CD (como beats)', () => {
    expect(hiddenRoll(10, 0, () => 11).pass).toBe(true);
    expect(hiddenRoll(10, 0, () => 10).pass).toBe(false);
    expect(hiddenRoll(15, 0, () => 15).pass).toBe(false);
    expect(hiddenRoll(18, 0, () => 19).pass).toBe(true);
  });

  it('o modificador da classe entra na conta', () => {
    expect(hiddenRoll(10, 1, () => 10).pass).toBe(true);
    expect(hiddenRoll(10, -1, () => 11).pass).toBe(false);
  });

  it('CD padrão por nível: pergunta 10, réplica 15, tréplica 18 (ou a do nó)', () => {
    const q: RolledQuestion = {
      ask: 'x',
      pass: { say: 'a', note: 'a' },
      fail: { say: 'b', note: 'b' },
    };
    expect(INTERROGATION_RULES.dc).toEqual([10, 15, 18]);
    expect([0, 1, 2].map((d) => dcFor(q, d))).toEqual([10, 15, 18]);
    expect(dcFor({ ...q, dc: 12 }, 0)).toBe(12);
    expect(dcFor({ ask: 'y', answer: { say: 'c', note: 'c' } }, 0)).toBeNull();
  });

  it('sorteia uma das falas', () => {
    expect(pickLine('só uma')).toBe('só uma');
    expect(pickLine(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pickLine(['a', 'b', 'c'], () => 0.99)).toBe('c');
  });
});

describe('perguntas, réplica e tréplica', () => {
  it('abre com até 3 perguntas, sempre com "Tem mais gente com vocês?"', () => {
    const opts = open(piloto);
    expect(opts.length).toBe(INTERROGATION_RULES.openingQuestions);
    expect(opts.some((o) => o.node.ask === MORE_PEOPLE)).toBe(true);
    // mesmo com mais perguntas que o limite, a de "mais gente" entra
    const many: NpcClass = {
      ...piloto,
      questions: [
        ...['a', 'b', 'c'].map((ask) => ({ ask, answer: { say: ask, note: ask } })),
        { ask: MORE_PEOPLE, answer: { say: 'ninguém', note: 'ninguém' } },
      ],
    };
    const asks = openingOptions(many, isMorePeople).map((o) => o.node.ask);
    expect(asks).toEqual(['a', 'b', MORE_PEOPLE]);
  });

  it('missão do aeroporto: o piloto passa, surge a RÉPLICA e depois a TRÉPLICA', () => {
    let opts = open(piloto);
    const carga = keyOf(opts, 'O que você carregava no avião?');
    // 1. pergunta (CD 10): tira 14, passa → evasiva e réplica logo abaixo
    let r = askQuestion(opts, carga, 0, dice(14), () => 0)!;
    expect(r.answer.passed).toBe(true);
    expect(r.answer.dc).toBe(10);
    expect(r.answer.line).toBe('Não sei, doutor.');
    expect(r.answer.unlocked?.node.ask).toBe('Não sabe? Tava pilotando vendado?');
    expect(r.answer.unlocked?.depth).toBe(1);
    opts = r.options;
    const i = opts.findIndex((o) => o.key === carga);
    expect(opts[i].done).toBe(true);
    expect(opts[i + 1].key).toBe(r.answer.unlocked!.key);
    // 2. réplica (CD 15): tira 16, passa → tréplica
    r = askQuestion(opts, r.answer.unlocked!.key, 0, dice(16), () => 0)!;
    expect(r.answer.dc).toBe(15);
    expect(r.answer.passed).toBe(true);
    expect(r.answer.unlocked?.node.ask).toBe(
      'É melhor você não mentir pra gente. Você não vai ser preso agora.',
    );
    expect(r.answer.unlocked?.depth).toBe(2);
    // 3. tréplica (CD 18): tira 18 (não é mais que 18) → confessa
    r = askQuestion(r.options, r.answer.unlocked!.key, 0, dice(18), () => 0)!;
    expect(r.answer.dc).toBe(18);
    expect(r.answer.passed).toBe(false);
    expect(r.answer.outcome.confess).toBe(true);
    expect(r.answer.unlocked).toBeNull();
    expect(noteKind(r.answer.outcome)).toBe('confessou');
  });

  it('falhou na pergunta: confessa e não surge réplica', () => {
    const opts = open(piloto);
    const r = askQuestion(
      opts,
      keyOf(opts, 'O que você carregava no avião?'),
      0,
      dice(3),
      () => 0,
    )!;
    expect(r.answer.passed).toBe(false);
    expect(r.answer.line).toBe('Combustível… pro garimpo.');
    expect(r.answer.unlocked).toBeNull();
    expect(r.options.length).toBe(opts.length);
  });

  it('pergunta sem réplica: passar não libera nada', () => {
    const opts = open(piloto);
    const r = askQuestion(opts, keyOf(opts, 'Pra onde ia esse voo?'), 0, dice(20))!;
    expect(r.answer.passed).toBe(true);
    expect(r.answer.unlocked).toBeNull();
  });

  it('réplica sem tréplica: passar na réplica não libera nada', () => {
    const g = NPC_CLASSES.garimpeiro;
    let opts = open(g);
    let r = askQuestion(opts, keyOf(opts, 'Essa carga tem nota?'), 0, dice(20))!;
    opts = r.options;
    r = askQuestion(opts, r.answer.unlocked!.key, 0, dice(20))!;
    expect(r.answer.passed).toBe(true);
    expect(r.answer.unlocked).toBeNull();
  });

  it('falhou com sinal de mentira: a anotação vira "sinal"', () => {
    const opts = open(piloto);
    const r = askQuestion(opts, keyOf(opts, 'Pra onde ia esse voo?'), 0, dice(1))!;
    expect(r.answer.outcome.tell).toBe('olha de relance pro GPS no painel');
    expect(noteKind(r.answer.outcome)).toBe('sinal');
  });

  it('pergunta sem CD: resposta fixa, sem rolar o dado', () => {
    const g = NPC_CLASSES.garimpeiro;
    const opts = open(g);
    let rolled = false;
    const r = askQuestion(opts, keyOf(opts, 'Estão armados?'), 0, () => ((rolled = true), 1))!;
    expect(rolled).toBe(false);
    expect(r.answer.passed).toBeNull();
    expect(r.answer.roll).toBeNull();
    expect(r.answer.line).toBe('Só o facão. Já tá aí com o senhor.');
    expect(noteKind(r.answer.outcome)).toBe('declarou');
  });

  it('cada pergunta só pode ser feita uma vez', () => {
    const opts = open(piloto);
    const key = keyOf(opts, MORE_PEOPLE);
    const r = askQuestion(opts, key, 0, dice(5))!;
    expect(askQuestion(r.options, key, 0, dice(5))).toBeNull();
    expect(askQuestion(opts, 'não existe', 0, dice(5))).toBeNull();
  });

  it('"Tem mais gente?" falhou: entrega alguém (revela a unidade)', () => {
    const opts = open(piloto);
    const r = askQuestion(opts, keyOf(opts, MORE_PEOPLE), 0, dice(2))!;
    expect(r.answer.outcome.reveal).toBe(true);
  });

  it('acabam as perguntas', () => {
    let opts = open(NPC_CLASSES.pescador);
    for (const o of [...opts]) opts = askQuestion(opts, o.key, 0, dice(1))!.options;
    expect(hasOpenQuestions(opts)).toBe(false);
  });
});

describe('aura de interrogatório', () => {
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

  it('NPC sem diálogo (segurança) não tem aura nem ação', () => {
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
