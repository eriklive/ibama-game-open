import { NpcClass, QuestionNode } from './interrogation';

/**
 * Diálogos dos suspeitos, por classe de NPC (ver `interrogation.ts` para as regras).
 *
 * Para adicionar um NPC, crie uma entrada aqui e ligue-a a um inimigo do mapa com `npc` (em
 * `maps.ts`). Para adicionar uma pergunta, ponha mais um nó em `questions`:
 *
 * - `{ ask, answer }`: sem rolagem, resposta fixa;
 * - `{ ask, pass, fail }`: rolagem escondida (CD 10, ou `dc`); `pass` é a evasiva e `fail`
 *   a confissão (`confess`) ou a resposta com sinal de mentira (`tell`);
 * - `followUp` dentro de um nó com rolagem é a réplica (CD 15), que surge quando o NPC passa;
 *   um `followUp` dentro da réplica é a tréplica (CD 18);
 * - `say` aceita uma fala ou uma lista (o jogo sorteia uma);
 * - `reveal` entrega alguém escondido: no mapa, aparece a unidade ligada ao suspeito
 *   (`reveals` no inimigo); sem unidade, só fica anotado.
 *
 * "Tem mais gente com vocês?" (`MORE_PEOPLE`) está em toda classe com diálogo e sempre aparece.
 */
export const MORE_PEOPLE = 'Tem mais gente com vocês?';

/** É a pergunta de "mais gente" (sempre entre as que abrem o interrogatório). */
export const isMorePeople = (q: QuestionNode): boolean => q.ask === MORE_PEOPLE;

export type NpcClassId = 'garimpeiro' | 'piloto' | 'cacador' | 'pescador' | 'seguranca';

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
    questions: [
      {
        ask: MORE_PEOPLE,
        pass: { say: ['Só nós dois.', 'Só nós. Pode olhar.'], note: 'Diz que são só dois.' },
        fail: {
          say: '…O Zé tá lá pra cima, na balsa.',
          note: '+1 ao norte: "Zé", na balsa.',
          reveal: true,
        },
        followUp: {
          ask: 'E essas três marmitas na caçamba?',
          pass: { say: 'Uma é a janta. Garimpeiro come bastante.', note: 'Explica as marmitas.' },
          fail: {
            say: 'Tá… tem o Zé. Mas ele só cozinha.',
            note: '+1 ao norte: "Zé".',
            reveal: true,
          },
          followUp: {
            ask: 'Se tiver mais alguém lá e você mentiu, quem se complica é você.',
            pass: { say: ['…', 'Já falei. Só nós dois.'], note: 'Mantém a versão.' },
            fail: {
              say: 'O Zé ficou na balsa. Só ele, juro.',
              note: '+1 ao norte: "Zé", na balsa.',
              reveal: true,
            },
          },
        },
      },
      {
        ask: 'Estão armados?',
        answer: { say: 'Só o facão. Já tá aí com o senhor.', note: 'Declara só um facão.' },
      },
      {
        ask: 'Essa carga tem nota?',
        pass: { say: 'Tem. Tá no porta-luvas.', note: 'Diz que tem nota no porta-luvas.' },
        fail: {
          say: 'Tem… tem nota sim.',
          tell: 'a voz falha e ele evita olhar pra cabine',
          note: 'Diz que tem nota. Hesitou, evitou a cabine.',
        },
        followUp: {
          ask: 'Então pega pra mim.',
          pass: { say: 'A chave ficou com o patrão.', note: 'Chave "com o patrão".' },
          fail: { say: '…Não tem nota nenhuma, doutor.', note: 'Carga sem nota.', confess: true },
        },
      },
    ],
  },

  // a sequência da missão do aeroporto
  piloto: {
    id: 'piloto',
    name: 'Piloto',
    trait: 'nervoso · se faz de desentendido',
    mod: 0,
    intro: {
      posture: 'rendido ao lado do avião, mãos na cabeça',
      say: 'Calma, doutor, calma. Eu só piloto.',
    },
    questions: [
      {
        ask: MORE_PEOPLE,
        pass: { say: 'Só eu e o ajudante.', note: 'Diz que são só dois.' },
        fail: {
          say: 'Tem o pessoal que descarrega… tão no barraco ali em cima.',
          note: '+ carregadores no barraco ao norte.',
          reveal: true,
        },
      },
      {
        ask: 'O que você carregava no avião?',
        pass: { say: 'Não sei, doutor.', note: 'Diz não saber o que levava.' },
        fail: {
          say: 'Combustível… pro garimpo.',
          note: 'Combustível para garimpo.',
          confess: true,
        },
        followUp: {
          ask: 'Não sabe? Tava pilotando vendado?',
          pass: {
            say: 'A gente não olha o conteúdo não. É o ajudante que carrega.',
            note: 'Joga a culpa no ajudante.',
          },
          fail: {
            say: 'É diesel, doutor. Uns tambor de diesel.',
            note: 'Admite tambores de diesel.',
          },
          followUp: {
            ask: 'É melhor você não mentir pra gente. Você não vai ser preso agora.',
            pass: {
              say: ['…', 'Tô falando pro senhor que não sei de nada.'],
              note: 'Mantém que não sabe.',
            },
            fail: {
              say: 'Tá bom… é combustível pro garimpo. Contrabando. Vai pras balsas lá dentro.',
              note: 'Contrabando de combustível para garimpo.',
              confess: true,
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
          say: 'Só uma de pressão…',
          tell: 'olha pra espingarda calibre 20 caída no mato',
          note: '"De pressão". Olhou pra uma 20 no mato.',
        },
        followUp: {
          ask: 'De pressão? Com cartucho no bolso?',
          pass: { say: 'Cartucho é do meu primo.', note: '"Cartucho é do primo".' },
          fail: {
            say: 'Tá, é a 20. Mas é pra defesa, tem onça aqui.',
            note: 'Espingarda calibre 20.',
            confess: true,
          },
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

  // calado: rende-se, mas não há o que interrogar (sem aura, sem ação)
  seguranca: { id: 'seguranca', name: 'Segurança', trait: 'calado', mod: 0, questions: [] },
};

/** Classe de NPC por id (`undefined` sem classe). */
export const npcClass = (id: string | undefined): NpcClass | undefined =>
  id && id in NPC_CLASSES ? NPC_CLASSES[id as NpcClassId] : undefined;
