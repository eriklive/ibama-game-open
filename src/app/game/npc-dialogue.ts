import {
  FixedQuestion,
  LinePool,
  Lines,
  NpcClass,
  QuestionNode,
  RolledQuestion,
  itemClue,
} from './interrogation';

/**
 * Diálogos dos suspeitos, por classe de NPC (ver `interrogation.ts` para as regras).
 *
 * Para adicionar um NPC, crie uma entrada aqui e ligue-a a um inimigo do mapa com `npc` (em
 * `maps.ts`). Para adicionar uma pergunta, ponha mais um nó em `questions` (cada classe abre
 * com umas 3 perguntas, sempre com uma de "tem mais gente?", ver `MORE_PEOPLE_ASKS`):
 *
 * - `{ ask, answer }`: sem rolagem, resposta fixa;
 * - `{ ask, pass, fail }`: rolagem escondida (CD 8, ou `dc`); `pass` é a evasiva e `fail`
 *   a confissão (`confess`) ou a resposta com sinal de mentira (`tell`);
 * - `say` aceita uma fala, uma lista (o jogo sorteia uma) ou um **pool compartilhado na missão**
 *   (`LinePool`: `{ pool, lines, fallback }`). Do pool, cada fala sai uma vez só entre todos os
 *   NPCs que usam o mesmo `pool` (o id); acabou, vale `fallback`. Ex.: `GARIMPEIROS_ON_GUN`;
 * - `reveal` entrega alguém escondido: no mapa, aparece a unidade ligada ao suspeito
 *   (`reveals` no inimigo); sem unidade, só fica anotado.
 *
 * **Cadeia pergunta → réplica → tréplica:** `followUp` num nó com rolagem é a réplica (CD 12),
 * que surge quando o NPC passa; um `followUp` dentro da réplica é a tréplica (CD 14). Cada
 * nível tem a **sua mentira** (`pass`), mas a **verdade é uma só**: o `fail` fica só na
 * pergunta da raiz e vale para a cadeia inteira. Cedendo em qualquer nível, o NPC dá essa
 * resposta e a cadeia acaba (réplica e tréplica nem aceitam `fail`). As falas da réplica e da
 * tréplica são o agente insistindo. Uma réplica/tréplica pode também ser **sem rolagem**
 * (`{ ask, answer }`): a fala do agente que fecha a insistência e a resposta fixa do NPC, sem
 * chance de ceder (ex.: a tréplica do caseiro em "De quem é essa arma?"). A intimidação do agente que conversa soma +1 à CD por ponto.
 *
 * **Perguntas que surgem (ou somem) com o que a equipe descobre:**
 *
 * - `requires`: a pergunta só aparece quando a pista (ou todas, numa lista) estiver registrada
 *   na missão; até lá, fica oculta;
 * - `hiddenWhen`: a pergunta some quando a pista estiver registrada — menos para quem já a fez,
 *   que continua vendo o cartão como "perguntado";
 * - para uma pergunta valer para vários NPCs, defina o nó uma vez e ponha-o nas classes (como
 *   `WHOSE_GUN_UNKNOWN`). Um nó em que o NPC confirma algo registra a pista com `clue`.
 *
 * Pistas que já existem:
 *
 * - `item:<id>` (`itemClue`): a inspeção achou o item escondido de id `<id>` (ex.: `item:arma`);
 * - `dono-arma` (`GUN_OWNER`): alguém confirmou de quem é a arma da casa (o caseiro, ao ceder em
 *   qualquer nível da cadeia de "De quem é essa arma?").
 *
 * Para uma pista nova, basta inventar o id e usá-lo no `clue` de quem a dá e no `requires` /
 * `hiddenWhen` de quem depende dela.
 *
 * `resume` é a fala curta de quando o agente volta a conversar (sem ela, repete a de entrada).
 */
export const MORE_PEOPLE = 'Tem mais gente com vocês?';
/** O jeito de cada um perguntar "tem mais gente?" (o caseiro mora sozinho na casa). */
export const MORE_PEOPLE_ASKS: readonly string[] = [MORE_PEOPLE, 'Tem mais alguém por aqui?'];

/** É a pergunta de "mais gente" (toda classe com diálogo tem, sem condição). */
export const isMorePeople = (q: QuestionNode): boolean => MORE_PEOPLE_ASKS.includes(q.ask);

/** Pista: alguém confirmou de quem é a arma escondida na prateleira da casa. */
export const GUN_OWNER = 'dono-arma';

/**
 * "De quem é essa arma?": aparece para todo NPC com diálogo da missão depois que a inspeção acha
 * a arma (`item:arma`) e some de quem ainda não perguntou assim que alguém confirma o dono.
 */
const WHOSE_GUN = {
  ask: 'De quem é essa arma?',
  requires: itemClue('arma'),
  hiddenWhen: GUN_OWNER,
} as const;

/** Quem não sabe de quem é a arma (resposta fixa). Para outro NPC poder confirmar o dono no
 * futuro, troque por um nó com rolagem cujo `fail` tenha `clue: GUN_OWNER` (como o do caseiro). */
const whoseGunUnknown = (say: Lines): FixedQuestion => ({
  ...WHOSE_GUN,
  answer: { say, note: 'Diz não saber de quem é a arma.' },
});

/**
 * O que os garimpeiros dizem da arma: um pool compartilhado na missão (sem repetição entre
 * eles); acabou, "Não sei.".
 */
const GARIMPEIROS_ON_GUN: LinePool = {
  pool: 'garimpeiros-arma',
  lines: [
    'Não sei.',
    'Já perguntou pro caseiro?',
    'Como eu vou saber?',
    'Eu só trabalho aqui, cara, sei de arma não.',
    'Eu não moro com o caseiro pra saber.',
  ],
  fallback: 'Não sei.',
};

/**
 * O caseiro: a arma é dele. Duas chances de ceder (pergunta e réplica), com duas evasivas e uma
 * verdade só: cedendo, confirma o dono e a pergunta some dos NPCs que ainda não a fizeram. A
 * tréplica é só a fala sarcástica do agente, sem rolagem; ele responde "…".
 */
const WHOSE_GUN_CASEIRO: RolledQuestion = {
  ...WHOSE_GUN,
  pass: { say: 'Sei não, senhor.', note: 'Diz não saber de quem é a arma.' },
  fail: {
    say: '…É minha, doutor. É pra onça, juro.',
    note: 'A arma da prateleira é dele.',
    confess: true,
    clue: GUN_OWNER,
  },
  followUp: {
    ask: 'Não sabe de quem é a arma que tá dentro da sua casa?',
    pass: {
      say: 'Pode ser de um dos meninos… eles vivem entrando aqui.',
      note: 'Diz que pode ser de um dos garimpeiros.',
    },
    // a tréplica não rola: é o agente encerrando a insistência; ele só fica calado
    followUp: {
      ask: 'Claro. A arma entrou sozinha e foi se esconder na prateleira.',
      answer: { say: '…', note: 'Mantém que a arma não é dele.' },
    },
  },
};

export type NpcClassId = 'garimpeiro' | 'piloto' | 'caseiro' | 'cacador' | 'pescador' | 'seguranca';

export const NPC_CLASSES: Readonly<Record<NpcClassId, NpcClass>> = {
  garimpeiro: {
    id: 'garimpeiro',
    name: 'Garimpeiro',
    trait: 'arisco · responde seco',
    mod: 0,
    intro: {
      posture: 'de joelhos, mãos na cabeça, encara o chão',
      say: 'Pode revistar. Não devo nada.',
    },
    resume: ['Ainda isso?', 'Já falei, doutor. Pode revistar.'],
    questions: [
      {
        ask: MORE_PEOPLE,
        pass: {
          say: 'Só a turma do hangar. Mais ninguém.',
          note: 'Diz que só há a turma do hangar.',
        },
        fail: {
          say: 'Tem o piloto, o vigia da pista… e o Jô, que cuida da casa.',
          tell: 'olha de relance pra pista',
          note: 'Cita o piloto, o vigia da pista e o caseiro Jô.',
        },
      },
      {
        ask: 'Estão armados?',
        answer: { say: 'Só o facão. Já tá aí com o senhor.', note: 'Declara só um facão.' },
      },
      {
        ask: 'Essa carga tem nota?',
        pass: { say: 'Tem. Tá com o patrão.', note: 'Diz que a nota está com o patrão.' },
        fail: {
          say: 'Tem… tem nota sim.',
          tell: 'a voz falha e ele evita olhar pros caixotes',
          note: 'Diz que tem nota. Hesitou, evitou olhar a carga.',
        },
      },
      whoseGunUnknown(GARIMPEIROS_ON_GUN),
    ],
  },

  // a cadeia da missão do aeroporto: três mentiras, uma verdade
  piloto: {
    id: 'piloto',
    name: 'Piloto',
    trait: 'nervoso · se faz de desentendido',
    mod: 0,
    intro: {
      posture: 'rendido ao lado do avião, mãos na cabeça',
      say: 'Calma, doutor, calma. Eu só piloto.',
    },
    resume: 'De novo, doutor? Já falei o que sei.',
    questions: [
      {
        ask: MORE_PEOPLE,
        pass: {
          say: 'Só os rapaz do hangar, que descarregam. Mais ninguém.',
          note: 'Diz que só há os garimpeiros do hangar.',
        },
        fail: {
          say: 'Tem os rapaz do hangar… e o caseiro, lá na casa.',
          note: 'Cita os garimpeiros do hangar e o caseiro na casa.',
        },
      },
      {
        ask: 'O que você carregava no avião?',
        pass: { say: 'Não sei, doutor.', note: 'Diz não saber o que levava.' },
        // a verdade da cadeia: cedendo na pergunta, na réplica ou na tréplica
        fail: {
          say: 'Tá bom… é combustível pro garimpo. Contrabando. Vai pras balsas lá dentro.',
          note: 'Contrabando de combustível para garimpo.',
          confess: true,
        },
        followUp: {
          ask: 'Não sabe? Tava pilotando vendado?',
          pass: {
            say: 'A gente não olha o conteúdo não. É o ajudante que carrega.',
            note: 'Joga a culpa no ajudante.',
          },
          followUp: {
            ask: 'É melhor você não mentir pra gente. Você não vai ser preso agora.',
            pass: {
              say: ['…', 'Tô falando pro senhor que não sei de nada.'],
              note: 'Mantém que não sabe.',
            },
          },
        },
      },
      {
        ask: 'Pra onde ia esse voo?',
        pass: {
          say: 'Fazenda de um conhecido. Coisa legal.',
          note: 'Diz que ia para uma fazenda.',
        },
        fail: {
          say: 'Pra uma fazenda aí…',
          tell: 'olha de relance pro GPS no painel',
          note: '"Uma fazenda". Olhou pro GPS.',
        },
      },
      whoseGunUnknown('Arma? Eu só piloto, doutor. Não sei de quem é.'),
      // FUTURO (não implementado): inspecionar o avião vai achar uma chave no painel (pista, ex.:
      // `item:chave-aviao`), que libera aqui uma pergunta sobre a chave do avião
      // (`requires: itemClue('chave-aviao')`).
    ],
  },

  // o Jô mora na casa e cuida dela
  caseiro: {
    id: 'caseiro',
    name: 'Caseiro',
    trait: 'manso · protege a casa',
    mod: 0,
    intro: {
      posture: 'rendido ao lado da mesa, mãos na cabeça',
      say: 'Calma, calma… eu só cuido da casa, doutor.',
    },
    resume: 'Pode perguntar, doutor. A casa tá aí.',
    questions: [
      {
        ask: 'Tem arma na casa?',
        pass: { say: 'Arma? Aqui não tem nada disso, doutor.', note: 'Nega ter arma na casa.' },
        // a verdade da cadeia: cedendo em qualquer nível
        fail: {
          say: 'Tem sim, tá no quartinho de trás.',
          note: 'Há uma arma no quartinho de trás.',
          confess: true,
        },
        followUp: {
          ask: 'Não tem? Casa no meio do garimpo e nenhuma arma?',
          pass: {
            say: 'Aqui é só panela e rede, pode olhar.',
            note: 'Diz que só tem panela e rede.',
          },
          followUp: {
            ask: 'Olha, é melhor falar agora. Se a gente achar, complica pra você.',
            pass: { say: ['…', 'Já disse que não tem, doutor.'], note: 'Mantém que não tem arma.' },
          },
        },
      },
      {
        ask: 'Tem mais alguém por aqui?',
        pass: { say: 'Só eu, doutor. Moro aqui sozinho.', note: 'Diz que mora sozinho.' },
        fail: {
          say: 'Só os rapaz do hangar, que vêm comer aqui de vez em quando.',
          tell: 'olha pela janela, pro lado da pista',
          note: 'Diz que os garimpeiros do hangar comem na casa.',
        },
      },
      WHOSE_GUN_CASEIRO,
    ],
  },

  cacador: {
    id: 'cacador',
    name: 'Caçador',
    trait: 'debochado · minimiza tudo',
    mod: 0,
    intro: {
      posture: 'mãos na cabeça, sorrindo de canto',
      say: 'Que exagero. Tudo isso por causa de uma paca?',
    },
    resume: 'Vai demorar muito? A paca tá esfriando.',
    questions: [
      {
        ask: MORE_PEOPLE,
        pass: { say: 'Só nós dois, passeando.', note: 'Diz que são só dois.' },
        fail: {
          say: 'O Lourival ficou na ceva. Ele que é o caçador.',
          note: '+1 ao norte: "Lourival", na ceva.',
          reveal: true,
        },
      },
      {
        ask: 'Estão armados?',
        pass: {
          say: 'Espingardinha de pressão. Pra passarinho.',
          note: 'Diz que é arma de pressão.',
        },
        fail: {
          say: 'Tá, é a 20. Mas é pra defesa, tem onça aqui.',
          note: 'Espingarda calibre 20.',
          confess: true,
        },
        followUp: {
          ask: 'De pressão? Com cartucho no bolso?',
          pass: { say: 'Cartucho é do meu primo.', note: '"Cartucho é do primo".' },
        },
      },
      {
        ask: 'O que tem nessa mochila?',
        pass: { say: 'Mandioca e farinha.', note: 'Diz "mandioca e farinha".' },
        fail: {
          say: 'Mandioca…',
          tell: 'a mochila está pingando sangue',
          note: '"Mandioca". Mochila pingando sangue.',
        },
      },
    ],
  },

  pescador: {
    id: 'pescador',
    name: 'Pescador',
    trait: 'assustado · humilde',
    mod: 0,
    intro: {
      posture: 'mãos na cabeça, tremendo',
      say: 'Pelo amor de Deus, doutor, eu sou trabalhador.',
    },
    resume: 'Doutor, eu falo, eu falo.',
    questions: [
      {
        ask: MORE_PEOPLE,
        pass: { say: 'Só nós dois aqui no barranco.', note: 'Diz que são só dois.' },
        fail: {
          say: 'O Neto tá de barco, recolhendo a rede.',
          note: '+1 ao norte: "Neto", de barco.',
          reveal: true,
        },
      },
      {
        ask: 'Vocês têm licença de pesca?',
        answer: {
          say: 'Tenho sim, senhor. Ficou em casa.',
          note: 'Diz ter licença. Não apresentou.',
        },
      },
      {
        ask: 'O que tem nesse isopor?',
        pass: { say: 'Uns lambarizinho, coisa pouca.', note: 'Diz "lambari".' },
        fail: {
          say: 'É pirarucu… mas é pra comer, juro.',
          note: 'Pirarucu no isopor.',
          confess: true,
        },
      },
    ],
  },

  // calado: rende-se, mas não há o que conversar (a ação aparece bloqueada, "sem diálogo")
  seguranca: { id: 'seguranca', name: 'Segurança', trait: 'calado', mod: 0, questions: [] },
};

/** Classe de NPC por id (`undefined` sem classe). */
export const npcClass = (id: string | undefined): NpcClass | undefined =>
  id && id in NPC_CLASSES ? NPC_CLASSES[id as NpcClassId] : undefined;
